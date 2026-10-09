import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { HEADER_ANIO_ACADEMICO } from "../../common/anio-lectivo";
import { MENU_SECCIONES } from "../../common/constants";
import { ClientInfo, type ClientInfoData, CurrentUser, MenuAccess } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import {
  AsignarDocenteDto,
  AsignarDocenteResultadoDto,
  CargaDocenteDetalleDto,
  CargaSeccionResponseDto,
} from "./dto";
import { CargaAcademicaService } from "./carga-academica.service";

@ApiTags("Carga Académica")
@ApiBearerAuth()
@ApiHeader({
  name: HEADER_ANIO_ACADEMICO,
  required: false,
  description: "Año lectivo de trabajo. Si se omite, se opera con el año en curso.",
})
@Controller()
export class CargaAcademicaController {
  constructor(private readonly service: CargaAcademicaService) {}

  @Get("secciones/:seccionId/carga")
  @ApiOperation({ summary: "Consultar la carga académica completa de una sección" })
  @ApiParam({ name: "seccionId", description: "UUID de la sección a consultar" })
  @ApiResponse({
    status: 200,
    description: "Carga académica de la sección con docentes y horas pedagógicas",
    type: CargaSeccionResponseDto,
  })
  async findBySeccion(
    @Param("seccionId", ParseUUIDPipe) seccionId: string,
  ): Promise<CargaSeccionResponseDto> {
    return this.service.findBySeccion(seccionId);
  }

  @Patch("carga-academica/:id/docente")
  @MenuAccess(MENU_SECCIONES)
  @ApiOperation({ summary: "Asignar o desasignar docente a un curso de la sección" })
  @ApiParam({ name: "id", description: "UUID del curso_seccion" })
  @ApiResponse({
    status: 200,
    description: "Docente asignado exitosamente y carga horaria recalculada",
    type: AsignarDocenteResultadoDto,
  })
  @ApiResponse({
    status: 400,
    description: "Solo se pueden asignar docentes activos",
  })
  @ApiResponse({
    status: 409,
    description: "El docente supera su jornada laboral (requiere confirmación)",
  })
  async asignarDocente(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AsignarDocenteDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<AsignarDocenteResultadoDto> {
    return this.service.asignarDocente(id, dto, usuario.id, clientInfo.ip);
  }

  @Get("carga-academica/docente/:docenteId")
  @ApiOperation({ summary: "Consultar la carga horaria y cursos asignados a un docente" })
  @ApiParam({ name: "docenteId", description: "UUID del docente a consultar" })
  @ApiResponse({
    status: 200,
    description: "Detalle de cursos y horas asignadas frente a su jornada laboral",
    type: CargaDocenteDetalleDto,
  })
  async findByDocente(
    @Param("docenteId", ParseUUIDPipe) docenteId: string,
  ): Promise<CargaDocenteDetalleDto> {
    return this.service.findByDocente(docenteId);
  }
}
