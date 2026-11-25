import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { AnioLectivoCls } from "../../../common/anio-lectivo";
import { AuditService } from "../../../common/services/audit.service";
import { AniosAcademicosService } from "../../anio-escolar/anios.service";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import { NotificacionesService } from "../../notificaciones/notificaciones.service";
import { CARPETA_MATERIALES, MENSAJES_AULA_VIRTUAL, MENSAJES_TAREA } from "../constants";
import type {
  CalificarDirectoDto,
  CalificarEntregaDto,
  CrearEntregaDto,
  EntregaResponse,
} from "../dto";
import { AulaVirtualRepository } from "../repositories";
import { evaluarIntentoPreguntas, validarExtensionArchivo } from "../utils";
import { AulaContextoHelper } from "./aula-contexto.helper";

/**
 * Servicio de dominio para recepción de entregas (trabajos y exámenes),
 * revisión docente, devolución y calificación manual o directa (RF-016).
 */
@Injectable()
export class AulaEntregasService {
  private readonly ctx: AulaContextoHelper;

  constructor(
    private readonly repository: AulaVirtualRepository,
    aniosService: AniosAcademicosService,
    anioLectivoCls: AnioLectivoCls,
    private readonly notificaciones: NotificacionesService,
    auditService: AuditService,
    @Optional() contexto?: AulaContextoHelper,
  ) {
    this.ctx =
      contexto ?? new AulaContextoHelper(repository, aniosService, anioLectivoCls, auditService);
  }

  async iniciarIntentoExamen(
    usuario: AuthenticatedUser,
    tareaId: string,
  ): Promise<{ mensaje: string; intento: EntregaResponse }> {
    const tarea = await this.repository.findTarea(tareaId);
    if (!tarea) throw new NotFoundException(MENSAJES_TAREA.TAREA_NO_ENCONTRADA);
    if (tarea.estado !== "publicada") {
      throw new BadRequestException("La tarea no está disponible para resolver.");
    }

    const curso = await this.ctx.requerirCurso(tarea.cursoSeccionId);
    const matricula = await this.repository.findMatriculaDeEstudiante(
      curso.seccionId,
      usuario.personaId,
    );
    if (!matricula) throw new ForbiddenException("No está matriculado en este curso.");

    const entregas = await this.repository.findEntregasDeEstudiante(tareaId, matricula.id);
    const enProgreso = entregas.find((e) => e.estado === "en_progreso");
    if (enProgreso) {
      return { mensaje: "Continuando intento en progreso.", intento: enProgreso };
    }
    if (entregas.length >= tarea.intentosMaximos) {
      throw new BadRequestException(MENSAJES_TAREA.SIN_INTENTOS);
    }

    const nuevoIntento = await this.repository.guardarEntrega({
      tareaId,
      matriculaId: matricula.id,
      intento: entregas.length + 1,
      estado: "en_progreso",
      iniciadoEn: new Date().toISOString(),
    });
    return { mensaje: "Intento iniciado.", intento: nuevoIntento };
  }

  async guardarProgresoIntento(
    usuario: AuthenticatedUser,
    tareaId: string,
    respuestas: Record<string, unknown>,
  ): Promise<{ mensaje: string; entrega: EntregaResponse }> {
    const tarea = await this.repository.findTarea(tareaId);
    if (!tarea) throw new NotFoundException(MENSAJES_TAREA.TAREA_NO_ENCONTRADA);

    const curso = await this.ctx.requerirCurso(tarea.cursoSeccionId);
    const matricula = await this.repository.findMatriculaDeEstudiante(
      curso.seccionId,
      usuario.personaId,
    );
    if (!matricula) throw new ForbiddenException("No está matriculado.");

    const activa = await this.repository.findEntregaActiva(tareaId, matricula.id);
    if (!activa || activa.estado !== "en_progreso") {
      throw new BadRequestException("No tiene un intento en progreso.");
    }

    const guardada = await this.repository.guardarEntrega({
      tareaId,
      matriculaId: matricula.id,
      intento: activa.intento,
      respuestas,
      estado: "en_progreso",
    });
    return { mensaje: "Progreso guardado.", entrega: guardada };
  }

  async entregarTarea(
    usuario: AuthenticatedUser,
    tareaId: string,
    dto: CrearEntregaDto,
    archivo?: Express.Multer.File,
  ): Promise<{
    mensaje: string;
    entrega: EntregaResponse;
    nota?: number;
    intentosRestantes?: number;
  }> {
    const tarea = await this.repository.findTarea(tareaId);
    if (!tarea) throw new NotFoundException(MENSAJES_TAREA.TAREA_NO_ENCONTRADA);
    if (tarea.estado !== "publicada") {
      throw new BadRequestException("La tarea no está disponible para entregas.");
    }

    const curso = await this.ctx.requerirCurso(tarea.cursoSeccionId);
    const matricula = await this.repository.findMatriculaDeEstudiante(
      curso.seccionId,
      usuario.personaId,
    );
    if (!matricula) throw new ForbiddenException("No está matriculado en este curso.");

    const ahora = new Date().toISOString();
    const pasadaLimite = ahora > tarea.fechaLimite;
    if (pasadaLimite && !tarea.permiteEntregaTardia) {
      throw new BadRequestException(MENSAJES_TAREA.FUERA_DE_PLAZO);
    }
    const esTardia = pasadaLimite;

    let archivoUrl: string | null = null;
    let archivoNombre: string | null = null;
    let archivoTamanoBytes: number | null = null;

    if (archivo) {
      if (!validarExtensionArchivo(archivo.originalname, tarea.tiposArchivo)) {
        throw new BadRequestException(MENSAJES_TAREA.FORMATO_NO_PERMITIDO);
      }
      const guardado = await this.ctx.guardarArchivoLocal(CARPETA_MATERIALES, archivo);
      archivoUrl = guardado.url;
      archivoNombre = guardado.archivoNombre;
      archivoTamanoBytes = guardado.archivoTamanoBytes;
    } else if (dto.archivoUrl) {
      archivoUrl = dto.archivoUrl;
      archivoNombre = dto.archivoNombre ?? null;
      archivoTamanoBytes = dto.archivoTamanoBytes ?? null;
    }

    if (tarea.tipo === "trabajo" || tarea.tipo === "proyecto") {
      const entregaExistente = await this.repository.findEntregaActiva(tareaId, matricula.id);
      if (entregaExistente && entregaExistente.estado === "calificada") {
        throw new BadRequestException(MENSAJES_TAREA.ENTREGA_YA_CALIFICADA);
      }

      const entrega = await this.repository.guardarEntrega({
        tareaId,
        matriculaId: matricula.id,
        intento: 1,
        entregadaEn: ahora,
        texto: dto.texto ?? null,
        enlaceUrl: dto.enlaceUrl ?? null,
        archivoUrl,
        archivoNombre,
        archivoTamanoBytes,
        esTardia,
        estado: "entregada",
      });

      await this.repository.registrarActividad?.({
        matriculaId: matricula.id,
        materialId: null,
        tareaId,
        accion: "completo",
      });

      const mensaje = esTardia ? MENSAJES_TAREA.ENTREGA_TARDIA : MENSAJES_TAREA.ENTREGA_ENVIADA;
      return { mensaje, entrega };
    }

    const entregasPrevias = await this.repository.findEntregasDeEstudiante(tareaId, matricula.id);
    const intentoEnProgreso = entregasPrevias.find((e) => e.estado === "en_progreso");
    const intentoNumero = intentoEnProgreso
      ? intentoEnProgreso.intento
      : entregasPrevias.length + 1;

    if (intentoNumero > tarea.intentosMaximos) {
      throw new BadRequestException(MENSAJES_TAREA.SIN_INTENTOS);
    }

    let tiempoAgotado = false;
    if (tarea.limiteTiempoMinutos && intentoEnProgreso) {
      const ms = new Date(ahora).getTime() - new Date(intentoEnProgreso.iniciadoEn).getTime();
      if (ms > tarea.limiteTiempoMinutos * 60 * 1000) tiempoAgotado = true;
    }

    const evaluacion = evaluarIntentoPreguntas(tarea.preguntas, dto.respuestas || {});
    const restantes = Math.max(0, tarea.intentosMaximos - intentoNumero);

    if (evaluacion.todasCerradas) {
      const entrega = await this.repository.guardarEntrega({
        tareaId,
        matriculaId: matricula.id,
        intento: intentoNumero,
        entregadaEn: ahora,
        respuestas: evaluacion.respuestasDetalle,
        esTardia,
        estado: "calificada",
        nota: evaluacion.notaVigesimal,
        calificadaEn: ahora,
      });

      await this.repository.registrarActividad?.({
        matriculaId: matricula.id,
        materialId: null,
        tareaId,
        accion: "completo",
      });

      const mensaje = tiempoAgotado
        ? MENSAJES_TAREA.TIEMPO_AGOTADO
        : MENSAJES_TAREA.INTENTO_CALIFICADO(evaluacion.notaVigesimal.toFixed(2), restantes);

      return { mensaje, entrega, nota: evaluacion.notaVigesimal, intentosRestantes: restantes };
    }

    const entrega = await this.repository.guardarEntrega({
      tareaId,
      matriculaId: matricula.id,
      intento: intentoNumero,
      entregadaEn: ahora,
      respuestas: evaluacion.respuestasDetalle,
      esTardia,
      estado: "entregada",
    });

    await this.repository.registrarActividad?.({
      matriculaId: matricula.id,
      materialId: null,
      tareaId,
      accion: "completo",
    });

    const mensaje = tiempoAgotado
      ? MENSAJES_TAREA.TIEMPO_AGOTADO
      : "Tu entrega fue enviada. Pendiente de calificación de preguntas abiertas.";

    return { mensaje, entrega, intentosRestantes: restantes };
  }

  async listarEntregasDeTarea(
    usuario: AuthenticatedUser,
    tareaId: string,
  ): Promise<EntregaResponse[]> {
    const tarea = await this.repository.findTarea(tareaId);
    if (!tarea) throw new NotFoundException(MENSAJES_TAREA.TAREA_NO_ENCONTRADA);

    const curso = await this.ctx.requerirCurso(tarea.cursoSeccionId);
    const esDocente = await this.ctx.esDocenteDelCurso(curso, usuario);
    const esDirectivo = this.ctx.esRolDeSeguimiento(usuario);
    if (!esDocente && !esDirectivo) {
      throw new ForbiddenException(MENSAJES_AULA_VIRTUAL.AULA_AJENA);
    }

    return this.repository.findEntregasDeTarea(tareaId);
  }

  async calificarEntrega(
    usuario: AuthenticatedUser,
    entregaId: string,
    dto: CalificarEntregaDto,
  ): Promise<{ mensaje: string; entrega: EntregaResponse }> {
    const entrega = await this.repository.findEntrega(entregaId);
    if (!entrega) throw new NotFoundException(MENSAJES_TAREA.ENTREGA_NO_ENCONTRADA);

    const tarea = await this.repository.findTarea(entrega.tareaId);
    if (!tarea) throw new NotFoundException(MENSAJES_TAREA.TAREA_NO_ENCONTRADA);

    const curso = await this.ctx.requerirCurso(tarea.cursoSeccionId);
    await this.ctx.exigirDocenteDelCurso(curso, usuario);
    if (tarea.periodoId) {
      this.ctx.exigirBimestreAbierto(await this.ctx.requerirPeriodo(tarea.periodoId));
    }

    if (dto.devolver) {
      if (!dto.retroalimentacion || !dto.retroalimentacion.trim()) {
        throw new BadRequestException(MENSAJES_TAREA.MOTIVO_DEVOLUCION_REQUERIDO);
      }
      const devuelta = await this.repository.devolverEntrega(
        entregaId,
        dto.retroalimentacion.trim(),
        usuario.id,
      );
      if (entrega.estudianteId) {
        await this.notificaciones.enviar({
          usuarioId: entrega.estudianteId,
          titulo: `Entrega devuelta en ${curso.cursoNombre}`,
          mensaje: `El docente devolvió tu entrega de «${tarea.titulo}»: ${dto.retroalimentacion.trim()}`,
          tipo: "alerta",
          enlaceUrl: `/admin/aula-virtual/${curso.id}`,
        });
      }
      return { mensaje: "Entrega devuelta para corrección.", entrega: devuelta };
    }

    let notaFinal = dto.nota;
    let respuestasActualizadas: Record<string, unknown> | null = entrega.respuestas;

    if (dto.calificacionesPreguntas && Object.keys(dto.calificacionesPreguntas).length > 0) {
      let sumaPtsObtenidos = 0;
      let sumaPtsPosibles = 0;
      const dictRespuestas: Record<string, unknown> = { ...(entrega.respuestas || {}) };

      for (const p of tarea.preguntas) {
        const ptsPregunta = p.puntaje || 1;
        sumaPtsPosibles += ptsPregunta;
        if (p.tipo === "respuesta_corta") {
          const califAbierta = dto.calificacionesPreguntas[p.id];
          const pts = califAbierta ? califAbierta.puntajeObtenido : 0;
          sumaPtsObtenidos += pts;
          const prev = (dictRespuestas[p.id] as Record<string, unknown> | undefined) || {};
          dictRespuestas[p.id] = {
            ...prev,
            puntajeObtenido: pts,
            calificada: true,
            comentario: califAbierta?.comentario,
          };
        } else {
          const cerrada = dictRespuestas[p.id] as { puntajeObtenido?: number } | undefined;
          sumaPtsObtenidos += cerrada?.puntajeObtenido || 0;
        }
      }

      respuestasActualizadas = dictRespuestas;
      notaFinal =
        sumaPtsPosibles > 0 ? Number(((sumaPtsObtenidos / sumaPtsPosibles) * 20).toFixed(2)) : 0;
    }

    if (notaFinal === undefined || notaFinal === null || notaFinal < 0 || notaFinal > 20) {
      throw new BadRequestException(MENSAJES_TAREA.NOTA_FUERA_DE_RANGO);
    }

    const calificada = await this.repository.calificarEntrega(entregaId, {
      nota: notaFinal,
      retroalimentacion: dto.retroalimentacion?.trim() ?? null,
      calificadaPorId: usuario.id,
      calificadaEn: new Date().toISOString(),
      respuestas: respuestasActualizadas,
    });

    if (entrega.estudianteId) {
      await this.notificaciones.enviar({
        usuarioId: entrega.estudianteId,
        titulo: `Tarea calificada en ${curso.cursoNombre}`,
        mensaje: `Tu entrega de «${tarea.titulo}» fue calificada con ${notaFinal.toFixed(2)}.`,
        tipo: "informacion",
        enlaceUrl: `/admin/aula-virtual/${curso.id}`,
      });
    }

    return { mensaje: "Entrega calificada exitosamente.", entrega: calificada };
  }

  async calificarDirecto(
    usuario: AuthenticatedUser,
    tareaId: string,
    dto: CalificarDirectoDto,
  ): Promise<{ mensaje: string; entrega: EntregaResponse }> {
    const tarea = await this.repository.findTarea(tareaId);
    if (!tarea) throw new NotFoundException(MENSAJES_TAREA.TAREA_NO_ENCONTRADA);

    const curso = await this.ctx.requerirCurso(tarea.cursoSeccionId);
    await this.ctx.exigirDocenteDelCurso(curso, usuario);
    if (tarea.periodoId) {
      this.ctx.exigirBimestreAbierto(await this.ctx.requerirPeriodo(tarea.periodoId));
    }
    if (dto.nota < 0 || dto.nota > 20) {
      throw new BadRequestException(MENSAJES_TAREA.NOTA_FUERA_DE_RANGO);
    }

    const entregaExistente = await this.repository.findEntregaActiva(tareaId, dto.matriculaId);
    const ahora = new Date().toISOString();

    const calificada = entregaExistente
      ? await this.repository.calificarEntrega(entregaExistente.id, {
          nota: dto.nota,
          retroalimentacion: dto.retroalimentacion?.trim() ?? null,
          calificadaPorId: usuario.id,
          calificadaEn: ahora,
        })
      : await this.repository.guardarEntrega({
          tareaId,
          matriculaId: dto.matriculaId,
          intento: 1,
          iniciadoEn: ahora,
          entregadaEn: ahora,
          texto: "Calificación manual directa / Entrega física",
          estado: "calificada",
          nota: dto.nota,
          retroalimentacion: dto.retroalimentacion?.trim() ?? null,
          calificadaPorId: usuario.id,
          calificadaEn: ahora,
        });

    const entregaCompleta = await this.repository.findEntrega(calificada.id);
    if (entregaCompleta?.estudianteId) {
      await this.notificaciones.enviar({
        usuarioId: entregaCompleta.estudianteId,
        titulo: `Tarea calificada en ${curso.cursoNombre}`,
        mensaje: `Tu calificación en «${tarea.titulo}» fue registrada con nota ${dto.nota.toFixed(2)}.`,
        tipo: "informacion",
        enlaceUrl: `/admin/aula-virtual/${curso.id}`,
      });
    }

    return { mensaje: "Calificación registrada exitosamente.", entrega: calificada };
  }
}
