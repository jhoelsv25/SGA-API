import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsUUID } from "class-validator";

export class AssignPermissionsDto {
  @ApiProperty({
    description: "Lista de UUIDs de permisos a asignar al rol",
    example: ["a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"],
    type: [String],
  })
  @IsArray({ message: "Los permisos deben ser una lista" })
  @IsUUID("4", { each: true, message: "Cada ID de permiso debe ser un UUID válido" })
  permisoIds!: string[];
}
