import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CampoModificadoDto {
  @ApiProperty({ description: "Nombre del campo", example: "apellidoMaterno" })
  campo: string;

  @ApiPropertyOptional({ description: "Valor anterior", example: "Ramos" })
  valorAnterior: unknown;

  @ApiPropertyOptional({ description: "Valor nuevo corregido", example: "Romero" })
  valorNuevo: unknown;
}

export class HistorialCorreccionCriticaDto {
  @ApiProperty({ description: "ID del registro de auditoría", example: 104 })
  id: number;

  @ApiProperty({ description: "Fecha y hora en que se realizó la corrección (ISO 8601)" })
  fechaHora: string;

  @ApiPropertyOptional({
    description: "Nombre del usuario o cuenta que realizó la corrección",
    example: "admin",
  })
  usuarioNombre: string | null;

  @ApiProperty({
    description: "Motivo o justificación registrada",
    example: "Rectificación según partida de nacimiento",
  })
  motivo: string;

  @ApiProperty({ description: "Campos que fueron modificados", type: [CampoModificadoDto] })
  camposModificados: CampoModificadoDto[];

  @ApiPropertyOptional({ description: "Dirección IP desde donde se solicitó" })
  direccionIp?: string | null;
}
