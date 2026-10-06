import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsUUID } from "class-validator";

export class ChangeUserRoleDto {
  @ApiProperty({
    description: "Nuevo rol para la cuenta",
    example: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
  })
  @IsUUID("4", { message: "El ID del rol debe ser un UUID válido" })
  @IsNotEmpty({ message: "El rol es obligatorio" })
  rolId!: string;
}
