import { ApiProperty } from "@nestjs/swagger";

export class MensajeIndicadoresResponseDto {
  @ApiProperty() mensaje!: string;
  @ApiProperty({ required: false }) id?: string;
  @ApiProperty({ required: false }) version?: number;
}
