import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

/** RF-002 V2 (HU1): asignar un rol adicional a una cuenta. */
export class AddUserRoleDto {
  @ApiProperty({
    description: "ID del rol a asignar",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID("all", { message: "Seleccione un rol válido." })
  rolId!: string;
}

/** RF-002 V2 (HU1): rol asignado a una cuenta, vigente o retirado (historial). */
export class UserRoleAssignmentDto {
  @ApiProperty({ description: "ID de la asignación" })
  id!: string;

  @ApiProperty({ description: "ID del rol" })
  rolId!: string;

  @ApiProperty({ example: "Docente" })
  rolNombre!: string;

  @ApiProperty({ example: true, description: "Rol con el que inicia sesión" })
  esPrincipal!: boolean;

  @ApiProperty({ example: true, description: "false = rol retirado (historial)" })
  vigente!: boolean;

  @ApiProperty({ example: "2026-10-09 10:00:00" })
  asignadoEn!: string;

  @ApiPropertyOptional({ description: "Usuario que asignó el rol" })
  asignadoPor?: string | null;

  @ApiPropertyOptional({ example: "2026-10-10 08:00:00" })
  retiradoEn?: string | null;

  @ApiPropertyOptional({ description: "Usuario que retiró el rol" })
  retiradoPor?: string | null;
}
