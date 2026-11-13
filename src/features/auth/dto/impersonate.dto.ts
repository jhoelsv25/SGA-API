import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsUUID } from "class-validator";

export class ImpersonateDto {
  @ApiProperty({
    example: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    description: "UUID del usuario destino a simular",
  })
  @IsNotEmpty({ message: "El usuario es requerido." })
  @IsUUID("4", { message: "El usuario debe ser un UUID válido." })
  userId!: string;

  @ApiPropertyOptional({
    example: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    description: "UUID del rol específico del usuario destino (opcional)",
  })
  @IsOptional()
  @IsUUID("4", { message: "El rol debe ser un UUID válido." })
  roleId?: string;
}
