import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsString, MaxLength, MinLength } from "class-validator";

export class BuscarAccesosDto {
  @ApiProperty({ description: "DNI o nombres y apellidos (mínimo 3 caracteres)" })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(3, { message: "Escriba al menos 3 caracteres." })
  @MaxLength(100)
  q!: string;
}
