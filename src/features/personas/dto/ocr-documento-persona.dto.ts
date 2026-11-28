import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class OcrDocumentoPersonaResponseDto {
  @ApiPropertyOptional({ nullable: true, example: "45678912" })
  dni!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "QUISPE" })
  apellidoPaterno!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "MAMANI" })
  apellidoMaterno!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "MARÍA ELENA" })
  nombres!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "1988-05-14" })
  fechaNacimiento!: string | null;

  @ApiPropertyOptional({ nullable: true, enum: ["M", "F"] })
  sexo!: "M" | "F" | null;

  @ApiProperty({ example: "mistral" })
  estrategia!: string;
}
