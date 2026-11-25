import { BadRequestException, Injectable, Optional } from "@nestjs/common";
import { AnioLectivoCls } from "../../../common/anio-lectivo";
import {
  type ColumnaReporte,
  type HojaReporteExtra,
  generarReporteExcel,
  nombreArchivoReporte,
  type ValorCelda,
} from "../../../common/excel/reporte-excel.builder";
import { AniosAcademicosService } from "../../anio-escolar/anios.service";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import type { CampoPlantilla } from "../../importacion/constants";
import { InstitucionService } from "../../institucion/institucion.service";
import type { PersonaResponseDto } from "../../personas/dto/persona-response.dto";

export interface ReporteGenerado {
  buffer: Buffer;
  nombreArchivo: string;
  totalFilas: number;
}

export type FilaReporte = Record<string, ValorCelda>;

export const columnasDePlantilla = (campos: CampoPlantilla[]): ColumnaReporte[] =>
  campos.map((c) => ({
    header: c.header,
    key: c.key,
    ancho: c.ancho,
    tipo: c.tipo === "fecha" ? "fecha" : "texto",
    requerido: c.requerido,
  }));

export const columna = (
  header: string,
  key: string,
  ancho: number,
  tipo?: "texto" | "fecha" | "numero",
  requerido?: boolean,
): ColumnaReporte => ({
  header,
  key,
  ancho,
  tipo,
  requerido,
});

export const siNo = (v: boolean | null | undefined): string | null =>
  v === null || v === undefined ? null : v ? "SI" : "NO";

export const COLUMNAS_MARCACIONES: ColumnaReporte[] = [
  columna("Fecha", "fecha", 14, "fecha", true),
  columna("Hora", "hora", 12, "texto", true),
  columna("Apellidos y nombres", "nombreCompleto", 34, "texto", true),
  columna("Tipo persona", "tipoPersona", 16, "texto", true),
  columna("Tipo marcación", "tipo", 16, "texto", true),
  columna("Origen", "origen", 14, "texto"),
  columna("Resultado", "resultado", 18, "texto", true),
  columna("Minutos tardanza", "minutosTardanza", 18, "numero"),
  columna("Justificada", "justificada", 14, "texto"),
  columna("Motivo justificación", "motivoJustificacion", 32, "texto"),
  columna("Observación", "observacion", 30, "texto"),
];

function fechaHoyLima(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Cuenta días laborables (lunes a viernes) entre dos fechas ISO inclusive, acotados hasta hoy. */
export function contarDiasLaborables(desdeIso: string, hastaIso: string): number {
  const hoy = fechaHoyLima();
  const limite = hastaIso < hoy ? hastaIso : hoy;
  if (desdeIso > limite) return 0;

  const actual = new Date(`${desdeIso}T12:00:00Z`);
  const fin = new Date(`${limite}T12:00:00Z`);
  let total = 0;

  while (actual <= fin) {
    const dia = actual.getUTCDay();
    if (dia >= 1 && dia <= 5) total += 1;
    actual.setUTCDate(actual.getUTCDate() + 1);
  }
  return total;
}

export function filaPersona(p: PersonaResponseDto): FilaReporte {
  return {
    tipoDocumento: p.tipoDocumento,
    numeroDocumento: p.numeroDocumento,
    apellidoPaterno: p.apellidoPaterno,
    apellidoMaterno: p.apellidoMaterno,
    nombres: p.nombres,
    sexo: p.sexo,
    fechaNacimiento: p.fechaNacimiento,
    celular: p.celular,
    correo: p.correo,
    direccion: p.direccion,
    distrito: p.distrito,
  };
}

/**
 * Helper compartido para construcción de workbooks institucionales
 * y resolución de año académico / rangos de período.
 */
@Injectable()
export class ExportacionContextoHelper {
  constructor(
    private readonly institucion: InstitucionService,
    @Optional() private readonly anios?: AniosAcademicosService,
    @Optional() private readonly anioLectivo?: AnioLectivoCls,
  ) {}

  async generar(
    user: AuthenticatedUser,
    modulo: string,
    titulo: string,
    columnas: ColumnaReporte[],
    filas: FilaReporte[],
    filtros: Record<string, string | undefined>,
    opcionesExtra?: { anioAcademico?: string; hojasExtra?: HojaReporteExtra[] },
  ): Promise<ReporteGenerado> {
    const inst = await this.institucion.get().catch(() => null);
    const buffer = await generarReporteExcel({
      titulo,
      modulo,
      columnas,
      filas,
      filtros,
      generadoPor: user.username,
      institucion: inst?.nombre ?? "SGA Colegio",
      anioAcademico: opcionesExtra?.anioAcademico,
      hojasExtra: opcionesExtra?.hojasExtra,
    });
    return { buffer, nombreArchivo: nombreArchivoReporte(modulo), totalFilas: filas.length };
  }

  async resolverAnioDeTrabajo(anioAcademicoId?: string) {
    if (!this.anios) return null;
    const id = anioAcademicoId ?? this.anioLectivo?.id();
    try {
      return id ? await this.anios.findById(id) : await this.anios.findEnCurso();
    } catch {
      return null;
    }
  }

  async resolverRangoFechas(
    q: { periodoId?: string; desde?: string; hasta?: string },
    mensajeSinAnio: string,
  ) {
    const anio = await this.resolverAnioDeTrabajo();
    let fechaDesde: string;
    let fechaHasta: string;
    let etiquetaPeriodo: string | undefined;

    if (q.periodoId) {
      const bimestre = anio?.bimestres.find((b) => b.id === q.periodoId);
      if (!bimestre) {
        throw new BadRequestException(
          "El período seleccionado no pertenece al año académico de trabajo.",
        );
      }
      fechaDesde = q.desde ?? bimestre.fechaInicio.slice(0, 10);
      fechaHasta = q.hasta ?? bimestre.fechaFin.slice(0, 10);
      etiquetaPeriodo = `Bimestre ${bimestre.nombre}`;
    } else if (q.desde && q.hasta) {
      fechaDesde = q.desde;
      fechaHasta = q.hasta;
    } else {
      if (!anio) throw new BadRequestException(mensajeSinAnio);
      fechaDesde = q.desde ?? anio.fechaInicio.slice(0, 10);
      fechaHasta = q.hasta ?? anio.fechaFin.slice(0, 10);
    }

    return { anio, fechaDesde, fechaHasta, etiquetaPeriodo };
  }
}
