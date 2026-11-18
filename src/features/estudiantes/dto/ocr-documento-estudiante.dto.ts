import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class OcrDocumentoEstudianteResponseDto {
  @ApiPropertyOptional({ nullable: true, example: "71234567" })
  dni!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "QUISPE" })
  apellidoPaterno!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "MAMANI" })
  apellidoMaterno!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "LUCÍA VALERIA" })
  nombres!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "2015-04-12" })
  fechaNacimiento!: string | null;

  @ApiPropertyOptional({ nullable: true, enum: ["M", "F"] })
  sexo!: "M" | "F" | null;

  @ApiProperty({ example: "mistral" })
  estrategia!: string;
}
