import { ForbiddenException, Injectable } from "@nestjs/common";
import { MENSAJES_CONSOLIDADO } from "../constants";
import { SeguimientoDocenteRepository } from "../repositories";

@Injectable()
export class ConsolidadoBloqueoService {
  constructor(private readonly repository: SeguimientoDocenteRepository) {}

  /**
   * Verifica si el consolidado vigente de un docente en un período está cerrado.
   * Si está cerrado, lanza ForbiddenException("El consolidado de este bimestre está cerrado. Solicite su reapertura.").
   * Si el consolidado está 'reabierto' o si aún NO existe consolidado, la promesa se resuelve sin error.
   */
  async asegurarNoCerrado(docenteId: string, periodoId: string): Promise<void> {
    const consolidado = await this.repository.buscarConsolidadoVigente(docenteId, periodoId);

    if (consolidado && consolidado.estado === "cerrado") {
      throw new ForbiddenException(MENSAJES_CONSOLIDADO.CONSOLIDADO_CERRADO);
    }
  }

  /**
   * Variante para cuando solo se dispone de la fecha y el docenteId (ej. registro de ausencias).
   * Localiza el período correspondiente a la fecha y evalúa asegurarNoCerrado.
   */
  async asegurarNoCerradoPorFecha(docenteId: string, fecha: string): Promise<void> {
    const periodo = await this.repository.buscarPeriodoPorFecha(fecha);
    if (!periodo) {
      return;
    }

    await this.asegurarNoCerrado(docenteId, periodo.id);
  }
}
