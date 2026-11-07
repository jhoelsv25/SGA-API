import { Controller, Get, Query, Res, StreamableFile } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { CurrentUser, Roles } from "../../common/decorators";
import { ApoderadoQueryDto as ApoderadoQuery } from "../apoderados/dto";
import { DocenteQueryDto } from "../docentes/dto";
import { EstudianteQueryDto } from "../estudiantes/dto";
import { PersonaQueryDto } from "../personas/dto";
import { UserQueryDto } from "../users/dto";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { ExportacionService, type ReporteGenerado } from "./exportacion.service";

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
@Controller("exportacion")
export class ExportacionController {
  constructor(private readonly servicio: ExportacionService) {}

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
}
