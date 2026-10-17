import PDFDocument from "pdfkit";
import type {
  ComparacionBimestreResponseDto,
  MedicionBimestreResponseDto,
  TableroIndicadoresResponseDto,
} from "../dto";
import type { DatosInstitucionReporte } from "./excel-indicadores.util";

export interface ParametrosGenerarPdfIndicadores {
  institucion: DatosInstitucionReporte;
  comparacion: ComparacionBimestreResponseDto;
  medicion?: MedicionBimestreResponseDto | null;
  tablero?: TableroIndicadoresResponseDto | null;
  actorNombre: string;
  fechaEmision?: string;
}

const COLOR_PRIMARIO = "#7A1228"; // Guindo institucional
const COLOR_SECUNDARIO = "#1E3A8A"; // Azul petróleo para postest
const COLOR_TEXTO = "#0F172A";
const COLOR_MUTED = "#64748B";
const COLOR_BORDE = "#CBD5E1";
const COLOR_FONDO_TABLA = "#F8FAFC";

/**
 * Genera el informe oficial en PDF para la tesis con gráfico vectorial de barras comparativo (RF-020, CP-RF020-19).
 */
export async function generarPdfIndicadores(
  parametros: ParametrosGenerarPdfIndicadores,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 36, bottom: 45, left: 40, right: 40 },
      bufferPages: true,
      autoFirstPage: true,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err: Error) => reject(err));

    const { institucion, comparacion, actorNombre } = parametros;
    const anchoPagina = doc.page.width - 80;

    // ── 1. Encabezado Institucional ──
    doc
      .fontSize(13)
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARIO)
      .text(institucion.nombre.toUpperCase(), 40, 36, { align: "center", width: anchoPagina });

    doc
      .fontSize(8.5)
      .font("Helvetica")
      .fillColor(COLOR_MUTED)
      .text(
        `Código Modular: ${institucion.codigoModular || "S/N"} · UGEL: ${institucion.ugel || "S/N"} · DRE: ${institucion.dre || "S/N"} · ${institucion.direccion || ""}`,
        { align: "center", width: anchoPagina },
      );

    doc.moveDown(0.5);
    doc.strokeColor(COLOR_BORDE).lineWidth(0.8).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.6);

    // ── 2. Título Oficial ──
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor(COLOR_TEXTO)
      .text("INFORME OFICIAL DE INDICADORES DE EFICACIA INSTITUCIONAL (TESIS)", {
        align: "center",
        width: anchoPagina,
      });

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(COLOR_MUTED)
      .text(`Período Académico Evaluado: ${comparacion.periodoNombre.toUpperCase()}`, {
        align: "center",
        width: anchoPagina,
      });

    doc.moveDown(0.8);

    // ── 3. Marco Metodológico de la Investigación ──
    doc
      .fontSize(9.5)
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARIO)
      .text("1. Marco Metodológico de las Variables de Estudio", 40, doc.y);

    doc.moveDown(0.3);

    const marcoY = doc.y;
    doc.rect(40, marcoY, anchoPagina, 50).fillAndStroke(COLOR_FONDO_TABLA, COLOR_BORDE);

    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .fillColor(COLOR_TEXTO)
      .text("• CSP (Cumplimiento de sesiones planificadas): ", 46, marcoY + 6, { continued: true })
      .font("Helvetica")
      .text(
        "(cumplidas + parciales) ÷ (planificadas − justificadas) × 100 [Dimensión: Prácticas pedagógicas]",
      )
      .font("Helvetica-Bold")
      .text("• ISA (Informes de seguimiento académico): ", 46, marcoY + 20, { continued: true })
      .font("Helvetica")
      .text(
        "libretas publicadas a tiempo ÷ libretas programadas × 100 [Dimensión: Seguimiento académico]",
      )
      .font("Helvetica-Bold")
      .text("• IGM (Gestión de materiales del aula virtual): ", 46, marcoY + 34, {
        continued: true,
      })
      .font("Helvetica")
      .text("materiales planificados a tiempo ÷ planificados × 100 [Dimensión: Aula virtual]");

    doc.y = marcoY + 58;

    // ── 4. Tabla de Comparación Pretest vs Postest ──
    doc
      .fontSize(9.5)
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARIO)
      .text("2. Resultados Comparativos: Pretest (Línea Base) vs. Postest (Con SGA)", 40, doc.y);

    doc.moveDown(0.3);

    const tablaY = doc.y;
    const altoEncabezado = 20;

    // Encabezado de tabla
    doc.rect(40, tablaY, anchoPagina, altoEncabezado).fillAndStroke(COLOR_PRIMARIO, COLOR_PRIMARIO);

    doc
      .fontSize(8.5)
      .font("Helvetica-Bold")
      .fillColor("#FFFFFF")
      .text("Indicador", 46, tablaY + 5, { width: 150 })
      .text("Dimensión", 200, tablaY + 5, { width: 110 })
      .text("Pretest (Base)", 315, tablaY + 5, { width: 75, align: "center" })
      .text("Postest (SGA)", 395, tablaY + 5, { width: 75, align: "center" })
      .text("Variación", 475, tablaY + 5, { width: 75, align: "center" });

    let filaY = tablaY + altoEncabezado;

    for (const item of comparacion.comparaciones) {
      const altoFila = 20;
      doc.rect(40, filaY, anchoPagina, altoFila).fillAndStroke(COLOR_FONDO_TABLA, COLOR_BORDE);

      const pretestTexto = item.pretest.registrado ? item.pretest.porcentajeTexto : "Sin pretest";
      const postestTexto = item.postest.medido ? item.postest.porcentajeTexto : "En curso";
      const variacionTexto = item.variacionPuntosTexto || "--";

      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor(COLOR_TEXTO)
        .text(`${item.indicador} — ${item.nombre}`, 46, filaY + 5, { width: 150 })
        .font("Helvetica")
        .text(item.dimension, 200, filaY + 5, { width: 110 })
        .text(pretestTexto, 315, filaY + 5, { width: 75, align: "center" })
        .font("Helvetica-Bold")
        .fillColor(COLOR_SECUNDARIO)
        .text(postestTexto, 395, filaY + 5, { width: 75, align: "center" })
        .fillColor(item.variacionPuntos && item.variacionPuntos >= 0 ? "#16A34A" : "#DC2626")
        .text(variacionTexto, 475, filaY + 5, { width: 75, align: "center" });

      filaY += altoFila;
    }

    doc.y = filaY + 12;

    // ── 5. Gráfico de Barras Vectorial Comparativo ──
    doc
      .fontSize(9.5)
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARIO)
      .text("3. Visualización Vectorial Comparativa (Pretest vs. Postest)", 40, doc.y);

    doc.moveDown(0.3);

    const graficoX = 60;
    const graficoY = doc.y + 15;
    const anchoGrafico = 430;
    const altoGrafico = 110;

    // Leyenda del gráfico
    doc.rect(140, doc.y, 10, 8).fill(COLOR_PRIMARIO);
    doc
      .fontSize(7.5)
      .font("Helvetica")
      .fillColor(COLOR_TEXTO)
      .text("Pretest (Línea Base)", 155, doc.y);

    doc.rect(320, doc.y - 8, 10, 8).fill(COLOR_SECUNDARIO);
    doc.text("Postest (Medición SGA)", 335, doc.y - 8);

    // Fondo y marco del gráfico
    doc.rect(graficoX, graficoY, anchoGrafico, altoGrafico).fillAndStroke("#FFFFFF", COLOR_BORDE);

    // Líneas guía horizontales (0%, 25%, 50%, 75%, 100%)
    const niveles = [0, 25, 50, 75, 100];
    for (const nivel of niveles) {
      const yNivel = graficoY + altoGrafico - (nivel / 100) * altoGrafico;
      doc
        .strokeColor("#E2E8F0")
        .lineWidth(0.5)
        .moveTo(graficoX, yNivel)
        .lineTo(graficoX + anchoGrafico, yNivel)
        .stroke();

      doc
        .fontSize(6.5)
        .font("Helvetica")
        .fillColor(COLOR_MUTED)
        .text(`${nivel}%`, graficoX - 24, yNivel - 4, { width: 20, align: "right" });
    }

    // Dibujar las barras para CSP, ISA, IGM
    const espacioGrupo = anchoGrafico / comparacion.comparaciones.length;
    const anchoBarra = 24;

    comparacion.comparaciones.forEach((item, index) => {
      const xCentroGrupo = graficoX + index * espacioGrupo + espacioGrupo / 2;

      const valorPretest = item.pretest.porcentaje || 0;
      const valorPostest = item.postest.porcentaje || 0;

      const altoBarraPre = Math.min((valorPretest / 100) * altoGrafico, altoGrafico);
      const altoBarraPost = Math.min((valorPostest / 100) * altoGrafico, altoGrafico);

      const xBarraPre = xCentroGrupo - anchoBarra - 2;
      const yBarraPre = graficoY + altoGrafico - altoBarraPre;

      const xBarraPost = xCentroGrupo + 2;
      const yBarraPost = graficoY + altoGrafico - altoBarraPost;

      // Barra Pretest
      doc.rect(xBarraPre, yBarraPre, anchoBarra, altoBarraPre).fill(COLOR_PRIMARIO);
      if (valorPretest > 0) {
        doc
          .fontSize(6.5)
          .font("Helvetica-Bold")
          .fillColor(COLOR_PRIMARIO)
          .text(`${valorPretest.toFixed(1)}%`, xBarraPre - 4, yBarraPre - 10, {
            width: anchoBarra + 8,
            align: "center",
          });
      }

      // Barra Postest
      doc.rect(xBarraPost, yBarraPost, anchoBarra, altoBarraPost).fill(COLOR_SECUNDARIO);
      if (valorPostest > 0) {
        doc
          .fontSize(6.5)
          .font("Helvetica-Bold")
          .fillColor(COLOR_SECUNDARIO)
          .text(`${valorPostest.toFixed(1)}%`, xBarraPost - 4, yBarraPost - 10, {
            width: anchoBarra + 8,
            align: "center",
          });
      }

      // Etiqueta de Indicador al pie
      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor(COLOR_TEXTO)
        .text(item.indicador, xCentroGrupo - 25, graficoY + altoGrafico + 5, {
          width: 50,
          align: "center",
        });
    });

    doc.y = graficoY + altoGrafico + 25;

    // ── 6. Serie Histórica de Evolución por Bimestres (si existe) ──
    if (comparacion.evolucionBimestres && comparacion.evolucionBimestres.length > 0) {
      doc
        .fontSize(9.5)
        .font("Helvetica-Bold")
        .fillColor(COLOR_PRIMARIO)
        .text("4. Evolución Histórica de Mediciones por Bimestre", 40, doc.y);

      doc.moveDown(0.3);

      const evoY = doc.y;
      doc.rect(40, evoY, anchoPagina, 18).fillAndStroke(COLOR_PRIMARIO, COLOR_PRIMARIO);

      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor("#FFFFFF")
        .text("Bimestre", 46, evoY + 5, { width: 140 })
        .text("CSP (%)", 190, evoY + 5, { width: 100, align: "center" })
        .text("ISA (%)", 300, evoY + 5, { width: 100, align: "center" })
        .text("IGM (%)", 410, evoY + 5, { width: 100, align: "center" });

      let fEvoY = evoY + 18;
      for (const evo of comparacion.evolucionBimestres) {
        doc.rect(40, fEvoY, anchoPagina, 16).fillAndStroke(COLOR_FONDO_TABLA, COLOR_BORDE);
        doc
          .fontSize(7.5)
          .font("Helvetica")
          .fillColor(COLOR_TEXTO)
          .text(evo.periodoNombre, 46, fEvoY + 4, { width: 140 })
          .text(evo.csp !== null ? `${evo.csp.toFixed(2)} %` : "--", 190, fEvoY + 4, {
            width: 100,
            align: "center",
          })
          .text(evo.isa !== null ? `${evo.isa.toFixed(2)} %` : "--", 300, fEvoY + 4, {
            width: 100,
            align: "center",
          })
          .text(evo.igm !== null ? `${evo.igm.toFixed(2)} %` : "--", 410, fEvoY + 4, {
            width: 100,
            align: "center",
          });
        fEvoY += 16;
      }
      doc.y = fEvoY + 10;
    }

    // ── 7. Metadatos de Emisión y Paginación (Pie de Página) ──
    const rangoPaginas = doc.bufferedPageRange();
    const ahora = new Date();
    const fechaEmisionTexto =
      ahora.toLocaleDateString("es-PE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }) +
      " " +
      ahora.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    for (let i = rangoPaginas.start; i < rangoPaginas.start + rangoPaginas.count; i++) {
      doc.switchToPage(i);

      // Línea divisoria en pie de página
      doc
        .strokeColor(COLOR_BORDE)
        .lineWidth(0.5)
        .moveTo(40, doc.page.height - 35)
        .lineTo(555, doc.page.height - 35)
        .stroke();

      doc
        .fontSize(7)
        .font("Helvetica")
        .fillColor(COLOR_MUTED)
        .text(
          `Emitido por: ${actorNombre} · Fecha de emisión: ${fechaEmisionTexto} Lima · SGA Tesis`,
          40,
          doc.page.height - 28,
          { width: 340 },
        )
        .text(`Página ${i + 1} de ${rangoPaginas.count}`, 390, doc.page.height - 28, {
          width: 165,
          align: "right",
        });
    }

    doc.end();
  });
}
