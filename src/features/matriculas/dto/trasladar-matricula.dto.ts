import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class TrasladarMatriculaDto {
  @ApiProperty({ description: "Fecha de traslado (YYYY-MM-DD)", example: "2027-08-15" })
  @IsDateString({}, { message: "Formato de fecha inválido (debe ser YYYY-MM-DD)" })
  @IsNotEmpty({ message: "La fecha de traslado es obligatoria" })
  fechaRetiro!: string;

  @ApiProperty({
    description: "Colegio de destino al que se traslada",
    example: "I.E. Alfonso Ugarte",
  })
  @IsString({ message: "El colegio de destino debe ser una cadena de texto" })
  @IsNotEmpty({ message: "El colegio de destino es obligatorio" })
  @MinLength(3, { message: "El nombre del colegio debe tener al menos 3 caracteres" })
  @MaxLength(150, { message: "El nombre del colegio no puede exceder 150 caracteres" })
  colegioDestino!: string;

  @ApiPropertyOptional({
    description: "Motivo u observaciones adicionales",
    example: "Traslado por cambio de trabajo de apoderado",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: "El motivo no puede exceder 255 caracteres" })
  motivo?: string;
}
