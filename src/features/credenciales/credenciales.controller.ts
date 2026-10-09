import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ClientInfo, type ClientInfoData, CurrentUser, Roles } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { CambiarPinDto, CarneDatosDto, CredencialResponseDto, ReemitirCredencialDto } from "./dto";
import { CredencialesService } from "./credenciales.service";

@ApiTags("Comunidad - Credenciales de Marcación")
@ApiBearerAuth()
@Controller("credenciales")
export class CredencialesController {
  constructor(private readonly credencialesService: CredencialesService) {}

  @Post("reemitir")
  @Roles("Administrador", "Secretaria")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Anular credencial anterior por pérdida/deterioro y emitir una nueva (RF-007 HU5)",
    description:
      "Anula la credencial activa con motivo y genera nuevo código y PIN mostrado una sola vez.",
  })
  @ApiResponse({ status: 200, type: CredencialResponseDto })
  async reemitir(
    @Body() dto: ReemitirCredencialDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<CredencialResponseDto> {
    return this.credencialesService.reemitir(dto, user.id, clientInfo.ip);
  }

  @Patch("mi-pin")
  @ApiOperation({
    summary: "Cambiar el PIN de marcación de la sesión actual (RF-007 HU5)",
    description:
      "Permite al docente o estudiante autenticado actualizar su PIN de marcación en kiosko.",
  })
  @ApiResponse({ status: 200, description: "PIN actualizado correctamente" })
  async cambiarMiPin(
    @Body() dto: CambiarPinDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<{ mensaje: string }> {
    return this.credencialesService.cambiarPin(dto, user.personaId, user.id, clientInfo.ip);
  }

  @Patch("personas/:personaId/pin")
  @Roles("Administrador", "Secretaria")
  @ApiOperation({
    summary: "Cambiar o restablecer el PIN de marcación de una persona (Administrativo)",
  })
  @ApiResponse({ status: 200, description: "PIN actualizado correctamente" })
  async cambiarPinPersona(
    @Param("personaId", ParseUUIDPipe) personaId: string,
    @Body() dto: CambiarPinDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<{ mensaje: string }> {
    return this.credencialesService.cambiarPin(dto, personaId, user.id, clientInfo.ip);
  }

  @Get("personas/:personaId/carne")
  @ApiOperation({
    summary: "Obtener datos completos para la emisión o impresión del carné con QR (RF-007 HU5)",
  })
  @ApiResponse({ status: 200, type: CarneDatosDto })
  async obtenerCarne(@Param("personaId", ParseUUIDPipe) personaId: string): Promise<CarneDatosDto> {
    return this.credencialesService.obtenerCarne(personaId);
  }

  @Get("personas/:personaId")
  @ApiOperation({
    summary: "Consultar la credencial activa de una persona",
  })
  @ApiResponse({ status: 200, type: CredencialResponseDto })
  async obtenerActiva(
    @Param("personaId", ParseUUIDPipe) personaId: string,
  ): Promise<CredencialResponseDto> {
    return this.credencialesService.obtenerActiva(personaId);
  }
}
