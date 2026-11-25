import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AnioLectivoCls } from "../../../common/anio-lectivo";
import { AuditService } from "../../../common/services/audit.service";
import { AniosAcademicosService } from "../../anio-escolar/anios.service";
import { SeccionesRepository } from "../../secciones";
import { MENSAJES_HORARIOS, TABLA_HORARIOS } from "../constants";
import type {
  BloqueMutacionResponseDto,
  BloquesLoteResponseDto,
  CreateBloqueHorarioDto,
  CrearBloquesLoteDto,
  UpdateBloqueHorarioDto,
} from "../dto";
import { HorariosRepository } from "../repositories";
import { construirMensajeCruceDocente, convertirHoraAMinutos, normalizarHora } from "../utils";
import {
  calcularAdvertenciasSeccion,
  exigirSeccionAbierta,
  resolverAnioHorario,
  serializarBloqueAuditoria,
} from "./horarios-base.helper";
import { HorariosConsultaService } from "./horarios-consulta.service";

/**
 * Servicio especializado en mutaciones de bloques de horario
 * (registro individual, edición, guardado en lote y eliminación) con auditoría.
 */
@Injectable()
export class HorariosBloquesService {
  constructor(
    private readonly horariosRepo: HorariosRepository,
    private readonly seccionesRepo: SeccionesRepository,
    private readonly aniosService: AniosAcademicosService,
    private readonly anioLectivoCls: AnioLectivoCls,
    private readonly auditService: AuditService,
    private readonly consultaService: HorariosConsultaService,
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

    const anio = await resolverAnioHorario(this.anioLectivoCls, this.aniosService, true);

    const seccion = await this.seccionesRepo.findById(seccionId);
    if (!seccion) {
      throw new NotFoundException(MENSAJES_HORARIOS.SECCION_NO_ENCONTRADA);
    }
    exigirSeccionAbierta(seccion);

    if (dto.tipoBloque === "clase" && !dto.cursoSeccionId) {
      throw new BadRequestException(MENSAJES_HORARIOS.CLASE_REQUIERE_CURSO);
    }

    const solapados = await this.horariosRepo.findSolapados(
      seccionId,
      dto.diaSemana,
      dto.horaInicio,
      dto.horaFin,
    );
    if (solapados.length > 0) {
      throw new ConflictException(MENSAJES_HORARIOS.BLOQUES_SUPERPUESTOS);
    }

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

    const bloqueCreado = await this.horariosRepo.create({
      seccionId,
      cursoSeccionId: dto.tipoBloque === "receso" ? null : dto.cursoSeccionId,
      diaSemana: dto.diaSemana,
      horaInicio: dto.horaInicio,
      horaFin: dto.horaFin,
      tipoBloque: dto.tipoBloque,
      aula: dto.aula,
    });
    await this.consultaService.invalidarCacheSeccion(seccionId);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: TABLA_HORARIOS,
      registroId: bloqueCreado.id,
      direccionIp: ip,
      valorNuevo: serializarBloqueAuditoria(bloqueCreado),
    });

    const advertencias = await calcularAdvertenciasSeccion(this.horariosRepo, seccionId);
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

    const anio = await resolverAnioHorario(this.anioLectivoCls, this.aniosService, true);
    exigirSeccionAbierta(await this.seccionesRepo.findById(bloqueActual.seccionId));

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

    const bloqueActualizado = await this.horariosRepo.update(id, dto);
    await this.consultaService.invalidarCacheSeccion(bloqueActual.seccionId);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: TABLA_HORARIOS,
      registroId: id,
      direccionIp: ip,
      valorAnterior: serializarBloqueAuditoria(bloqueActual),
      valorNuevo: serializarBloqueAuditoria(bloqueActualizado),
    });

    const advertencias = await calcularAdvertenciasSeccion(
      this.horariosRepo,
      bloqueActual.seccionId,
    );
    const mensaje =
      anio.estado === "en_curso" ? MENSAJES_HORARIOS.HORARIO_GUARDADO_VIGENCIA : undefined;

    return {
      bloque: bloqueActualizado,
      advertencias,
      mensaje,
    };
  }

  async crearBloquesLote(
    seccionId: string,
    dto: CrearBloquesLoteDto,
    actorId: string,
    ip?: string,
  ): Promise<BloquesLoteResponseDto> {
    const anio = await resolverAnioHorario(this.anioLectivoCls, this.aniosService, true);
    const seccion = await this.seccionesRepo.findById(seccionId);
    if (!seccion) {
      throw new NotFoundException(MENSAJES_HORARIOS.SECCION_NO_ENCONTRADA);
    }
    exigirSeccionAbierta(seccion);

    const [cursosSeccion, bloquesActualesSeccion] = await Promise.all([
      this.horariosRepo.cursosSeccionPorSeccion(seccionId),
      this.horariosRepo.findBySeccion(seccionId),
    ]);
    const cursoPorId = new Map(cursosSeccion.map((c) => [c.cursoSeccionId, c]));
    const idsBloquesSeccion = new Set(bloquesActualesSeccion.map((b) => b.id));
    const existentesSeccion = dto.reemplazarExistentes ? [] : bloquesActualesSeccion;

    const docentesUnicos = [
      ...new Set(cursosSeccion.map((c) => c.docenteId).filter((id): id is string => Boolean(id))),
    ];
    const ocupadoPorDocente = new Map<
      string,
      Array<{ diaSemana: number; horaInicio: string; horaFin: string; descripcion: string }>
    >();
    await Promise.all(
      docentesUnicos.map(async (docenteId) => {
        const bloquesDocente = await this.horariosRepo.findByDocente(anio.id, docenteId);
        ocupadoPorDocente.set(
          docenteId,
          bloquesDocente
            .filter((b) => !idsBloquesSeccion.has(b.id))
            .map((b) => ({
              diaSemana: b.diaSemana,
              horaInicio: b.horaInicio,
              horaFin: b.horaFin,
              descripcion: `${b.gradoNumero}.° ${b.seccionNombre}`,
            })),
        );
      }),
    );

    const normalizados: Array<{
      diaSemana: number;
      horaInicio: string;
      horaFin: string;
      tipoBloque: "clase" | "receso";
      cursoSeccionId: string | null;
      aula: string | null;
    }> = [];

    for (const item of dto.bloques) {
      const horaInicio = normalizarHora(item.horaInicio);
      const horaFin = normalizarHora(item.horaFin);
      if (convertirHoraAMinutos(horaFin) <= convertirHoraAMinutos(horaInicio)) {
        throw new BadRequestException(MENSAJES_HORARIOS.FIN_DEBE_SER_POSTERIOR);
      }
      if (item.tipoBloque === "clase" && !item.cursoSeccionId) {
        throw new BadRequestException(MENSAJES_HORARIOS.CLASE_REQUIERE_CURSO);
      }

      const cursoSeccionId = item.tipoBloque === "receso" ? null : (item.cursoSeccionId ?? null);
      if (cursoSeccionId && !cursoPorId.has(cursoSeccionId)) {
        throw new BadRequestException(MENSAJES_HORARIOS.CLASE_REQUIERE_CURSO);
      }

      const inicioMin = convertirHoraAMinutos(horaInicio);
      const finMin = convertirHoraAMinutos(horaFin);
      const chocaInterno = normalizados.some(
        (otro) =>
          otro.diaSemana === item.diaSemana &&
          inicioMin < convertirHoraAMinutos(otro.horaFin) &&
          finMin > convertirHoraAMinutos(otro.horaInicio),
      );
      if (chocaInterno) {
        throw new ConflictException(MENSAJES_HORARIOS.BLOQUES_SUPERPUESTOS);
      }

      const chocaExistente = existentesSeccion.some(
        (otro) =>
          otro.diaSemana === item.diaSemana &&
          inicioMin < convertirHoraAMinutos(otro.horaFin) &&
          finMin > convertirHoraAMinutos(otro.horaInicio),
      );
      if (chocaExistente) {
        throw new ConflictException(MENSAJES_HORARIOS.BLOQUES_SUPERPUESTOS);
      }

      if (cursoSeccionId) {
        const docenteId = cursoPorId.get(cursoSeccionId)?.docenteId;
        if (docenteId) {
          const ocupados = ocupadoPorDocente.get(docenteId) ?? [];
          const cruce = ocupados.find(
            (b) =>
              b.diaSemana === item.diaSemana &&
              inicioMin < convertirHoraAMinutos(b.horaFin) &&
              finMin > convertirHoraAMinutos(b.horaInicio),
          );
          if (cruce) {
            throw new ConflictException(
              `El docente ya tiene clase asignada en ${cruce.descripcion} (${cruce.horaInicio}–${cruce.horaFin}).`,
            );
          }
        }
      }

      normalizados.push({
        diaSemana: item.diaSemana,
        horaInicio,
        horaFin,
        tipoBloque: item.tipoBloque,
        cursoSeccionId,
        aula: item.aula ?? null,
      });
    }

    const bloques = await this.horariosRepo.crearLote(
      seccionId,
      normalizados.map((b) => ({ seccionId, ...b })),
      Boolean(dto.reemplazarExistentes),
    );
    await this.consultaService.invalidarCacheSeccion(seccionId);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: TABLA_HORARIOS,
      registroId: seccionId,
      valorNuevo: {
        seccionId,
        totalCreados: normalizados.length,
        reemplazarExistentes: Boolean(dto.reemplazarExistentes),
      },
      direccionIp: ip,
    });

    const advertencias = await calcularAdvertenciasSeccion(this.horariosRepo, seccionId);
    return {
      bloques,
      totalCreados: normalizados.length,
      advertencias,
    };
  }

  async eliminarBloque(id: string, actorId: string, ip?: string): Promise<void> {
    await resolverAnioHorario(this.anioLectivoCls, this.aniosService, true);

    const bloque = await this.horariosRepo.findById(id);
    if (!bloque) {
      throw new NotFoundException(MENSAJES_HORARIOS.BLOQUE_NO_ENCONTRADO);
    }
    exigirSeccionAbierta(await this.seccionesRepo.findById(bloque.seccionId));

    const tieneSesiones = await this.horariosRepo.tieneSesiones(id);
    if (tieneSesiones) {
      throw new ConflictException(MENSAJES_HORARIOS.ELIMINAR_CON_SESIONES);
    }

    await this.horariosRepo.delete(id);
    await this.consultaService.invalidarCacheSeccion(bloque.seccionId);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "eliminar",
      tabla: TABLA_HORARIOS,
      registroId: id,
      direccionIp: ip,
      valorAnterior: serializarBloqueAuditoria(bloque),
    });
  }
}
