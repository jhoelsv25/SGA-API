import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from "class-validator";
import { BimestreFechaDto } from "./create-anio-academico.dto";

export class GuardarBimestresDto {
  @ApiProperty({ type: [BimestreFechaDto] })
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => BimestreFechaDto)
  bimestres!: BimestreFechaDto[];
}
