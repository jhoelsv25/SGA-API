import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ClientInfo, type ClientInfoData, CurrentUser, Roles } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { BiometricoService } from "./biometrico.service";
import { AsignarCodigoBiometricoDto, CodigoBiometricoResponseDto } from "./dto";

const ROLES_BIOMETRICO = ["Administrador", "Soporte TI", "Secretaria"] as const;

@ApiTags("Biométrico (RF-022)")
@Controller("biometrico")
export class BiometricoController {
  constructor(private readonly service: BiometricoService) {}

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
}
