import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AdminDashboardDataDto } from "./admin-dashboard.dto";
import { DirectivoDashboardDataDto } from "./directivo-dashboard.dto";
import { DocenteDashboardDataDto } from "./docente-dashboard.dto";
import { EstudianteDashboardDataDto } from "./estudiante-dashboard.dto";
import { SecretariaDashboardDataDto } from "./secretaria-dashboard.dto";

export * from "./admin-dashboard.dto";
export * from "./directivo-dashboard.dto";
export * from "./docente-dashboard.dto";
export * from "./estudiante-dashboard.dto";
export * from "./secretaria-dashboard.dto";

export class PeriodoActualInfoDto {
  @ApiProperty()
  anioId!: string;

  @ApiProperty()
  anio!: number;

  @ApiPropertyOptional()
  periodoId?: string | null;

  @ApiPropertyOptional()
  periodoNombre?: string | null;
}

export class DashboardResponseDto {
  @ApiProperty({
    enum: ["directivo", "docente", "estudiante", "apoderado", "admin", "secretaria", "adicional"],
  })
  rolCategoria!:
    "directivo" | "docente" | "estudiante" | "apoderado" | "admin" | "secretaria" | "adicional";

  @ApiProperty()
  rolNombre!: string;

  @ApiProperty({ type: PeriodoActualInfoDto })
  periodoActual!: PeriodoActualInfoDto;

  @ApiPropertyOptional({ type: DirectivoDashboardDataDto })
  directivo?: DirectivoDashboardDataDto;

  @ApiPropertyOptional({ type: DocenteDashboardDataDto })
  docente?: DocenteDashboardDataDto;

  @ApiPropertyOptional({ type: EstudianteDashboardDataDto })
  estudiante?: EstudianteDashboardDataDto;

  @ApiPropertyOptional({ type: AdminDashboardDataDto })
  admin?: AdminDashboardDataDto;

  @ApiPropertyOptional({ type: SecretariaDashboardDataDto })
  secretaria?: SecretariaDashboardDataDto;
}
