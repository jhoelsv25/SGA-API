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
import { MENSAJES_AULA_VIRTUAL, MENSAJES_TAREA } from "../constants";
import type {
  ActualizarTareaDto,
  CerrarTareaDto,
  CrearTareaDto,
  EntregaResponse,
  TareaResponse,
} from "../dto";
import type { CursoAula, PreguntaConOpciones, TareaFila } from "../interfaces";
import { AulaVirtualRepository } from "../repositories";
import { formatearFecha, puedenRevelarseRespuestas, validarPublicacionTarea } from "../utils";
import { AulaContextoHelper } from "./aula-contexto.helper";

/**
 * Servicio de dominio para gestión CRUD de tareas y evaluaciones,
 * banco de preguntas y consulta para docentes/estudiantes (RF-016).
 */
@Injectable()
export class AulaTareasService {
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

  async crearTarea(
    usuario: AuthenticatedUser,
    cursoSeccionId: string,
    dto: CrearTareaDto,
  ): Promise<{ mensaje: string; tarea: TareaResponse }> {
    const curso = await this.ctx.requerirCurso(cursoSeccionId);
    await this.ctx.exigirDocenteDelCurso(curso, usuario);

    const intentosMaximos =
      dto.tipo === "trabajo" || dto.tipo === "proyecto" ? 1 : (dto.intentosMaximos ?? 1);

    if (dto.publicar) {
      const val = validarPublicacionTarea(
        {
          tipo: dto.tipo,
          fechaLimite: dto.fechaLimite,
          preguntas: dto.preguntas?.map((p, idx) => ({
            id: p.id ?? `temp-${idx}`,
            tipo: p.tipo,
            puntaje: p.puntaje,
            enunciado: p.enunciado,
            orden: p.orden,
            opciones: p.opciones,
          })),
        },
        new Date().toISOString(),
      );
      if (!val.valida) throw new BadRequestException(val.error);
    }

    let periodoId = dto.periodoId;
    if (!periodoId && dto.unidadId) {
      const unidad = await this.ctx.requerirUnidad(dto.unidadId);
      periodoId = unidad.periodoId ?? undefined;
    }
    if (!periodoId) {
      const per = await this.ctx.periodoEnCursoDelAnio();
      periodoId = per.id;
    }

    const tarea = await this.repository.crearTarea({
      cursoSeccionId,
      periodoId,
      unidadId: dto.unidadId,
      sesionClaseId: dto.sesionClaseId,
      titulo: dto.titulo.trim(),
      instrucciones: dto.instrucciones?.trim() || null,
      tipo: dto.tipo,
      fechaLimite: dto.fechaLimite,
      permiteEntregaTardia: dto.permiteEntregaTardia ?? false,
      intentosMaximos,
      limiteTiempoMinutos: dto.limiteTiempoMinutos ?? null,
      calculoNotaIntentos: dto.calculoNotaIntentos ?? "mas_alta",
      revelarRespuestas: dto.revelarRespuestas ?? "al_terminar_intentos",
      tiposArchivo: dto.tiposArchivo ?? null,
      estado: dto.publicar ? "publicada" : "borrador",
    });

    if (dto.preguntas && dto.preguntas.length > 0) {
      await this.repository.guardarPreguntasTarea(tarea.id, this.mapearPreguntas(dto.preguntas));
    }

    if (dto.publicar) {
      const publicada = await this.repository.publicarTarea(tarea.id, new Date().toISOString());
      await this.avisarAEstudiantesTarea(curso, publicada);
      await this.ctx.auditar("actualizar", "tareas", tarea.id, usuario.id, null, {
        estado: "publicada",
      });
      return {
        mensaje: MENSAJES_TAREA.PUBLICADA,
        tarea: await this.armarTarea(publicada, usuario),
      };
    }

    await this.ctx.auditar("crear", "tareas", tarea.id, usuario.id, null, { titulo: tarea.titulo });
    return {
      mensaje: "Tarea guardada como borrador.",
      tarea: await this.armarTarea(tarea, usuario),
    };
  }

  async publicarTarea(
    usuario: AuthenticatedUser,
    tareaId: string,
  ): Promise<{ mensaje: string; tarea: TareaResponse }> {
    const tareaConP = await this.repository.findTarea(tareaId);
    if (!tareaConP) throw new NotFoundException(MENSAJES_TAREA.TAREA_NO_ENCONTRADA);

    const curso = await this.ctx.requerirCurso(tareaConP.cursoSeccionId);
    await this.ctx.exigirDocenteDelCurso(curso, usuario);

    const val = validarPublicacionTarea(
      { tipo: tareaConP.tipo, fechaLimite: tareaConP.fechaLimite, preguntas: tareaConP.preguntas },
      new Date().toISOString(),
    );
    if (!val.valida) throw new BadRequestException(val.error);

    const publicada = await this.repository.publicarTarea(tareaId, new Date().toISOString());
    await this.avisarAEstudiantesTarea(curso, publicada);
    await this.ctx.auditar(
      "actualizar",
      "tareas",
      tareaId,
      usuario.id,
      { estado: tareaConP.estado },
      { estado: "publicada" },
    );

    return { mensaje: MENSAJES_TAREA.PUBLICADA, tarea: await this.armarTarea(publicada, usuario) };
  }

  async actualizarTarea(
    usuario: AuthenticatedUser,
    tareaId: string,
    dto: ActualizarTareaDto,
  ): Promise<{ mensaje: string; tarea: TareaResponse }> {
    const tarea = await this.repository.findTarea(tareaId);
    if (!tarea) throw new NotFoundException(MENSAJES_TAREA.TAREA_NO_ENCONTRADA);

    const curso = await this.ctx.requerirCurso(tarea.cursoSeccionId);
    await this.ctx.exigirDocenteDelCurso(curso, usuario);
    if (tarea.estado === "cerrada") {
      throw new BadRequestException("La tarea está cerrada y no se puede modificar.");
    }

    const actualizada = await this.repository.actualizarTarea(tareaId, {
      titulo: dto.titulo?.trim(),
      instrucciones: dto.instrucciones?.trim(),
      unidadId: dto.unidadId,
      fechaLimite: dto.fechaLimite,
      permiteEntregaTardia: dto.permiteEntregaTardia,
      intentosMaximos: dto.intentosMaximos,
      limiteTiempoMinutos: dto.limiteTiempoMinutos,
      calculoNotaIntentos: dto.calculoNotaIntentos,
      revelarRespuestas: dto.revelarRespuestas,
      tiposArchivo: dto.tiposArchivo,
    });

    if (dto.preguntas) {
      await this.repository.guardarPreguntasTarea(tareaId, this.mapearPreguntas(dto.preguntas));
    }

    await this.ctx.auditar("actualizar", "tareas", tareaId, usuario.id, null, {
      titulo: actualizada.titulo,
    });
    return { mensaje: "Tarea actualizada.", tarea: await this.armarTarea(actualizada, usuario) };
  }

  async cerrarTarea(
    usuario: AuthenticatedUser,
    tareaId: string,
    dto?: CerrarTareaDto,
  ): Promise<{ mensaje: string; tarea: TareaResponse }> {
    const tarea = await this.repository.findTarea(tareaId);
    if (!tarea) throw new NotFoundException(MENSAJES_TAREA.TAREA_NO_ENCONTRADA);

    const curso = await this.ctx.requerirCurso(tarea.cursoSeccionId);
    await this.ctx.exigirDocenteDelCurso(curso, usuario);

    const ahora = new Date().toISOString();
    const cerrada = await this.repository.cerrarTarea(tareaId, ahora);

    if (dto?.asignarCeroSinEntrega) {
      const estudiantes =
        (await this.repository.listarEstudiantesDeSeccion?.(curso.seccionId)) ?? [];
      for (const est of estudiantes) {
        const entregas =
          (await this.repository.findEntregasDeEstudiante?.(tareaId, est.matriculaId)) ?? [];
        const tieneEntregaValida = entregas.some(
          (e) => e.estado === "entregada" || e.estado === "calificada",
        );
        if (!tieneEntregaValida) {
          const intentoNum = entregas.length > 0 ? entregas[entregas.length - 1].intento : 1;
          await this.repository.guardarEntrega?.({
            tareaId,
            matriculaId: est.matriculaId,
            intento: intentoNum,
            entregadaEn: ahora,
            estado: "calificada",
            nota: 0,
            retroalimentacion: "Sin entrega al cierre del plazo.",
            calificadaPorId: usuario.id,
            calificadaEn: ahora,
          });
        }
      }
    }

    return {
      mensaje: dto?.asignarCeroSinEntrega
        ? "Tarea cerrada y nota 0 asignada a quienes no entregaron."
        : "Tarea cerrada.",
      tarea: await this.armarTarea(cerrada, usuario),
    };
  }

  async eliminarTarea(usuario: AuthenticatedUser, tareaId: string): Promise<{ mensaje: string }> {
    const tarea = await this.repository.findTarea(tareaId);
    if (!tarea) throw new NotFoundException(MENSAJES_TAREA.TAREA_NO_ENCONTRADA);

    const curso = await this.ctx.requerirCurso(tarea.cursoSeccionId);
    await this.ctx.exigirDocenteDelCurso(curso, usuario);

    await this.repository.eliminarTarea(tareaId);
    return { mensaje: "Tarea eliminada." };
  }

  async listarTareas(
    usuario: AuthenticatedUser,
    cursoSeccionId: string,
    filtro: { unidadId?: string; periodoId?: string; estudianteId?: string },
  ): Promise<TareaResponse[]> {
    const curso = await this.ctx.requerirCurso(cursoSeccionId);
    const esDocente = await this.ctx.esDocenteDelCurso(curso, usuario);
    const esAdmin = this.ctx.esRolDeSeguimiento(usuario);
    const soloPublicadas = !(esDocente || esAdmin);

    let matriculaId: string | undefined;
    if (usuario.role === "Estudiante") {
      const mat = await this.repository.findMatriculaDeEstudiante(
        curso.seccionId,
        usuario.personaId,
      );
      if (!mat) throw new ForbiddenException(MENSAJES_AULA_VIRTUAL.SIN_ACCESO_AULA);
      matriculaId = mat.id;
    } else if (usuario.role === "Apoderado") {
      matriculaId = await this.ctx.resolverHijoApoderado(
        usuario.personaId,
        curso.seccionId,
        filtro.estudianteId,
      );
    } else if (!esDocente && !esAdmin) {
      throw new ForbiddenException(MENSAJES_AULA_VIRTUAL.SIN_ACCESO_AULA);
    }

    const tareas = await this.repository.listarTareas(cursoSeccionId, {
      soloPublicadas,
      unidadId: filtro.unidadId,
      periodoId: filtro.periodoId,
    });

    return Promise.all(tareas.map((t) => this.armarTarea(t, usuario, matriculaId)));
  }

  async obtenerDetalleTarea(
    usuario: AuthenticatedUser,
    tareaId: string,
    estudiantePersonaId?: string,
  ): Promise<TareaResponse> {
    const tarea = await this.repository.findTarea(tareaId);
    if (!tarea) throw new NotFoundException(MENSAJES_TAREA.TAREA_NO_ENCONTRADA);

    const curso = await this.ctx.requerirCurso(tarea.cursoSeccionId);
    const esDocente = await this.ctx.esDocenteDelCurso(curso, usuario);
    const esAdmin = this.ctx.esRolDeSeguimiento(usuario);
    if (!esDocente && !esAdmin && tarea.estado === "borrador") {
      throw new NotFoundException(MENSAJES_TAREA.TAREA_NO_ENCONTRADA);
    }

    const matriculaId =
      usuario.role === "Apoderado"
        ? await this.ctx.resolverHijoApoderado(
            usuario.personaId,
            curso.seccionId,
            estudiantePersonaId,
          )
        : (
            await this.repository.findMatriculaDeEstudiante(
              curso.seccionId,
              estudiantePersonaId || usuario.personaId,
            )
          )?.id;

    return this.armarTarea(tarea, usuario, matriculaId);
  }

  private mapearPreguntas(
    preguntas: NonNullable<CrearTareaDto["preguntas"]>,
  ): Parameters<AulaVirtualRepository["guardarPreguntasTarea"]>[1] {
    return preguntas.map((p, idx) => ({
      enunciado: p.enunciado.trim(),
      tipo: p.tipo,
      puntaje: p.puntaje,
      orden: p.orden ?? idx + 1,
      opciones: p.opciones?.map((o, oIdx) => ({
        texto: o.texto.trim(),
        esCorrecta: o.esCorrecta,
        orden: o.orden ?? oIdx + 1,
      })),
    }));
  }

  private async armarTarea(
    tarea: TareaFila,
    usuario?: AuthenticatedUser,
    matriculaId?: string,
  ): Promise<TareaResponse> {
    const tareaConP = await this.repository.findTarea(tarea.id);
    let miEntrega: EntregaResponse | null = null;
    let intentosRestantes = tarea.intentosMaximos;

    if (matriculaId) {
      const entregas = await this.repository.findEntregasDeEstudiante(tarea.id, matriculaId);
      intentosRestantes = Math.max(0, tarea.intentosMaximos - entregas.length);
      const activa = entregas[entregas.length - 1];
      if (activa) miEntrega = activa;
    }

    let preguntas: PreguntaConOpciones[] | undefined = tareaConP?.preguntas;
    if (preguntas && (usuario?.role === "Estudiante" || usuario?.role === "Apoderado")) {
      const intentoNum = miEntrega ? miEntrega.intento : 0;
      const revelar = puedenRevelarseRespuestas(
        tarea.revelarRespuestas,
        intentoNum,
        tarea.intentosMaximos,
        tarea.fechaLimite,
        new Date().toISOString(),
      );
      if (!revelar) {
        preguntas = preguntas.map((p) => ({
          ...p,
          opciones: p.opciones.map((o) => ({
            id: o.id,
            texto: o.texto,
            orden: o.orden,
            esCorrecta: false,
          })),
        }));
      }
    }

    return {
      id: tarea.id,
      cursoSeccionId: tarea.cursoSeccionId,
      periodoId: tarea.periodoId,
      unidadId: tarea.unidadId,
      sesionClaseId: tarea.sesionClaseId,
      titulo: tarea.titulo,
      instrucciones: tarea.instrucciones,
      tipo: tarea.tipo,
      puntajeMaximo: tarea.puntajeMaximo,
      publicadaEn: tarea.publicadaEn,
      fechaLimite: tarea.fechaLimite,
      permiteEntregaTardia: tarea.permiteEntregaTardia,
      intentosMaximos: tarea.intentosMaximos,
      limiteTiempoMinutos: tarea.limiteTiempoMinutos,
      calculoNotaIntentos: tarea.calculoNotaIntentos,
      revelarRespuestas: tarea.revelarRespuestas,
      tiposArchivo: tarea.tiposArchivo,
      estado: tarea.estado,
      preguntas,
      miEntrega,
      intentosRestantes,
    };
  }

  private async avisarAEstudiantesTarea(curso: CursoAula, tarea: TareaFila): Promise<void> {
    const destinatarios = await this.repository.usuariosEstudiantesDeSeccion(
      curso.seccionId,
      curso.anioAcademicoId,
    );
    await Promise.all(
      destinatarios.map((usuarioId) =>
        this.notificaciones.enviar({
          usuarioId,
          titulo: `Nueva tarea en ${curso.cursoNombre}`,
          mensaje: `Se publicó la tarea «${tarea.titulo}». Fecha límite: ${formatearFecha(tarea.fechaLimite.slice(0, 10))}.`,
          tipo: "informacion",
          enlaceUrl: `/admin/aula-virtual/${curso.id}`,
        }),
      ),
    );
  }
}
