import {
  generarReporteExcel,
  type ColumnaReporte,
} from "../../../common/excel/reporte-excel.builder";
import { MENSAJES_APOYO } from "../constants";
import type {
  AusenciaApoyo,
  ContextoApoyo,
  FilaRanking,
  JustificacionApoyo,
  SesionApoyo,
} from "./indicadores-apoyo.util";
import { dentroDelRango } from "./indicadores-apoyo.util";
import type { DatosInstitucionReporte } from "./excel-indicadores.util";

export interface ParametrosExcelApoyo {
  generadoPor: string;
  institucion: DatosInstitucionReporte;
  periodoNombre: string | null;
  ctx: ContextoApoyo;
  resumenPorDocente: FilaRanking[];
  sesiones: SesionApoyo[];
  ausencias: AusenciaApoyo[];
  justificaciones: JustificacionApoyo[];
}

const col = (
  header: string,
  key: string,
  ancho: number,
  tipo?: "texto" | "numero",
): ColumnaReporte => ({ header, key, ancho, tipo });

const sd = (valor: number | null): string | number => valor ?? MENSAJES_APOYO.SIN_DATOS;

/**
 * Excel de los indicadores de apoyo (RF-020 V2): resumen por docente y hojas de detalle de
 * sesiones, supervisiones y justificaciones. No incluye CSP, ISA ni IGM.
 */
export async function generarExcelApoyo(p: ParametrosExcelApoyo): Promise<Buffer> {
  const resumen = p.resumenPorDocente.map(({ docenteNombre, resumen: r }) => ({
    docente: docenteNombre,
    jornadas: sd(r.jornadasEfectivas.valor),
    programados: r.jornadasEfectivas.minutosProgramados,
    efectivos: r.jornadasEfectivas.minutosEfectivos,
    perdidos: sd(r.minutosPerdidos.total),
    promedio: sd(r.minutosPerdidos.promedioPorSesion),
    puntualidad: sd(r.puntualidad.valor),
    fuera: sd(r.minutosFueraAula.minutos),
    supervisiones: r.minutosFueraAula.supervisiones,
    resolucion: sd(r.tiempoResolucion.promedioDias),
    vencidas: r.tiempoResolucion.vencidas,
  }));

  const detalleSesiones = p.sesiones
    .filter((s) => dentroDelRango(s.fecha, p.ctx))
    .map((s) => {
      const ejecutada = s.estado === "cumplida" || s.estado === "parcial";
      return {
        fecha: s.fecha,
        docente: s.docenteNombre,
        curso: s.cursoNombre,
        seccion: s.seccionNombre,
        estado: s.estado,
        programados: s.estado === "justificada" ? 0 : s.minutosBloque,
        efectivos: ejecutada ? Math.max(0, s.minutosBloque - s.minutosPerdidos) : 0,
        perdidos: ejecutada ? s.minutosPerdidos : 0,
        puntual: ejecutada ? (s.minutosRetraso === 0 ? "Sí" : "No") : "—",
      };
    });

  return generarReporteExcel({
    titulo: "Indicadores de apoyo del seguimiento docente",
    modulo: "indicadores-apoyo",
    columnas: [
      col("Docente", "docente", 32),
      col("Jornadas efectivas (%)", "jornadas", 18),
      col("Minutos programados", "programados", 18, "numero"),
      col("Minutos efectivos", "efectivos", 18, "numero"),
      col("Minutos perdidos", "perdidos", 16),
      col("Promedio por sesión", "promedio", 18),
      col("Puntualidad (%)", "puntualidad", 16),
      col("Minutos fuera del aula", "fuera", 20),
      col("Supervisiones", "supervisiones", 14, "numero"),
      col("Resolución de justificaciones (días)", "resolucion", 24),
      col("Justificaciones vencidas", "vencidas", 20, "numero"),
    ],
    filas: resumen,
    hojasExtra: [
      {
        nombre: "Detalle Sesiones",
        columnas: [
          col("Fecha", "fecha", 14),
          col("Docente", "docente", 32),
          col("Curso", "curso", 26),
          col("Sección", "seccion", 12),
          col("Estado", "estado", 16),
          col("Minutos programados", "programados", 18, "numero"),
          col("Minutos efectivos", "efectivos", 18, "numero"),
          col("Minutos perdidos", "perdidos", 16, "numero"),
          col("Puntual", "puntual", 10),
        ],
        filas: detalleSesiones,
      },
      {
        nombre: "Supervisiones",
        columnas: [
          col("Fecha", "fecha", 14),
          col("Docente", "docente", 32),
          col("Curso", "curso", 26),
          col("Sección", "seccion", 12),
          col("Motivo", "motivo", 24),
          col("Minutos", "minutos", 12, "numero"),
        ],
        filas: p.ausencias
          .filter((a) => dentroDelRango(a.fecha, p.ctx))
          .map((a) => ({
            fecha: a.fecha,
            docente: a.docenteNombre,
            curso: a.cursoNombre,
            seccion: a.seccionNombre,
            motivo: a.motivo,
            minutos: a.minutos,
          })),
      },
      {
        nombre: "Justificaciones",
        columnas: [
          col("Fecha de la sesión", "fecha", 18),
          col("Docente", "docente", 32),
          col("Curso", "curso", 26),
          col("Sección", "seccion", 12),
          col("Estado", "estado", 14),
          col("Solicitada", "solicitada", 20),
          col("Resuelta", "resuelta", 20),
        ],
        filas: p.justificaciones.map((j) => ({
          fecha: j.fechaSesion,
          docente: j.docenteNombre,
          curso: j.cursoNombre,
          seccion: j.seccionNombre,
          estado: j.estado,
          solicitada: j.solicitadaEn,
          resuelta: j.revisadaEn ?? "—",
        })),
      },
    ],
    filtros: { Período: p.periodoNombre ?? `${p.ctx.desde} al ${p.ctx.hasta}` },
    generadoPor: p.generadoPor,
    institucion: p.institucion.nombre,
    datosInstitucion: {
      "Código modular": p.institucion.codigoModular,
      UGEL: p.institucion.ugel,
      DRE: p.institucion.dre,
      Dirección: p.institucion.direccion,
    },
  });
}
