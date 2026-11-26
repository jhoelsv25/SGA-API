import * as fs from "node:fs";
import * as path from "node:path";
import type { BloqueHorarioResponseDto } from "../dto";

const COLOR_PRIMARIO = "#881337";
const COLOR_PRIMARIO_SUAVE = "#FDF2F4";
const COLOR_PRIMARIO_BORDE = "#F5D0D8";
const COLOR_TEXTO = "#111827";
const COLOR_TEXTO_SEC = "#374151";
export const COLOR_MUTED = "#6B7280";
const COLOR_BORDE = "#E5E7EB";
const COLOR_BORDE_FUERTE = "#D1D5DB";
const COLOR_FONDO_HEADER_TABLA = "#F8FAFC";
const COLOR_RECESO_FONDO = "#FEF3C7";
const COLOR_RECESO_BORDE = "#F59E0B";
const COLOR_RECESO_TEXTO = "#92400E";

const DIAS = [
  { dia: 1, nombre: "Lunes" },
  { dia: 2, nombre: "Martes" },
  { dia: 3, nombre: "Miércoles" },
  { dia: 4, nombre: "Jueves" },
  { dia: 5, nombre: "Viernes" },
] as const;

export interface DatosHorarioPdf {
  titulo: string;
  subtitulo: string;
  filtroDocente?: string;
  bloques: BloqueHorarioResponseDto[];
}

interface IntervaloHorario {
  inicio: string;
  fin: string;
  minInicio: number;
  minFin: number;
  alto: number;
  y: number;
}

function minutosDe(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => Number.parseInt(n, 10));
  return (Number.isNaN(h) ? 0 : h) * 60 + (Number.isNaN(m) ? 0 : m);
}

/** Mezcla un color hex con blanco según la proporción (0..1) sin usar canal alfa. */
function tintHex(hex: string, factor: number): string {
  const limpio = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(limpio)) {
    return "#F3F4F6";
  }
  const r = Number.parseInt(limpio.slice(0, 2), 16);
  const g = Number.parseInt(limpio.slice(2, 4), 16);
  const b = Number.parseInt(limpio.slice(4, 6), 16);

  const mix = (c: number) => Math.round(255 - (255 - c) * factor);
  const toHex = (c: number) => c.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

export function resolverLogoPath(): string | null {
  const candidatos = [
    path.resolve(process.cwd(), "src/assets/logo.png"),
    path.resolve(process.cwd(), "dist/assets/logo.png"),
    path.resolve(process.cwd(), "public/logo.png"),
    path.resolve(process.cwd(), "../sga-web/public/logo.png"),
  ];
  for (const ruta of candidatos) {
    if (fs.existsSync(ruta)) {
      return ruta;
    }
  }
  return null;
}

function construirIntervalos(
  bloques: readonly BloqueHorarioResponseDto[],
  altoDisponible: number,
): IntervaloHorario[] {
  const puntos = new Map<number, string>();
  for (const b of bloques) {
    puntos.set(minutosDe(b.horaInicio), b.horaInicio);
    puntos.set(minutosDe(b.horaFin), b.horaFin);
  }

  const ordenados = Array.from(puntos.entries()).sort((a, b) => a[0] - b[0]);
  if (ordenados.length < 2) {
    return [];
  }

  const crudos: Omit<IntervaloHorario, "y">[] = [];
  for (let i = 0; i < ordenados.length - 1; i++) {
    const [minInicio, inicio] = ordenados[i];
    const [minFin, fin] = ordenados[i + 1];
    const duracion = minFin - minInicio;
    const tieneBloque = bloques.some(
      (b) => minutosDe(b.horaInicio) <= minInicio && minutosDe(b.horaFin) >= minFin,
    );

    const altoBase = tieneBloque
      ? Math.max(26, Math.min(72, Math.round(duracion * 0.95)))
      : Math.max(12, Math.min(18, Math.round(duracion * 0.5)));

    crudos.push({ inicio, fin, minInicio, minFin, alto: altoBase });
  }

  const suma = crudos.reduce((acc, item) => acc + item.alto, 0);
  const escala = suma > altoDisponible ? altoDisponible / suma : 1;

  let yActual = 0;
  return crudos.map((item) => {
    const alto = Math.max(tieneMinimo(item.alto, escala), Math.round(item.alto * escala));
    const intervalo: IntervaloHorario = { ...item, alto, y: yActual };
    yActual += alto;
    return intervalo;
  });
}

function tieneMinimo(altoBase: number, escala: number): number {
  return altoBase <= 18 ? Math.max(10, Math.round(altoBase * escala)) : 20;
}

function dibujarCabecera(
  doc: PDFKit.PDFDocument,
  datos: DatosHorarioPdf,
  logoPath: string | null,
  anchoContenido: number,
  margen: number,
): number {
  const anchoPagina = doc.page.width;

  // Filete superior institucional
  doc.rect(0, 0, anchoPagina, 4).fill(COLOR_PRIMARIO);

  const topY = 20;
  let textoX = margen;

  if (logoPath) {
    try {
      doc.image(logoPath, margen, topY, {
        fit: [48, 48],
        align: "center",
        valign: "center",
      });
      textoX = margen + 58;
    } catch {
      textoX = margen;
    }
  }

  doc
    .fillColor(COLOR_PRIMARIO)
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .text("I.E. DE MUJERES NUESTRA SEÑORA DEL CARMEN · LIRCAY", textoX, topY + 2, {
      width: anchoContenido - (textoX - margen) - 165,
    });

  doc
    .fillColor(COLOR_TEXTO)
    .font("Helvetica-Bold")
    .fontSize(15)
    .text("HORARIO ESCOLAR SEMANAL", textoX, topY + 14, {
      width: anchoContenido - (textoX - margen) - 165,
    });

  doc
    .fillColor(COLOR_TEXTO_SEC)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(
      datos.filtroDocente ? `${datos.titulo}  ·  Docente: ${datos.filtroDocente}` : datos.titulo,
      textoX,
      topY + 33,
      {
        width: anchoContenido - (textoX - margen) - 165,
      },
    );

  // Insignia derecha con año académico
  const anchoBadge = 152;
  const badgeX = margen + anchoContenido - anchoBadge;
  doc
    .roundedRect(badgeX, topY + 6, anchoBadge, 24, 5)
    .fillAndStroke(COLOR_PRIMARIO_SUAVE, COLOR_PRIMARIO_BORDE);

  doc
    .fillColor(COLOR_PRIMARIO)
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .text(datos.subtitulo, badgeX + 6, topY + 13, {
      width: anchoBadge - 12,
      align: "center",
    });

  const fechaTexto = `Emitido: ${new Date().toLocaleDateString("es-PE")}`;
  doc
    .fillColor(COLOR_MUTED)
    .font("Helvetica")
    .fontSize(7.5)
    .text(fechaTexto, badgeX, topY + 35, {
      width: anchoBadge,
      align: "right",
    });

  const lineaY = topY + 54;
  doc
    .moveTo(margen, lineaY)
    .lineTo(margen + anchoContenido, lineaY)
    .strokeColor(COLOR_PRIMARIO)
    .lineWidth(1.2)
    .stroke();

  return lineaY + 10;
}

function dibujarBloqueClase(
  doc: PDFKit.PDFDocument,
  bloque: BloqueHorarioResponseDto,
  x: number,
  y: number,
  ancho: number,
  alto: number,
): void {
  const color = bloque.colorHex || COLOR_PRIMARIO;
  const fondo = tintHex(color, 0.09);
  const borde = tintHex(color, 0.28);

  doc.roundedRect(x, y, ancho, alto, 4).fillAndStroke(fondo, borde);

  // Barra lateral de color
  doc.save();
  doc.roundedRect(x, y, 4.5, alto, 2).fill(color);
  doc.restore();

  const textoX = x + 9;
  const textoAncho = ancho - 14;
  const esCompacto = alto < 34;

  if (esCompacto) {
    doc
      .fillColor(COLOR_TEXTO)
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .text(bloque.cursoNombre ?? "Clase", textoX, y + 4, {
        width: textoAncho,
        ellipsis: true,
        lineBreak: false,
      });

    doc
      .fillColor(color)
      .font("Helvetica-Bold")
      .fontSize(6.5)
      .text(`${bloque.horaInicio} – ${bloque.horaFin}`, textoX, y + 14, {
        width: textoAncho,
        lineBreak: false,
      });
    return;
  }

  let cursorY = y + 6;
  doc
    .fillColor(COLOR_TEXTO)
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .text(bloque.cursoNombre ?? "Clase", textoX, cursorY, {
      width: textoAncho,
      ellipsis: true,
      lineBreak: false,
    });
  cursorY += 11;

  if (bloque.docenteNombre && cursorY + 10 < y + alto - 12) {
    doc
      .fillColor(COLOR_TEXTO_SEC)
      .font("Helvetica")
      .fontSize(7.5)
      .text(bloque.docenteNombre, textoX, cursorY, {
        width: textoAncho,
        ellipsis: true,
        lineBreak: false,
      });
    cursorY += 10;
  }

  if (bloque.aula && cursorY + 10 < y + alto - 12) {
    doc
      .fillColor(COLOR_MUTED)
      .font("Helvetica")
      .fontSize(7)
      .text(`Aula: ${bloque.aula}`, textoX, cursorY, {
        width: textoAncho,
        ellipsis: true,
        lineBreak: false,
      });
  }

  // Franja horaria en la parte inferior de la tarjeta
  doc
    .fillColor(color)
    .font("Helvetica-Bold")
    .fontSize(7)
    .text(`${bloque.horaInicio} – ${bloque.horaFin}`, textoX, y + alto - 12, {
      width: textoAncho,
      lineBreak: false,
    });
}

function dibujarBloqueReceso(
  doc: PDFKit.PDFDocument,
  bloque: BloqueHorarioResponseDto,
  x: number,
  y: number,
  ancho: number,
  alto: number,
): void {
  doc.roundedRect(x, y, ancho, alto, 4).fillAndStroke(COLOR_RECESO_FONDO, COLOR_RECESO_BORDE);

  const etiqueta = `RECESO · ${bloque.horaInicio} – ${bloque.horaFin}`;
  doc
    .fillColor(COLOR_RECESO_TEXTO)
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .text(etiqueta, x + 4, y + Math.max(3, (alto - 8) / 2), {
      width: ancho - 8,
      align: "center",
      lineBreak: false,
    });
}

export function dibujarPaginaHorario(
  doc: PDFKit.PDFDocument,
  datos: DatosHorarioPdf,
  logoPath: string | null,
): void {
  const margen = 28;
  const anchoContenido = doc.page.width - margen * 2;
  const yTabla = dibujarCabecera(doc, datos, logoPath, anchoContenido, margen);
  const altoHeaderTabla = 24;
  const yFooter = doc.page.height - margen - 14;
  const altoDisponibleGrilla = yFooter - 10 - (yTabla + altoHeaderTabla);

  const intervalos = construirIntervalos(datos.bloques, altoDisponibleGrilla);

  if (intervalos.length === 0) {
    doc
      .roundedRect(margen, yTabla + 10, anchoContenido, 68, 6)
      .strokeColor(COLOR_BORDE_FUERTE)
      .lineWidth(1)
      .stroke();
    doc
      .fillColor(COLOR_MUTED)
      .font("Helvetica")
      .fontSize(11)
      .text("No hay bloques de horario registrados para esta sección.", margen, yTabla + 38, {
        width: anchoContenido,
        align: "center",
      });
    return;
  }

  const anchoHora = 76;
  const anchoDia = (anchoContenido - anchoHora) / DIAS.length;
  const altoTotalGrilla = intervalos.reduce((acc, item) => acc + item.alto, 0);

  // Cabecera de columnas
  doc
    .rect(margen, yTabla, anchoContenido, altoHeaderTabla)
    .fillAndStroke(COLOR_FONDO_HEADER_TABLA, COLOR_BORDE_FUERTE);

  doc
    .fillColor(COLOR_TEXTO)
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .text("HORA", margen + 4, yTabla + 8, { width: anchoHora - 8, align: "center" });

  DIAS.forEach((dia, idx) => {
    const x = margen + anchoHora + idx * anchoDia;
    doc
      .moveTo(x, yTabla)
      .lineTo(x, yTabla + altoHeaderTabla + altoTotalGrilla)
      .strokeColor(COLOR_BORDE)
      .lineWidth(0.75)
      .stroke();

    doc
      .fillColor(COLOR_TEXTO)
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .text(dia.nombre.toUpperCase(), x + 4, yTabla + 8, {
        width: anchoDia - 8,
        align: "center",
      });
  });

  const yInicioCuerpo = yTabla + altoHeaderTabla;

  // Filas base por intervalo horario (en orden cronológico estricto)
  for (const intervalo of intervalos) {
    const yFila = yInicioCuerpo + intervalo.y;

    doc
      .moveTo(margen, yFila + intervalo.alto)
      .lineTo(margen + anchoContenido, yFila + intervalo.alto)
      .strokeColor(COLOR_BORDE)
      .lineWidth(0.6)
      .stroke();

    doc
      .fillColor(COLOR_TEXTO_SEC)
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .text(
        `${intervalo.inicio} - ${intervalo.fin}`,
        margen + 4,
        yFila + Math.max(2, (intervalo.alto - 8) / 2),
        {
          width: anchoHora - 8,
          align: "center",
          lineBreak: false,
        },
      );
  }

  // Contorno exterior de la grilla
  doc
    .rect(margen, yTabla, anchoContenido, altoHeaderTabla + altoTotalGrilla)
    .strokeColor(COLOR_BORDE_FUERTE)
    .lineWidth(0.9)
    .stroke();

  // Línea divisoria entre columna Hora y días
  doc
    .moveTo(margen + anchoHora, yTabla)
    .lineTo(margen + anchoHora, yInicioCuerpo + altoTotalGrilla)
    .strokeColor(COLOR_BORDE_FUERTE)
    .lineWidth(0.8)
    .stroke();

  // Mapeo minuto -> coordenada Y exacta dentro de la grilla
  const yDeMinuto = (minuto: number): number => {
    for (const intervalo of intervalos) {
      if (minuto === intervalo.minInicio) {
        return yInicioCuerpo + intervalo.y;
      }
      if (minuto === intervalo.minFin) {
        return yInicioCuerpo + intervalo.y + intervalo.alto;
      }
    }
    return yInicioCuerpo;
  };

  // Dibujar tarjetas de bloque abarcando todos sus intervalos correspondientes
  for (const bloque of datos.bloques) {
    const idxDia = DIAS.findIndex((d) => d.dia === bloque.diaSemana);
    if (idxDia === -1) {
      continue;
    }

    const yTop = yDeMinuto(minutosDe(bloque.horaInicio));
    const yBottom = yDeMinuto(minutosDe(bloque.horaFin));
    const altoBloque = Math.max(18, yBottom - yTop - 4);
    const xDia = margen + anchoHora + idxDia * anchoDia;

    if (bloque.tipoBloque === "receso") {
      dibujarBloqueReceso(doc, bloque, xDia + 3, yTop + 2, anchoDia - 6, altoBloque);
    } else {
      dibujarBloqueClase(doc, bloque, xDia + 3, yTop + 2, anchoDia - 6, altoBloque);
    }
  }

  // Pie de página
  doc
    .moveTo(margen, yFooter - 4)
    .lineTo(margen + anchoContenido, yFooter - 4)
    .strokeColor(COLOR_BORDE)
    .lineWidth(0.6)
    .stroke();

  doc
    .fillColor(COLOR_MUTED)
    .font("Helvetica")
    .fontSize(7.5)
    .text("Sistema de Gestión Académica · I.E. Nuestra Señora del Carmen", margen, yFooter, {
      width: anchoContenido / 2,
    });

  doc
    .fillColor(COLOR_MUTED)
    .font("Helvetica")
    .fontSize(7.5)
    .text(`Total de bloques: ${datos.bloques.length}`, margen + anchoContenido / 2, yFooter, {
      width: anchoContenido / 2,
      align: "right",
    });
}
