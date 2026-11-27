import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import {
  ClientInfo,
  type ClientInfoData,
  CurrentUser,
  Public,
  Roles,
} from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import {
  AprobarSolicitudKioskoDto,
  EstadoSolicitudKioskoDto,
  RegistrarSolicitudKioskoDto,
  SolicitudKioskoResponseDto,
} from "./dto";
import { SolicitudesKioskoService } from "./solicitudes-kiosko.service";

@ApiTags("Aprobación de kioskos")
@Controller("solicitudes-kiosko")
export class SolicitudesKioskoController {
  constructor(private readonly solicitudesService: SolicitudesKioskoService) {}

  @Public()
  @Post()
  @HttpCode(200)
  // Cada kiosko consulta cada 10 s; el margen admite varios detrás de la misma IP
  @Throttle({ long: { limit: 40, ttl: 60000 } })
  @ApiOperation({ summary: "Registrar un navegador kiosko y consultar su estado (Público)" })
  @ApiResponse({ status: 200, type: EstadoSolicitudKioskoDto })
  registrar(@Body() dto: RegistrarSolicitudKioskoDto): Promise<EstadoSolicitudKioskoDto> {
    return this.solicitudesService.registrar(dto.secreto);
  }

  @Get()
  @ApiBearerAuth()
  @Roles("Administrador", "Soporte TI")
  @ApiOperation({ summary: "Listar solicitudes de aprobación de kioskos" })
  @ApiResponse({ status: 200, type: [SolicitudKioskoResponseDto] })
  findAll(): Promise<SolicitudKioskoResponseDto[]> {
    return this.solicitudesService.findAll();
  }

  @Post(":id/aprobar")
  @HttpCode(204)
  @ApiBearerAuth()
  @Roles("Administrador", "Soporte TI")
  @ApiOperation({ summary: "Aprobar una solicitud y vincularla a un kiosko" })
  aprobar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AprobarSolicitudKioskoDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<void> {
    return this.solicitudesService.aprobar(id, dto.equipoId, user.id, clientInfo.ip);
  }

  @Post(":id/rechazar")
  @HttpCode(204)
  @ApiBearerAuth()
  @Roles("Administrador", "Soporte TI")
  @ApiOperation({ summary: "Rechazar una solicitud pendiente" })
  rechazar(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<void> {
    return this.solicitudesService.rechazar(id, user.id, clientInfo.ip);
  }
}
