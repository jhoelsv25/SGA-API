import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  ClientInfo,
  type ClientInfoData,
  CurrentUser,
  Public,
  Roles,
} from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { BiometricoService } from "./biometrico.service";
import {
  AsignarCodigoBiometricoDto,
  AsignarPendienteDto,
  CodigoBiometricoResponseDto,
  CrearOrdenDto,
  DescartarPendienteDto,
  GuardarConfigRelojDto,
  GuardarConfigRelojResponseDto,
  OrdenDto,
  ResultadoOrdenDto,
  EstadoRelojDto,
  LatidoDto,
  LatidoResponseDto,
  LoteResponseDto,
  PendienteResponseDto,
  PendientesQueryDto,
  RecibirLoteDto,
  ResolverPendienteResponseDto,
} from "./dto";

const ROLES_BIOMETRICO = ["Administrador", "Soporte TI", "Secretaria"] as const;

@ApiTags("Biométrico (RF-022)")
@Controller("biometrico")
export class BiometricoController {
  constructor(private readonly service: BiometricoService) {}

  // ---- App puente --------------------------------------------------------

  @Public()
  @Post("lote")
  @HttpCode(200)
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({
    summary: "La app puente envía las marcaciones leídas del reloj",
    description: "Se identifica con la clave del reloj en el header 'x-puente-token'.",
  })
  @ApiHeader({ name: "x-puente-token", required: true, description: "Clave de la app puente" })
  @ApiResponse({ status: 200, type: LoteResponseDto })
  async recibirLote(
    @Headers("x-puente-token") clave: string | undefined,
    @Body() dto: RecibirLoteDto,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<LoteResponseDto> {
    return this.service.recibirLote(clave, dto, clientInfo.ip);
  }

  @Public()
  @Post("latido")
  @HttpCode(200)
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: "La app puente avisa su estado y la hora del reloj" })
  @ApiHeader({ name: "x-puente-token", required: true, description: "Clave de la app puente" })
  @ApiResponse({ status: 200, type: LatidoResponseDto })
  async latido(
    @Headers("x-puente-token") clave: string | undefined,
    @Body() dto: LatidoDto,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<LatidoResponseDto> {
    return this.service.registrarLatido(clave, dto, clientInfo.ip);
  }

  @Public()
  @Post("ordenes/:ordenId/resultado")
  @HttpCode(200)
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: "La app puente informa el resultado de una orden" })
  @ApiHeader({ name: "x-puente-token", required: true, description: "Clave de la app puente" })
  async resultadoOrden(
    @Headers("x-puente-token") clave: string | undefined,
    @Param("ordenId", ParseUUIDPipe) ordenId: string,
    @Body() dto: ResultadoOrdenDto,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<{ mensaje: string }> {
    return this.service.resolverOrden(clave, ordenId, dto, clientInfo.ip);
  }

  // ---- Administración ----------------------------------------------------

  @Get("estado")
  @ApiBearerAuth()
  @Roles(...ROLES_BIOMETRICO)
  @ApiOperation({ summary: "Estado de los relojes y de su app puente, con alertas" })
  @ApiResponse({ status: 200, type: [EstadoRelojDto] })
  async estado(): Promise<EstadoRelojDto[]> {
    return this.service.estadoRelojes();
  }

  @Get("personas/:personaId/codigo")
  @ApiBearerAuth()
  @Roles(...ROLES_BIOMETRICO)
  @ApiOperation({ summary: "Consultar el código biométrico de una persona" })
  @ApiResponse({ status: 200, type: CodigoBiometricoResponseDto })
  async obtenerCodigo(
    @Param("personaId", ParseUUIDPipe) personaId: string,
  ): Promise<CodigoBiometricoResponseDto> {
    return this.service.obtenerCodigo(personaId);
  }

  @Put("personas/:personaId/codigo")
  @ApiBearerAuth()
  @Roles(...ROLES_BIOMETRICO)
  @ApiOperation({ summary: "Asignar el código biométrico (ID del reloj) a una persona" })
  @ApiResponse({ status: 200, type: CodigoBiometricoResponseDto })
  async asignarCodigo(
    @Param("personaId", ParseUUIDPipe) personaId: string,
    @Body() dto: AsignarCodigoBiometricoDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<CodigoBiometricoResponseDto> {
    return this.service.asignarCodigo(personaId, dto, usuario.id, clientInfo.ip);
  }

  @Delete("personas/:personaId/codigo")
  @ApiBearerAuth()
  @Roles(...ROLES_BIOMETRICO)
  @ApiOperation({ summary: "Quitar el código biométrico de una persona" })
  @ApiResponse({ status: 200, type: CodigoBiometricoResponseDto })
  async quitarCodigo(
    @Param("personaId", ParseUUIDPipe) personaId: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<CodigoBiometricoResponseDto> {
    return this.service.quitarCodigo(personaId, usuario.id, clientInfo.ip);
  }

  @Get("pendientes")
  @ApiBearerAuth()
  @Roles(...ROLES_BIOMETRICO)
  @ApiOperation({ summary: "Bandeja de marcaciones del reloj que no se pudieron asignar" })
  @ApiResponse({ status: 200, type: [PendienteResponseDto] })
  async pendientes(@Query() query: PendientesQueryDto): Promise<PendienteResponseDto[]> {
    return this.service.listarPendientes(query.estado);
  }

  @Post("pendientes/:id/asignar")
  @HttpCode(200)
  @ApiBearerAuth()
  @Roles(...ROLES_BIOMETRICO)
  @ApiOperation({ summary: "Asignar una marcación pendiente a un docente" })
  @ApiResponse({ status: 200, type: ResolverPendienteResponseDto })
  async asignarPendiente(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AsignarPendienteDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<ResolverPendienteResponseDto> {
    return this.service.asignarPendiente(id, dto, usuario.id, clientInfo.ip);
  }

  @Post("pendientes/:id/descartar")
  @HttpCode(200)
  @ApiBearerAuth()
  @Roles(...ROLES_BIOMETRICO)
  @ApiOperation({ summary: "Descartar una marcación pendiente con motivo" })
  @ApiResponse({ status: 200, type: ResolverPendienteResponseDto })
  async descartarPendiente(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DescartarPendienteDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<ResolverPendienteResponseDto> {
    return this.service.descartarPendiente(id, dto, usuario.id, clientInfo.ip);
  }

  @Put("relojes/:equipoId/config")
  @ApiBearerAuth()
  @Roles(...ROLES_BIOMETRICO)
  @ApiOperation({ summary: "Guardar la conexión al reloj (IP, puerto, clave, intervalo)" })
  @ApiResponse({ status: 200, type: GuardarConfigRelojResponseDto })
  async guardarConfig(
    @Param("equipoId", ParseUUIDPipe) equipoId: string,
    @Body() dto: GuardarConfigRelojDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<GuardarConfigRelojResponseDto> {
    return this.service.guardarConfig(equipoId, dto, usuario.id, clientInfo.ip);
  }

  @Post("relojes/:equipoId/ordenes")
  @HttpCode(200)
  @ApiBearerAuth()
  @Roles(...ROLES_BIOMETRICO)
  @ApiOperation({ summary: "Pedir a la app puente probar, leer o sincronizar el reloj" })
  @ApiResponse({ status: 200, type: OrdenDto })
  async crearOrden(
    @Param("equipoId", ParseUUIDPipe) equipoId: string,
    @Body() dto: CrearOrdenDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<OrdenDto> {
    return this.service.crearOrden(equipoId, dto.tipo, usuario.id);
  }

  @Get("relojes/:equipoId/ordenes")
  @ApiBearerAuth()
  @Roles(...ROLES_BIOMETRICO)
  @ApiOperation({ summary: "Últimas órdenes del reloj y su resultado" })
  @ApiResponse({ status: 200, type: [OrdenDto] })
  async ordenes(@Param("equipoId", ParseUUIDPipe) equipoId: string): Promise<OrdenDto[]> {
    return this.service.listarOrdenes(equipoId);
  }
}
