import { ApiProperty } from "@nestjs/swagger";
import { VariableTipo } from "../constants";

export class VariableSistemaResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "sesion.tolerancia_ingreso_min" })
  codigo: string;

  @ApiProperty({ example: "Tolerancia al firmar el ingreso antes de contar minutos perdidos" })
  descripcion: string;

  @ApiProperty({ example: "sesiones" })
  modulo: string;

  @ApiProperty({ example: "entero" })
  tipo: VariableTipo;

  @ApiProperty({ example: "15" })
  valor: string;

  @ApiProperty({ example: "minutos", nullable: true })
  unidad: string | null;

  @ApiProperty({ example: 0, nullable: true })
  valorMinimo: number | null;

  @ApiProperty({ example: 60, nullable: true })
  valorMaximo: number | null;

  @ApiProperty({ example: true })
  editable: boolean;

  @ApiProperty({ example: true })
  cargaEnAplicacion: boolean;

  @ApiProperty({ example: true })
  vigente: boolean;

  @ApiProperty({ example: "Ajuste de tolerancia", nullable: true })
  motivoCambio: string | null;

  @ApiProperty({ example: "a43...", nullable: true })
  actualizadoPorId: string | null;

  @ApiProperty({ example: "Jhoel Silvestre", nullable: true })
  actualizadoPorNombre?: string | null;

  @ApiProperty({ example: "2026-10-08T12:00:00Z" })
  creadoEn: string;
}
