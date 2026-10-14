import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class MensajeConsolidadoResponseDto {
  @ApiProperty({
    description: "Mensaje informativo o de confirmación de la operación",
    example: "Consolidado del II Bimestre generado para 24 docentes.",
  })
  mensaje!: string;

  @ApiPropertyOptional({
    description: "Cantidad de elementos procesados o generados",
    example: 24,
  })
  cantidad?: number;

  @ApiPropertyOptional({
    description: "Identificador del registro afectado",
    example: "c1098c1a-f86e-11da-bd1a-00112444be3e",
  })
  id?: string;

  @ApiPropertyOptional({
    description: "Número de versión generada",
    example: 2,
  })
  version?: number;
}
