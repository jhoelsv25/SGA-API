import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateCargoDto {
  @ApiProperty({ example: "Coordinador(a) académico" })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "El nombre debe ser texto" })
  @IsNotEmpty({ message: "El nombre del cargo es obligatorio" })
  @MaxLength(80, { message: "El nombre no puede superar 80 caracteres" })
  nombre!: string;

  @ApiPropertyOptional({ example: "Coordinación pedagógica" })
  @IsOptional()
  @IsString({ message: "La descripción debe ser texto" })
  @MaxLength(255, { message: "La descripción no puede superar 255 caracteres" })
  descripcion?: string;

  @ApiPropertyOptional({
    description: "IDs de los roles que se sugieren al asignar este cargo (solo sugerencia)",
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: "Los roles sugeridos deben ser una lista" })
  @IsUUID("all", { each: true, message: "Cada rol sugerido debe ser un UUID válido" })
  rolesSugeridosIds?: string[];
}

export class UpdateCargoDto {
  @ApiPropertyOptional({ example: "Coordinador(a) académico" })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "El nombre debe ser texto" })
  @IsNotEmpty({ message: "El nombre del cargo es obligatorio" })
  @MaxLength(80, { message: "El nombre no puede superar 80 caracteres" })
  nombre?: string;

  @ApiPropertyOptional({ example: "Coordinación pedagógica" })
  @IsOptional()
  @IsString({ message: "La descripción debe ser texto" })
  @MaxLength(255, { message: "La descripción no puede superar 255 caracteres" })
  descripcion?: string;

  @ApiPropertyOptional({
    description: "Reemplaza la lista de roles sugeridos",
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: "Los roles sugeridos deben ser una lista" })
  @IsUUID("all", { each: true, message: "Cada rol sugerido debe ser un UUID válido" })
  rolesSugeridosIds?: string[];
}

export class CargoRolDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: "Subdirector" })
  nombre!: string;
}

export class CargoResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: "Coordinador(a) académico" })
  nombre!: string;

  @ApiPropertyOptional({ example: "Coordinación pedagógica" })
  descripcion?: string | null;

  @ApiProperty({ example: true })
  vigente!: boolean;

  @ApiProperty({ type: [CargoRolDto], description: "Roles sugeridos (no dan permisos)" })
  rolesSugeridos!: CargoRolDto[];

  @ApiProperty({ example: 3, description: "Personas con este cargo vigente" })
  personasCount!: number;
}
