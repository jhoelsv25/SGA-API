import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ClientInfo, type ClientInfoData, CurrentUser, Roles } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { ESTADOS_EQUIPO_ACCESO } from "./constants";
import { AutorizarEquipoAccesoDto, EquipoAccesoResponseDto, MotivoEquipoAccesoDto } from "./dto";
import { EquiposAccesoService } from "./equipos-acceso.service";

@ApiTags("Equipos de acceso")
@ApiBearerAuth()
@Controller("equipos-acceso")
export class EquiposAccesoController {
  constructor(private readonly equiposAccesoService: EquiposAccesoService) {}

  @Get()
  @Roles("Administrador", "Soporte TI")
  @ApiOperation({
    summary: "Listar los equipos desde los que los usuarios inician sesión en SGA-NET",
  })
  @ApiQuery({ name: "estado", required: false, enum: ESTADOS_EQUIPO_ACCESO })
  @ApiResponse({ status: 200, type: [EquipoAccesoResponseDto] })
  findAll(
    @Query("estado", new ParseIntPipe({ optional: true })) estado?: number,
  ): Promise<EquipoAccesoResponseDto[]> {
    return this.equiposAccesoService.findAll(ESTADOS_EQUIPO_ACCESO.find((e) => e === estado));
  }

  @Post(":id/autorizar")
  @Roles("Administrador", "Soporte TI")
  @ApiOperation({ summary: "Autorizar un equipo de acceso (opcionalmente hasta una fecha)" })
  @ApiResponse({ status: 201, type: EquipoAccesoResponseDto })
  autorizar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AutorizarEquipoAccesoDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<EquipoAccesoResponseDto> {
    return this.equiposAccesoService.autorizar(id, user.id, dto.vigenteHasta, clientInfo.ip);
  }

  @Post(":id/rechazar")
  @Roles("Administrador", "Soporte TI")
  @ApiOperation({ summary: "Rechazar la solicitud de un equipo pendiente" })
  @ApiResponse({ status: 201, type: EquipoAccesoResponseDto })
  rechazar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: MotivoEquipoAccesoDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<EquipoAccesoResponseDto> {
    return this.equiposAccesoService.rechazar(id, user.id, dto.motivo, clientInfo.ip);
  }

  @Post(":id/revocar")
  @Roles("Administrador", "Soporte TI")
  @ApiOperation({ summary: "Revocar un equipo autorizado" })
  @ApiResponse({ status: 201, type: EquipoAccesoResponseDto })
  revocar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: MotivoEquipoAccesoDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<EquipoAccesoResponseDto> {
    return this.equiposAccesoService.revocar(id, user.id, dto.motivo, clientInfo.ip);
  }
}
