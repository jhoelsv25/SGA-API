import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";
import { ComunicadosRepository } from "../repositories/comunicados.repository";
import { AvanceLecturaResponse, ComunicadoItem } from "../interfaces";
import { ComunicadoQueryDto, CrearComunicadoDto, PaginatedComunicadosResponseDto } from "../dto";

export interface UserContext {
  id: string;
  rol?: string;
}

@Injectable()
export class ComunicadosService {
  constructor(
    private readonly repository: ComunicadosRepository,
    private readonly auditService: AuditService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  async listar(
    user: UserContext,
    query?: ComunicadoQueryDto,
  ): Promise<PaginatedComunicadosResponseDto> {
    return this.repository.findByQuery(user.id, query);
  }

  async obtenerPorId(id: string, user: UserContext): Promise<ComunicadoItem> {
    const comunicado = await this.repository.findById(id);
    if (!comunicado) {
      throw new NotFoundException("El comunicado solicitado no existe.");
    }

    // Registro automático de lectura si el usuario actual es un destinatario
    if (comunicado.autorId !== user.id) {
      await this.repository.marcarLectura(id, user.id);
    }

    return {
      ...comunicado,
      leidoPorMi: true,
    };
  }

  async crear(
    dto: CrearComunicadoDto,
    user: UserContext,
    ip?: string,
  ): Promise<{ id: string; message: string }> {
    // 1. Validaciones de alcance del rol
    await this.validarAlcanceRol(user, dto.seccionId, dto.gradoId);

    // 2. Validación de vencimiento
    if (dto.venceEn) {
      const fechaVence = new Date(dto.venceEn);
      if (fechaVence <= new Date()) {
        throw new BadRequestException(
          "La fecha de vencimiento debe ser posterior a la publicación.",
        );
      }
    }

    const publicarInmediatamente = Boolean(dto.publicar);
    const ahoraIso = new Date().toISOString();

    // 3. Si se publica de inmediato, validar que existan destinatarios
    let destinatarios: Array<{ usuarioId: string }> = [];
    if (publicarInmediatamente) {
      destinatarios = await this.repository.findDestinatarios(
        dto.dirigidoA,
        dto.gradoId,
        dto.seccionId,
      );

      if (destinatarios.length === 0) {
        throw new BadRequestException("No hay destinatarios para el público y alcance elegidos.");
      }
    }

    // 4. Inserción en base de datos
    const inserted = await this.repository.insert({
      autorId: user.id,
      titulo: dto.titulo.trim(),
      contenido: dto.contenido.trim(),
      dirigidoA: dto.dirigidoA,
      gradoId: dto.gradoId,
      seccionId: dto.seccionId,
      prioridad: dto.prioridad || "normal",
      estado: publicarInmediatamente ? "publicado" : "borrador",
      adjuntoUrl: dto.adjuntoUrl,
      publicadoEn: publicarInmediatamente ? ahoraIso : null,
      venceEn: dto.venceEn,
    });

    // 5. Si se publicó, notificar a los destinatarios enlazados
    if (publicarInmediatamente) {
      await this.despacharNotificaciones(
        inserted.id,
        dto.titulo.trim(),
        dto.contenido.trim(),
        dto.prioridad || "normal",
        destinatarios.map((d) => d.usuarioId),
      );
    }

    // 6. Auditoría inmutable
    await this.auditService.log({
      usuarioId: user.id,
      accion: "crear",
      tabla: "comunicados",
      registroId: inserted.id,
      valorNuevo: {
        titulo: dto.titulo,
        estado: publicarInmediatamente ? "publicado" : "borrador",
        dirigidoA: dto.dirigidoA,
        destinatariosCount: destinatarios.length,
      },
      direccionIp: ip,
    });

    const message = publicarInmediatamente
      ? `Comunicado publicado para ${destinatarios.length} destinatarios.`
      : "Borrador de comunicado guardado con éxito.";

    return { id: inserted.id, message };
  }

  async publicar(
    id: string,
    user: UserContext,
    ip?: string,
  ): Promise<{ id: string; message: string }> {
    const comunicado = await this.repository.findById(id);
    if (!comunicado) {
      throw new NotFoundException("El comunicado solicitado no existe.");
    }

    if (comunicado.estado === "publicado") {
      throw new BadRequestException(
        "Un comunicado publicado no se puede editar. Archívelo y publique uno nuevo.",
      );
    }

    if (comunicado.autorId !== user.id) {
      throw new ForbiddenException("Solo el autor puede publicar este comunicado.");
    }

    // Validar alcance
    await this.validarAlcanceRol(
      user,
      comunicado.seccionId || undefined,
      comunicado.gradoId || undefined,
    );

    // Calcular destinatarios
    const destinatarios = await this.repository.findDestinatarios(
      comunicado.dirigidoA,
      comunicado.gradoId,
      comunicado.seccionId,
    );

    if (destinatarios.length === 0) {
      throw new BadRequestException("No hay destinatarios para el público y alcance elegidos.");
    }

    const ahoraIso = new Date().toISOString();
    await this.repository.updateEstado(id, "publicado", ahoraIso);

    // Despachar notificaciones a los destinatarios
    await this.despacharNotificaciones(
      id,
      comunicado.titulo,
      comunicado.contenido,
      comunicado.prioridad,
      destinatarios.map((d) => d.usuarioId),
    );

    // Auditoría
    await this.auditService.log({
      usuarioId: user.id,
      accion: "actualizar",
      tabla: "comunicados",
      registroId: id,
      valorAnterior: { estado: comunicado.estado },
      valorNuevo: {
        estado: "publicado",
        publicadoEn: ahoraIso,
        destinatariosCount: destinatarios.length,
      },
      direccionIp: ip,
    });

    return {
      id,
      message: `Comunicado publicado para ${destinatarios.length} destinatarios.`,
    };
  }

  async archivar(
    id: string,
    user: UserContext,
    ip?: string,
  ): Promise<{ id: string; message: string }> {
    const comunicado = await this.repository.findById(id);
    if (!comunicado) {
      throw new NotFoundException("El comunicado solicitado no existe.");
    }

    if (comunicado.autorId !== user.id) {
      throw new ForbiddenException("Solo el autor puede archivar este comunicado.");
    }

    await this.repository.updateEstado(id, "archivado");

    await this.auditService.log({
      usuarioId: user.id,
      accion: "actualizar",
      tabla: "comunicados",
      registroId: id,
      valorAnterior: { estado: comunicado.estado },
      valorNuevo: { estado: "archivado" },
      direccionIp: ip,
    });

    return { id, message: "Comunicado archivado exitosamente." };
  }

  async obtenerAvanceLectura(id: string, user: UserContext): Promise<AvanceLecturaResponse> {
    const comunicado = await this.repository.findById(id);
    if (!comunicado) {
      throw new NotFoundException("El comunicado no existe.");
    }

    if (comunicado.autorId !== user.id) {
      throw new ForbiddenException(
        "Solo el autor puede consultar el avance de lecturas de este comunicado.",
      );
    }

    const avance = await this.repository.obtenerAvanceLectura(id);
    if (!avance) {
      throw new NotFoundException("No se encontró información de lectura.");
    }

    return avance;
  }

  private async validarAlcanceRol(
    user: UserContext,
    seccionId?: string,
    gradoId?: string,
  ): Promise<void> {
    const rol = (user.rol || "").toLowerCase();

    // Si es docente / tutor con alcance de tutoría:
    if (rol === "docente" || rol.includes("tutor")) {
      if (!seccionId || gradoId) {
        throw new ForbiddenException("Solo puede enviar comunicados a su sección.");
      }

      const esTutor = await this.repository.esTutorDeSeccion(user.id, seccionId);
      if (!esTutor) {
        throw new ForbiddenException("Solo puede enviar comunicados a su sección.");
      }
    }
  }

  private async despacharNotificaciones(
    comunicadoId: string,
    titulo: string,
    contenido: string,
    prioridad: "normal" | "importante" | "urgente",
    destinatarioUserIds: string[],
  ): Promise<void> {
    const tipo = prioridad === "urgente" ? "alerta" : "informacion";
    const snippet = contenido.length > 140 ? `${contenido.substring(0, 137)}...` : contenido;

    // 1. Inserción en base de datos vinculada al comunicado
    await this.repository.registrarNotificacionesComunicado(
      comunicadoId,
      titulo,
      snippet,
      tipo,
      destinatarioUserIds,
    );

    // 2. Despacho por BullMQ / notificación interna
    for (const userId of destinatarioUserIds) {
      await this.notificacionesService
        .enviar({
          usuarioId: userId,
          titulo,
          mensaje: snippet,
          tipo,
          comunicadoId,
          enlaceUrl: `/admin/comunicados?id=${comunicadoId}`,
          canales: ["in_app"],
        })
        .catch(() => undefined);
    }
  }
}
