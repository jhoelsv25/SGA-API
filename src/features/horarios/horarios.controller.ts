import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
} from "@nestjs/common";
import type { Response } from "express";
import { Throttle } from "@nestjs/throttler";
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { HEADER_ANIO_ACADEMICO } from "../../common/anio-lectivo";
import { MENU_HORARIOS } from "../../common/constants";
import { ClientInfo, type ClientInfoData, CurrentUser, MenuAccess } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { MENSAJES_HORARIOS, REGEX_HORA_HH_MM } from "./constants";
import {
  BloqueMutacionResponseDto,
  BloquesLoteResponseDto,
  CopiarHorarioResponseDto,
  CreateBloqueHorarioDto,
  CrearBloquesLoteDto,
  GrillaPropuestaResponseDto,
  HorarioEstudianteResponseDto,
  ListarPorSeccionResponseDto,
  MiHorarioResponseDto,
  ProponerHorarioIaDto,
  PropuestaHorarioIaResponseDto,
  UpdateBloqueHorarioDto,
} from "./dto";
import { HorariosService } from "./horarios.service";

@ApiTags("Horarios")
@ApiBearerAuth()
@ApiHeader({
  name: HEADER_ANIO_ACADEMICO,
  required: false,
  description: "Año lectivo de trabajo. Si se omite, se opera con el año en curso.",
})
@Controller("horarios")
export class HorariosController {
  constructor(private readonly service: HorariosService) {}

  @Post("seccion/:seccionId/bloques")
  @MenuAccess(MENU_HORARIOS)
  @ApiOperation({ summary: "Crear un nuevo bloque de horario para una sección" })
  @ApiParam({ name: "seccionId", description: "UUID de la sección escolar" })
  @ApiResponse({
    status: 201,
    description: "Bloque registrado exitosamente",
    type: BloqueMutacionResponseDto,
  })
  async crearBloque(
    @Param("seccionId", ParseUUIDPipe) seccionId: string,
    @Body() dto: CreateBloqueHorarioDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<BloqueMutacionResponseDto> {
    return this.service.crearBloque(seccionId, dto, usuario.id, clientInfo.ip);
  }

  @Post("seccion/:seccionId/bloques/lote")
  @MenuAccess(MENU_HORARIOS)
  @ApiOperation({
    summary: "Guardar múltiples bloques de horario en lote (ideal tras propuesta IA/drag & drop)",
  })
  @ApiParam({ name: "seccionId", description: "UUID de la sección escolar" })
  @ApiResponse({
    status: 201,
    description: "Bloques guardados en lote exitosamente",
    type: BloquesLoteResponseDto,
  })
  async crearBloquesLote(
    @Param("seccionId", ParseUUIDPipe) seccionId: string,
    @Body() dto: CrearBloquesLoteDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<BloquesLoteResponseDto> {
    return this.service.crearBloquesLote(seccionId, dto, usuario.id, clientInfo.ip);
  }

  @Patch("bloques/:id")
  @MenuAccess(MENU_HORARIOS)
  @ApiOperation({ summary: "Actualizar un bloque de horario existente" })
  @ApiParam({ name: "id", description: "UUID del bloque de horario a modificar" })
  @ApiResponse({
    status: 200,
    description: "Bloque actualizado exitosamente",
    type: BloqueMutacionResponseDto,
  })
  async actualizarBloque(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateBloqueHorarioDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<BloqueMutacionResponseDto> {
    return this.service.actualizarBloque(id, dto, usuario.id, clientInfo.ip);
  }

  @Delete("bloques/:id")
  @MenuAccess(MENU_HORARIOS)
  @ApiOperation({ summary: "Eliminar un bloque de horario" })
  @ApiParam({ name: "id", description: "UUID del bloque de horario a eliminar" })
  @ApiResponse({
    status: 200,
    description: "Bloque eliminado exitosamente",
  })
  async eliminarBloque(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<void> {
    return this.service.eliminarBloque(id, usuario.id, clientInfo.ip);
  }

  @Get("pdf")
  @ApiOperation({
    summary: "Descargar horarios semanales consolidados en PDF (todas las secciones o filtrados)",
  })
  @ApiQuery({ name: "gradoId", required: false, description: "UUID del grado escolar (opcional)" })
  @ApiQuery({ name: "seccionId", required: false, description: "UUID de la sección (opcional)" })
  @ApiQuery({ name: "docenteId", required: false, description: "UUID del docente (opcional)" })
  @ApiResponse({ status: 200, description: "Archivo PDF consolidado de horarios semanales" })
  async descargarPdfConsolidado(
    @Res({ passthrough: true }) res: Response,
    @Query("gradoId", new ParseUUIDPipe({ optional: true })) gradoId?: string,
    @Query("seccionId", new ParseUUIDPipe({ optional: true })) seccionId?: string,
    @Query("docenteId", new ParseUUIDPipe({ optional: true })) docenteId?: string,
  ): Promise<StreamableFile> {
    const { buffer, nombreArchivo } = await this.service.generarHorariosConsolidadoPdf({
      gradoId,
      seccionId,
      docenteId,
    });
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      "Access-Control-Expose-Headers": "Content-Disposition",
      "Content-Length": buffer.length,
    });
    return new StreamableFile(buffer);
  }

  @Get("seccion/:seccionId")
  @ApiOperation({
    summary: "Listar bloques de horario de una sección con resumen de horas vs plan",
  })
  @ApiParam({ name: "seccionId", description: "UUID de la sección escolar" })
  @ApiResponse({
    status: 200,
    description: "Listado de bloques de la sección y resumen de horas",
    type: ListarPorSeccionResponseDto,
  })
  async listarPorSeccion(
    @Param("seccionId", ParseUUIDPipe) seccionId: string,
  ): Promise<ListarPorSeccionResponseDto> {
    return this.service.listarPorSeccion(seccionId);
  }

  @Get("seccion/:seccionId/pdf")
  @ApiOperation({ summary: "Descargar el horario semanal de una sección en PDF" })
  @ApiParam({ name: "seccionId", description: "UUID de la sección escolar" })
  @ApiQuery({
    name: "docenteId",
    required: false,
    description: "UUID del docente para filtrar los bloques de clase (opcional)",
  })
  @ApiResponse({ status: 200, description: "Archivo PDF del horario semanal" })
  async descargarPdfSeccion(
    @Param("seccionId", ParseUUIDPipe) seccionId: string,
    @Res({ passthrough: true }) res: Response,
    @Query("docenteId", new ParseUUIDPipe({ optional: true })) docenteId?: string,
  ): Promise<StreamableFile> {
    const { buffer, nombreArchivo } = await this.service.generarHorarioSeccionPdf(
      seccionId,
      docenteId,
    );
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      "Content-Length": buffer.length,
    });
    return new StreamableFile(buffer);
  }

  @Get("seccion/:seccionId/grilla")
  @ApiOperation({
    summary: "Proponer la grilla semanal de horario para una sección",
  })
  @ApiParam({ name: "seccionId", description: "UUID de la sección escolar" })
  @ApiQuery({
    name: "horaEntrada",
    required: false,
    description: "Hora de entrada en formato HH:mm (opcional)",
  })
  @ApiResponse({
    status: 200,
    description: "Grilla propuesta con bloques de clase y recesos",
    type: GrillaPropuestaResponseDto,
  })
  async proponerGrilla(
    @Param("seccionId", ParseUUIDPipe) seccionId: string,
    @Query("horaEntrada") horaEntrada?: string,
  ): Promise<GrillaPropuestaResponseDto> {
    if (horaEntrada && !REGEX_HORA_HH_MM.test(horaEntrada)) {
      throw new BadRequestException(MENSAJES_HORARIOS.FORMATO_HORA_INVALIDO);
    }
    return this.service.proponerGrilla(seccionId, horaEntrada);
  }

  @Post("seccion/:seccionId/proponer-ia")
  @MenuAccess(MENU_HORARIOS)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: "Proponer distribución de cursos en la grilla usando IA + validador sin cruces",
  })
  @ApiParam({ name: "seccionId", description: "UUID de la sección escolar" })
  @ApiResponse({
    status: 200,
    description: "Propuesta de horario validada sin cruces lista para ajustar y guardar",
    type: PropuestaHorarioIaResponseDto,
  })
  async proponerConIa(
    @Param("seccionId", ParseUUIDPipe) seccionId: string,
    @Body() dto: ProponerHorarioIaDto,
  ): Promise<PropuestaHorarioIaResponseDto> {
    return this.service.proponerConIa(seccionId, dto);
  }

  @Post("seccion/:destinoId/copiar-de/:origenId")
  @MenuAccess(MENU_HORARIOS)
  @ApiOperation({
    summary: "Copiar el horario de una sección a otra del mismo grado",
  })
  @ApiParam({ name: "destinoId", description: "UUID de la sección destino" })
  @ApiParam({ name: "origenId", description: "UUID de la sección origen" })
  @ApiResponse({
    status: 201,
    description: "Horario copiado exitosamente con detalle de posibles conflictos",
    type: CopiarHorarioResponseDto,
  })
  async copiar(
    @Param("origenId", ParseUUIDPipe) origenId: string,
    @Param("destinoId", ParseUUIDPipe) destinoId: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<CopiarHorarioResponseDto> {
    return this.service.copiar(origenId, destinoId, usuario.id, clientInfo.ip);
  }

  @Get("mi-horario")
  @ApiOperation({
    summary: "Consultar el horario semanal propio del docente autenticado",
  })
  @ApiResponse({
    status: 200,
    description: "Horario semanal del docente con bloques, sección, aula y color",
    type: MiHorarioResponseDto,
  })
  async miHorario(@CurrentUser() usuario: AuthenticatedUser): Promise<MiHorarioResponseDto> {
    return this.service.miHorario(usuario.personaId);
  }

  @Get("mi-horario/pdf")
  @ApiOperation({
    summary: "Descargar el horario semanal propio del docente autenticado en PDF",
  })
  @ApiResponse({ status: 200, description: "Archivo PDF del horario semanal del docente" })
  async descargarMiHorarioPdf(
    @CurrentUser() usuario: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, nombreArchivo } = await this.service.generarMiHorarioPdf(usuario.personaId);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      "Content-Length": buffer.length,
    });
    return new StreamableFile(buffer);
  }

  @Get("estudiante/:estudianteId")
  @ApiOperation({
    summary: "Consultar el horario semanal de la sección asignada a un estudiante",
  })
  @ApiParam({ name: "estudianteId", description: "UUID del estudiante a consultar" })
  @ApiResponse({
    status: 200,
    description: "Horario de la sección asignada al estudiante",
    type: HorarioEstudianteResponseDto,
  })
  async horarioDeEstudiante(
    @Param("estudianteId", ParseUUIDPipe) estudianteId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<HorarioEstudianteResponseDto> {
    return this.service.horarioDeEstudiante(estudianteId, usuario);
  }

  @Get("estudiante/:estudianteId/pdf")
  @ApiOperation({
    summary: "Descargar el horario semanal de la sección asignada a un estudiante en PDF",
  })
  @ApiParam({ name: "estudianteId", description: "UUID del estudiante a consultar" })
  @ApiResponse({ status: 200, description: "Archivo PDF del horario semanal del estudiante" })
  async descargarPdfEstudiante(
    @Param("estudianteId", ParseUUIDPipe) estudianteId: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, nombreArchivo } = await this.service.generarHorarioEstudiantePdf(
      estudianteId,
      usuario,
    );
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      "Content-Length": buffer.length,
    });
    return new StreamableFile(buffer);
  }
}
