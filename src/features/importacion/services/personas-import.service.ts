import { Injectable } from "@nestjs/common";
import { PersonasService } from "../../personas/personas.service";
import { IMPORTACION_MESSAGES } from "../constants";
import type { FilaPrevisualizadaDto } from "../dto";
import type {
  AnalizarFilaContext,
  IEntidadImportHandler,
  ProcesarFilaContext,
  ProcesarFilaResult,
} from "../interfaces";

@Injectable()
export class PersonasImportService implements IEntidadImportHandler {
  constructor(private readonly personasService: PersonasService) {}

  analizar(ctx: AnalizarFilaContext): FilaPrevisualizadaDto {
    const { numeroFila, datos, personaExistente } = ctx;

    if (personaExistente) {
      return {
        numeroFila,
        datos,
        estado: "ya_registrada",
        accion: "omitir",
        mensaje: IMPORTACION_MESSAGES.YA_REGISTRADO("en el padrón"),
      };
    }

    return {
      numeroFila,
      datos,
      estado: "valida",
      accion: "crear",
    };
  }

  async procesar(ctx: ProcesarFilaContext): Promise<ProcesarFilaResult | null> {
    const { basePersona, personaExistente, actorId, ip } = ctx;

    if (personaExistente) {
      return null;
    }

    await this.personasService.create(basePersona, actorId, ip);
    return {};
  }
}
