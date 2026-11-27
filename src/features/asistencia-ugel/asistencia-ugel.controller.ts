import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { MENU_MARCACIONES_HOY } from "../../common/constants";
import { ClientInfo, type ClientInfoData, CurrentUser, MenuAccess } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { AsistenciaUgelService } from "./asistencia-ugel.service";
import { AnularNovedadDto, CrearNovedadDto, MesQueryDto } from "./dto";
import { generarAnexosExcel } from "./utils/anexos-excel.util";
import { generarAnexosPdf } from "./utils/anexos-pdf.util";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

@ApiTags("Reporte de asistencia a la UGEL")
@ApiBearerAuth()
@MenuAccess(MENU_MARCACIONES_HOY)
@Controller("asistencia-ugel")
export class AsistenciaUgelController {
  constructor(private readonly service: AsistenciaUgelService) {}

  @Get("reporte")
  @ApiOperation({ summary: "Vista previa de los Anexos 03 y 04 de un mes, con avisos de revisión" })
  reporte(@Query() query: MesQueryDto) {
    return this.service.reporte(query.mes);
  }

  @Get("reporte/documento.xlsx")
  @ApiOperation({ summary: "Anexos 03 y 04 en Excel (editable)" })
  async excel(@Query() query: MesQueryDto, @Res({ passthrough: true }) res: Response) {
    const buffer = await generarAnexosExcel(await this.service.reporte(query.mes));
    res.set({
      "Content-Type": XLSX,
      "Content-Disposition": `attachment; filename="asistencia-ugel-${query.mes}.xlsx"`,
    });
    return new StreamableFile(buffer);
  }

  @Get("reporte/documento.pdf")
  @ApiOperation({ summary: "Anexos 03 y 04 en PDF para firma del director" })
  async pdf(@Query() query: MesQueryDto, @Res({ passthrough: true }) res: Response) {
    const buffer = await generarAnexosPdf(await this.service.reporte(query.mes));
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="asistencia-ugel-${query.mes}.pdf"`,
    });
    return new StreamableFile(buffer);
  }

  @Get("personas")
  personas(@Query() query: MesQueryDto) {
    return this.service.personas(query.mes);
  }

  @Get("novedades")
  @ApiOperation({ summary: "Licencias, permisos, vacaciones, huelgas y omisiones justificadas" })
  novedades(@Query() query: MesQueryDto) {
    return this.service.listarNovedades(query.mes);
  }

  @Post("novedades")
  registrar(
    @Body() dto: CrearNovedadDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() cliente: ClientInfoData,
  ) {
    return this.service.registrarNovedad(dto, usuario.id, cliente.ip);
  }

  @Patch("novedades/:id/anular")
  anular(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AnularNovedadDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() cliente: ClientInfoData,
  ) {
    return this.service.anularNovedad(id, dto.motivo, usuario.id, cliente.ip);
  }
}
