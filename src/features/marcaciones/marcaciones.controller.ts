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
import { Throttle } from "@nestjs/throttler";
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  ClientInfo,
  type ClientInfoData,
  CurrentUser,
  MenuAccess,
  Public,
} from "../../common/decorators";
import { MENU_MARCACION_MANUAL, MENU_MARCACIONES_HOY } from "../../common/constants";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import {
  JustificarMarcacionDto,
  MarcacionKioskoResponseDto,
  MarcacionResponseDto,
  MarcarKioskoDto,
  PanelMarcacionesHoyResponseDto,
  RegistrarMarcacionManualDto,
  ReporteMarcacionesQueryDto,
  ReporteMarcacionesResponseDto,
} from "./dto";
import { MarcacionesService } from "./marcaciones.service";

@ApiTags("Marcaciones")
@Controller("marcaciones")
export class MarcacionesController {
  constructor(private readonly service: MarcacionesService) {}

  @Public()
  @Post("kiosko")
  @HttpCode(200)
  // Un kiosko atiende a muchos en la puerta, pero el PIN es de 4 dígitos: se limita por IP.
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({
    summary: "Marcar entrada o salida en un kiosko autorizado (código + PIN)",
    description: "El equipo se identifica con el header 'x-kiosk-token'. Usa la hora del servidor.",
  })
  @ApiHeader({ name: "x-kiosk-token", required: true, description: "Token del kiosko autorizado" })
  @ApiResponse({ status: 200, type: MarcacionKioskoResponseDto })
  async marcarEnKiosko(
    @Headers("x-kiosk-token") tokenEquipo: string | undefined,
    @Body() dto: MarcarKioskoDto,
  ): Promise<MarcacionKioskoResponseDto> {
    return this.service.marcarEnKiosko(tokenEquipo, dto);
  }

  @Post("manual")
  @ApiBearerAuth()
  @MenuAccess(MENU_MARCACION_MANUAL)
  @ApiOperation({ summary: "Registrar una marcación manual con hora real y observación" })
  @ApiResponse({ status: 201, type: MarcacionResponseDto })
  async registrarManual(
    @Body() dto: RegistrarMarcacionManualDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MarcacionResponseDto> {
    return this.service.registrarManual(dto, usuario.id, clientInfo.ip);
  }

  @Patch(":id/justificar")
  @ApiBearerAuth()
  @MenuAccess(MENU_MARCACIONES_HOY)
  @ApiOperation({ summary: "Justificar una tardanza o salida anticipada" })
  @ApiParam({ name: "id", description: "UUID de la marcación" })
  @ApiResponse({ status: 200, type: MarcacionResponseDto })
  async justificar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: JustificarMarcacionDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MarcacionResponseDto> {
    return this.service.justificar(id, dto, usuario.id, clientInfo.ip);
  }

  @Get("hoy")
  @ApiBearerAuth()
  @MenuAccess(MENU_MARCACIONES_HOY)
  @ApiOperation({ summary: "Panel en vivo de las marcaciones de hoy" })
  @ApiResponse({ status: 200, type: PanelMarcacionesHoyResponseDto })
  async panelDeHoy(): Promise<PanelMarcacionesHoyResponseDto> {
    return this.service.panelDeHoy();
  }

  @Get("reporte")
  @ApiBearerAuth()
  @MenuAccess(MENU_MARCACIONES_HOY)
  @ApiOperation({ summary: "Reporte de marcaciones por fecha, sección y persona (paginado)" })
  @ApiResponse({ status: 200, type: ReporteMarcacionesResponseDto })
  async reporte(
    @Query() query: ReporteMarcacionesQueryDto,
  ): Promise<ReporteMarcacionesResponseDto> {
    return this.service.reporte(query);
  }
}
