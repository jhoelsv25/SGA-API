import { Controller, Get, Query, Res, StreamableFile } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { MENU_INFORME_HORAS_EFECTIVAS, MENU_PENDIENTES_SEGUIMIENTO } from "@/common/constants";
import { CurrentUser, MenuAccess } from "@/common/decorators";
import { nombreArchivoReporte } from "@/common/excel/reporte-excel.builder";
import type { AuthenticatedUser } from "@/features/auth/interfaces/jwt-payload.interface";
import { InformeMensualQueryDto, PendientesQueryDto } from "./dto";
import type { ActorConsolidado } from "./interfaces";
import { SeguimientoReportesService } from "./seguimiento-reportes.service";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function actorDe(usuario: AuthenticatedUser): ActorConsolidado {
  return {
    id: usuario.id,
    roleId: usuario.roleId,
    role: usuario.role,
    personaId: usuario.personaId,
  };
}

/** Reportes del seguimiento docente (RF-013 V2, HU6 y HU7). */
@ApiTags("Seguimiento docente - reportes")
@ApiBearerAuth()
@Controller("seguimiento-docente")
export class SeguimientoReportesController {
  constructor(private readonly service: SeguimientoReportesService) {}

  @Get("pendientes")
  @MenuAccess(MENU_PENDIENTES_SEGUIMIENTO)
  @ApiOperation({ summary: "Pendientes de seguimiento: conteos por tipo y listado" })
  pendientes(@Query() query: PendientesQueryDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.service.pendientes(query, actorDe(usuario));
  }

  @Get("pendientes/exportar/excel")
  @MenuAccess(MENU_PENDIENTES_SEGUIMIENTO)
  @ApiOperation({ summary: "Exporta a Excel los pendientes (con los filtros indicados)" })
  async exportarPendientes(
    @Query() query: PendientesQueryDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.service.exportarPendientes(query, actorDe(usuario), usuario.username);
    res.set({
      "Content-Type": XLSX,
      "Content-Disposition": `attachment; filename="${nombreArchivoReporte("pendientes-seguimiento")}"`,
      "Content-Length": buffer.length,
    });
    return new StreamableFile(buffer);
  }

  @Get("informe-mensual/excel")
  @MenuAccess(MENU_INFORME_HORAS_EFECTIVAS)
  @ApiOperation({
    summary: "Informe mensual de horas efectivas en Excel (solo se genera, no se envía)",
  })
  async informeMensual(
    @Query() query: InformeMensualQueryDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.service.informeMensualExcel(
      query.mes,
      actorDe(usuario),
      usuario.username,
    );
    res.set({
      "Content-Type": XLSX,
      "Content-Disposition": `attachment; filename="${nombreArchivoReporte("informe-horas-efectivas")}"`,
      "Content-Length": buffer.length,
    });
    return new StreamableFile(buffer);
  }
}
