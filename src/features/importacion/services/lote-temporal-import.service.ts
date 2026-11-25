import { randomUUID } from "crypto";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { QUEUES } from "../../../core/queues/queues.constants";
import type { TipoImportacion } from "../constants";

interface LoteTemporalGuardado {
  tipo: TipoImportacion;
  filas: Record<string, unknown>[];
  expiraEn: number;
}

interface ClienteRedisMinimo {
  set: (clave: string, valor: string, modo: "EX", segundos: number) => Promise<unknown>;
  get: (clave: string) => Promise<string | null>;
  del: (clave: string) => Promise<unknown>;
}

function esClienteRedis(valor: unknown): valor is ClienteRedisMinimo {
  return (
    typeof valor === "object" &&
    valor !== null &&
    "set" in valor &&
    typeof valor.set === "function" &&
    "get" in valor &&
    typeof valor.get === "function" &&
    "del" in valor &&
    typeof valor.del === "function"
  );
}

const TTL_LOTE_SEGUNDOS = 1800; // 30 minutos
const PREFIJO_CLAVE_LOTE = "importacion:lote:";

/**
 * Servicio auxiliar para almacenamiento temporal en Redis (con respaldo en memoria)
 * de lotes previsualizados pendientes de ejecución.
 */
@Injectable()
export class LoteTemporalImportService {
  private readonly logger = new Logger(LoteTemporalImportService.name);
  private readonly lotesEnMemoria = new Map<string, LoteTemporalGuardado>();

  constructor(
    @InjectQueue(QUEUES.IMPORTACION)
    private readonly importacionQueue: Queue,
  ) {}

  private async obtenerClienteRedis(): Promise<ClienteRedisMinimo | null> {
    const colaConCliente = this.importacionQueue as unknown as { client?: Promise<unknown> };
    const cliente: unknown = await colaConCliente.client;
    return esClienteRedis(cliente) ? cliente : null;
  }

  async guardarLote(tipo: TipoImportacion, filas: Record<string, unknown>[]): Promise<string> {
    const loteId = randomUUID();
    const clave = `${PREFIJO_CLAVE_LOTE}${loteId}`;
    const payload = JSON.stringify({ tipo, filas });

    try {
      const redis = await this.obtenerClienteRedis();
      if (redis) {
        await redis.set(clave, payload, "EX", TTL_LOTE_SEGUNDOS);
        return loteId;
      }
    } catch (err: unknown) {
      this.logger.warn(
        `No se pudo guardar el lote ${loteId} en Redis; usando memoria local: ${String(err)}`,
      );
    }

    this.lotesEnMemoria.set(loteId, {
      tipo,
      filas,
      expiraEn: Date.now() + TTL_LOTE_SEGUNDOS * 1000,
    });
    return loteId;
  }

  async recuperarLote(
    loteId: string,
    tipoEsperado: TipoImportacion,
  ): Promise<Record<string, unknown>[]> {
    const clave = `${PREFIJO_CLAVE_LOTE}${loteId}`;

    try {
      const redis = await this.obtenerClienteRedis();
      if (redis) {
        const raw = await redis.get(clave);
        if (raw) {
          await redis.del(clave);
          const parsed = JSON.parse(raw) as {
            tipo: TipoImportacion;
            filas: Record<string, unknown>[];
          };
          if (parsed.tipo !== tipoEsperado) {
            throw new BadRequestException(
              "El lote previsualizado no corresponde al tipo de importación seleccionado.",
            );
          }
          return parsed.filas;
        }
      }
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn(`Error al leer lote ${loteId} desde Redis: ${String(err)}`);
    }

    const enMemoria = this.lotesEnMemoria.get(loteId);
    if (enMemoria) {
      this.lotesEnMemoria.delete(loteId);
      if (Date.now() > enMemoria.expiraEn) {
        throw new BadRequestException(
          "La vista previa expiró. Vuelva a subir el archivo Excel para continuar.",
        );
      }
      if (enMemoria.tipo !== tipoEsperado) {
        throw new BadRequestException(
          "El lote previsualizado no corresponde al tipo de importación seleccionado.",
        );
      }
      return enMemoria.filas;
    }

    throw new BadRequestException(
      "El lote previsualizado no existe o expiró. Vuelva a subir el archivo Excel.",
    );
  }
}
