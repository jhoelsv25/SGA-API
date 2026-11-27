import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, Matches } from "class-validator";
import type { SesionResponseDto } from "../../sesiones-clase/dto";
import type { EstadoDia } from "../utils/control-diario.util";
import type { MarcacionResponseDto } from "./marcacion-response.dto";

export class ControlDiarioQueryDto {
  @ApiPropertyOptional({ description: "Fecha YYYY-MM-DD; por defecto, hoy" })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha debe tener el formato AAAA-MM-DD." })
  @IsDateString({ strict: true }, { message: "La fecha no es válida." })
  fecha?: string;
}

export class ControlMensualQueryDto {
  @ApiPropertyOptional({ description: "Mes YYYY-MM; por defecto, el actual" })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "El mes debe tener el formato AAAA-MM." })
  mes?: string;
}

export class HorarioEsperadoDto {
  @ApiProperty({ enum: ["clases", "turno"] }) fuente: "clases" | "turno";
  @ApiProperty() entrada: string;
  @ApiProperty() salida: string;
}

export class DiaDePersonaDto {
  @ApiProperty() fecha: string;
  @ApiProperty() estado: EstadoDia;
  @ApiPropertyOptional({ type: HorarioEsperadoDto, nullable: true })
  horario: HorarioEsperadoDto | null;
  @ApiPropertyOptional({ nullable: true }) entrada: MarcacionResponseDto | null;
  @ApiPropertyOptional({ nullable: true }) salida: MarcacionResponseDto | null;
  @ApiProperty({ isArray: true }) sesiones: SesionResponseDto[];
}

export class PersonaControlDto extends DiaDePersonaDto {
  @ApiProperty() personaId: string;
  @ApiProperty() nombreCompleto: string;
  @ApiPropertyOptional({ nullable: true }) fotoUrl: string | null;
  @ApiProperty({ enum: ["docentes", "administrativos"] })
  tipoPersona: "docentes" | "administrativos";
}

export class ControlDiarioResponseDto {
  @ApiProperty() fecha: string;
  @ApiProperty() esHoy: boolean;
  @ApiProperty({ description: "El calendario suspende las clases ese día" }) sinClases: boolean;

  @ApiProperty({ description: "Sin clases, pero el personal trabaja" })
  personalLabora!: boolean;
  @ApiProperty({ type: [PersonaControlDto] }) personas: PersonaControlDto[];
}

export class ControlMensualResponseDto {
  @ApiProperty() mes: string;
  @ApiProperty() personaId: string;
  @ApiProperty() nombreCompleto: string;
  @ApiProperty({ enum: ["docentes", "administrativos"] })
  tipoPersona: "docentes" | "administrativos";
  @ApiProperty({ type: [DiaDePersonaDto] }) dias: DiaDePersonaDto[];
}
