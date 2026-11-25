import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { HEADER_ANIO_ACADEMICO } from "../../common/anio-lectivo";
import { MENU_MATERIALES_BIMESTRE, MENU_SOLICITUDES_CAMBIO_FECHA } from "../../common/constants";
import { ClientInfo, type ClientInfoData, CurrentUser, MenuAccess } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { LIMITE_DURO_SUBIDA_BYTES } from "./constants";
import {
  ActualizarMaterialDto,
  ActualizarUnidadDto,
  ContenidoMaterialDto,
  CrearUnidadDto,
  PlanificarMaterialDto,
  PublicarMaterialExtraDto,
  ResolverSolicitudDto,
  SeguimientoQueryDto,
  SolicitarCambioFechaDto,
  SolicitudesQueryDto,
  type AulaVirtualResponse,
  type CursoAulaResponse,
  type MutacionMaterialResponse,
  type SeguimientoResponse,
  type SolicitudCambioResponse,
} from "./dto";
import type { UnidadFila } from "./interfaces";
import { AulaMaterialesService, AulaSolicitudesService, AulaUnidadesService } from "./services";

const OPCIONES_SUBIDA = { limits: { fileSize: LIMITE_DURO_SUBIDA_BYTES } };

@ApiTags("Aula virtual - Unidades y materiales")
@ApiBearerAuth()
@ApiHeader({
  name: HEADER_ANIO_ACADEMICO,
  required: false,
  description: "Año lectivo de trabajo. Si se omite, se opera con el año en curso.",
})
@Controller("aula-virtual")
export class AulaVirtualController {
  constructor(
    private readonly unidadesSvc: AulaUnidadesService,
    private readonly materialesSvc: AulaMaterialesService,
    private readonly solicitudesSvc: AulaSolicitudesService,
  ) {}

  @Get("mis-cursos")
  @ApiOperation({ summary: "Cursos con aula virtual del usuario (docente o estudiante)" })
  async misCursos(@CurrentUser() usuario: AuthenticatedUser): Promise<CursoAulaResponse[]> {
    return this.unidadesSvc.misCursos(usuario);
  }

  @Get("seguimiento")
  @MenuAccess(MENU_MATERIALES_BIMESTRE)
  @ApiOperation({ summary: "Materiales del bimestre por docente y curso (Subdirector)" })
  async seguimiento(@Query() query: SeguimientoQueryDto): Promise<SeguimientoResponse> {
    return this.solicitudesSvc.seguimiento(query.periodoId);
  }

  @Get("solicitudes-cambio-fecha")
  @ApiOperation({
    summary:
      "Solicitudes de cambio de fecha (pendientes para el Subdirector; propias para el docente)",
  })
  async solicitudes(
    @Query() query: SolicitudesQueryDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<SolicitudCambioResponse[]> {
    return this.solicitudesSvc.listarSolicitudes(usuario, query.estado);
  }

  @Patch("solicitudes-cambio-fecha/:id/aprobar")
  @MenuAccess(MENU_SOLICITUDES_CAMBIO_FECHA)
  @ApiOperation({ summary: "Aprobar una solicitud de cambio de fecha" })
  @ApiParam({ name: "id", description: "UUID de la solicitud" })
  async aprobar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ResolverSolicitudDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<{ mensaje: string }> {
    return this.solicitudesSvc.aprobarSolicitud(id, dto, usuario, clientInfo.ip);
  }

  @Patch("solicitudes-cambio-fecha/:id/rechazar")
  @MenuAccess(MENU_SOLICITUDES_CAMBIO_FECHA)
  @ApiOperation({ summary: "Rechazar una solicitud de cambio de fecha (respuesta obligatoria)" })
  @ApiParam({ name: "id", description: "UUID de la solicitud" })
  async rechazar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ResolverSolicitudDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<{ mensaje: string }> {
    return this.solicitudesSvc.rechazarSolicitud(id, dto, usuario, clientInfo.ip);
  }

  @Get("cursos/:cursoSeccionId")
  @ApiOperation({ summary: "Aula virtual de un curso: unidades y materiales" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async obtenerAula(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<AulaVirtualResponse> {
    return this.unidadesSvc.obtenerAula(cursoSeccionId, usuario);
  }

  @Post("cursos/:cursoSeccionId/unidades")
  @ApiOperation({ summary: "Crear una unidad del curso (docente asignado)" })
  @ApiParam({ name: "cursoSeccionId", description: "UUID del curso de la sección" })
  async crearUnidad(
    @Param("cursoSeccionId", ParseUUIDPipe) cursoSeccionId: string,
    @Body() dto: CrearUnidadDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<UnidadFila> {
    return this.unidadesSvc.crearUnidad(cursoSeccionId, dto, usuario, clientInfo.ip);
  }

  @Patch("unidades/:unidadId")
  @ApiOperation({ summary: "Editar u ocultar una unidad" })
  @ApiParam({ name: "unidadId", description: "UUID de la unidad" })
  async actualizarUnidad(
    @Param("unidadId", ParseUUIDPipe) unidadId: string,
    @Body() dto: ActualizarUnidadDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<UnidadFila> {
    return this.unidadesSvc.actualizarUnidad(unidadId, dto, usuario, clientInfo.ip);
  }

  @Post("unidades/:unidadId/materiales/planificar")
  @ApiOperation({ summary: "Planificar un material con su fecha programada" })
  @ApiParam({ name: "unidadId", description: "UUID de la unidad" })
  @ApiResponse({ status: 201, description: "Material planificado" })
  async planificar(
    @Param("unidadId", ParseUUIDPipe) unidadId: string,
    @Body() dto: PlanificarMaterialDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MutacionMaterialResponse> {
    return this.materialesSvc.planificarMaterial(unidadId, dto, usuario, clientInfo.ip);
  }

  @Post("unidades/:unidadId/materiales/extra")
  @UseInterceptors(FileInterceptor("archivo", OPCIONES_SUBIDA))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Publicar un material extra (no planificado, no cuenta en el IGM)" })
  @ApiParam({ name: "unidadId", description: "UUID de la unidad" })
  async publicarExtra(
    @Param("unidadId", ParseUUIDPipe) unidadId: string,
    @Body() dto: PublicarMaterialExtraDto,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MutacionMaterialResponse> {
    return this.materialesSvc.publicarExtra(unidadId, dto, archivo, usuario, clientInfo.ip);
  }

  @Patch("materiales/:materialId")
  @ApiOperation({ summary: "Editar un material (la fecha solo mientras no esté congelada)" })
  @ApiParam({ name: "materialId", description: "UUID del material" })
  async actualizarMaterial(
    @Param("materialId", ParseUUIDPipe) materialId: string,
    @Body() dto: ActualizarMaterialDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MutacionMaterialResponse> {
    return this.materialesSvc.actualizarMaterial(materialId, dto, usuario, clientInfo.ip);
  }

  @Post("materiales/:materialId/publicar")
  @UseInterceptors(FileInterceptor("archivo", OPCIONES_SUBIDA))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Publicar un material planificado (archivo o enlace)" })
  @ApiParam({ name: "materialId", description: "UUID del material" })
  async publicar(
    @Param("materialId", ParseUUIDPipe) materialId: string,
    @Body() dto: ContenidoMaterialDto,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MutacionMaterialResponse> {
    return this.materialesSvc.publicarPlanificado(materialId, dto, archivo, usuario, clientInfo.ip);
  }

  @Post("materiales/:materialId/reemplazar")
  @UseInterceptors(FileInterceptor("archivo", OPCIONES_SUBIDA))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Reemplazar el archivo o enlace de un material publicado" })
  @ApiParam({ name: "materialId", description: "UUID del material" })
  async reemplazar(
    @Param("materialId", ParseUUIDPipe) materialId: string,
    @Body() dto: ContenidoMaterialDto,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<MutacionMaterialResponse> {
    return this.materialesSvc.reemplazarMaterial(materialId, dto, archivo, usuario, clientInfo.ip);
  }

  @Patch("materiales/:materialId/retirar")
  @ApiOperation({ summary: "Retirar un material publicado (vigencia 0, no se elimina)" })
  @ApiParam({ name: "materialId", description: "UUID del material" })
  async retirar(
    @Param("materialId", ParseUUIDPipe) materialId: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<{ mensaje: string }> {
    return this.materialesSvc.retirarMaterial(materialId, usuario, clientInfo.ip);
  }

  @Post("materiales/:materialId/solicitudes-cambio-fecha")
  @ApiOperation({ summary: "Solicitar el cambio de fecha de un material con fecha congelada" })
  @ApiParam({ name: "materialId", description: "UUID del material" })
  async solicitarCambio(
    @Param("materialId", ParseUUIDPipe) materialId: string,
    @Body() dto: SolicitarCambioFechaDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<{ mensaje: string; id: string }> {
    return this.solicitudesSvc.solicitarCambioFecha(materialId, dto, usuario, clientInfo.ip);
  }
}
