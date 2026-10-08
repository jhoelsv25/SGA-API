import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, IsNotEmpty, Min } from "class-validator";

export class UpdateHorasPlanDto {
  @ApiProperty({
    description: "Nuevas horas pedagógicas semanales (mayor que 0)",
    example: 7,
  })
  @Transform(({ value }: { value: unknown }) =>
    value !== undefined && value !== null ? Number(value) : value,
  )
  @IsNotEmpty({ message: "Las horas semanales son obligatorias." })
  @IsInt({ message: "Las horas semanales deben ser un número entero." })
  @Min(1, { message: "Las horas semanales deben ser mayores que 0." })
  horasSemanales!: number;
}
