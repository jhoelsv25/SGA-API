import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ClientInfo, type ClientInfoData, CurrentUser, Roles } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { CreateTurnoDto, TurnoResponseDto, UpdateTurnoDto } from "./dto";
import { TurnosService } from "./turnos.service";

@ApiTags("Turnos")
@ApiBearerAuth()
@Controller("turnos")
export class TurnosController {
  constructor(private readonly turnosService: TurnosService) {}

  @Get()
  @Roles("Administrador", "Director")
  @ApiOperation({ summary: "Listar turnos oficiales de marcación" })
  @ApiResponse({ status: 200, type: [TurnoResponseDto] })
  async findAll(): Promise<TurnoResponseDto[]> {
    return this.turnosService.findAll();
  }

  @Get(":id")
  @Roles("Administrador", "Director")
  @ApiOperation({ summary: "Obtener detalle de un turno" })
  @ApiResponse({ status: 200, type: TurnoResponseDto })
  async findById(@Param("id", ParseUUIDPipe) id: string): Promise<TurnoResponseDto> {
    return this.turnosService.findById(id);
  }

  @Post()
  @Roles("Administrador")
  @ApiOperation({ summary: "Registrar turno para estudiantes, docentes o administrativos" })
  @ApiResponse({ status: 201, type: TurnoResponseDto })
  async create(
    @Body() dto: CreateTurnoDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<TurnoResponseDto> {
    return this.turnosService.create(dto, user.id, clientInfo.ip);
  }

  @Put(":id")
  @Roles("Administrador")
  @ApiOperation({ summary: "Modificar horarios y ventanas de un turno" })
  @ApiResponse({ status: 200, type: TurnoResponseDto })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTurnoDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<TurnoResponseDto> {
    return this.turnosService.update(id, dto, user.id, clientInfo.ip);
  }

  @Patch(":id")
  @Roles("Administrador")
  @ApiOperation({ summary: "Modificar parcialmente horarios y ventanas de un turno" })
  @ApiResponse({ status: 200, type: TurnoResponseDto })
  async patch(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTurnoDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<TurnoResponseDto> {
    return this.turnosService.update(id, dto, user.id, clientInfo.ip);
  }

  @Patch(":id/toggle-activo")
  @Roles("Administrador")
  @ApiOperation({ summary: "Activar o desactivar un turno" })
  @ApiResponse({ status: 200, type: TurnoResponseDto })
  async toggleActivo(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("activo") activo: boolean,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<TurnoResponseDto> {
    return this.turnosService.toggleActivo(id, Boolean(activo), user.id, clientInfo.ip);
  }
}
