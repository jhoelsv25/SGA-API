import * as fs from "fs";
import * as path from "path";
import PDFDocument from "pdfkit";
import type {
  ConsolidadoFila,
  DocenteParaConsolidado,
  PeriodoParaConsolidado,
} from "../interfaces";
import { NOMBRE_INSTITUCION_DEFECTO } from "../constants";
import { formatearTiempoMinutos } from "./tiempo.util";

export interface SesionParaFichaPdf {
  id: string;
  fecha: string;
  cursoNombre: string;
  seccionNombre: string;
  tema: string | null;
  horaInicioPlan: string | null;
  horaFinPlan: string | null;
  horaInicioReal: string | null;
  horaFinReal: string | null;
  minutosRetraso: number;
  minutosPerdidos: number;
  estado: string;
  justificacionComentario: string | null;
  ausencias: Array<{
    id: string;
    horaDesde: string;
    horaHasta: string;
    minutos: number;
    motivo: string;
    observacion: string | null;
    descargo: string | null;
    descargoEn: string | null;
    fotos: Array<{ id: string; archivoUrl: string; tomadaEn: string | null; orden: number }>;
  }>;
}

export interface DatosDetalleFichaPdf {
  consolidado: ConsolidadoFila;
  docente: DocenteParaConsolidado;
  periodo: PeriodoParaConsolidado;
  generadoPorNombre: string;
  reabiertoPorNombre: string | null;
  sesiones: SesionParaFichaPdf[];
  nombreInstitucion?: string;
}

// ── Paleta de Colores Institucional Oficial ──
const COLOR_PRIMARIO = "#1E3A8A"; // Azul marino formal
const COLOR_SECUNDARIO = "#0F172A"; // Antracita oscuro para texto principal
const COLOR_TEXTO_MUTED = "#475569"; // Gris medio para etiquetas
const COLOR_BORDE = "#CBD5E1"; // Borde sobrio
const COLOR_FONDO_SECCION = "#F8FAFC"; // Gris tenue institucional

/**
 * Resuelve de forma segura si una ruta o URL existe físicamente en el disco.
 * Si no existe o es una URL externa sin copia local, retorna null para no fallar la generación.
 */
function resolverRutaArchivoSegura(urlORuta: string | null | undefined): string | null {
  if (!urlORuta || typeof urlORuta !== "string") {
    return null;
  }
  let limpia = urlORuta.trim();
  if (limpia.startsWith("http://") || limpia.startsWith("https://")) {
    try {
      const parsed = new URL(limpia);
      limpia = parsed.pathname;
    } catch {
      return null;
    }
  }
  limpia = limpia.replace(/^\//, "");
  const candidatas = [
    path.resolve(process.cwd(), limpia),
    path.resolve(process.cwd(), "public", limpia),
    path.resolve(process.cwd(), "uploads", limpia),
  ];
  for (const c of candidatas) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return null;
}

function formatearDecisionTexto(decision: string): string {
  switch (decision) {
    case "llamada_atencion":
      return "Llamada de atención";
    case "compromiso_mejora":
      return "Compromiso de mejora";
    case "derivado":
      return "Derivado a instancia superior";
    case "ninguna":
    default:
      return "Ninguna";
  }
}

function formatearEstadoSesionTexto(estado: string): string {
  switch (estado) {
    case "cumplida":
      return "Cumplida";
    case "parcial":
      return "Parcial";
    case "no_cumplida":
      return "No cumplida";
    case "justificada":
      return "Justificada";
    case "reprogramada":
      return "Reprogramada";
    default:
      return estado.toUpperCase();
  }
}

/**
 * Genera el documento PDF oficial de la Ficha de Seguimiento Docente (RF-013 HU4).
 * Incluye: datos institucionales y del docente, resumen de sesiones, ausencias vigentes con
 * descargos y fotos, totales de tiempo en 'X h Y min', decisión y firma del docente y Director.
 */
export async function generarFichaSeguimientoPdf(datos: DatosDetalleFichaPdf): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      bufferPages: true,
      margins: { top: 35, bottom: 35, left: 40, right: 40 },
    });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err: Error) => reject(err));

    const anchoPagina = doc.page.width;
    const altoPagina = doc.page.height;
    const margenIzquierdo = 40;
    const margenDerecho = anchoPagina - 40;
    const anchoContenido = margenDerecho - margenIzquierdo;

    const verificarSaltoPagina = (espacioRequerido: number) => {
      const limite = altoPagina - doc.page.margins.bottom - 45;
      if (doc.y + espacioRequerido > limite) {
        doc.addPage();
      }
    };

    // ── 1. Filete Superior Oficial ──
    doc.rect(0, 0, anchoPagina, 5).fill(COLOR_PRIMARIO);

    // ── 2. Encabezado Institucional y Título ──
    doc.y = 25;
    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .fillColor(COLOR_TEXTO_MUTED)
      .text("REPÚBLICA DEL PERÚ · MINISTERIO DE EDUCACIÓN", margenIzquierdo, doc.y, {
        align: "center",
        width: anchoContenido,
      });

    doc
      .fontSize(13)
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARIO)
      .text(
        (datos.nombreInstitucion || NOMBRE_INSTITUCION_DEFECTO).toUpperCase(),
        margenIzquierdo,
        doc.y + 2,
        {
          align: "center",
          width: anchoContenido,
        },
      );

    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor(COLOR_SECUNDARIO)
      .text("FICHA OFICIAL DE SEGUIMIENTO DOCENTE", margenIzquierdo, doc.y + 2, {
        align: "center",
        width: anchoContenido,
      });

    // Línea divisoria bajo el encabezado
    doc.y += 6;
    doc
      .strokeColor(COLOR_PRIMARIO)
      .lineWidth(1)
      .moveTo(margenIzquierdo, doc.y)
      .lineTo(margenDerecho, doc.y)
      .stroke();

    // ── 3. Metadatos del Consolidado y del Docente ──
    doc.y += 8;
    const cajaDatosY = doc.y;
    const altoCajaDatos = 52;

    doc
      .roundedRect(margenIzquierdo, cajaDatosY, anchoContenido, altoCajaDatos, 3)
      .fillAndStroke(COLOR_FONDO_SECCION, COLOR_BORDE);

    const col1X = margenIzquierdo + 8;
    const col2X = margenIzquierdo + anchoContenido * 0.52;

    const textoDocente =
      datos.docente.nombreCompleto ||
      `${datos.docente.apellidoPaterno} ${datos.docente.apellidoMaterno}, ${datos.docente.nombres}`;
    const versionTexto =
      datos.consolidado.version > 1 && datos.consolidado.motivoCambio
        ? `Versión ${datos.consolidado.version} (${datos.consolidado.motivoCambio})`
        : `Versión ${datos.consolidado.version}`;

    doc
      .fontSize(8.5)
      .font("Helvetica-Bold")
      .fillColor(COLOR_TEXTO_MUTED)
      .text("Docente:", col1X, cajaDatosY + 7);
    doc
      .font("Helvetica-Bold")
      .fillColor(COLOR_SECUNDARIO)
      .text(textoDocente, col1X + 50, cajaDatosY + 7, { width: 210, ellipsis: true });

    doc
      .font("Helvetica-Bold")
      .fillColor(COLOR_TEXTO_MUTED)
      .text("N.° Doc.:", col1X, cajaDatosY + 21);
    doc
      .font("Helvetica")
      .fillColor(COLOR_SECUNDARIO)
      .text(datos.docente.numeroDocumento || "—", col1X + 50, cajaDatosY + 21);

    doc
      .font("Helvetica-Bold")
      .fillColor(COLOR_TEXTO_MUTED)
      .text("Generado:", col1X, cajaDatosY + 35);
    doc
      .font("Helvetica")
      .fillColor(COLOR_SECUNDARIO)
      .text(
        `${datos.generadoPorNombre} (${new Date(datos.consolidado.generadoEn).toLocaleDateString("es-PE")})`,
        col1X + 50,
        cajaDatosY + 35,
        { width: 210, ellipsis: true },
      );

    doc
      .font("Helvetica-Bold")
      .fillColor(COLOR_TEXTO_MUTED)
      .text("Período:", col2X, cajaDatosY + 7);
    doc
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARIO)
      .text(datos.periodo.nombre, col2X + 50, cajaDatosY + 7);

    doc
      .font("Helvetica-Bold")
      .fillColor(COLOR_TEXTO_MUTED)
      .text("Consolidado:", col2X, cajaDatosY + 21);
    doc
      .font("Helvetica")
      .fillColor(COLOR_SECUNDARIO)
      .text(versionTexto, col2X + 65, cajaDatosY + 21, { width: 175, ellipsis: true });

    doc
      .font("Helvetica-Bold")
      .fillColor(COLOR_TEXTO_MUTED)
      .text("Estado:", col2X, cajaDatosY + 35);
    doc
      .font("Helvetica-Bold")
      .fillColor(datos.consolidado.estado === "cerrado" ? "#15803D" : "#B45309")
      .text(datos.consolidado.estado.toUpperCase(), col2X + 50, cajaDatosY + 35);

    // ── 4. Resumen de Totales y Tiempo Fuera de Clase ──
    doc.y = cajaDatosY + altoCajaDatos + 8;
    const cajaTotalesY = doc.y;
    const altoCajaTotales = 48;

    doc
      .roundedRect(margenIzquierdo, cajaTotalesY, anchoContenido, altoCajaTotales, 3)
      .fillAndStroke("#FFFFFF", COLOR_BORDE);

    const totalMinutosFueraClase =
      (datos.consolidado.minutosPerdidosFirma || 0) + (datos.consolidado.minutosFueraAula || 0);
    const tiempoTexto = formatearTiempoMinutos(totalMinutosFueraClase);

    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARIO)
      .text("RESUMEN DE SESIONES Y TIEMPO FUERA DE CLASE", margenIzquierdo + 8, cajaTotalesY + 6);

    const filaMetricasY = cajaTotalesY + 20;
    const anchoCelda = anchoContenido / 5;

    // Métricas cuantitativas
    doc
      .fontSize(7.5)
      .font("Helvetica")
      .fillColor(COLOR_TEXTO_MUTED)
      .text("Programadas:", margenIzquierdo + 8, filaMetricasY)
      .font("Helvetica-Bold")
      .fillColor(COLOR_SECUNDARIO)
      .text(`${datos.consolidado.sesionesProgramadas}`, margenIzquierdo + 8, filaMetricasY + 11);

    doc
      .font("Helvetica")
      .fillColor(COLOR_TEXTO_MUTED)
      .text("Cumpl./Parc./No:", margenIzquierdo + anchoCelda, filaMetricasY)
      .font("Helvetica-Bold")
      .fillColor(COLOR_SECUNDARIO)
      .text(
        `${datos.consolidado.sesionesCumplidas} / ${datos.consolidado.sesionesParciales} / ${datos.consolidado.sesionesNoCumplidas}`,
        margenIzquierdo + anchoCelda,
        filaMetricasY + 11,
      );

    doc
      .font("Helvetica")
      .fillColor(COLOR_TEXTO_MUTED)
      .text("Min. Perdidos Firma:", margenIzquierdo + anchoCelda * 2, filaMetricasY)
      .font("Helvetica-Bold")
      .fillColor(COLOR_SECUNDARIO)
      .text(
        `${datos.consolidado.minutosPerdidosFirma} min`,
        margenIzquierdo + anchoCelda * 2,
        filaMetricasY + 11,
      );

    doc
      .font("Helvetica")
      .fillColor(COLOR_TEXTO_MUTED)
      .text("Ausencias Aula:", margenIzquierdo + anchoCelda * 3, filaMetricasY)
      .font("Helvetica-Bold")
      .fillColor(COLOR_SECUNDARIO)
      .text(
        `${datos.consolidado.totalAusencias} (${datos.consolidado.minutosFueraAula} min)`,
        margenIzquierdo + anchoCelda * 3,
        filaMetricasY + 11,
      );

    doc
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARIO)
      .text("TOTAL FUERA CLASE:", margenIzquierdo + anchoCelda * 4, filaMetricasY)
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#B91C1C")
      .text(tiempoTexto, margenIzquierdo + anchoCelda * 4, filaMetricasY + 10);

    // ── 5. Decisión Directiva ──
    doc.y = cajaTotalesY + altoCajaTotales + 6;
    const cajaDecisionY = doc.y;
    const altoCajaDecision = 26;

    doc
      .roundedRect(margenIzquierdo, cajaDecisionY, anchoContenido, altoCajaDecision, 3)
      .fillAndStroke(COLOR_FONDO_SECCION, COLOR_BORDE);

    const decisionTexto = formatearDecisionTexto(datos.consolidado.decision);
    const obsTexto = datos.consolidado.observacion
      ? ` | Obs: ${datos.consolidado.observacion}`
      : "";

    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARIO)
      .text("Decisión directiva:", margenIzquierdo + 8, cajaDecisionY + 8);
    doc
      .font("Helvetica-Bold")
      .fillColor(COLOR_SECUNDARIO)
      .text(decisionTexto, margenIzquierdo + 95, cajaDecisionY + 8);
    if (obsTexto) {
      doc
        .font("Helvetica")
        .fillColor(COLOR_TEXTO_MUTED)
        .text(
          obsTexto,
          margenIzquierdo + 95 + doc.widthOfString(decisionTexto),
          cajaDecisionY + 8,
          {
            width: anchoContenido - 130 - doc.widthOfString(decisionTexto),
            ellipsis: true,
          },
        );
    }

    // ── 6. Listado Detallado de Sesiones de Clase y Ausencias ──
    doc.y = cajaDecisionY + altoCajaDecision + 8;
    doc
      .fontSize(8.5)
      .font("Helvetica-Bold")
      .fillColor(COLOR_PRIMARIO)
      .text("DETALLE DE SESIONES DE CLASE Y AUSENCIAS VIGENTES", margenIzquierdo, doc.y);

    doc.y += 4;

    if (!datos.sesiones || datos.sesiones.length === 0) {
      doc
        .fontSize(8)
        .font("Helvetica-Oblique")
        .fillColor(COLOR_TEXTO_MUTED)
        .text("No se registraron sesiones de clase en este período.", margenIzquierdo, doc.y + 4);
      doc.y += 14;
    } else {
      for (const sesion of datos.sesiones) {
        const tieneAusencias = sesion.ausencias && sesion.ausencias.length > 0;
        const altoEstimadoSesion = tieneAusencias ? 60 + sesion.ausencias.length * 42 : 36;
        verificarSaltoPagina(altoEstimadoSesion);

        const cardY = doc.y + 3;

        // Barra cabecera de la sesión
        doc
          .roundedRect(margenIzquierdo, cardY, anchoContenido, 18, 2)
          .fillAndStroke(COLOR_FONDO_SECCION, COLOR_BORDE);

        doc
          .fontSize(7.5)
          .font("Helvetica-Bold")
          .fillColor(COLOR_SECUNDARIO)
          .text(
            `${sesion.fecha}  |  ${sesion.cursoNombre} (${sesion.seccionNombre})  |  Tema: ${sesion.tema || "—"}`,
            margenIzquierdo + 6,
            cardY + 5,
            { width: anchoContenido - 90, ellipsis: true },
          );

        doc
          .font("Helvetica-Bold")
          .fillColor(COLOR_PRIMARIO)
          .text(formatearEstadoSesionTexto(sesion.estado), margenDerecho - 80, cardY + 5, {
            width: 74,
            align: "right",
          });

        // Detalle de horas y minutos perdidos
        const infoY = cardY + 22;
        doc
          .fontSize(7)
          .font("Helvetica")
          .fillColor(COLOR_TEXTO_MUTED)
          .text(
            `Plan: ${sesion.horaInicioPlan || "—"} - ${sesion.horaFinPlan || "—"}  |  Real: ${sesion.horaInicioReal || "—"} - ${sesion.horaFinReal || "—"}  |  Retraso: ${sesion.minutosRetraso} min  |  Min. Perdidos: ${sesion.minutosPerdidos} min`,
            margenIzquierdo + 6,
            infoY,
          );

        let finalSesionY = infoY + 12;

        // Sub-bloque de ausencias si las tiene
        if (tieneAusencias) {
          for (const aus of sesion.ausencias) {
            verificarSaltoPagina(38);
            const ausY = finalSesionY + 2;

            doc
              .rect(margenIzquierdo + 10, ausY, anchoContenido - 20, 32)
              .fillAndStroke("#FFFFFF", COLOR_BORDE);

            doc
              .strokeColor("#DC2626")
              .lineWidth(2)
              .moveTo(margenIzquierdo + 10, ausY)
              .lineTo(margenIzquierdo + 10, ausY + 32)
              .stroke();

            doc
              .fontSize(7)
              .font("Helvetica-Bold")
              .fillColor("#DC2626")
              .text(
                `Ausencia vigente: ${aus.horaDesde} a ${aus.horaHasta} (${aus.minutos} min) - ${aus.motivo}`,
                margenIzquierdo + 16,
                ausY + 4,
                { width: anchoContenido - 80 },
              );

            const obsTextoAus = aus.observacion ? `Obs: ${aus.observacion}` : "";
            const descargoTextoAus = aus.descargo ? ` | Descargo: ${aus.descargo}` : "";
            doc
              .font("Helvetica")
              .fillColor(COLOR_TEXTO_MUTED)
              .text(
                `${obsTextoAus}${descargoTextoAus}` || "Sin observaciones adicionales",
                margenIzquierdo + 16,
                ausY + 14,
                {
                  width: anchoContenido - 90,
                  ellipsis: true,
                },
              );

            // Miniaturas de fotos si existen en disco (no falla si no existen)
            if (aus.fotos && aus.fotos.length > 0) {
              let fotoX = margenDerecho - 70;
              for (const foto of aus.fotos) {
                const rutaFoto = resolverRutaArchivoSegura(foto.archivoUrl);
                if (rutaFoto) {
                  try {
                    doc.image(rutaFoto, fotoX, ausY + 3, { fit: [26, 26] });
                    fotoX -= 30;
                  } catch {
                    // Si la foto está dañada o no es válida, se omite
                  }
                }
              }
            }

            finalSesionY = ausY + 35;
          }
        }

        doc.y = finalSesionY + 2;
      }
    }

    // ── 7. Sección de Firmas Oficiales ──
    verificarSaltoPagina(95);
    doc.y += 10;
    const firmasY = doc.y;

    const anchoFirma = 190;
    const firmaDocenteX = margenIzquierdo + 20;
    const firmaDirectorX = margenDerecho - anchoFirma - 20;
    const lineaFirmaY = firmasY + 50;

    // Firma del Docente: imagen si existe en disco
    const rutaFirmaDocente = resolverRutaArchivoSegura(datos.docente.firmaUrl);
    if (rutaFirmaDocente) {
      try {
        doc.image(rutaFirmaDocente, firmaDocenteX + 35, lineaFirmaY - 45, {
          fit: [120, 42],
          align: "center",
        });
      } catch {
        // Omite la imagen si falla la lectura del archivo
      }
    }

    // Línea de firma Docente
    doc
      .strokeColor(COLOR_SECUNDARIO)
      .lineWidth(0.8)
      .moveTo(firmaDocenteX, lineaFirmaY)
      .lineTo(firmaDocenteX + anchoFirma, lineaFirmaY)
      .stroke();

    doc
      .fontSize(7.5)
      .font("Helvetica-Bold")
      .fillColor(COLOR_SECUNDARIO)
      .text(textoDocente, firmaDocenteX, lineaFirmaY + 4, {
        width: anchoFirma,
        align: "center",
      });

    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor(COLOR_TEXTO_MUTED)
      .text(
        `Docente · DNI: ${datos.docente.numeroDocumento || "—"}`,
        firmaDocenteX,
        lineaFirmaY + 14,
        {
          width: anchoFirma,
          align: "center",
        },
      );

    // Línea de firma Director
    doc
      .strokeColor(COLOR_SECUNDARIO)
      .lineWidth(0.8)
      .moveTo(firmaDirectorX, lineaFirmaY)
      .lineTo(firmaDirectorX + anchoFirma, lineaFirmaY)
      .stroke();

    doc
      .fontSize(7.5)
      .font("Helvetica-Bold")
      .fillColor(COLOR_SECUNDARIO)
      .text("DIRECCIÓN GENERAL", firmaDirectorX, lineaFirmaY + 4, {
        width: anchoFirma,
        align: "center",
      });

    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor(COLOR_TEXTO_MUTED)
      .text("Firma y Sello de la Dirección", firmaDirectorX, lineaFirmaY + 14, {
        width: anchoFirma,
        align: "center",
      });

    // ── 8. Pie de Página con Numeración Dinámica ──
    const totalPaginas = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPaginas; i++) {
      doc.switchToPage(i);
      const pieY = altoPagina - 26;

      doc
        .strokeColor(COLOR_BORDE)
        .lineWidth(0.5)
        .moveTo(margenIzquierdo, pieY - 4)
        .lineTo(margenDerecho, pieY - 4)
        .stroke();

      doc
        .fontSize(6.5)
        .font("Helvetica")
        .fillColor(COLOR_TEXTO_MUTED)
        .text(
          `Ficha oficial de seguimiento · Versión ${datos.consolidado.version} · Página ${i + 1} de ${totalPaginas}`,
          margenIzquierdo,
          pieY,
          { width: anchoContenido, align: "center" },
        );
    }

    doc.end();
  });
}
