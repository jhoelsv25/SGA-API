import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { ALCANCES_LIBRETA } from "../constants";

export class ProgramarLibretasDto {
  @IsUUID()
  periodoId!: string;

  @IsDateString()
  fechaLimite!: string;
}

export class CambiarFechaLibretasDto {
  @IsDateString()
  fechaLimite!: string;
}

export class VistaPreviaLibretasDto {
  @IsUUID()
  seccionId!: string;

  @IsUUID()
  periodoId!: string;
}

export class PublicarLibretasDto {
  @IsUUID()
  seccionId!: string;

  @IsUUID()
  periodoId!: string;

  /** JSON: [{ nombreArchivo, matriculaId, motivo? }] */
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  asignaciones?: string;
}

export class CambiarAlcanceLibretasDto {
  @IsUUID()
  rolId!: string;

  @IsIn(ALCANCES_LIBRETA)
  alcance!: (typeof ALCANCES_LIBRETA)[number];
}
