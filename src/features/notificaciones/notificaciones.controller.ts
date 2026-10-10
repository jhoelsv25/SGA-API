import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Sse,
} from "@nestjs/common";
import type { MessageEvent } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Observable } from "rxjs";
import { CurrentUser } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces";
import { NotificacionesService } from "./notificaciones.service";
import { NotificacionesRealtimeEmitter } from "./services";
import { NotificacionQueryDto, PaginatedNotificacionesResponseDto } from "./dto";

@ApiTags("Comunicación - Notificaciones Personales (RF-019)")
@ApiBearerAuth()
@Controller("notificaciones")
export class NotificacionesController {
  constructor(
    private readonly notificacionesService: NotificacionesService,
    private readonly realtimeEmitter: NotificacionesRealtimeEmitter,
  ) {}

  @Sse("stream")
  @ApiOperation({
    summary: "Canal Server-Sent Events (SSE) para recibir notificaciones en tiempo real",
  })
  stream(@CurrentUser() user: AuthenticatedUser): Observable<MessageEvent> {
    return this.realtimeEmitter.getStream(user.id);
  }

  @Get()
  @ApiOperation({
    summary: "Consultar la bandeja de notificaciones del usuario autenticado (con cursor)",
  })
  @ApiResponse({ status: 200, type: PaginatedNotificacionesResponseDto })
  async obtenerBandeja(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: NotificacionQueryDto,
  ): Promise<PaginatedNotificacionesResponseDto> {
    return this.notificacionesService.obtenerBandeja(user.id, query);
  }

  @Get("conteo-no-leidas")
  @ApiOperation({ summary: "Obtener el conteo de notificaciones no leídas para la campana" })
  @ApiResponse({ status: 200, schema: { example: { unreadCount: 3 } } })
  async obtenerConteo(@CurrentUser() user: AuthenticatedUser): Promise<{ unreadCount: number }> {
    return this.notificacionesService.obtenerConteoNoLeidas(user.id);
  }

  @Patch(":id/leer")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Marcar una notificación como leída al abrirla" })
  @ApiResponse({
    status: 200,
    schema: { example: { message: "Notificación marcada como leída.", id: "..." } },
  })
  async marcarComoLeida(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string; id: string }> {
    return this.notificacionesService.marcarComoLeida(id, user.id);
  }

  @Patch("leer-todas")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Marcar todas las notificaciones pendientes como leídas" })
  @ApiResponse({ status: 200, schema: { example: { message: "...", actualizadas: 5 } } })
  async marcarTodasComoLeidas(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string; actualizadas: number }> {
    return this.notificacionesService.marcarTodasComoLeidas(user.id);
  }

  @Delete("leidas/todas")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Eliminar todas las notificaciones leídas de la bandeja" })
  @ApiResponse({ status: 200, schema: { example: { message: "...", eliminadas: 4 } } })
  async eliminarTodasLeidas(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string; eliminadas: number }> {
    return this.notificacionesService.eliminarTodasLeidas(user.id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Eliminar una notificación específica" })
  @ApiResponse({
    status: 200,
    schema: { example: { message: "Notificación eliminada correctamente.", id: "..." } },
  })
  async eliminar(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string; id: string }> {
    return this.notificacionesService.eliminar(id, user.id);
  }
}
