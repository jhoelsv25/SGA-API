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
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ClientInfo, type ClientInfoData, CurrentUser, Roles } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { CambiarPinDto, CarneDatosDto, CredencialResponseDto, ReemitirCredencialDto } from "./dto";
import { ROLES_CAMBIO_PIN, ROLES_EMISION_CARNES } from "./constants";
import { CredencialesService } from "./credenciales.service";
import { exigirAccesoACredencial } from "./utils/acceso-credencial.util";

@ApiTags("Comunidad - Credenciales de Marcación")
@ApiBearerAuth()
@Controller("credenciales")
export class CredencialesController {
  constructor(private readonly credencialesService: CredencialesService) {}

  @Post("reemitir")
  @Roles("Administrador", "Secretaria")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Anular credencial anterior por pérdida/deterioro y emitir una nueva",
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

  @Patch("personas/:personaId/pin")
  @Roles(...ROLES_CAMBIO_PIN)
  @ApiOperation({
    summary: "Cambiar o restablecer el PIN de marcación de una persona (solo Soporte TI)",
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
    summary: "Obtener datos completos para la emisión o impresión del carné con QR",
  })
  @ApiResponse({ status: 200, type: CarneDatosDto })
  async obtenerCarne(
    @Param("personaId", ParseUUIDPipe) personaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CarneDatosDto> {
    exigirAccesoACredencial(user, personaId);
    return this.credencialesService.obtenerCarne(personaId);
  }

  @Get("personas/:personaId/carne/pdf")
  @ApiOperation({
    summary: "Descargar o previsualizar el Carné Oficial con QR en PDF estándar PVC",
  })
  @ApiResponse({ status: 200, description: "Buffer del archivo PDF del carné PVC" })
  async descargarCarnePdf(
    @Param("personaId", ParseUUIDPipe) personaId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    exigirAccesoACredencial(user, personaId);
    const buffer = await this.credencialesService.generarCarnePdf(personaId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="carnet-${personaId}.pdf"`);
    res.setHeader("Content-Length", buffer.length.toString());
    res.end(buffer);
  }

  @Get("secciones/:seccionId/carnes/pdf")
  @Roles(...ROLES_EMISION_CARNES)
  @ApiOperation({
    summary: "Descargar en PDF A4 los carnés con QR de toda una sección listos para impresión",
    description:
      "Genera una planilla A4 con cuadrícula de 8 carnés por hoja con guías de corte punteadas.",
  })
  @ApiResponse({
    status: 200,
    description: "Buffer del archivo PDF A4 con los carnés de la sección",
  })
  async descargarCarnesSeccionPdf(
    @Param("seccionId", ParseUUIDPipe) seccionId: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.credencialesService.generarCarnesSeccionPdf(seccionId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="carnes-seccion-${seccionId}.pdf"`);
    res.setHeader("Content-Length", buffer.length.toString());
    res.end(buffer);
  }

  @Get("docentes/carnes/pdf")
  @Roles(...ROLES_EMISION_CARNES)
  @ApiOperation({
    summary: "Descargar en PDF A4 los carnés con QR de todo el personal docente activo",
    description:
      "Genera una planilla A4 con cuadrícula de 8 carnés por hoja con guías de corte punteadas.",
  })
  @ApiResponse({
    status: 200,
    description: "Buffer del archivo PDF A4 con los carnés de los docentes",
  })
  async descargarCarnesDocentesPdf(@Res() res: Response): Promise<void> {
    const buffer = await this.credencialesService.generarCarnesDocentesPdf();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="carnes-docentes.pdf"`);
    res.setHeader("Content-Length", buffer.length.toString());
    res.end(buffer);
  }

  @Get("personas/:personaId")
  @ApiOperation({
    summary: "Consultar la credencial activa de una persona",
  })
  @ApiResponse({ status: 200, type: CredencialResponseDto })
  async obtenerActiva(
    @Param("personaId", ParseUUIDPipe) personaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CredencialResponseDto> {
    exigirAccesoACredencial(user, personaId);
    return this.credencialesService.obtenerActiva(personaId);
  }
}
