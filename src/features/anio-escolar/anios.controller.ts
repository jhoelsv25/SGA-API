import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ClientInfo, type ClientInfoData, CurrentUser, Roles } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { AniosAcademicosService } from "./anios.service";
import {
  AnioAcademicoResponseDto,
  BimestreResponseDto,
  CreateAnioAcademicoDto,
  GuardarBimestresDto,
  ReabrirAnioDto,
  UpdateAnioAcademicoDto,
} from "./dto";

@ApiTags("Año escolar")
@ApiBearerAuth()
@Controller("anios-academicos")
export class AniosAcademicosController {
  constructor(private readonly aniosService: AniosAcademicosService) {}

  @Get()
  @Roles("Administrador")
  @ApiOperation({ summary: "Listar años escolares" })
  @ApiResponse({ status: 200, type: [AnioAcademicoResponseDto] })
  findAll(): Promise<AnioAcademicoResponseDto[]> {
    return this.aniosService.findAll();
  }

  @Get("en-curso")
  @ApiOperation({ summary: "Año escolar vigente: en curso o, si no hay, el reabierto" })
  @ApiResponse({ status: 200, type: AnioAcademicoResponseDto })
  findEnCurso(): Promise<AnioAcademicoResponseDto> {
    return this.aniosService.findEnCurso();
  }

  @Get(":id")
  @Roles("Administrador")
  @ApiOperation({ summary: "Detalle de un año escolar con sus bimestres" })
  @ApiResponse({ status: 200, type: AnioAcademicoResponseDto })
  findById(@Param("id", ParseUUIDPipe) id: string): Promise<AnioAcademicoResponseDto> {
    return this.aniosService.findById(id);
  }

  @Post()
  @Roles("Administrador")
  @ApiOperation({ summary: "Crear el año escolar, con sus 4 bimestres si se envían las fechas" })
  @ApiResponse({ status: 201, type: AnioAcademicoResponseDto })
  create(
    @Body() dto: CreateAnioAcademicoDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<AnioAcademicoResponseDto> {
    return this.aniosService.create(dto, user.id, clientInfo.ip);
  }

  @Patch(":id")
  @Roles("Administrador")
  @ApiOperation({ summary: "Ajustar denominación o fechas de un año planificado" })
  @ApiResponse({ status: 200, type: AnioAcademicoResponseDto })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnioAcademicoDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<AnioAcademicoResponseDto> {
    return this.aniosService.update(id, dto, user.id, clientInfo.ip);
  }

  @Put(":id/bimestres")
  @Roles("Administrador")
  @ApiOperation({ summary: "Completar o corregir las fechas de los 4 bimestres" })
  @ApiResponse({ status: 200, type: AnioAcademicoResponseDto })
  guardarBimestres(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: GuardarBimestresDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<AnioAcademicoResponseDto> {
    return this.aniosService.guardarBimestres(id, dto.bimestres, user.id, clientInfo.ip);
  }

  @Post(":id/iniciar")
  @Roles("Administrador")
  @ApiOperation({ summary: "Iniciar el año escolar" })
  @ApiResponse({ status: 200, type: AnioAcademicoResponseDto })
  iniciar(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<AnioAcademicoResponseDto> {
    return this.aniosService.iniciar(id, user.id, clientInfo.ip);
  }

  @Post(":id/cerrar")
  @Roles("Administrador")
  @ApiOperation({ summary: "Cerrar el año escolar cuando sus 4 bimestres están cerrados" })
  @ApiResponse({ status: 200, type: AnioAcademicoResponseDto })
  cerrar(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<AnioAcademicoResponseDto> {
    return this.aniosService.cerrar(id, user.id, clientInfo.ip);
  }

  @Post(":id/reabrir")
  @Roles("Administrador")
  @ApiOperation({ summary: "Reabrir un año cerrado, con motivo y fecha límite" })
  @ApiResponse({ status: 200, type: AnioAcademicoResponseDto })
  reabrir(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReabrirAnioDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<AnioAcademicoResponseDto> {
    return this.aniosService.reabrir(id, dto, user.id, clientInfo.ip);
  }

  @Post(":id/bimestres/:bimestreId/iniciar")
  @Roles("Administrador")
  @ApiOperation({ summary: "Iniciar un bimestre, en orden y uno a la vez" })
  @ApiResponse({ status: 200, type: BimestreResponseDto })
  iniciarBimestre(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("bimestreId", ParseUUIDPipe) bimestreId: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<BimestreResponseDto> {
    return this.aniosService.iniciarBimestre(id, bimestreId, user.id, clientInfo.ip);
  }

  @Post(":id/bimestres/:bimestreId/cerrar")
  @Roles("Administrador")
  @ApiOperation({ summary: "Cerrar el bimestre en curso" })
  @ApiResponse({ status: 200, type: BimestreResponseDto })
  cerrarBimestre(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("bimestreId", ParseUUIDPipe) bimestreId: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<BimestreResponseDto> {
    return this.aniosService.cerrarBimestre(id, bimestreId, user.id, clientInfo.ip);
  }
}
