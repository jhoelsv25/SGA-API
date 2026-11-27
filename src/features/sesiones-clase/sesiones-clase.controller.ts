import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import {
  MENU_JUSTIFICACIONES_SESION,
  MENU_MIS_SESIONES,
  MENU_SESIONES_HOY,
} from "../../common/constants";
import {
  ClientInfo,
  type ClientInfoData,
  CurrentUser,
  MenuAccess,
  Public,
  Roles,
} from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import {
  AprobarJustificacionDto,
  CredencialesKioskoDto,
  DetalleSolicitudJustificacionDto,
  FiltrosBandejaJustificacionesDto,
  FirmaSesionResponseDto,
  FirmarIngresoDto,
  MensajeSesionResponseDto,
  MotivoJustificacionDto,
  MiJornadaHoyResponseDto,
  MisSesionesResponseDto,
  PanelSesionesResponseDto,
  RangoSesionesQueryDto,
  RechazarJustificacionDto,
  ReemplazoSesionDto,
  SesionResponseDto,
  SesionesKioskoResponseDto,
  SolicitarJustificacionDto,
  SolicitudJustificacionDto,
  SugerirTemaDto,
  SugerirTemaResponseDto,
  TemaSesionDto,
} from "./dto";
import { SesionesClaseService } from "./sesiones-clase.service";

const TOKEN_KIOSKO = "x-kiosk-token";

/** El Director consulta la bandeja pero no aprueba ni rechaza (P-49). */
const ROLES_RESUELVEN_JUSTIFICACION = ["Subdirector", "Administrador"] as const;

@ApiTags("Sesiones de clase")
@Controller("sesiones-clase")
export class SesionesClaseController {
  constructor(private readonly service: SesionesClaseService) {}

  // --- Kiosko de Sesiones (sin sesión de usuario; el equipo se identifica por su token)

  @Public()
  @Post("kiosko/sesiones")
  @HttpCode(200)
  @Throttle({ long: { limit: 60, ttl: 60000 } })
  @ApiHeader({ name: TOKEN_KIOSKO, required: true })
  @ApiOperation({ summary: "Sesiones de hoy del docente (código + PIN)" })
  @ApiResponse({ status: 200, type: SesionesKioskoResponseDto })
  async sesionesEnKiosko(
    @Headers(TOKEN_KIOSKO) token: string | undefined,
    @Body() dto: CredencialesKioskoDto,
  ): Promise<SesionesKioskoResponseDto> {
    return this.service.sesionesEnKiosko(token, dto);
  }

  @Public()
  @Post("kiosko/:id/ingreso")
  @HttpCode(200)
  @Throttle({ long: { limit: 60, ttl: 60000 } })
  @ApiHeader({ name: TOKEN_KIOSKO, required: true })
  @ApiOperation({ summary: "Firmar el ingreso de una sesión con su tema" })
  @ApiResponse({ status: 200, type: FirmaSesionResponseDto })
  async firmarIngreso(
    @Headers(TOKEN_KIOSKO) token: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: FirmarIngresoDto,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<FirmaSesionResponseDto> {
    return this.service.firmarIngreso(token, id, dto, clientInfo.ip);
  }

  @Public()
  @Post("kiosko/:id/salida")
  @HttpCode(200)
  @Throttle({ long: { limit: 60, ttl: 60000 } })
  @ApiHeader({ name: TOKEN_KIOSKO, required: true })
  @ApiOperation({ summary: "Firmar la salida de una sesión" })
  @ApiResponse({ status: 200, type: FirmaSesionResponseDto })
  async firmarSalida(
    @Headers(TOKEN_KIOSKO) token: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CredencialesKioskoDto,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<FirmaSesionResponseDto> {
    return this.service.firmarSalida(token, id, dto, clientInfo.ip);
  }

  // --- Subdirección

  @Get("hoy")
  @ApiBearerAuth()
  @MenuAccess(MENU_SESIONES_HOY)
  @ApiOperation({ summary: "Panel en vivo de las sesiones de hoy, con alertas" })
  @ApiResponse({ status: 200, type: PanelSesionesResponseDto })
  async panelDeHoy(): Promise<PanelSesionesResponseDto> {
    return this.service.panelDeHoy();
  }

  @Get("justificaciones")
  @ApiBearerAuth()
  @MenuAccess(MENU_JUSTIFICACIONES_SESION)
  @ApiOperation({ summary: "Bandeja de justificaciones por revisar, con antigüedad y filtros" })
  @ApiResponse({ status: 200, type: [SolicitudJustificacionDto] })
  async justificaciones(
    @Query() filtros: FiltrosBandejaJustificacionesDto,
  ): Promise<SolicitudJustificacionDto[]> {
    return this.service.justificacionesSolicitadas(filtros);
  }

  @Get("justificaciones/motivos")
  @ApiBearerAuth()
  @MenuAccess(MENU_MIS_SESIONES, MENU_JUSTIFICACIONES_SESION)
  @ApiOperation({ summary: "Catálogo de motivos de justificación" })
  @ApiResponse({ status: 200, type: [MotivoJustificacionDto] })
  async motivosJustificacion(): Promise<MotivoJustificacionDto[]> {
    return this.service.motivosJustificacion();
  }

  @Get("justificaciones/:id")
  @ApiBearerAuth()
  @MenuAccess(MENU_JUSTIFICACIONES_SESION)
  @ApiOperation({ summary: "Detalle de una solicitud, con el contador de permisos personales" })
  @ApiResponse({ status: 200, type: DetalleSolicitudJustificacionDto })
  async detalleJustificacion(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<DetalleSolicitudJustificacionDto> {
    return this.service.detalleSolicitud(id);
  }

  @Patch(":id/reemplazo")
  @ApiBearerAuth()
  @MenuAccess(MENU_SESIONES_HOY)
  @ApiOperation({ summary: "Asignar un docente de reemplazo a una sesión sin firmar" })
  @ApiParam({ name: "id", description: "UUID de la sesión" })
  @ApiResponse({ status: 200, type: SesionResponseDto })
  async asignarReemplazo(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReemplazoSesionDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<SesionResponseDto> {
    return this.service.asignarReemplazo(id, dto, usuario.id, clientInfo.ip);
  }

  @Patch(":id/justificacion/aprobar")
  @ApiBearerAuth()
  @MenuAccess(MENU_JUSTIFICACIONES_SESION)
  @Roles(...ROLES_RESUELVEN_JUSTIFICACION)
  @ApiOperation({ summary: "Aprobar la justificación de una sesión no cumplida" })
  @ApiResponse({ status: 200, type: MensajeSesionResponseDto })
  async aprobarJustificacion(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AprobarJustificacionDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MensajeSesionResponseDto> {
    return this.service.aprobarJustificacion(id, usuario.id, clientInfo.ip, dto);
  }

  @Patch(":id/justificacion/rechazar")
  @ApiBearerAuth()
  @MenuAccess(MENU_JUSTIFICACIONES_SESION)
  @Roles(...ROLES_RESUELVEN_JUSTIFICACION)
  @ApiOperation({ summary: "Rechazar la justificación con un comentario" })
  @ApiResponse({ status: 200, type: MensajeSesionResponseDto })
  async rechazarJustificacion(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RechazarJustificacionDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MensajeSesionResponseDto> {
    return this.service.rechazarJustificacion(id, dto, usuario.id, clientInfo.ip);
  }

  // --- Docente

  @Get("mi-jornada-hoy")
  @Roles("Docente")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Sesiones de hoy del docente autenticado para firma rápida en header" })
  @ApiResponse({ status: 200, type: MiJornadaHoyResponseDto })
  async miJornadaHoy(@CurrentUser() usuario: AuthenticatedUser): Promise<MiJornadaHoyResponseDto> {
    return this.service.miJornadaHoy(usuario);
  }

  @Post(":id/ingreso")
  @HttpCode(200)
  @Roles("Docente")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Firmar ingreso de una sesión desde la web del docente" })
  @ApiResponse({ status: 200, type: FirmaSesionResponseDto })
  async firmarIngresoWeb(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: TemaSesionDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<FirmaSesionResponseDto> {
    return this.service.firmarIngresoWeb(id, dto, usuario, clientInfo.ip);
  }

  @Post(":id/sugerir-tema")
  @HttpCode(200)
  @Roles("Docente")
  @Throttle({ long: { limit: 10, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: "Sugerir o pulir el tema de la sesión con IA" })
  @ApiResponse({ status: 200, type: SugerirTemaResponseDto })
  async sugerirTema(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SugerirTemaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<SugerirTemaResponseDto> {
    return this.service.sugerirTema(id, dto, usuario);
  }

  @Post(":id/salida")
  @HttpCode(200)
  @Roles("Docente")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Firmar salida de una sesión desde la web del docente" })
  @ApiResponse({ status: 200, type: FirmaSesionResponseDto })
  async firmarSalidaWeb(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<FirmaSesionResponseDto> {
    return this.service.firmarSalidaWeb(id, usuario, clientInfo.ip);
  }

  @Get("mis-sesiones")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Historial de mis sesiones con totales" })
  @ApiResponse({ status: 200, type: MisSesionesResponseDto })
  async misSesiones(
    @Query() query: RangoSesionesQueryDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<MisSesionesResponseDto> {
    return this.service.misSesiones(usuario, query);
  }

  @Patch(":id/tema")
  @ApiBearerAuth()
  @MenuAccess(MENU_MIS_SESIONES)
  @ApiOperation({ summary: "Corregir el tema hasta firmar la salida" })
  @ApiResponse({ status: 200, type: SesionResponseDto })
  async corregirTema(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: TemaSesionDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<SesionResponseDto> {
    return this.service.corregirTema(id, dto, usuario, clientInfo.ip);
  }

  @Post(":id/justificacion")
  @ApiBearerAuth()
  @MenuAccess(MENU_MIS_SESIONES)
  @ApiOperation({ summary: "Solicitar la justificación de una sesión no cumplida" })
  @ApiResponse({ status: 201, type: MensajeSesionResponseDto })
  async solicitarJustificacion(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SolicitarJustificacionDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MensajeSesionResponseDto> {
    return this.service.solicitarJustificacion(id, dto, usuario, clientInfo.ip);
  }
}
