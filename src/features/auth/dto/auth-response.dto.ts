import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CurrentUserDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id!: string;

  @ApiProperty({ example: "admin" })
  username!: string;

  @ApiPropertyOptional({ example: "admin@colegio.edu.pe" })
  email?: string;

  @ApiPropertyOptional({ example: "Juan Carlos" })
  firstName?: string;

  @ApiPropertyOptional({ example: "García López" })
  lastName?: string;

  @ApiPropertyOptional({ example: ["administrador"], type: [String] })
  roles?: string[];

  @ApiPropertyOptional({ example: "b3f07a41-3829-4505-89f5-7e23114d5e90" })
  institutionId?: string;

  @ApiPropertyOptional({ example: "I.E. Mariscal Cáceres" })
  institutionName?: string;

  @ApiPropertyOptional({ example: "https://ejemplo.com/avatar.png" })
  avatarUrl?: string;

  @ApiPropertyOptional({
    example: false,
    description: "Indica si el usuario debe cambiar su contraseña obligatoriamente",
  })
  mustChangePassword?: boolean;
}

export class AuthModuleDto {
  @ApiProperty({ example: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" })
  id!: string;

  @ApiProperty({ example: "Matrículas" })
  name!: string;

  @ApiProperty({ example: "matriculas" })
  code!: string;

  @ApiPropertyOptional({ example: "user-check" })
  icon?: string;

  @ApiProperty({ example: "/matriculas" })
  path!: string;
}

export class AuthResponseDto {
  @ApiPropertyOptional({ example: "Inicio de sesión exitoso" })
  message?: string;

  @ApiPropertyOptional({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  accessToken?: string;

  @ApiProperty({ type: CurrentUserDto })
  user!: CurrentUserDto;

  @ApiPropertyOptional({ type: [AuthModuleDto] })
  modules?: AuthModuleDto[];
}
