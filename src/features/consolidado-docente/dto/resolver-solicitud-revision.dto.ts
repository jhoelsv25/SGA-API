import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class ResolverSolicitudRevisionDto {
  @IsIn(["aceptar", "rechazar"])
  accion!: "aceptar" | "rechazar";

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  respuesta?: string;
}
