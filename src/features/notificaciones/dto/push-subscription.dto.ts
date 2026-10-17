import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class PushSubscriptionKeysDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  auth: string;
}

export class SuscribirPushDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @ApiProperty({ type: PushSubscriptionKeysDto })
  @IsObject()
  keys: PushSubscriptionKeysDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dispositivo?: string;
}

export class DesuscribirPushDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  endpoint: string;
}
