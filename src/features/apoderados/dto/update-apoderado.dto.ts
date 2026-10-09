import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { GRADOS_INSTRUCCION, type GradoInstruccion } from "../constants";

export class UpdateApoderadoDto {
  @ApiPropertyOptional({
    description: "Ocupación o profesión del apoderado",
    example: "Contador Público",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ocupacion?: string;

  @ApiPropertyOptional({
    description: "Empresa o centro laboral",
    example: "Estudio Contable Ramos & Asociados",
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  centroLaboral?: string;

  @ApiPropertyOptional({
    description: "Teléfono laboral",
    example: "014567890",
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefonoLaboral?: string;

  @ApiPropertyOptional({
    description: "Grado de instrucción",
    enum: GRADOS_INSTRUCCION,
    example: "universitaria",
  })
  @IsOptional()
  @IsIn(GRADOS_INSTRUCCION, {
    message:
      "El grado de instrucción debe ser: sin_estudios, primaria, secundaria, tecnica, universitaria o posgrado.",
  })
  gradoInstruccion?: GradoInstruccion;
}
