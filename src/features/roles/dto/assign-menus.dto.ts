import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsUUID } from "class-validator";

/** RF-002 V2 (Roles-Menú): opciones de menú que puede ver y usar el rol. */
export class AssignMenusDto {
  @ApiProperty({
    description: "IDs de las opciones de menú del rol (reemplaza la lista actual)",
    type: [String],
    example: ["a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"],
  })
  @IsArray({ message: "Los menús deben ser una lista" })
  @IsUUID("all", { each: true, message: "Cada menú debe ser un UUID válido" })
  menuIds!: string[];
}
