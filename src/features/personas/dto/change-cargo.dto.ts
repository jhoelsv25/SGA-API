import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsUUID } from "class-validator";

export class ChangeCargoDto {
  @ApiProperty({ description: "ID del nuevo cargo a asignar" })
  @IsUUID()
  cargoId: string;

  @ApiPropertyOptional({
    description: "Fecha desde la que inicia el nuevo cargo (por defecto, hoy)",
    example: "2027-08-01",
  })
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;
}

export class CargoAsignadoResponseDto {
  @ApiProperty({ description: "Nombre del cargo vigente" })
  cargoVigente: string;

  @ApiProperty({ description: "Roles sugeridos por el nuevo cargo (IDs)", type: [String] })
  rolesSugeridosIds: string[];
}
