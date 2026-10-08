import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ClientInfo, type ClientInfoData, CurrentUser, Roles } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { CargosService } from "./cargos.service";
import { CargoResponseDto, CreateCargoDto, UpdateCargoDto } from "./dto";

@ApiTags("Seguridad - Cargos")
@ApiBearerAuth()
@Roles("Administrador")
@Controller("cargos")
export class CargosController {
  constructor(private readonly cargosService: CargosService) {}

  @Get()
  @ApiOperation({ summary: "Listar cargos con sus roles sugeridos (RF-002 V2)" })
  @ApiResponse({ status: 200, type: [CargoResponseDto] })
  async findAll(
    @Query("vigentes", new ParseBoolPipe({ optional: true })) vigentes?: boolean,
  ): Promise<CargoResponseDto[]> {
    return this.cargosService.findAll(vigentes ?? false);
  }

  @Get(":id")
  @ApiOperation({ summary: "Detalle de un cargo" })
  @ApiResponse({ status: 200, type: CargoResponseDto })
  async findById(@Param("id", ParseUUIDPipe) id: string): Promise<CargoResponseDto> {
    return this.cargosService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: "Crear un cargo con sus roles sugeridos" })
  @ApiResponse({ status: 201, type: CargoResponseDto })
  @ApiResponse({ status: 409, description: "Ya existe un cargo con ese nombre" })
  async create(
    @Body() dto: CreateCargoDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<CargoResponseDto> {
    return this.cargosService.create(dto, user.id, client.ip);
  }

  @Put(":id")
  @ApiOperation({ summary: "Editar un cargo o sus roles sugeridos" })
  @ApiResponse({ status: 200, type: CargoResponseDto })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCargoDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<CargoResponseDto> {
    return this.cargosService.update(id, dto, user.id, client.ip);
  }

  @Patch(":id/deactivate")
  @ApiOperation({ summary: "Desactivar un cargo (no si hay personal vigente con él)" })
  @ApiResponse({ status: 200, type: CargoResponseDto })
  @ApiResponse({ status: 400, description: "Cargo asignado a personal vigente" })
  async deactivate(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<CargoResponseDto> {
    return this.cargosService.deactivate(id, user.id, client.ip);
  }

  @Patch(":id/reactivate")
  @ApiOperation({ summary: "Reactivar un cargo" })
  @ApiResponse({ status: 200, type: CargoResponseDto })
  async reactivate(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<CargoResponseDto> {
    return this.cargosService.reactivate(id, user.id, client.ip);
  }
}
