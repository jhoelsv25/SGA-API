import { ApiProperty } from "@nestjs/swagger";

export class EstudianteDelApoderadoResponseDto {
  @ApiProperty()
  estudianteId: string;

  @ApiProperty()
  personaId: string;

  @ApiProperty()
  nombreCompleto: string;

  @ApiProperty()
  parentesco: string;

  @ApiProperty({ nullable: true })
  seccionId: string | null;

  @ApiProperty({ nullable: true })
  seccionNombre: string | null;
}
