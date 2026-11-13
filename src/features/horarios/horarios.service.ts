import { sinFichaDocente } from "../../common/utils/ficha-docente.util";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { DIAS_SEMANA_CLASE, MENSAJES_HORARIOS, TABLA_HORARIOS } from "./constants";
import {
  BloqueHorarioResponseDto,
  BloqueMutacionResponseDto,
  ConflictoHorarioCopiaDto,
  CopiarHorarioResponseDto,
  CreateBloqueHorarioDto,
  GrillaPropuestaResponseDto,
  HorarioEstudianteResponseDto,
  ListarPorSeccionResponseDto,
  MiHorarioResponseDto,
  ResumenHorasCursoDto,
  UpdateBloqueHorarioDto,
} from "./dto";
import { HorariosRepository } from "./repositories";
import { generarHorarioPdfBuffer } from "./utils";
import {
  construirAdvertenciaHorasPlan,
  construirMensajeCruceDocente,
  convertirHoraAMinutos,
  minutosAHora,
  normalizarHora,
} from "./utils";

export interface UsuarioConsultaEstudiante {
  id: string;
  personaId?: string;
  role?: string;
  rol?: string;
}

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
    this.exigirSeccionAbierta(seccion);

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
    this.exigirSeccionAbierta(await this.seccionesRepo.findById(bloqueActual.seccionId));

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
    this.exigirSeccionAbierta(await this.seccionesRepo.findById(bloque.seccionId));

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

  async generarHorarioSeccionPdf(
    seccionId: string,
    docenteId?: string,
  ): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    const [info, data] = await Promise.all([
      this.horariosRepo.infoSeccion(seccionId),
      this.listarPorSeccion(seccionId),
    ]);
    if (!info) {
      throw new NotFoundException(MENSAJES_HORARIOS.SECCION_NO_ENCONTRADA);
    }

    let bloquesFiltrados: BloqueHorarioResponseDto[] = data.bloques;
    let docenteNombre: string | undefined;

    if (docenteId) {
      const cursosSeccion = await this.horariosRepo.cursosSeccionPorSeccion(seccionId);
      const cursosDocente = new Set(
        cursosSeccion.filter((c) => c.docenteId === docenteId).map((c) => c.cursoSeccionId),
      );
      bloquesFiltrados = data.bloques.filter(
        (b) =>
          b.tipoBloque === "receso" ||
          (b.cursoSeccionId !== null &&
            b.cursoSeccionId !== undefined &&
            cursosDocente.has(b.cursoSeccionId)),
      );
      docenteNombre =
        bloquesFiltrados.find((b) => b.tipoBloque === "clase")?.docenteNombre ?? undefined;
    }

    const buffer = await generarHorarioPdfBuffer({
      titulo: `${info.gradoNombre} – Sección ${info.seccionNombre}`,
      subtitulo: `Año académico ${info.anio}`,
      filtroDocente: docenteNombre,
      bloques: bloquesFiltrados,
    });
    const slug = `${info.gradoNombre}-${info.seccionNombre}-${info.anio}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return { buffer, nombreArchivo: `horario-${slug || "seccion"}.pdf` };
  }

  async proponerGrilla(
    seccionId: string,
    horaEntrada?: string,
  ): Promise<GrillaPropuestaResponseDto> {
    const seccion = await this.seccionesRepo.findById(seccionId);
    if (!seccion) {
      throw new NotFoundException(MENSAJES_HORARIOS.SECCION_NO_ENCONTRADA);
    }

    const { minutosHoraPedagogica, horasPedagogicasDia, recreoDespuesDeHora, minutosRecreo } =
      await this.horariosRepo.obtenerParametrosJornada();

    const horaInicioBase = horaEntrada
      ? normalizarHora(horaEntrada)
      : await this.horariosRepo.horaEntradaEstudiantes();

    const bloques: GrillaPropuestaResponseDto["bloques"] = [];

    for (const diaSemana of DIAS_SEMANA_CLASE) {
      let minutoActual = convertirHoraAMinutos(horaInicioBase);

      for (let horaPedagogica = 1; horaPedagogica <= horasPedagogicasDia; horaPedagogica++) {
        const horaInicioBloque = minutosAHora(minutoActual);
        minutoActual += minutosHoraPedagogica;
        const horaFinBloque = minutosAHora(minutoActual);

        bloques.push({
          diaSemana,
          horaInicio: horaInicioBloque,
          horaFin: horaFinBloque,
          tipoBloque: "clase",
        });

        if (horaPedagogica === recreoDespuesDeHora) {
          const horaInicioReceso = minutosAHora(minutoActual);
          minutoActual += minutosRecreo;
          const horaFinReceso = minutosAHora(minutoActual);

          bloques.push({
            diaSemana,
            horaInicio: horaInicioReceso,
            horaFin: horaFinReceso,
            tipoBloque: "receso",
          });
        }
      }
    }

    return {
      horaEntrada: horaInicioBase,
      bloques,
    };
  }

  async copiar(
    origenId: string,
    destinoId: string,
    actorId: string,
    ip?: string,
  ): Promise<CopiarHorarioResponseDto> {
    const anio = await this.resolverAnio(true);

    const [seccionOrigen, seccionDestino] = await Promise.all([
      this.seccionesRepo.findById(origenId),
      this.seccionesRepo.findById(destinoId),
    ]);

    if (!seccionOrigen || !seccionDestino) {
      throw new NotFoundException(MENSAJES_HORARIOS.SECCION_NO_ENCONTRADA);
    }

    this.exigirSeccionAbierta(seccionDestino);

    if (seccionOrigen.gradoId !== seccionDestino.gradoId) {
      throw new BadRequestException(MENSAJES_HORARIOS.COPIA_DISTINTO_GRADO);
    }

    const bloquesDestinoExistentes = await this.horariosRepo.findBySeccion(destinoId);
    if (bloquesDestinoExistentes.length > 0) {
      throw new ConflictException(MENSAJES_HORARIOS.COPIA_DESTINO_CON_BLOQUES);
    }

    const [bloquesOrigen, cursosOrigen, cursosDestino] = await Promise.all([
      this.horariosRepo.findBySeccion(origenId),
      this.horariosRepo.cursosSeccionPorSeccion(origenId),
      this.horariosRepo.cursosSeccionPorSeccion(destinoId),
    ]);

    const mapaCursoOrigen = new Map<string, { cursoId: string; cursoNombre: string }>();
    for (const co of cursosOrigen) {
      mapaCursoOrigen.set(co.cursoSeccionId, { cursoId: co.cursoId, cursoNombre: co.cursoNombre });
    }

    const mapaCursoDestinoPorCursoId = new Map<
      string,
      { cursoSeccionId: string; cursoNombre: string; docenteId: string | null }
    >();
    for (const cd of cursosDestino) {
      mapaCursoDestinoPorCursoId.set(cd.cursoId, {
        cursoSeccionId: cd.cursoSeccionId,
        cursoNombre: cd.cursoNombre,
        docenteId: cd.docenteId,
      });
    }

    let bloquesCreados = 0;
    const conflictos: ConflictoHorarioCopiaDto[] = [];

    for (const bo of bloquesOrigen) {
      if (bo.tipoBloque === "receso") {
        const bloqueCreado = await this.horariosRepo.create({
          seccionId: destinoId,
          cursoSeccionId: null,
          diaSemana: bo.diaSemana,
          horaInicio: bo.horaInicio,
          horaFin: bo.horaFin,
          tipoBloque: "receso",
          aula: bo.aula,
        });
        bloquesCreados++;

        await this.auditService.log({
          usuarioId: actorId,
          accion: "crear",
          tabla: TABLA_HORARIOS,
          registroId: bloqueCreado.id,
          direccionIp: ip,
          valorNuevo: this.serializarAuditoria(bloqueCreado),
        });
        continue;
      }

      if (!bo.cursoSeccionId) {
        continue;
      }

      const cursoOrigen = mapaCursoOrigen.get(bo.cursoSeccionId);
      if (!cursoOrigen) {
        continue;
      }

      const cursoDestino = mapaCursoDestinoPorCursoId.get(cursoOrigen.cursoId);
      if (!cursoDestino) {
        continue;
      }

      if (cursoDestino.docenteId) {
        const cruce = await this.horariosRepo.findCruceDocente(
          anio.id,
          cursoDestino.docenteId,
          bo.diaSemana,
          bo.horaInicio,
          bo.horaFin,
          destinoId,
        );

        if (cruce) {
          conflictos.push({
            diaSemana: bo.diaSemana,
            horaInicio: normalizarHora(bo.horaInicio),
            horaFin: normalizarHora(bo.horaFin),
            cursoNombre: cursoDestino.cursoNombre,
            mensaje: construirMensajeCruceDocente(cruce, true),
          });
        }
      }

      const bloqueCreado = await this.horariosRepo.create({
        seccionId: destinoId,
        cursoSeccionId: cursoDestino.cursoSeccionId,
        diaSemana: bo.diaSemana,
        horaInicio: bo.horaInicio,
        horaFin: bo.horaFin,
        tipoBloque: "clase",
        aula: bo.aula,
      });
      bloquesCreados++;

      await this.auditService.log({
        usuarioId: actorId,
        accion: "crear",
        tabla: TABLA_HORARIOS,
        registroId: bloqueCreado.id,
        direccionIp: ip,
        valorNuevo: this.serializarAuditoria(bloqueCreado),
      });
    }

    return {
      bloquesCreados,
      conflictos,
    };
  }

  async miHorario(personaId: string): Promise<MiHorarioResponseDto> {
    const anio = await this.resolverAnio(false);

    const docente = await this.horariosRepo.docentePorPersonaId(personaId);
    if (!docente) {
      throw sinFichaDocente();
    }

    const bloques = await this.horariosRepo.findByDocente(anio.id, docente.id);

    return {
      docenteId: docente.id,
      bloques,
    };
  }

  async horarioDeEstudiante(
    estudianteId: string,
    usuario: UsuarioConsultaEstudiante,
  ): Promise<HorarioEstudianteResponseDto> {
    const rol = (usuario.role ?? usuario.rol ?? "").trim().toLowerCase();

    if (rol === "estudiante") {
      const estudiantePersonaId = usuario.personaId ?? usuario.id;
      if (estudiantePersonaId !== estudianteId) {
        throw new ForbiddenException(
          "No tiene permiso para consultar el horario de otro estudiante.",
        );
      }
    } else if (rol === "apoderado") {
      const apoderadoPersonaId = usuario.personaId ?? usuario.id;
      const esVinculado = await this.horariosRepo.esApoderadoDeEstudiante(
        apoderadoPersonaId,
        estudianteId,
      );
      if (!esVinculado) {
        throw new ForbiddenException(
          "No tiene permiso para consultar el horario de este estudiante.",
        );
      }
    }

    const anio = await this.resolverAnio(false);

    const matricula = await this.horariosRepo.matriculaEstudiante(anio.id, estudianteId);
    if (!matricula || matricula.estado !== "matriculado") {
      throw new NotFoundException(
        "El estudiante no cuenta con matrícula activa en el año académico.",
      );
    }

    const bloques = await this.horariosRepo.findBySeccion(matricula.seccionId);

    return {
      seccionId: matricula.seccionId,
      bloques,
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

  /** Una sección cerrada solo admite consulta: no se le crean, editan, borran ni copian bloques. */
  private exigirSeccionAbierta(seccion: { estado: string } | null | undefined): void {
    if (seccion?.estado === "cerrada") {
      throw new BadRequestException(MENSAJES_HORARIOS.SECCION_CERRADA);
    }
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
