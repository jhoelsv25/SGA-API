import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AdminKpisDto {
  @ApiProperty()
  totalUsuarios!: number;

  @ApiProperty()
  usuariosActivos!: number;

  @ApiProperty()
  usuariosBloqueados!: number;

  @ApiProperty()
  usuariosInactivos!: number;

  @ApiProperty()
  intentosFallidosHoy!: number;

  @ApiProperty()
  sinAcceso30Dias!: number;

  @ApiProperty()
  totalEquipos!: number;

  @ApiProperty()
  equiposActivos!: number;
}

export class DistribucionUsuariosRolDto {
  @ApiProperty()
  rol!: string;

  @ApiProperty()
  cantidad!: number;

  @ApiProperty()
  fill!: string;
}

export class AuditoriaRecienteItemDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  accion!: string;

  @ApiProperty()
  tabla!: string;

  @ApiProperty()
  usuarioNombre!: string;

  @ApiProperty()
  fecha!: string;

  @ApiPropertyOptional()
  ip?: string | null;
}

export class AdminActividadSemanalDto {
  @ApiProperty()
  dia!: string;

  @ApiProperty()
  fecha!: string;

  @ApiProperty()
  totalEventos!: number;

  @ApiProperty()
  iniciosSesion!: number;

  @ApiProperty()
  cambios!: number;
}

export class AdminEquipoRecienteDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty()
  tipo!: string;

  @ApiPropertyOptional()
  ultimoAcceso?: string | null;

  @ApiProperty()
  autorizado!: boolean;

  @ApiProperty()
  activo!: boolean;
}

export class AdminServicioEstadoDto {
  @ApiProperty()
  nombre!: string;

  @ApiProperty({ enum: ["operacional", "degradado", "inactivo"] })
  estado!: "operacional" | "degradado" | "inactivo";

  @ApiProperty()
  detalle!: string;
}

export class AdminDashboardDataDto {
  @ApiProperty({ type: AdminKpisDto })
  kpis!: AdminKpisDto;

  @ApiProperty({ type: [DistribucionUsuariosRolDto] })
  distribucionRoles!: DistribucionUsuariosRolDto[];

  @ApiProperty({ type: [AuditoriaRecienteItemDto] })
  ultimasAuditorias!: AuditoriaRecienteItemDto[];

  @ApiPropertyOptional({ type: [AdminActividadSemanalDto] })
  actividadSemanal?: AdminActividadSemanalDto[];

  @ApiPropertyOptional({ type: [AdminEquipoRecienteDto] })
  equiposRecientes?: AdminEquipoRecienteDto[];

  @ApiPropertyOptional({ type: [AdminServicioEstadoDto] })
  servicios?: AdminServicioEstadoDto[];
}
