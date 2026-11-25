import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { AnioLectivoCls } from "../../../common/anio-lectivo";
import { AuditService } from "../../../common/services/audit.service";
import { IaService } from "../../../core/ia/ia.service";
import { AniosAcademicosService } from "../../anio-escolar/anios.service";
import { SeccionesRepository } from "../../secciones";
import { DIAS_SEMANA_CLASE, MENSAJES_HORARIOS, TABLA_HORARIOS } from "../constants";
import type {
  ConflictoHorarioCopiaDto,
  CopiarHorarioResponseDto,
  GrillaPropuestaResponseDto,
  ProponerHorarioIaDto,
  PropuestaHorarioIaResponseDto,
} from "../dto";
import { construirPromptProponerHorario, INSTRUCCION_SISTEMA_PROPONER_HORARIO } from "../prompts";
import { HorariosRepository } from "../repositories";
import {
  type AsignacionIaPropuesta,
  type BloqueOcupadoDocente,
  consolidarPropuestaHorario,
  construirMensajeCruceDocente,
  convertirHoraAMinutos,
  minutosAHora,
  type NecesidadCursoHorario,
  normalizarHora,
} from "../utils";
import {
  exigirSeccionAbierta,
  resolverAnioHorario,
  serializarBloqueAuditoria,
} from "./horarios-base.helper";
import { HorariosConsultaService } from "./horarios-consulta.service";

/**
 * Servicio especializado en generación de grilla base, propuestas con IA
 * y copia de horarios entre secciones del mismo grado.
 */
@Injectable()
export class HorariosPlanificacionService {
  constructor(
    private readonly horariosRepo: HorariosRepository,
    private readonly seccionesRepo: SeccionesRepository,
    private readonly aniosService: AniosAcademicosService,
    private readonly anioLectivoCls: AnioLectivoCls,
    private readonly auditService: AuditService,
    private readonly consultaService: HorariosConsultaService,
    @Optional() private readonly iaService?: IaService,
  ) {}

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

  async proponerConIa(
    seccionId: string,
    dto: ProponerHorarioIaDto,
  ): Promise<PropuestaHorarioIaResponseDto> {
    const grilla = await this.proponerGrilla(seccionId, dto.horaEntrada);
    const anio = await resolverAnioHorario(this.anioLectivoCls, this.aniosService, false);
    const [cursos, planPorCurso, bloquesActualesSeccion] = await Promise.all([
      this.horariosRepo.cursosSeccionPorSeccion(seccionId),
      this.horariosRepo.horasPlanPorCurso(seccionId),
      this.horariosRepo.findBySeccion(seccionId),
    ]);

    const necesidades: NecesidadCursoHorario[] = cursos
      .map((c) => ({
        cursoSeccionId: c.cursoSeccionId,
        cursoNombre: c.cursoNombre,
        docenteId: c.docenteId,
        bloquesRequeridos: Math.max(0, Math.round(planPorCurso[c.cursoId]?.horasPlan ?? 0)),
      }))
      .filter((n) => n.bloquesRequeridos > 0);

    const idsBloquesSeccion = new Set(bloquesActualesSeccion.map((b) => b.id));
    const docentesUnicos = [
      ...new Set(necesidades.map((n) => n.docenteId).filter((id): id is string => Boolean(id))),
    ];

    const ocupadoPorDocente = new Map<string, BloqueOcupadoDocente[]>();
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
            })),
        );
      }),
    );

    let asignacionesIa: AsignacionIaPropuesta[] = [];
    let usandoIa = false;

    if (this.iaService?.estaHabilitada() && necesidades.length > 0) {
      asignacionesIa = await this.solicitarAsignacionesIa({
        grilla: grilla.bloques,
        necesidades,
        ocupadoPorDocente,
        preferencias: dto.preferencias,
      });
      usandoIa = asignacionesIa.length > 0;
    }

    const { bloques, advertencias } = consolidarPropuestaHorario({
      grillaBase: grilla.bloques,
      necesidades,
      ocupadoPorDocente,
      asignacionesIa,
    });

    return {
      horaEntrada: grilla.horaEntrada,
      bloques,
      usandoIa,
      advertencias,
    };
  }

  private async solicitarAsignacionesIa(params: {
    grilla: GrillaPropuestaResponseDto["bloques"];
    necesidades: NecesidadCursoHorario[];
    ocupadoPorDocente: Map<string, BloqueOcupadoDocente[]>;
    preferencias?: string;
  }): Promise<AsignacionIaPropuesta[]> {
    if (!this.iaService) return [];
    try {
      const slotsClase = params.grilla
        .filter((b) => b.tipoBloque === "clase")
        .map((b) => ({ diaSemana: b.diaSemana, horaInicio: b.horaInicio, horaFin: b.horaFin }));

      const resumenOcupacion = [...params.ocupadoPorDocente.entries()].map(
        ([docenteId, bloques]) => ({
          docenteId,
          ocupado: bloques.map((b) => `${b.diaSemana}:${b.horaInicio}-${b.horaFin}`),
        }),
      );

      const respuesta = await this.iaService.generarEstructurado<{
        asignaciones: AsignacionIaPropuesta[];
      }>({
        instruccionSistema: INSTRUCCION_SISTEMA_PROPONER_HORARIO,
        prompt: construirPromptProponerHorario({
          slotsDisponibles: slotsClase,
          cursos: params.necesidades,
          docentesOcupados: resumenOcupacion,
          preferencias: params.preferencias,
        }),
      });

      return Array.isArray(respuesta.datos?.asignaciones) ? respuesta.datos.asignaciones : [];
    } catch {
      return [];
    }
  }

  async copiar(
    origenId: string,
    destinoId: string,
    actorId: string,
    ip?: string,
  ): Promise<CopiarHorarioResponseDto> {
    const anio = await resolverAnioHorario(this.anioLectivoCls, this.aniosService, true);

    const [seccionOrigen, seccionDestino] = await Promise.all([
      this.seccionesRepo.findById(origenId),
      this.seccionesRepo.findById(destinoId),
    ]);

    if (!seccionOrigen || !seccionDestino) {
      throw new NotFoundException(MENSAJES_HORARIOS.SECCION_NO_ENCONTRADA);
    }

    exigirSeccionAbierta(seccionDestino);

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

    const mapaCursoOrigen = new Map(
      cursosOrigen.map((co) => [
        co.cursoSeccionId,
        { cursoId: co.cursoId, cursoNombre: co.cursoNombre },
      ]),
    );
    const mapaCursoDestinoPorCursoId = new Map(
      cursosDestino.map((cd) => [
        cd.cursoId,
        { cursoSeccionId: cd.cursoSeccionId, cursoNombre: cd.cursoNombre, docenteId: cd.docenteId },
      ]),
    );

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
          valorNuevo: serializarBloqueAuditoria(bloqueCreado),
        });
        continue;
      }

      if (!bo.cursoSeccionId) continue;

      const cursoOrigen = mapaCursoOrigen.get(bo.cursoSeccionId);
      if (!cursoOrigen) continue;

      const cursoDestino = mapaCursoDestinoPorCursoId.get(cursoOrigen.cursoId);
      if (!cursoDestino) continue;

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
        valorNuevo: serializarBloqueAuditoria(bloqueCreado),
      });
    }

    if (bloquesCreados > 0) {
      await this.consultaService.invalidarCacheSeccion(destinoId);
    }

    return {
      bloquesCreados,
      conflictos,
    };
  }
}
