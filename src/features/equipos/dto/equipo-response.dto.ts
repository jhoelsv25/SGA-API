import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { EQUIPO_PROPOSITOS, EQUIPO_TIPOS, EquipoProposito, EquipoTipo } from "../constants";

export class EquipoResponseDto {
  @ApiProperty({ description: "ID del equipo (UUID)" })
  id!: string;

  @ApiProperty({ description: "Nombre del equipo" })
  nombre!: string;

  @ApiProperty({ description: "Ubicación física" })
  ubicacion!: string;

  @ApiProperty({ description: "Tipo de equipo", enum: EQUIPO_TIPOS })
  tipo!: EquipoTipo;

  @ApiProperty({ description: "Propósito del equipo", enum: EQUIPO_PROPOSITOS })
  proposito!: EquipoProposito;

  @ApiProperty({ description: "Usuarios permitidos" })
  usuariosPermitidos!: string;

  @ApiPropertyOptional({ description: "Número de serie" })
  numeroSerie?: string | null;

  @ApiProperty({ description: "Indica si el equipo ya fue autorizado" })
  autorizado!: boolean;

  @ApiPropertyOptional({ description: "Fecha de autorización ISO-8601" })
  autorizadoEn?: string | null;

  @ApiPropertyOptional({ description: "ID del usuario que autorizó el equipo" })
  autorizadoPorId?: string | null;

  @ApiProperty({ description: "Indica si el equipo está activo" })
  activo!: boolean;

  @ApiPropertyOptional({ description: "Último acceso registrado" })
  ultimoAcceso?: string | null;

  @ApiPropertyOptional({ description: "IP de registro" })
  ipRegistro?: string | null;

  @ApiPropertyOptional({ description: "RF-022: último aviso de la app puente (solo biométricos)" })
  ultimoLatidoEn?: string | null;

  @ApiPropertyOptional({ description: "RF-022: última vez que el reloj respondió a la app puente" })
  relojRespondioEn?: string | null;

  @ApiPropertyOptional({
    description: "RF-022: desfase (minutos) de la hora del reloj en el último aviso",
  })
  ultimoDesfaseMin?: number | null;

  @ApiProperty({ description: "Fecha de creación ISO-8601" })
  creadoEn!: string;

  @ApiProperty({ description: "Fecha de última actualización ISO-8601" })
  actualizadoEn!: string;
}
