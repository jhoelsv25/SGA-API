import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { DashboardService } from "./dashboard.service";
import { DashboardFiltrosDto, DashboardResponseDto } from "./dto";

@ApiTags("Dashboard")
@ApiBearerAuth()
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("resumen")
  @ApiOperation({
    summary: "Obtener métricas, KPIs y gráficos del dashboard según el rol del usuario autenticado",
  })
  @ApiResponse({
    status: 200,
    description: "Métricas y datos analíticos del dashboard",
    type: DashboardResponseDto,
  })
  async getResumen(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filtros: DashboardFiltrosDto,
  ): Promise<DashboardResponseDto> {
    return this.dashboardService.getDashboardData(user, filtros);
  }
}
