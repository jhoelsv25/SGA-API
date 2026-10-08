import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, IsNotEmpty, IsUUID, Min } from "class-validator";

export class AddCursoPlanDto {
  @ApiProperty({
    description: "ID del curso a incorporar al plan de estudios",
    example: "b2d2f7a1-5c74-4b52-9b21-4f129a0c7e2b",
  })
  @IsNotEmpty({ message: "El ID del curso es obligatorio." })
  @IsUUID("4", { message: "El ID del curso debe ser un UUID válido." })
  cursoId!: string;

  @ApiProperty({
    description: "Horas pedagógicas semanales (mayor que 0)",
    example: 6,
  })
  @Transform(({ value }: { value: unknown }) =>
    value !== undefined && value !== null ? Number(value) : value,
  )
  @IsNotEmpty({ message: "Las horas semanales son obligatorias." })
  @IsInt({ message: "Las horas semanales deben ser un número entero." })
  @Min(1, { message: "Las horas semanales deben ser mayores que 0." })
  horasSemanales!: number;
}
