import { ApiProperty } from "@nestjs/swagger";
import { ESTADOS_SOLICITUD_REVISION, type EstadoSolicitudRevision } from "../constants";

export class SolicitudRevisionResponseDto {
  @ApiProperty({ example: "s1098c1a-f86e-11da-bd1a-00112444be1e" })
  id!: string;

  @ApiProperty({ example: "c1098c1a-f86e-11da-bd1a-00112444be3e" })
  consolidadoId!: string;

  @ApiProperty({ example: "d1098c1a-f86e-11da-bd1a-00112444be4e" })
  docenteId!: string;

  @ApiProperty({ example: "Quispe Mamani, Juan" })
  docenteNombre!: string;

  @ApiProperty({ example: "10203040" })
  docenteDocumento!: string;

  @ApiProperty({ example: "p1098c1a-f86e-11da-bd1a-00112444be5e" })
  periodoId!: string;

  @ApiProperty({ example: "II Bimestre" })
  periodoNombre!: string;

  @ApiProperty({ example: "El 12/06 firmé en el kiosko; adjunto foto de la pizarra" })
  motivo!: string;

  @ApiProperty({ example: "/uploads/solicitudes-revision/pizarra.jpg", nullable: true })
  adjuntoUrl!: string | null;

  @ApiProperty({ example: "pizarra.jpg", nullable: true })
  adjuntoNombre!: string | null;

  @ApiProperty({ enum: ESTADOS_SOLICITUD_REVISION, example: "solicitada" })
  estado!: EstadoSolicitudRevision;

  @ApiProperty({ example: null, nullable: true })
  respuesta!: string | null;

  @ApiProperty({ example: null, nullable: true })
  resueltaPorId!: string | null;

  @ApiProperty({ example: null, nullable: true })
  resueltaPorNombre!: string | null;

  @ApiProperty({ example: "2027-07-17T11:00:00.000Z" })
  creadoEn!: string;

  @ApiProperty({ example: null, nullable: true })
  resueltaEn!: string | null;
}
