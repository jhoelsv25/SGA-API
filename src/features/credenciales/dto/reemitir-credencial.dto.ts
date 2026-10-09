import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUUID, MaxLength, MinLength } from "class-validator";
import { CREDENCIAL_MESSAGES } from "../constants";

export class ReemitirCredencialDto {
  @ApiProperty({
    description: "ID de la persona a quien se le anula y reemite la credencial",
    example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  })
  @IsUUID("4", { message: "El ID de persona debe ser un UUID válido" })
  @IsNotEmpty({ message: "El ID de persona es obligatorio" })
  personaId: string;

  @ApiProperty({
    description: "Motivo de la anulación y reemisión de la credencial (ej. 'Pérdida de carné')",
    example: "Pérdida de carné escolar",
  })
  @IsString({ message: "El motivo debe ser una cadena de texto" })
  @MinLength(3, { message: CREDENCIAL_MESSAGES.MOTIVO_REQUERIDO })
  @MaxLength(255, { message: "El motivo no puede exceder los 255 caracteres" })
  @IsNotEmpty({ message: CREDENCIAL_MESSAGES.MOTIVO_REQUERIDO })
  motivo: string;
}
