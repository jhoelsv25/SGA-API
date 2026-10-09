import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { AnioLectivoCls } from "../../common/anio-lectivo";
import { AuditService } from "../../common/services/audit.service";
import { AniosAcademicosService } from "../anio-escolar/anios.service";
import { DocentesRepository } from "../docentes";
import { SeccionesRepository } from "../secciones";
import { VariablesSistemaRepository } from "../variables-sistema/repositories";
import { MENSAJES_HORARIOS, TABLA_HORARIOS } from "./constants";
import {
  BloqueHorarioResponseDto,
  BloqueMutacionResponseDto,
  CreateBloqueHorarioDto,
  ListarPorSeccionResponseDto,
  ResumenHorasCursoDto,
  UpdateBloqueHorarioDto,
} from "./dto";
import { HorariosRepository } from "./repositories";
import {
  construirAdvertenciaHorasPlan,
  construirMensajeCruceDocente,
  convertirHoraAMinutos,
} from "./utils";

@Injectable()
export class HorariosService {
  constructor(
    private readonly horariosRepo: HorariosRepository,
    private readonly seccionesRepo: SeccionesRepository,
    private readonly docentesRepo: DocentesRepository,
    private readonly aniosService: AniosAcademicosService,
    private readonly anioLectivoCls: AnioLectivoCls,
    private readonly auditService: AuditService,
    @Optional() private readonly variablesSistemaRepo?: VariablesSistemaRepository,
  ) {}

  async crearBloque(
    seccionId: string,
    dto: CreateBloqueHorarioDto,
    actorId: string,
    ip?: string,
  ): Promise<BloqueMutacionResponseDto> {
    const minInicio = convertirHoraAMinutos(dto.horaInicio);
    const minFin = convertirHoraAMinutos(dto.horaFin);
    if (minFin <= minInicio) {
      throw new BadRequestException(MENSAJES_HORARIOS.FIN_DEBE_SER_POSTERIOR);
    }

    const anio = await this.resolverAnio(true);

    const seccion = await this.seccionesRepo.findById(seccionId);
    if (!seccion) {
      throw new NotFoundException(MENSAJES_HORARIOS.SECCION_NO_ENCONTRADA);
    }

    if (dto.tipoBloque === "clase" && !dto.cursoSeccionId) {
      throw new BadRequestException(MENSAJES_HORARIOS.CLASE_REQUIERE_CURSO);
    }

    // 1. Validar superposición en la sección
    const solapados = await this.horariosRepo.findSolapados(
      seccionId,
      dto.diaSemana,
      dto.horaInicio,
      dto.horaFin,
    );
    if (solapados.length > 0) {
      throw new ConflictException(MENSAJES_HORARIOS.BLOQUES_SUPERPUESTOS);
    }

    // 2. Validar cruce de docente en otra sección del año escolar
    if (dto.tipoBloque === "clase" && dto.cursoSeccionId) {
      const cruceDocente = await this.horariosRepo.findCruceDocente(
        anio.id,
        dto.cursoSeccionId,
        dto.diaSemana,
        dto.horaInicio,
        dto.horaFin,
        seccionId,
      );
      if (cruceDocente) {
        throw new ConflictException(construirMensajeCruceDocente(cruceDocente));
      }
    }

    // 3. Crear bloque en base de datos
    const bloqueCreado = await this.horariosRepo.create({
      seccionId,
      cursoSeccionId: dto.tipoBloque === "receso" ? null : dto.cursoSeccionId,
      diaSemana: dto.diaSemana,
      horaInicio: dto.horaInicio,
      horaFin: dto.horaFin,
      tipoBloque: dto.tipoBloque,
      aula: dto.aula,
    });

    // 4. Registrar auditoría inmutable
    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: TABLA_HORARIOS,
      registroId: bloqueCreado.id,
      direccionIp: ip,
      valorNuevo: this.serializarAuditoria(bloqueCreado),
    });

    // 5. Comparar horas frente al plan de estudios para emitir advertencias oficiales
    const advertencias = await this.calcularAdvertencias(seccionId);
    const mensaje =
      anio.estado === "en_curso" ? MENSAJES_HORARIOS.HORARIO_GUARDADO_VIGENCIA : undefined;

    return {
      bloque: bloqueCreado,
      advertencias,
      mensaje,
    };
  }

  async actualizarBloque(
    id: string,
    dto: UpdateBloqueHorarioDto,
    actorId: string,
    ip?: string,
  ): Promise<BloqueMutacionResponseDto> {
    const bloqueActual = await this.horariosRepo.findById(id);
    if (!bloqueActual) {
      throw new NotFoundException(MENSAJES_HORARIOS.BLOQUE_NO_ENCONTRADO);
    }

    const horaInicioEfectiva = dto.horaInicio ?? bloqueActual.horaInicio;
    const horaFinEfectiva = dto.horaFin ?? bloqueActual.horaFin;
    const diaSemanaEfectivo = dto.diaSemana ?? bloqueActual.diaSemana;
    const tipoBloqueEfectivo = dto.tipoBloque ?? bloqueActual.tipoBloque;
    const cursoSeccionIdEfectivo =
      dto.cursoSeccionId !== undefined ? dto.cursoSeccionId : bloqueActual.cursoSeccionId;

    const minInicio = convertirHoraAMinutos(horaInicioEfectiva);
    const minFin = convertirHoraAMinutos(horaFinEfectiva);
    if (minFin <= minInicio) {
      throw new BadRequestException(MENSAJES_HORARIOS.FIN_DEBE_SER_POSTERIOR);
    }

    const anio = await this.resolverAnio(true);

    // 1. Validar superposición en la sección (excluyendo el bloque actual)
    const solapados = await this.horariosRepo.findSolapados(
      bloqueActual.seccionId,
      diaSemanaEfectivo,
      horaInicioEfectiva,
      horaFinEfectiva,
      id,
    );
    if (solapados.length > 0) {
      throw new ConflictException(MENSAJES_HORARIOS.BLOQUES_SUPERPUESTOS);
    }

    // 2. Validar cruce de docente en otra sección del año escolar
    if (tipoBloqueEfectivo === "clase" && cursoSeccionIdEfectivo) {
      const cruceDocente = await this.horariosRepo.findCruceDocente(
        anio.id,
        cursoSeccionIdEfectivo,
        diaSemanaEfectivo,
        horaInicioEfectiva,
        horaFinEfectiva,
        bloqueActual.seccionId,
      );
      if (cruceDocente) {
        throw new ConflictException(construirMensajeCruceDocente(cruceDocente));
      }
    }

    // 3. Actualizar bloque
    const bloqueActualizado = await this.horariosRepo.update(id, dto);

    // 4. Registrar auditoría inmutable
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: TABLA_HORARIOS,
      registroId: id,
      direccionIp: ip,
      valorAnterior: this.serializarAuditoria(bloqueActual),
      valorNuevo: this.serializarAuditoria(bloqueActualizado),
    });

    // 5. Comparar horas frente al plan de estudios para emitir advertencias
    const advertencias = await this.calcularAdvertencias(bloqueActual.seccionId);
    const mensaje =
      anio.estado === "en_curso" ? MENSAJES_HORARIOS.HORARIO_GUARDADO_VIGENCIA : undefined;

    return {
      bloque: bloqueActualizado,
      advertencias,
      mensaje,
    };
  }

  async eliminarBloque(id: string, actorId: string, ip?: string): Promise<void> {
    await this.resolverAnio(true);

    const bloque = await this.horariosRepo.findById(id);
    if (!bloque) {
      throw new NotFoundException(MENSAJES_HORARIOS.BLOQUE_NO_ENCONTRADO);
    }

    const tieneSesiones = await this.horariosRepo.tieneSesiones(id);
    if (tieneSesiones) {
      throw new ConflictException(MENSAJES_HORARIOS.ELIMINAR_CON_SESIONES);
    }

    await this.horariosRepo.delete(id);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "eliminar",
      tabla: TABLA_HORARIOS,
      registroId: id,
      direccionIp: ip,
      valorAnterior: this.serializarAuditoria(bloque),
    });
  }

  async listarPorSeccion(seccionId: string): Promise<ListarPorSeccionResponseDto> {
    const [bloques, horasPlanMap, horasHorarioMap] = await Promise.all([
      this.horariosRepo.findBySeccion(seccionId),
      this.horariosRepo.horasPlanPorCurso(seccionId),
      this.horariosRepo.horasPorCurso(seccionId),
    ]);

    const advertencias: string[] = [];
    const resumenHoras: ResumenHorasCursoDto[] = [];

    for (const [cursoSeccionId, planInfo] of Object.entries(horasPlanMap)) {
      const horasHorario = horasHorarioMap[cursoSeccionId] ?? 0;
      resumenHoras.push({
        cursoId: cursoSeccionId,
        cursoNombre: planInfo.cursoNombre,
        horasHorario,
        horasPlan: planInfo.horasPlan,
      });

      if (horasHorario !== planInfo.horasPlan) {
        advertencias.push(
          construirAdvertenciaHorasPlan(planInfo.cursoNombre, horasHorario, planInfo.horasPlan),
        );
      }
    }

    return {
      bloques,
      resumenHoras,
      advertencias,
    };
  }

  private async calcularAdvertencias(seccionId: string): Promise<string[]> {
    const advertencias: string[] = [];
    const [horasPlanMap, horasHorarioMap] = await Promise.all([
      this.horariosRepo.horasPlanPorCurso(seccionId),
      this.horariosRepo.horasPorCurso(seccionId),
    ]);

    if (!horasPlanMap || !horasHorarioMap) {
      return advertencias;
    }

    for (const [cursoSeccionId, planInfo] of Object.entries(horasPlanMap)) {
      const horasHorario = horasHorarioMap[cursoSeccionId] ?? 0;
      if (horasHorario !== planInfo.horasPlan) {
        advertencias.push(
          construirAdvertenciaHorasPlan(planInfo.cursoNombre, horasHorario, planInfo.horasPlan),
        );
      }
    }

    return advertencias;
  }

  private async resolverAnio(requiereEscritura: boolean) {
    const id = this.anioLectivoCls.id();
    const anio = id ? await this.aniosService.findById(id) : await this.aniosService.findEnCurso();
    if (requiereEscritura && anio.estado === "cerrado") {
      throw new BadRequestException(MENSAJES_HORARIOS.ANIO_CERRADO);
    }
    return anio;
  }

  private serializarAuditoria(bloque: BloqueHorarioResponseDto): Record<string, unknown> {
    return {
      id: bloque.id,
      seccionId: bloque.seccionId,
      cursoSeccionId: bloque.cursoSeccionId,
      cursoNombre: bloque.cursoNombre,
      docenteNombre: bloque.docenteNombre,
      diaSemana: bloque.diaSemana,
      horaInicio: bloque.horaInicio,
      horaFin: bloque.horaFin,
      tipoBloque: bloque.tipoBloque,
      aula: bloque.aula,
    };
  }
}
