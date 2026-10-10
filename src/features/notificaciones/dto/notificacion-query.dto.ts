import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class NotificacionQueryDto {
  @ApiPropertyOptional({
    description: "Cursor opaco en base64url para la siguiente página de notificaciones",
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: "Filtrar solo notificaciones no leídas", default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  soloNoLeidas?: boolean = false;

  @ApiPropertyOptional({
    description: "Cantidad de notificaciones por página (máx. 50)",
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}
