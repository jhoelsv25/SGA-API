import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";
import { ConductaRepository } from "../repositories/conducta.repository";
import { LIMITE_HORAS_CORRECCION, MENSAJES_CONDUCTA } from "../constants";
import {
  IncidenciaItem,
  ObservacionItem,
  ResumenConductaEstudiante,
  UserContext,
} from "../interfaces";
import {
  ActualizarIncidenciaDto,
  AnularIncidenciaDto,
  CrearIncidenciaDto,
  CrearObservacionDto,
  QueryIncidenciasDto,
  QueryObservacionesDto,
} from "../dto";

@Injectable()
export class ConductaService {
  constructor(
    private readonly repository: ConductaRepository,
    private readonly auditService: AuditService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  /**
   * Registra una incidencia de conducta (mérito o falta) y notifica al apoderado.
   */
  async registrarIncidencia(
    dto: CrearIncidenciaDto,
    user: UserContext,
    ip?: string,
  ): Promise<{ id: string; message: string }> {
    // 1. Validar fecha no futura
    const hoy = new Date().toISOString().slice(0, 10);
    if (dto.fecha > hoy) {
      throw new BadRequestException(MENSAJES_CONDUCTA.FECHA_FUTURA);
    }

    // 2. Validar coherencia tipo y gravedad
    if (dto.tipo === "falta" && !dto.gravedad) {
      throw new BadRequestException(MENSAJES_CONDUCTA.FALTA_SIN_GRAVEDAD);
    }
    if (dto.tipo === "merito" && dto.gravedad) {
      throw new BadRequestException(MENSAJES_CONDUCTA.MERITO_CON_GRAVEDAD);
    }

    // 3. Validar existencia de matrícula
    const matInfo = await this.repository.obtenerInfoMatricula(dto.matriculaId);
    if (!matInfo) {
      throw new NotFoundException(MENSAJES_CONDUCTA.ESTUDIANTE_NO_ENCONTRADO);
    }

    // 4. Validar alcance por rol (docente acotado a sus secciones)
    const rol = (user.rol || "").toLowerCase();
    const esAdminODirectivo = ["admin", "administrador", "director", "subdirector"].includes(rol);

    if (rol === "estudiante" || rol === "apoderado") {
      throw new ForbiddenException(MENSAJES_CONDUCTA.FUERA_DE_ALCANCE);
    }

    if (!esAdminODirectivo) {
      const autorizado = await this.repository.esDocenteDeSeccion(user.id, matInfo.seccionId);
      if (!autorizado) {
        throw new ForbiddenException(MENSAJES_CONDUCTA.FUERA_DE_ALCANCE);
      }
    }

    // 5. Deducir automáticamente el periodo / bimestre
    const periodoId = await this.repository.deducirPeriodoId(dto.matriculaId, dto.fecha);

    // 6. Determinar si hay apoderado principal a notificar
    const tieneApoderado = Boolean(matInfo.apoderadoPrincipalUsuarioId);

    // 7. Persistir la incidencia
    const id = await this.repository.crearIncidencia(dto, periodoId, user.id, tieneApoderado);

    // 8. Despachar notificación automática al apoderado principal (RF-019)
    if (tieneApoderado && matInfo.apoderadoPrincipalUsuarioId) {
      const tituloNotif =
        dto.tipo === "merito"
          ? "Reconocimiento de mérito registrado"
          : `Registro de falta (${dto.gravedad || "leve"})`;

      const mensajeNotif = `${matInfo.nombreCompleto}: ${dto.categoria} - ${dto.descripcion}`;

      await this.notificacionesService
        .enviar({
          usuarioId: matInfo.apoderadoPrincipalUsuarioId,
          titulo: tituloNotif,
          mensaje: mensajeNotif,
          tipo: dto.tipo === "merito" ? "informacion" : "alerta",
          enlaceUrl: `/admin/conducta?matriculaId=${dto.matriculaId}`,
          canales: ["in_app"],
        })
        .catch(() => undefined);
    }

    // 9. Registrar auditoría inmutable
    await this.auditService.log({
      usuarioId: user.id,
      accion: "crear",
      tabla: "incidencias_conducta",
      registroId: id,
      valorNuevo: {
        matriculaId: dto.matriculaId,
        tipo: dto.tipo,
        categoria: dto.categoria,
        gravedad: dto.gravedad ?? null,
        apoderadoNotificado: tieneApoderado,
      },
      direccionIp: ip,
    });

    return {
      id,
      message: tieneApoderado
        ? MENSAJES_CONDUCTA.INCIDENCIA_REGISTRADA
        : MENSAJES_CONDUCTA.INCIDENCIA_REGISTRADA_SIN_NOTIFICAR,
    };
  }

  /**
   * Corrige una incidencia dentro del plazo de 24 horas.
   */
  async corregirIncidencia(
    id: string,
    dto: ActualizarIncidenciaDto,
    user: UserContext,
    ip?: string,
  ): Promise<{ id: string; message: string }> {
    const incidencia = await this.repository.obtenerIncidenciaPorId(id);
    if (!incidencia) {
      throw new NotFoundException(MENSAJES_CONDUCTA.INCIDENCIA_NO_ENCONTRADA);
    }

    // Validar plazo de 24 horas
    const creadoEn = new Date(incidencia.creadoEn).getTime();
    const ahora = Date.now();
    const diffHoras = (ahora - creadoEn) / (1000 * 60 * 60);

    if (diffHoras > LIMITE_HORAS_CORRECCION) {
      throw new BadRequestException(MENSAJES_CONDUCTA.CORRECCION_FUERA_DE_PLAZO);
    }

    // Validar que sea el autor original o administrador
    const rol = (user.rol || "").toLowerCase();
    if (incidencia.registradoPorId !== user.id && !["admin", "administrador"].includes(rol)) {
      throw new ForbiddenException("Solo quien registró la incidencia puede corregirla.");
    }

    await this.repository.actualizarIncidencia(id, dto);

    await this.auditService.log({
      usuarioId: user.id,
      accion: "actualizar",
      tabla: "incidencias_conducta",
      registroId: id,
      valorNuevo: { ...dto },
      valorAnterior: { ...incidencia },
      direccionIp: ip,
    });

    return {
      id,
      message: "Incidencia corregida exitosamente.",
    };
  }

  /**
   * Anula una incidencia con motivo obligatorio.
   */
  async anularIncidencia(
    id: string,
    dto: AnularIncidenciaDto,
    user: UserContext,
    ip?: string,
  ): Promise<{ id: string; message: string }> {
    if (!dto.motivo || !dto.motivo.trim()) {
      throw new BadRequestException(MENSAJES_CONDUCTA.ANULACION_SIN_MOTIVO);
    }

    const incidencia = await this.repository.obtenerIncidenciaPorId(id);
    if (!incidencia) {
      throw new NotFoundException(MENSAJES_CONDUCTA.INCIDENCIA_NO_ENCONTRADA);
    }

    const rol = (user.rol || "").toLowerCase();
    if (
      incidencia.registradoPorId !== user.id &&
      !["admin", "administrador", "director", "subdirector"].includes(rol)
    ) {
      throw new ForbiddenException(
        "Solo quien registró la incidencia o un directivo puede anularla.",
      );
    }

    // Registro inmutable en bitácora antes de anular
    await this.auditService.log({
      usuarioId: user.id,
      accion: "eliminar",
      tabla: "incidencias_conducta",
      registroId: id,
      valorAnterior: {
        ...incidencia,
        motivoAnulacion: dto.motivo,
      },
      direccionIp: ip,
    });

    await this.repository.eliminarIncidencia(id);

    return {
      id,
      message: "Incidencia anulada exitosamente.",
    };
  }

  /**
   * Registra una observación tutorial o psicopedagógica.
   */
  async registrarObservacion(
    dto: CrearObservacionDto,
    user: UserContext,
    ip?: string,
  ): Promise<{ id: string; message: string }> {
    const hoy = new Date().toISOString().slice(0, 10);
    if (dto.fecha > hoy) {
      throw new BadRequestException(MENSAJES_CONDUCTA.FECHA_FUTURA);
    }

    const matInfo = await this.repository.obtenerInfoMatricula(dto.matriculaId);
    if (!matInfo) {
      throw new NotFoundException(MENSAJES_CONDUCTA.ESTUDIANTE_NO_ENCONTRADO);
    }

    const rol = (user.rol || "").toLowerCase();
    const esAdminODirectivo = ["admin", "administrador", "director", "subdirector"].includes(rol);

    if (rol === "estudiante" || rol === "apoderado") {
      throw new ForbiddenException(MENSAJES_CONDUCTA.FUERA_DE_ALCANCE);
    }

    if (!esAdminODirectivo) {
      const autorizado = await this.repository.esDocenteDeSeccion(user.id, matInfo.seccionId);
      if (!autorizado) {
        throw new ForbiddenException(MENSAJES_CONDUCTA.FUERA_DE_ALCANCE);
      }
    }

    const id = await this.repository.crearObservacion(dto, user.id);

    await this.auditService.log({
      usuarioId: user.id,
      accion: "crear",
      tabla: "observaciones_estudiante",
      registroId: id,
      valorNuevo: {
        matriculaId: dto.matriculaId,
        tipo: dto.tipo,
        esConfidencial: dto.esConfidencial,
      },
      direccionIp: ip,
    });

    return {
      id,
      message: "Observación registrada exitosamente.",
    };
  }

  /**
   * Obtiene una observación verificando los permisos de confidencialidad.
   */
  async obtenerObservacionPorId(id: string, user: UserContext): Promise<ObservacionItem> {
    const obs = await this.repository.obtenerObservacionPorId(id);
    if (!obs) {
      throw new NotFoundException(MENSAJES_CONDUCTA.OBSERVACION_NO_ENCONTRADA);
    }

    const tieneAcceso = await this.validarAccesoObservacion(obs, user);
    if (!tieneAcceso) {
      throw new ForbiddenException(MENSAJES_CONDUCTA.SIN_ACCESO_OBSERVACION);
    }

    return obs;
  }

  /**
   * Valida si un usuario tiene acceso a consultar una observación según su nivel de confidencialidad.
   */
  async validarAccesoObservacion(obs: ObservacionItem, user: UserContext): Promise<boolean> {
    const rol = (user.rol || "").toLowerCase();

    // Directores, subdirectores y administradores siempre ven todas las observaciones
    if (["admin", "administrador", "director", "subdirector"].includes(rol)) {
      return true;
    }

    // Quien registró la observación siempre la ve
    if (obs.registradoPorId === user.id) {
      return true;
    }

    // Usuarios con permiso explícito de ver confidenciales (ej. Psicología)
    if (user.permisos?.includes("observaciones.ver_confidenciales")) {
      return true;
    }

    const matInfo = await this.repository.obtenerInfoMatricula(obs.matriculaId);
    if (!matInfo) return false;

    // El propio estudiante ve sus observaciones (v2.0, P-17)
    if (matInfo.estudianteUsuarioId && matInfo.estudianteUsuarioId === user.id) {
      return true;
    }
    if (rol === "estudiante") {
      const esEstudiante = await this.repository.esEstudianteDeMatricula(user.id, obs.matriculaId);
      if (esEstudiante) return true;
    }

    // Los apoderados del estudiante ven las observaciones
    if (rol === "apoderado") {
      const esApoderado = await this.repository.esApoderadoDeEstudiante(user.id, obs.matriculaId);
      if (esApoderado) return true;
    }

    // El tutor de la sección ve las observaciones
    if (matInfo.tutorUsuarioId && matInfo.tutorUsuarioId === user.id) {
      return true;
    }

    // Si la observación NO es confidencial, la ven los docentes de la sección
    if (!obs.esConfidencial) {
      const esDocente = await this.repository.esDocenteDeSeccion(user.id, matInfo.seccionId);
      if (esDocente) return true;
    }

    return false;
  }

  /**
   * Lista incidencias con filtros y validación de acceso por rol.
   */
  async listarIncidencias(
    dto: QueryIncidenciasDto,
    user: UserContext,
  ): Promise<{ data: IncidenciaItem[]; nextCursor: string | null; hasMore: boolean }> {
    const rol = (user.rol || "").toLowerCase();

    // Control de acceso para apoderado
    if (rol === "apoderado") {
      if (!dto.matriculaId) {
        const matriculasHijos = await this.repository.obtenerMatriculasDeUsuario?.(
          user.id,
          "apoderado",
        );
        if (!matriculasHijos?.length) {
          return { data: [], nextCursor: null, hasMore: false };
        }
        dto = { ...dto, matriculaId: matriculasHijos[0] };
      } else {
        const esHijo = await this.repository.esApoderadoDeEstudiante(user.id, dto.matriculaId);
        if (!esHijo) {
          throw new ForbiddenException(MENSAJES_CONDUCTA.SIN_ACCESO_ESTUDIANTE);
        }
      }
    }

    // Control de acceso para estudiante
    if (rol === "estudiante") {
      if (!dto.matriculaId) {
        const matriculasPropias = await this.repository.obtenerMatriculasDeUsuario?.(
          user.id,
          "estudiante",
        );
        if (!matriculasPropias?.length) {
          return { data: [], nextCursor: null, hasMore: false };
        }
        dto = { ...dto, matriculaId: matriculasPropias[0] };
      } else {
        const esSuyo = await this.repository.esEstudianteDeMatricula(user.id, dto.matriculaId);
        if (!esSuyo) {
          throw new ForbiddenException(MENSAJES_CONDUCTA.SIN_ACCESO_ESTUDIANTE);
        }
      }
    }

    return this.repository.listarIncidencias(dto);
  }

  /**
   * Lista observaciones filtrando confidenciales según permisos del usuario.
   */
  async listarObservaciones(
    dto: QueryObservacionesDto,
    user: UserContext,
  ): Promise<{ data: ObservacionItem[]; nextCursor: string | null; hasMore: boolean }> {
    const rol = (user.rol || "").toLowerCase();

    if (rol === "apoderado") {
      if (!dto.matriculaId) {
        const matriculasHijos = await this.repository.obtenerMatriculasDeUsuario?.(
          user.id,
          "apoderado",
        );
        if (!matriculasHijos?.length) {
          return { data: [], nextCursor: null, hasMore: false };
        }
        dto = { ...dto, matriculaId: matriculasHijos[0] };
      } else {
        const esHijo = await this.repository.esApoderadoDeEstudiante(user.id, dto.matriculaId);
        if (!esHijo) {
          throw new ForbiddenException(MENSAJES_CONDUCTA.SIN_ACCESO_ESTUDIANTE);
        }
      }
    }

    if (rol === "estudiante") {
      if (!dto.matriculaId) {
        const matriculasPropias = await this.repository.obtenerMatriculasDeUsuario?.(
          user.id,
          "estudiante",
        );
        if (!matriculasPropias?.length) {
          return { data: [], nextCursor: null, hasMore: false };
        }
        dto = { ...dto, matriculaId: matriculasPropias[0] };
      } else {
        const esSuyo = await this.repository.esEstudianteDeMatricula(user.id, dto.matriculaId);
        if (!esSuyo) {
          throw new ForbiddenException(MENSAJES_CONDUCTA.SIN_ACCESO_ESTUDIANTE);
        }
      }
    }

    const result = await this.repository.listarObservaciones(dto);

    // Filtrar aquellas confidenciales a las que no tenga acceso
    const filtradas: ObservacionItem[] = [];
    for (const obs of result.data) {
      const puedeVer = await this.validarAccesoObservacion(obs, user);
      if (puedeVer) {
        filtradas.push(obs);
      }
    }

    return {
      data: filtradas,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };
  }

  /**
   * Obtiene el resumen de conducta y métricas por bimestre para la ficha del estudiante.
   */
  async obtenerResumenConducta(
    matriculaId: string,
    user: UserContext,
  ): Promise<ResumenConductaEstudiante> {
    const rol = (user.rol || "").toLowerCase();

    if (rol === "apoderado") {
      const esHijo = await this.repository.esApoderadoDeEstudiante(user.id, matriculaId);
      if (!esHijo) {
        throw new ForbiddenException(MENSAJES_CONDUCTA.SIN_ACCESO_ESTUDIANTE);
      }
    }

    if (rol === "estudiante") {
      const esSuyo = await this.repository.esEstudianteDeMatricula(user.id, matriculaId);
      if (!esSuyo) {
        throw new ForbiddenException(MENSAJES_CONDUCTA.SIN_ACCESO_ESTUDIANTE);
      }
    }

    return this.repository.obtenerResumenConducta(matriculaId);
  }
}
