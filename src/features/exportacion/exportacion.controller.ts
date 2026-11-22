import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
} from "@nestjs/common";
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { createReadStream } from "fs";
import type { Response } from "express";
import { HEADER_ANIO_ACADEMICO } from "../../common/anio-lectivo";
import { ClientInfo, type ClientInfoData, CurrentUser, Roles } from "../../common/decorators";
import { ApoderadoQueryDto as ApoderadoQuery } from "../apoderados/dto";
import { DocenteQueryDto } from "../docentes/dto";
import { EstudianteQueryDto } from "../estudiantes/dto";
import { MatriculaQueryDto } from "../matriculas/dto";
import { PersonaQueryDto } from "../personas/dto";
import { UserQueryDto } from "../users/dto";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import {
  ExportarAsistenciaPersonalQueryDto,
  ExportarAsistenciaSeccionQueryDto,
  ExportarLibretasQueryDto,
  ExportarMarcacionesQueryDto,
  SolicitarReporteDto,
  TrabajoReporteResponseDto,
} from "./dto";
import { ExportacionService, type ReporteGenerado } from "./exportacion.service";
import { ReportesColaService } from "./services";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function enviar(res: Response, r: ReporteGenerado): StreamableFile {
  res.set({
    "Content-Type": XLSX,
    "Content-Disposition": `attachment; filename="${r.nombreArchivo}"`,
    "Access-Control-Expose-Headers": "Content-Disposition",
  });
  return new StreamableFile(r.buffer);
}

/** Reportes Excel estándar (skill `estandar-reportes-excel`): todas las filas que cumplen los filtros. */
@ApiTags("Reportes - Exportación Excel")
@ApiBearerAuth()
@ApiHeader({
  name: HEADER_ANIO_ACADEMICO,
  required: false,
  description: "Año académico de trabajo (opcional; por defecto el año en curso).",
})
@Controller("exportacion")
export class ExportacionController {
  constructor(
    private readonly servicio: ExportacionService,
    private readonly reportesCola: ReportesColaService,
  ) {}

  @Post("trabajos")
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles("Administrador", "Secretaria", "Director", "Subdirector", "Auxiliar", "Docente")
  @ApiOperation({
    summary: "Encolar la generación asíncrona de un reporte Excel en BullMQ (reports-queue)",
  })
  @ApiResponse({ status: 202, type: TrabajoReporteResponseDto })
  async encolarTrabajo(
    @Body() dto: SolicitarReporteDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<TrabajoReporteResponseDto> {
    return this.reportesCola.encolar(dto, user, client.ip);
  }

  @Get("trabajos")
  @Roles("Administrador", "Secretaria", "Director", "Subdirector", "Auxiliar", "Docente")
  @ApiOperation({ summary: "Listar trabajos de reportes recientes del usuario en cola BullMQ" })
  @ApiResponse({ status: 200, type: [TrabajoReporteResponseDto] })
  async listarTrabajos(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TrabajoReporteResponseDto[]> {
    return this.reportesCola.listarTrabajosUsuario(user);
  }

  @Get("trabajos/:jobId")
  @Roles("Administrador", "Secretaria", "Director", "Subdirector", "Auxiliar", "Docente")
  @ApiOperation({ summary: "Consultar estado y progreso de un trabajo de reporte" })
  @ApiResponse({ status: 200, type: TrabajoReporteResponseDto })
  async obtenerTrabajo(
    @Param("jobId") jobId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TrabajoReporteResponseDto> {
    return this.reportesCola.obtenerTrabajo(jobId, user);
  }

  @Get("trabajos/:jobId/descargar")
  @Roles("Administrador", "Secretaria", "Director", "Subdirector", "Auxiliar", "Docente")
  @ApiOperation({ summary: "Descargar el archivo Excel generado por un trabajo completado" })
  async descargarTrabajo(
    @Param("jobId") jobId: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { rutaArchivo, nombreArchivo } = await this.reportesCola.obtenerArchivoDescarga(
      jobId,
      user,
      client.ip,
    );
    res.set({
      "Content-Type": XLSX,
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      "Access-Control-Expose-Headers": "Content-Disposition",
    });
    return new StreamableFile(createReadStream(rutaArchivo));
  }

  @Delete("trabajos/:jobId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles("Administrador", "Secretaria", "Director", "Subdirector", "Auxiliar", "Docente")
  @ApiOperation({ summary: "Quitar un reporte finalizado de la lista de descargas recientes" })
  async eliminarTrabajo(
    @Param("jobId") jobId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.reportesCola.eliminarTrabajo(jobId, user);
  }

  @Delete("trabajos")
  @Roles("Administrador", "Secretaria", "Director", "Subdirector", "Auxiliar", "Docente")
  @ApiOperation({ summary: "Limpiar todos los reportes finalizados del usuario" })
  async limpiarTrabajos(@CurrentUser() user: AuthenticatedUser): Promise<{ eliminados: number }> {
    return this.reportesCola.limpiarTrabajosUsuario(user);
  }

  @Get("personas")
  @Roles("Administrador", "Secretaria")
  @ApiOperation({ summary: "Exportar a Excel el padrón de personas con los filtros actuales" })
  async personas(
    @Query() q: PersonaQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return enviar(res, await this.servicio.personasExcel(q, user));
  }

  @Get("estudiantes")
  @Roles("Administrador", "Secretaria")
  @ApiOperation({ summary: "Exportar a Excel los estudiantes con los filtros actuales" })
  async estudiantes(
    @Query() q: EstudianteQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return enviar(res, await this.servicio.estudiantesExcel(q, user));
  }

  @Get("docentes")
  @Roles("Administrador", "Secretaria")
  @ApiOperation({ summary: "Exportar a Excel los docentes con los filtros actuales" })
  async docentes(
    @Query() q: DocenteQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return enviar(res, await this.servicio.docentesExcel(q, user));
  }

  @Get("apoderados")
  @Roles("Administrador", "Secretaria")
  @ApiOperation({ summary: "Exportar a Excel los apoderados (una fila por estudiante vinculado)" })
  async apoderados(
    @Query() q: ApoderadoQuery,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return enviar(res, await this.servicio.apoderadosExcel(q, user));
  }

  @Get("usuarios")
  @Roles("Administrador")
  @ApiOperation({ summary: "Exportar a Excel los usuarios del sistema con los filtros actuales" })
  async usuarios(
    @Query() q: UserQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return enviar(res, await this.servicio.usuariosExcel(q, user));
  }

  @Get("matriculas")
  @Roles("Administrador", "Secretaria", "Director", "Subdirector")
  @ApiOperation({ summary: "Exportar a Excel la nómina de matrículas del año académico" })
  async matriculas(
    @Query() q: MatriculaQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return enviar(res, await this.servicio.matriculasExcel(q, user));
  }

  @Get("marcaciones")
  @Roles("Administrador", "Secretaria", "Director", "Subdirector", "Auxiliar")
  @ApiOperation({
    summary: "Exportar a Excel el reporte de asistencia y marcaciones por período o fechas",
  })
  async marcaciones(
    @Query() q: ExportarMarcacionesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return enviar(res, await this.servicio.marcacionesExcel(q, user));
  }

  @Get("libretas")
  @Roles("Administrador", "Secretaria", "Director", "Subdirector", "Docente")
  @ApiOperation({
    summary: "Exportar a Excel el seguimiento y detalle de entrega de libretas SIAGIE por bimestre",
  })
  async libretas(
    @Query() q: ExportarLibretasQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return enviar(res, await this.servicio.libretasExcel(q, user));
  }

  @Get("asistencia-seccion")
  @Roles("Administrador", "Secretaria", "Director", "Subdirector", "Auxiliar", "Docente")
  @ApiOperation({
    summary:
      "Exportar a Excel la asistencia consolidada (colegio + por curso) por sección, grado o todo el colegio",
  })
  async asistenciaSeccion(
    @Query() q: ExportarAsistenciaSeccionQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return enviar(res, await this.servicio.asistenciaSeccionExcel(q, user));
  }

  @Get("asistencia-personal")
  @Roles("Administrador", "Secretaria", "Director", "Subdirector", "Auxiliar")
  @ApiOperation({
    summary:
      "Exportar a Excel la asistencia consolidada de docentes y personal administrativo (resumen + detalle)",
  })
  async asistenciaPersonal(
    @Query() q: ExportarAsistenciaPersonalQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return enviar(res, await this.servicio.asistenciaPersonalExcel(q, user));
  }
}
