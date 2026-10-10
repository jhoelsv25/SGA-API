import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsUUID, ValidateIf } from "class-validator";

export class AsignarDocenteDto {
  @ApiPropertyOptional({
    description: "UUID del docente a asignar, o null para desasignar",
    example: "b3f07297-c88c-4a39-a9a3-568393557e4e",
    nullable: true,
  })
  @ValidateIf((_object, value) => value !== null && value !== undefined)
  @IsUUID("4", { message: "El ID del docente debe ser un UUID válido." })
  @IsOptional()
  docenteId!: string | null;

  @ApiPropertyOptional({
    description: "Confirmar la asignación aunque el docente supere su jornada laboral",
    example: false,
    default: false,
  })
  @IsBoolean({ message: "El valor de confirmación debe ser booleano." })
  @IsOptional()
  confirmarExceso?: boolean;
}
