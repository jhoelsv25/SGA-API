import { ConfigService } from "@nestjs/config";

export function obtenerConfigIa(
  configService: ConfigService,
  claveEspecifica: string,
  claveGeneral: string,
  valorPorDefecto = "",
): string {
  const especifica = configService.get<string>(claveEspecifica, "").trim();
  if (especifica.length > 0) {
    return especifica;
  }
  const general = configService.get<string>(claveGeneral, "").trim();
  return general.length > 0 ? general : valorPorDefecto;
}
