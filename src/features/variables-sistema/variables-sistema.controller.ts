import { Body, Controller, Get, Param, Patch, Put, Query } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ClientInfo, type ClientInfoData, CurrentUser, Roles } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { UpdateVariableDto, VariableSistemaResponseDto } from "./dto";
import { VariablesSistemaService } from "./variables-sistema.service";

@ApiTags("Variables del Sistema")
@ApiBearerAuth()
@Controller("variables-sistema")
export class VariablesSistemaController {
  constructor(private readonly service: VariablesSistemaService) {}

  @Get()
  @Roles("Administrador", "Director", "Soporte TI")
  @ApiOperation({ summary: "Listar variables de configuración vigentes del sistema" })
  @ApiQuery({ name: "modulo", required: false, description: "Filtrar por módulo específico" })
  @ApiResponse({
    status: 200,
    description: "Lista de variables vigentes",
    type: [VariableSistemaResponseDto],
  })
  async listVigentes(@Query("modulo") modulo?: string): Promise<VariableSistemaResponseDto[]> {
    return this.service.listVigentes(modulo);
  }

  @Get(":codigo")
  @Roles("Administrador", "Director", "Soporte TI")
  @ApiOperation({ summary: "Consultar valor vigente de una variable de configuración" })
  @ApiParam({ name: "codigo", example: "sesion.tolerancia_ingreso_min" })
  @ApiResponse({
    status: 200,
    description: "Detalle de la variable vigente",
    type: VariableSistemaResponseDto,
  })
  async getByCodigo(@Param("codigo") codigo: string): Promise<VariableSistemaResponseDto> {
    return this.service.getByCodigo(codigo);
  }

  @Get(":codigo/historial")
  @Roles("Administrador", "Director", "Soporte TI")
  @ApiOperation({ summary: "Consultar historial de versiones de una variable" })
  @ApiParam({ name: "codigo", example: "sesion.tolerancia_ingreso_min" })
  @ApiResponse({
    status: 200,
    description: "Historial cronológico de cambios de la variable",
    type: [VariableSistemaResponseDto],
  })
  async getHistorial(@Param("codigo") codigo: string): Promise<VariableSistemaResponseDto[]> {
    return this.service.getHistorial(codigo);
  }

  @Put(":codigo")
  @Roles("Administrador")
  @ApiOperation({ summary: "Actualizar variable de configuración (Solo Administrador)" })
  @ApiParam({ name: "codigo", example: "sesion.tolerancia_ingreso_min" })
  @ApiResponse({
    status: 200,
    description: "Variable actualizada y versionada con éxito",
    type: VariableSistemaResponseDto,
  })
  async updatePut(
    @Param("codigo") codigo: string,
    @Body() dto: UpdateVariableDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<VariableSistemaResponseDto> {
    return this.service.update(codigo, dto, user.id, clientInfo.ip);
  }

  @Patch(":codigo")
  @Roles("Administrador")
  @ApiOperation({ summary: "Actualizar variable de configuración (Solo Administrador)" })
  @ApiParam({ name: "codigo", example: "sesion.tolerancia_ingreso_min" })
  @ApiResponse({
    status: 200,
    description: "Variable actualizada y versionada con éxito",
    type: VariableSistemaResponseDto,
  })
  async updatePatch(
    @Param("codigo") codigo: string,
    @Body() dto: UpdateVariableDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<VariableSistemaResponseDto> {
    return this.service.update(codigo, dto, user.id, clientInfo.ip);
  }
}
