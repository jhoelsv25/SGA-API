import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  ClientInfo,
  type ClientInfoData,
  CurrentUser,
  Public,
  Roles,
} from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import {
  AutorizarEquipoResponseDto,
  CreateEquipoDto,
  EquipoResponseDto,
  LlaveKioskoDto,
  UpdateEquipoDto,
  ValidarEquipoResponseDto,
} from "./dto";
import { FirmadoPorKiosko, LlaveKiosko } from "./decorators/llave-kiosko.decorator";
import { EquiposService } from "./equipos.service";

@ApiTags("Equipos Autorizados")
@Controller("equipos")
export class EquiposController {
  constructor(private readonly equiposService: EquiposService) {}

  @Get()
  @ApiBearerAuth()
  @Roles("Administrador", "Soporte TI")
  @ApiOperation({ summary: "Listar equipos registrados (kioskos y biométricos)" })
  @ApiResponse({ status: 200, type: [EquipoResponseDto] })
  async findAll(): Promise<EquipoResponseDto[]> {
    return this.equiposService.findAll();
  }

  @Public()
  @Get("validar-kiosko")
  @FirmadoPorKiosko()
  @ApiOperation({ summary: "Validar si una terminal física de kiosko está autorizada (Público)" })
  @ApiResponse({ status: 200, type: ValidarEquipoResponseDto })
  async validarKiosko(@LlaveKiosko() llave: string | undefined): Promise<ValidarEquipoResponseDto> {
    return this.equiposService.validarKiosko(llave);
  }

  @Get(":id")
  @ApiBearerAuth()
  @Roles("Administrador", "Soporte TI")
  @ApiOperation({ summary: "Obtener detalle de un equipo" })
  @ApiResponse({ status: 200, type: EquipoResponseDto })
  async findById(@Param("id", ParseUUIDPipe) id: string): Promise<EquipoResponseDto> {
    return this.equiposService.findById(id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles("Administrador", "Soporte TI")
  @ApiOperation({ summary: "Registrar un nuevo equipo autorizado" })
  @ApiResponse({ status: 201, type: EquipoResponseDto })
  async create(
    @Body() dto: CreateEquipoDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<EquipoResponseDto> {
    return this.equiposService.create(dto, user.id, clientInfo.ip);
  }

  @Put(":id")
  @ApiBearerAuth()
  @Roles("Administrador", "Soporte TI")
  @ApiOperation({ summary: "Actualizar datos de un equipo" })
  @ApiResponse({ status: 200, type: EquipoResponseDto })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipoDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<EquipoResponseDto> {
    return this.equiposService.update(id, dto, user.id, clientInfo.ip);
  }

  @Patch(":id/toggle-activo")
  @ApiBearerAuth()
  @Roles("Administrador", "Soporte TI")
  @ApiOperation({ summary: "Activar o desactivar un equipo inmediatamente" })
  @ApiResponse({ status: 200, type: EquipoResponseDto })
  async toggleActivo(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("activo") activo: boolean,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<EquipoResponseDto> {
    return this.equiposService.toggleActivo(id, Boolean(activo), user.id, clientInfo.ip);
  }

  @Post(":id/autorizar")
  @ApiBearerAuth()
  @Roles("Administrador", "Soporte TI")
  @ApiOperation({
    summary:
      "Autorizar la terminal física desde la que se ejecuta la petición con su llave pública",
  })
  @ApiResponse({ status: 200, type: AutorizarEquipoResponseDto })
  async autorizar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: LlaveKioskoDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<AutorizarEquipoResponseDto> {
    return this.equiposService.autorizar(id, dto.llavePublica, user.id, clientInfo.ip);
  }
}
