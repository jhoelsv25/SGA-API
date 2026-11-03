import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ConfigService } from "@nestjs/config";
import type { AuthenticatedUser, JwtPayload } from "../../auth/interfaces/jwt-payload.interface";
import { AuthRepository } from "../../auth/repositories/auth.repository";
import { getJwtSecret } from "../../auth/utils/jwt-secret.util";
import type { MensajeChatFila } from "../interfaces";
import { AulaVirtualRepository } from "../repositories";

interface SocketData {
  user?: AuthenticatedUser;
}

type ChatSocket = Socket<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  SocketData
>;

@WebSocketGateway({
  namespace: "/chat-aula",
  cors: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Permitir conexiones desde cualquier origen configurado (local / frontend)
      callback(null, true);
    },
    credentials: true,
  },
})
export class ChatAulaGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatAulaGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authRepository: AuthRepository,
    private readonly aulaRepository: AulaVirtualRepository,
  ) {}

  async handleConnection(client: ChatSocket) {
    try {
      const token = this.extraerToken(client);
      if (!token) {
        this.logger.warn(`Conexión rechazada (sin token): socketId=${client.id}`);
        client.disconnect();
        return;
      }

      const secret = getJwtSecret(this.configService);

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, { secret });
      const user = await this.authRepository.findUserById(payload.sub);

      if (!user || user.estado !== "activo" || user.eliminadoEn !== null) {
        this.logger.warn(`Conexión rechazada (usuario inactivo): sub=${payload.sub}`);
        client.disconnect();
        return;
      }

      const roles = await this.authRepository.findUserRoles(user.id);
      const activeRole = roles.find((r) => r.rolId === payload.roleId);
      const authUser: AuthenticatedUser = {
        id: user.id,
        username: user.nombreUsuario,
        roleId: payload.roleId,
        role: activeRole?.nombre ?? payload.role,
        personaId: user.personaId,
      };

      client.data.user = authUser;
      this.logger.log(`Cliente conectado a /chat-aula: ${authUser.username} (${client.id})`);
    } catch (error) {
      this.logger.warn(`Error de autenticación WebSocket: ${(error as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: ChatSocket) {
    this.logger.log(`Cliente desconectado de /chat-aula: ${client.id}`);
  }

  @SubscribeMessage("unirse_sala")
  async handleUnirseSala(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() data: { cursoSeccionId: string },
  ) {
    const user = client.data.user;
    if (!user || !data?.cursoSeccionId) {
      return { ok: false, mensaje: "No autorizado o curso inválido" };
    }

    const curso = await this.aulaRepository.findCurso(data.cursoSeccionId);
    if (!curso) {
      return { ok: false, mensaje: "Curso no encontrado" };
    }

    const esDirectivo = ["Administrador", "Director", "Subdirector"].includes(user.role);
    let tieneAcceso = esDirectivo;
    if (!tieneAcceso && curso.docenteId) {
      const docenteId = await this.aulaRepository.findDocenteIdPorPersona(user.personaId);
      tieneAcceso = docenteId === curso.docenteId;
    }
    if (!tieneAcceso) {
      const matricula = await this.aulaRepository.obtenerMatriculaActivaEstudiante(
        user.personaId,
        curso.seccionId,
      );
      tieneAcceso = Boolean(matricula);
    }
    if (!tieneAcceso) {
      return { ok: false, mensaje: "No participa en esta aula virtual." };
    }

    // Unirse a la sala del curso
    const roomName = `curso_${data.cursoSeccionId}`;
    await client.join(roomName);
    this.logger.log(`Usuario ${user.username} se unió a sala ${roomName}`);

    return { ok: true, sala: data.cursoSeccionId };
  }

  @SubscribeMessage("salir_sala")
  async handleSalirSala(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { cursoSeccionId: string },
  ) {
    if (data?.cursoSeccionId) {
      const roomName = `curso_${data.cursoSeccionId}`;
      await client.leave(roomName);
    }
    return { ok: true };
  }

  /**
   * Emite un mensaje nuevo a todos los usuarios conectados en la sala del curso.
   */
  emitirNuevoMensaje(cursoSeccionId: string, mensaje: MensajeChatFila) {
    if (!this.server) return;
    const roomName = `curso_${cursoSeccionId}`;
    this.server.to(roomName).emit("chat:nuevo_mensaje", mensaje);
    this.logger.log(`Mensaje emitido vía WebSocket a ${roomName} (id: ${mensaje.id})`);
  }

  /**
   * Emite evento de moderación (ocultado o restaurado) a todos los usuarios de la sala.
   */
  emitirMensajeModerado(cursoSeccionId: string, mensajeId: string, vigente: boolean) {
    if (!this.server) return;
    const roomName = `curso_${cursoSeccionId}`;
    this.server.to(roomName).emit("chat:mensaje_moderado", { id: mensajeId, vigente });
    this.logger.log(
      `Evento moderación emitido a ${roomName}: mensaje ${mensajeId} vigente=${vigente}`,
    );
  }

  private extraerToken(client: Socket): string | null {
    // 1. Auth payload del handshake (socket.io auth: { token })
    if (client.handshake.auth?.token) {
      return String(client.handshake.auth.token);
    }

    // 2. Authorization header: "Bearer <token>"
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    // 3. Cookie "access_token"
    const cookieHeader = client.handshake.headers?.cookie;
    if (cookieHeader) {
      const cookies = cookieHeader.split(";").map((c) => c.trim());
      for (const cookie of cookies) {
        if (cookie.startsWith("access_token=")) {
          return decodeURIComponent(cookie.substring("access_token=".length));
        }
      }
    }

    return null;
  }
}
