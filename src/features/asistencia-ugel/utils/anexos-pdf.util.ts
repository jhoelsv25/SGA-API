import PDFDocument from "pdfkit";
import type { FilaReporteDto, ReporteUgelDto } from "../dto";
import {
  ENCABEZADO_NORMA,
  NOTA_ANEXO_04,
  TITULO_ANEXO_03,
  TITULO_ANEXO_04,
  lugarYFecha,
} from "./anexos-textos";

const MARGEN = 24;
const ANCHO = 842 - MARGEN * 2; // A4 horizontal
const ALTO_PAGINA = 595;
const LETRA = 6.5;

interface Celda {
  x: number;
  y: number;
  w: number;
  h: number;
  texto: string;
  izquierda?: boolean;
  negrita?: boolean;
}

/** Anexos 03 y 04 listos para imprimir y firmar. */
export async function generarAnexosPdf(r: ReporteUgelDto): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
    const partes: Buffer[] = [];
    doc.on("data", (c: Buffer) => partes.push(c));
    doc.on("end", () => resolve(Buffer.concat(partes)));
    doc.on("error", reject);

    const fuente = (negrita: boolean, size = LETRA) =>
      doc.font(negrita ? "Helvetica-Bold" : "Helvetica").fontSize(size);
    const libre = (texto: string, x: number, y: number, negrita = false, size = 8) =>
      fuente(negrita, size).text(texto, x, y, { lineBreak: false });
    const centrado = (texto: string, y: number, size: number) =>
      fuente(true, size).text(texto, MARGEN, y, { width: ANCHO, align: "center" });
    const celda = ({ x, y, w, h, texto, izquierda, negrita = false }: Celda) => {
      doc.lineWidth(0.5).rect(x, y, w, h).stroke();
      if (!texto) return;
      fuente(negrita);
      const alto = Math.min(doc.heightOfString(texto, { width: w - 3 }), h - 1);
      doc.text(texto, x + 1.5, y + Math.max((h - alto) / 2, 0.5), {
        width: w - 3,
        height: h - 1,
        align: izquierda ? "left" : "center",
        ellipsis: true,
      });
    };

    const encabezado = (titulo: string) => {
      const [anexo, formato] = titulo.split("\n");
      centrado(ENCABEZADO_NORMA, MARGEN, 7);
      centrado(anexo, MARGEN + 22, 10);
      centrado((r.borrador ? "BORRADOR · " : "") + formato, MARGEN + 35, 9);
      const e = r.encabezado;
      libre(`DRE/UGEL: ${e.dreUgel}`, MARGEN, 76);
      libre(`I.E.: ${e.institucion}`, MARGEN, 87);
      libre(`Nivel/Modalidad Educativa: ${e.nivelModalidad}`, MARGEN, 98);
      libre(`PERIODO (mes/año): ${e.periodo}`, 520, 76);
      libre(`Turno: ${e.turno}`, 520, 87);
      return 114;
    };

    const pie = (y: number) => {
      libre(lugarYFecha(r.encabezado.lugar), 600, y + 4);
      libre("______________________________", 340, y + 34);
      libre(r.encabezado.director, 340, y + 45);
      libre("Director", 400, y + 56);
    };

    /** Dibuja las filas y abre páginas nuevas repitiendo el encabezado. */
    const tabla = (
      titulo: string,
      cabeza: (y: number) => number,
      altoFila: number,
      columnas: {
        w: number;
        izquierda?: boolean;
        valor: (f: FilaReporteDto, i: number) => string;
      }[],
      altoPie: number,
    ): number => {
      let y = cabeza(encabezado(titulo));
      r.filas.forEach((f, i) => {
        if (y + altoFila > ALTO_PAGINA - MARGEN) {
          doc.addPage();
          y = cabeza(encabezado(titulo));
        }
        let x = MARGEN;
        for (const c of columnas) {
          celda({ x, y, w: c.w, h: altoFila, texto: c.valor(f, i), izquierda: c.izquierda });
          x += c.w;
        }
        y += altoFila;
      });
      if (y + altoPie > ALTO_PAGINA - MARGEN) {
        doc.addPage();
        y = encabezado(titulo);
      }
      return y;
    };

    const fijas = (anchos: number[]) => [
      { w: anchos[0], valor: (_: FilaReporteDto, i: number) => String(i + 1) },
      { w: anchos[1], valor: (f: FilaReporteDto) => f.dni },
      { w: anchos[2], izquierda: true, valor: (f: FilaReporteDto) => f.nombreCompleto },
      { w: anchos[3], valor: (f: FilaReporteDto) => f.cargo },
      { w: anchos[4], valor: (f: FilaReporteDto) => f.condicion },
      { w: anchos[5], valor: (f: FilaReporteDto) => String(f.jornada ?? "") },
    ];
    const titulosFijos = (anchos: number[], y: number, h: number) => {
      let x = MARGEN;
      ["Nº", "DNI", "Apellidos y Nombres", "Cargo", "Condición", "Jor. Lab."].forEach((t, i) => {
        celda({ x, y, w: anchos[i], h, texto: t, negrita: true });
        x += anchos[i];
      });
      return x;
    };

    // Anexo 03
    const a3 = [16, 40, 130, 52, 40, 20];
    const anchoDia = (ANCHO - a3.reduce((a, b) => a + b, 0)) / r.calendario.length;
    let y = tabla(
      TITULO_ANEXO_03,
      (top) => {
        const x = titulosFijos(a3, top, 26);
        celda({
          x,
          y: top,
          w: anchoDia * r.calendario.length,
          h: 10,
          texto: "DÍAS CALENDARIO",
          negrita: true,
        });
        r.calendario.forEach((d, i) => {
          celda({
            x: x + i * anchoDia,
            y: top + 10,
            w: anchoDia,
            h: 8,
            texto: String(d.numero),
            negrita: true,
          });
          celda({ x: x + i * anchoDia, y: top + 18, w: anchoDia, h: 8, texto: d.inicial });
        });
        return top + 26;
      },
      17,
      [
        ...fijas(a3),
        ...r.calendario.map((_, i) => ({ w: anchoDia, valor: (f: FilaReporteDto) => f.dias[i] })),
      ],
      r.leyenda.length * 10 + 16,
    );
    libre("LEYENDA:", MARGEN, y + 5, true, 7);
    r.leyenda.forEach(([codigo, texto], i) => {
      celda({ x: MARGEN, y: y + 15 + i * 10, w: 18, h: 10, texto: codigo });
      celda({ x: MARGEN + 18, y: y + 15 + i * 10, w: 230, h: 10, texto, izquierda: true });
    });
    pie(y);

    // Anexo 04
    doc.addPage();
    const a4 = [16, 40, 130, 56, 44, 22];
    const numericas = [52, 30, 32, 30, 32, 52];
    const obs = ANCHO - [...a4, ...numericas].reduce((a, b) => a + b, 0);
    y = tabla(
      TITULO_ANEXO_04,
      (top) => {
        let x = titulosFijos(a4, top, 24);
        const grupo = (titulo: string, subs: [string, number][]) => {
          const w = subs.reduce((a, [, s]) => a + s, 0);
          celda({ x, y: top, w, h: 12, texto: titulo, negrita: true });
          for (const [t, s] of subs) {
            celda({ x, y: top + 12, w: s, h: 12, texto: t });
            x += s;
          }
        };
        grupo("Inasistencias", [["Días", numericas[0]]]);
        grupo("Tardanzas", [
          ["Horas (*)", numericas[1]],
          ["Min. (*)", numericas[2]],
        ]);
        grupo("Permisos SG", [
          ["Horas (*)", numericas[3]],
          ["Min. (*)", numericas[4]],
        ]);
        grupo("Huelga/Paro", [["Días", numericas[5]]]);
        celda({ x, y: top, w: obs, h: 24, texto: "Observaciones", negrita: true });
        return top + 24;
      },
      24,
      [
        ...fijas(a4),
        ...[
          (f: FilaReporteDto) => f.diasInasistencia,
          (f: FilaReporteDto) => f.tardanza.horas,
          (f: FilaReporteDto) => f.tardanza.minutos,
          (f: FilaReporteDto) => f.permisoSinGoce.horas,
          (f: FilaReporteDto) => f.permisoSinGoce.minutos,
          (f: FilaReporteDto) => f.diasHuelga,
        ].map((valor, i) => ({ w: numericas[i], valor: (f: FilaReporteDto) => String(valor(f)) })),
        { w: obs, izquierda: true, valor: (f: FilaReporteDto) => f.observaciones },
      ],
      80,
    );
    libre(NOTA_ANEXO_04, MARGEN, y + 4, false, 7);
    pie(y + 8);

    doc.end();
  });
}
