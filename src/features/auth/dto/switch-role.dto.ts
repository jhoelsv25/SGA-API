import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class SwitchRoleDto {
  @ApiProperty({
    description: "ID del rol al que se quiere cambiar; debe estar asignado al usuario",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID("all", { message: "Seleccione un rol válido." })
  roleId!: string;
}
