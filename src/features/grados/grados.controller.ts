import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ClientInfo, type ClientInfoData, CurrentUser, Roles } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { GradoResponseDto, UpdateGradoDto } from "./dto";
import { GradosService } from "./grados.service";

@ApiTags("Grados")
@ApiBearerAuth()
@Controller("grados")
export class GradosController {
  constructor(private readonly service: GradosService) {}

  @Get()
  @Roles("Administrador", "Director", "Coordinador", "Secretaria", "Docente")
  @ApiOperation({ summary: "Listar los grados de secundaria (1.° a 5.° en orden)" })
  @ApiResponse({
    status: 200,
    description: "Listado de grados ordenados cronológicamente",
    type: [GradoResponseDto],
  })
  async findAll(): Promise<GradoResponseDto[]> {
    return this.service.findAll();
  }

  @Get(":id")
  @Roles("Administrador", "Director", "Coordinador", "Secretaria", "Docente")
  @ApiOperation({ summary: "Obtener detalle de un grado por ID" })
  @ApiParam({ name: "id", description: "UUID del grado" })
  @ApiResponse({
    status: 200,
    description: "Detalle del grado",
    type: GradoResponseDto,
  })
  async findById(@Param("id", ParseUUIDPipe) id: string): Promise<GradoResponseDto> {
    return this.service.findById(id);
  }

  @Patch(":id")
  @Roles("Administrador")
  @ApiOperation({ summary: "Editar el nombre visible de un grado (Solo Administrador)" })
  @ApiParam({ name: "id", description: "UUID del grado" })
  @ApiResponse({
    status: 200,
    description: "Nombre del grado actualizado",
    type: GradoResponseDto,
  })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateGradoDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<GradoResponseDto> {
    return this.service.update(id, dto, user.id, clientInfo.ip);
  }
}
