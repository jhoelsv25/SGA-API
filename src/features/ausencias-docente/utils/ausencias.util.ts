import { type MotivoAusencia, VALORES_DEFECTO_AUSENCIA } from "../constants";
import type { AusenciaResponseDto } from "../dto";
import type { AusenciaConDetalle } from "../interfaces";

/**
 * Calcula la diferencia en minutos entre dos horas en formato "HH:mm".
 */
export function calcularMinutosEntre(horaDesde: string, horaHasta: string): number {
  const [horaD, minD] = horaDesde.split(":").map(Number);
  const [horaH, minH] = horaHasta.split(":").map(Number);
  return horaH * 60 + minH - (horaD * 60 + minD);
}

/**
 * Formatea una fecha a "DD/MM/YYYY" usando valores UTC para evitar desfases de huso horario.
 */
export function formatearFechaDdMmYyyy(fecha: Date | string): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const dia = String(d.getUTCDate()).padStart(2, "0");
  const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
  const anio = String(d.getUTCFullYear());
  return `${dia}/${mes}/${anio}`;
}

/**
 * Mapea una entidad `AusenciaConDetalle` a su correspondiente DTO de respuesta `AusenciaResponseDto`.
 */
export function mapearAAusenciaResponseDto(
  ausencia: AusenciaConDetalle,
  plazoDescargoDias: number = VALORES_DEFECTO_AUSENCIA.PLAZO_DESCARGO_DIAS,
  plazoCorreccionHoras: number = VALORES_DEFECTO_AUSENCIA.PLAZO_CORRECCION_HORAS,
): AusenciaResponseDto {
  const registradoEnFecha = new Date(ausencia.registradoEn);
  const tiempoRegistrado = registradoEnFecha.getTime();

  const fechaLimiteDescargoDate = new Date(
    tiempoRegistrado + plazoDescargoDias * 24 * 60 * 60 * 1000,
  );
  const fechaLimiteDescargo = fechaLimiteDescargoDate.toISOString();
  const fechaLimiteDescargoFormateada = formatearFechaDdMmYyyy(fechaLimiteDescargoDate);

  const ahora = Date.now();
  const horasTranscurridas = (ahora - tiempoRegistrado) / (1000 * 60 * 60);

  const puedeDescargar =
    !ausencia.anulada &&
    ausencia.vigente &&
    ausencia.descargo === null &&
    ahora <= fechaLimiteDescargoDate.getTime();

  const puedeCorregir =
    !ausencia.anulada &&
    ausencia.vigente &&
    ausencia.descargo === null &&
    horasTranscurridas <= plazoCorreccionHoras;

  const puedeAnular = !ausencia.anulada && ausencia.vigente;

  return {
    id: ausencia.id,
    ausenciaRaizId: ausencia.ausenciaRaizId ?? ausencia.id,
    sesionClaseId: ausencia.sesionClaseId,
    sesion: {
      id: ausencia.sesion.id,
      fecha: ausencia.sesion.fecha,
      horaInicio: ausencia.sesion.horaInicio,
      horaFin: ausencia.sesion.horaFin,
      cursoNombre: ausencia.sesion.cursoNombre,
      seccionNombre: ausencia.sesion.seccionNombre,
      docenteId: ausencia.sesion.docenteId,
      docenteNombre: ausencia.sesion.docenteNombre,
    },
    horaDesde: ausencia.horaDesde,
    horaHasta: ausencia.horaHasta,
    minutos: ausencia.minutos,
    motivo: ausencia.motivo as MotivoAusencia,
    observacion: ausencia.observacion,
    version: ausencia.version,
    motivoCambio: ausencia.motivoCambio ?? null,
    vigente: ausencia.vigente,
    anulada: ausencia.anulada,
    anuladaEn: ausencia.anuladaEn,
    motivoAnulacion: ausencia.motivoAnulacion,
    descargo: ausencia.descargo,
    descargoEn: ausencia.descargoEn,
    fechaLimiteDescargo,
    fechaLimiteDescargoFormateada,
    puedeDescargar,
    puedeCorregir,
    puedeAnular,
    fotos: (ausencia.fotos ?? []).map((f) => ({
      id: f.id,
      archivoUrl: f.archivoUrl,
      tomadaEn: f.tomadaEn,
      orden: f.orden,
    })),
    registradoPor: {
      id: ausencia.registradoPorId,
      nombreCompleto: ausencia.registradoPorNombre,
    },
    registradoEn: ausencia.registradoEn,
  };
}
