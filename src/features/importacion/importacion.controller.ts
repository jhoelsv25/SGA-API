import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  StreamableFile,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { nombreArchivoReporte } from "../../common/excel/reporte-excel.builder";
import { ClientInfo, type ClientInfoData, CurrentUser, Roles } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { TIPO_IMPORTACION, type TipoImportacion } from "./constants";
import {
  EjecutarImportacionDto,
  EstadoImportacionJobDto,
  IniciarImportacionResponseDto,
  PrevisualizarImportacionDto,
  VistaPreviaResponseDto,
} from "./dto";
import { InstitucionService } from "../institucion/institucion.service";
import { ImportacionService } from "./importacion.service";

@ApiTags("Comunidad - Importación Masiva")
@ApiBearerAuth()
@Controller("importacion")
export class ImportacionController {
  constructor(
    private readonly importacionService: ImportacionService,
    private readonly institucionService: InstitucionService,
  ) {}

  @Get("plantilla/:tipo")
  @Roles("Administrador", "Secretaria")
  @ApiOperation({
    summary: "Descargar plantilla Excel para carga masiva",
    description:
      "Genera y descarga un archivo .xlsx con los encabezados requeridos y una fila de ejemplo para el tipo especificado.",
  })
  @ApiParam({
    name: "tipo",
    enum: Object.values(TIPO_IMPORTACION),
    description: "Tipo de entidad a importar (personas, estudiantes, docentes, apoderados)",
  })
  async descargarPlantilla(
    @Param("tipo") tipo: TipoImportacion,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.importacionService.generarPlantillaExcel(tipo);

    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="plantilla_${tipo}.xlsx"`,
      "Content-Length": buffer.length,
    });

    return new StreamableFile(buffer);
  }

  @Post("previsualizar")
  @Roles("Administrador", "Secretaria")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Previsualizar archivo de importación masiva",
    description:
      "Valida hasta 500 filas del lote, clasifica cada fila con semáforo (válida, ya registrada, error) y detecta duplicados.",
  })
  @ApiResponse({ status: 200, type: VistaPreviaResponseDto })
  async previsualizar(@Body() dto: PrevisualizarImportacionDto): Promise<VistaPreviaResponseDto> {
    return this.importacionService.previsualizar(dto);
  }

  @Post("ejecutar")
  @Roles("Administrador", "Secretaria")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Ejecutar la importación en segundo plano con BullMQ",
    description:
      "Encola el lote de importación masiva en BullMQ y retorna el jobId para seguimiento asíncrono y descarga de credenciales en Redis.",
  })
  @ApiResponse({ status: 200, type: IniciarImportacionResponseDto })
  async ejecutar(
    @Body() dto: EjecutarImportacionDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<IniciarImportacionResponseDto> {
    return this.importacionService.ejecutar(dto, user.id, clientInfo.ip);
  }

  @Get("jobs/:id")
  @Roles("Administrador", "Secretaria")
  @ApiOperation({
    summary: "Consultar progreso y resultado del trabajo de importación masiva",
    description:
      "Devuelve el estado, porcentaje de avance (0 a 100) y el resultado con credenciales guardadas en Redis al finalizar.",
  })
  @ApiParam({ name: "id", description: "ID del trabajo en BullMQ" })
  @ApiResponse({ status: 200, type: EstadoImportacionJobDto })
  async consultarEstadoJob(@Param("id") id: string): Promise<EstadoImportacionJobDto> {
    return this.importacionService.consultarEstadoJob(id);
  }

  @Get("jobs/:id/credenciales-excel")
  @Roles("Administrador", "Secretaria")
  @ApiOperation({
    summary: "Descargar reporte Excel de credenciales generadas en segundo plano",
    description:
      "Genera y envía el buffer binario del archivo Excel con los usuarios, contraseñas temporales y PINs almacenados en Redis.",
  })
  @ApiParam({ name: "id", description: "ID del trabajo en BullMQ" })
  async descargarCredencialesExcel(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const institucion = await this.institucionService.get().catch(() => null);
    const buffer = await this.importacionService.generarReporteCredencialesExcel(id, {
      institucion: institucion?.nombre ?? "SGA Colegio",
      generadoPor: user.username,
    });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${nombreArchivoReporte("credenciales")}"`,
    );
    res.send(buffer);
  }
}
