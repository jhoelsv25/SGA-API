import { Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";

/**
 * Servicio de exportación de reporte Excel y ficha de seguimiento PDF (HU4).
 * Firmas del contrato RF-013 (sección 5). La implementación completa corresponde a T07.
 */
@Injectable()
export class SeguimientoExportacionService {
  generarFichaPdf(
    _consolidadoId: string,
    _usuario: AuthenticatedUser,
  ): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    return Promise.reject(new Error("No implementado en T03"));
  }

  exportarReporteExcel(
    _periodoId: string,
    _actorId: string,
    _ip?: string,
  ): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    return Promise.reject(new Error("No implementado en T03"));
  }
}
