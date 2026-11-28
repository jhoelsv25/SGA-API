import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches } from "class-validator";
import { FORMATO_LLAVE_PUBLICA_KIOSKO } from "../utils/firma-kiosko.util";

export class LlaveKioskoDto {
  @ApiProperty({
    description: "Llave pública ECDSA P-256 generada por el navegador (base64url)",
  })
  @IsString()
  @Matches(FORMATO_LLAVE_PUBLICA_KIOSKO, { message: "El identificador del equipo no es válido." })
  llavePublica!: string;
}
