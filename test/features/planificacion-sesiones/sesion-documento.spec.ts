import { inflateRawSync } from "node:zlib";
import {
  DOCUMENTO_SESION,
  generarSesionDocx,
  generarSesionPdf,
  type DatosSesionPdf,
} from "@/features/planificacion-sesiones";

const datos: DatosSesionPdf = {
  institucion: "I.E. Miguel Grau Seminario",
  director: "Mag. Lily Veliz Peralta",
  docente: "José Candiotti García",
  gradoSeccion: "1.° año / Única",
  area: "Educación Física",
  fecha: "2026-10-12",
  numero: 1,
  unidad: "U7",
  titulo: "Desenterrando tesoros: juegos ancestrales del Perú",
  proposito: "Explora y vivencia juegos tradicionales peruanos.",
  competencias: [
    {
      orden: 1,
      competenciaId: "c-1",
      competenciaTexto: "Se desenvuelve de manera autónoma a través de su motricidad",
      capacidades: ["Comprende su cuerpo", "Se expresa corporalmente"],
      desempenos: [{ desempenoId: null, base: null, texto: "Adapta sus movimientos" }],
      campoTematico: "Juegos tradicionales",
    },
  ],
  evidencia: "Ficha de trabajo",
  criterios: ["Describe los movimientos"],
  instrumento: "Rúbrica",
  transversales: [
    {
      competencia: "Gestiona su aprendizaje de manera autónoma",
      capacidades: ["Define metas"],
      desempeno: null,
    },
  ],
  enfoques: [
    { enfoque: "Enfoque Intercultural", valores: ["Justicia"], acciones: ["Acogen con respeto"] },
  ],
  materiales: { impresos: ["Fichas"], manipulativos: ["Conos"], digitales: [] },
  momentos: [
    { momento: "inicio", actividades: "Video y diálogo", minutos: 15 },
    { momento: "desarrollo", actividades: "Práctica", minutos: 65 },
    { momento: "cierre", actividades: "Metacognición", minutos: 10 },
  ],
  referencias: ["MINEDU (2016). Currículo Nacional."],
  borrador: false,
};

/** Texto de `word/document.xml` dentro del .docx (zip), sin etiquetas. */
function textoDelDocx(docx: Buffer): string {
  const firma = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  let i = docx.indexOf(firma);
  while (i >= 0) {
    const metodo = docx.readUInt16LE(i + 8);
    const comprimido = docx.readUInt32LE(i + 18);
    const largoNombre = docx.readUInt16LE(i + 26);
    const largoExtra = docx.readUInt16LE(i + 28);
    const nombre = docx.subarray(i + 30, i + 30 + largoNombre).toString();
    const inicio = i + 30 + largoNombre + largoExtra;
    if (nombre === "word/document.xml") {
      const datos = docx.subarray(inicio, inicio + comprimido);
      const xml = (metodo === 8 ? inflateRawSync(datos) : datos).toString("utf8");
      return xml
        .replace(/<\/w:p>/g, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&");
    }
    i = docx.indexOf(firma, inicio);
  }
  throw new Error("El .docx no trae word/document.xml");
}

describe("RF-024 V1: documento de la sesión (HU4)", () => {
  it("el Word sigue la estructura compartida con el editor, en su orden", async () => {
    const texto = textoDelDocx(await generarSesionDocx(datos));
    const M = DOCUMENTO_SESION;
    const esperado = [
      `${M.encabezado} 1`,
      M.datosInformativos.titulo,
      ...Object.values(M.datosInformativos.filas),
      M.acerca,
      M.propositos.titulo,
      M.propositos.etiquetaProposito.trim(),
      ...M.propositos.columnas,
      M.evaluacion.titulo,
      ...M.evaluacion.columnas,
      M.transversales.titulo,
      ...M.transversales.columnas,
      M.enfoques.titulo,
      ...M.enfoques.columnas,
      M.secuencia,
      M.materiales.titulo,
      ...M.materiales.columnas,
      M.momentos.titulo,
      ...M.momentos.columnas,
      ...M.momentos.orden.map((m) => M.momentos.nombres[m]),
      M.referencias,
      ...M.firmas.roles,
    ];
    let desde = 0;
    for (const t of esperado) {
      const en = texto.indexOf(t, desde);
      expect({ t, en: en >= 0 }).toEqual({ t, en: true });
      desde = en + t.length;
    }
    expect(texto).toContain("12/10/2026");
    expect(texto).not.toContain(M.borrador);
  });

  it("genera el PDF", async () => {
    const pdf = await generarSesionPdf(datos);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("genera el Word (.docx es un zip)", async () => {
    const docx = await generarSesionDocx(datos);
    expect(docx.subarray(0, 2).toString()).toBe("PK");
    expect(docx.length).toBeGreaterThan(2000);
  });

  it("un borrador también se genera", async () => {
    await expect(generarSesionDocx({ ...datos, borrador: true })).resolves.toBeDefined();
  });
});
