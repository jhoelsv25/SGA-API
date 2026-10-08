import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FECHA_INVALIDA = "Indique una fecha válida (AAAA-MM-DD).";

export class BimestreFechaDto {
  @ApiProperty({
    description: "Número de bimestre, del I al IV",
    example: 1,
    minimum: 1,
    maximum: 4,
  })
  @IsInt()
  @Min(1)
  @Max(4)
  numero!: number;

  @ApiProperty({ example: "2027-03-01" })
  @Matches(FECHA, { message: FECHA_INVALIDA })
  fechaInicio!: string;

  @ApiProperty({ example: "2027-05-09" })
  @Matches(FECHA, { message: FECHA_INVALIDA })
  fechaFin!: string;
}

export class CreateAnioAcademicoDto {
  @ApiProperty({ example: 2027 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  anio!: number;

  @ApiPropertyOptional({
    description: "Denominación oficial, por ejemplo «Año del…»",
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombre?: string;

  @ApiProperty({ example: "2027-03-01" })
  @Matches(FECHA, { message: FECHA_INVALIDA })
  fechaInicio!: string;

  @ApiProperty({ example: "2027-12-19" })
  @Matches(FECHA, { message: FECHA_INVALIDA })
  fechaFin!: string;

  @ApiPropertyOptional({ type: [BimestreFechaDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => BimestreFechaDto)
  bimestres?: BimestreFechaDto[];
}
