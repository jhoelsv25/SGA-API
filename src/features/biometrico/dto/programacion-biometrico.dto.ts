import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsString,
  Matches,
  ValidateNested,
} from "class-validator";
import { MAX_HORAS_PROGRAMACION, MENSAJES_BIOMETRICO } from "../constants";

export class HoraProgramadaDto {
  @ApiProperty({ example: "07:00", description: "Hora de sincronización (HH:mm, 24 horas)" })
  @IsString({ message: MENSAJES_BIOMETRICO.HORA_INVALIDA })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: MENSAJES_BIOMETRICO.HORA_INVALIDA })
  hora!: string;

  @ApiProperty({ example: "1,2,3,4,5", description: "Días de la semana: 1 = lunes … 7 = domingo" })
  @IsString({ message: MENSAJES_BIOMETRICO.DIAS_INVALIDOS })
  @Matches(/^[1-7](,[1-7])*$/, { message: MENSAJES_BIOMETRICO.DIAS_INVALIDOS })
  dias!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  activa!: boolean;
}

export class GuardarProgramacionDto {
  @ApiProperty({
    type: [HoraProgramadaDto],
    description: "Lista completa: reemplaza a la anterior",
  })
  @IsArray()
  @ArrayMaxSize(MAX_HORAS_PROGRAMACION)
  @ValidateNested({ each: true })
  @Type(() => HoraProgramadaDto)
  horarios!: HoraProgramadaDto[];
}

export class ProgramacionResponseDto {
  @ApiProperty({ type: [HoraProgramadaDto] }) horarios!: HoraProgramadaDto[];
  @ApiProperty({ nullable: true, type: String }) actualizadoEn!: string | null;
  @ApiProperty() mensaje!: string;
}

export class SincronizacionRelojResponseDto {
  @ApiProperty() relojSerie!: string;
  @ApiProperty({ description: "Última marca entregada a la base" }) ultimaMarca!: string;
  @ApiProperty() ultimaSincronizacion!: string;
  @ApiProperty({ nullable: true, type: String }) equipo!: string | null;
}
