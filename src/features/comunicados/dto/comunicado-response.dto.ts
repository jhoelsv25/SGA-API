import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ComunicadoItem, DestinatarioLecturaItem } from "../interfaces";

export class PaginatedComunicadosResponseDto {
  @ApiProperty({ description: "Lista de comunicados de la página actual" })
  data!: ComunicadoItem[];

  @ApiPropertyOptional({
    description: "Cursor opaco en base64url para la siguiente página de resultados",
    nullable: true,
  })
  nextCursor!: string | null;

  @ApiProperty({ description: "Indica si existen más resultados para paginar" })
  hasMore!: boolean;

  @ApiProperty({ description: "Límite de registros solicitados por página" })
  limit!: number;
}

export class AvanceLecturaResponseDto {
  @ApiProperty({ description: "ID del comunicado" })
  comunicadoId!: string;

  @ApiProperty({ description: "Título del comunicado" })
  titulo!: string;

  @ApiProperty({ description: "Total de destinatarios calculados" })
  totalDestinatarios!: number;

  @ApiProperty({ description: "Total de destinatarios que ya abrieron el comunicado" })
  totalLeidos!: number;

  @ApiProperty({ description: "Porcentaje de lectura acumulado (0 a 100)" })
  porcentajeLectura!: number;

  @ApiProperty({ description: "Desglose individual de destinatarios y fecha de lectura" })
  destinatarios!: DestinatarioLecturaItem[];
}
