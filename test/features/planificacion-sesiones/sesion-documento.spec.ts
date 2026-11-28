import { inflateRawSync } from "node:zlib";
import {
  DOCUMENTO_SESION,
  generarSesionDocx,
  generarSesionPdf,
  type DatosSesion,
} from "@/features/planificacion-sesiones";

const datos: DatosSesion = {
  lema: "AÑO DE PRUEBA",
  institucion: "I.E. Miguel Grau Seminario",
  docente: "José Candiotti García",
  coordinador: "Samuel Anyaipoma",
  area: "Matemática",
  bimestre: "IV Bimestre",
  unidad: "Unidad 04",
  nivelGrado: "Secundaria - 4to Grado",
  fechaInicio: "2026-11-23",
  fechaFin: "2026-11-26",
  secciones: ["A", "B"],
  duracionMin: 90,
  numero: 7,
  titulo: "Divisibilidad en acción",
  proposito: "Aplicar la divisibilidad.",
  competencias: [
    {
      orden: 1,
      competenciaId: "c-1",
      competenciaTexto: "Resuelve problemas de cantidad",
      capacidades: ["Traduce cantidades"],
      desempenos: [{ desempenoId: null, base: null, texto: "Resuelve problemas" }],
      campoTematico: "Divisibilidad",
    },
  ],
  enfoques: [{ enfoque: "Enfoque de Derechos", valores: ["Conciencia"], acciones: ["Debate"] }],
  transversales: [
    {
      competencia: "Gestiona su aprendizaje",
      capacidades: ["Define metas"],
      actividad: "Establece una meta",
    },
  ],
  momentos: [
    { momento: "inicio", actividades: "Video", minutos: 15 },
    { momento: "desarrollo", actividades: "Trabajo en grupos", minutos: 60 },
    { momento: "cierre", actividades: "Metacognición", minutos: 15 },
  ],
  mapaVisual: [{ concepto: "Múltiplo", definicion: "a = k·b" }],
  criterios: ["Incluye la tabla"],
  evidencia: "Informe escrito",
  producto: "Informe grupal",
  instrumento: "Lista de cotejo",
  acuerdos: ["Levantar la mano"],
  materiales: { recursos: ["Cuaderno de trabajo"], comunidad: ["Entrevista"] },
  listasCotejo: [{ seccion: "A", estudiantes: ["Quispe Rojas, Ana"] }],
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

describe("RF-024 V2: documento de la sesión (HU4)", () => {
  it("el Word sigue la estructura compartida con el editor, en su orden", async () => {
    const texto = textoDelDocx(await generarSesionDocx(datos));
    const M = DOCUMENTO_SESION;
    const esperado = [
      datos.lema,
      datos.institucion,
      `${M.encabezado} 07`,
      M.datosInformativos.titulo,
      ...Object.values(M.datosInformativos.filas),
      M.tituloSesion.titulo,
      M.propositos.titulo,
      ...M.propositos.columnas,
      M.enfoques.titulo,
      ...M.enfoques.columnas,
      M.transversales.titulo,
      ...M.transversales.columnas,
      M.momentos.titulo,
      ...M.momentos.columnas,
      M.momentos.nombres.inicio,
      M.momentos.etiquetaProposito.trim(),
      M.momentos.nombres.desarrollo,
      M.momentos.mapaVisual,
      M.momentos.nombres.cierre,
      M.evaluacion.titulo,
      ...M.evaluacion.columnas,
      M.acuerdos.titulo,
      M.materiales.titulo,
      ...M.materiales.columnas,
      ...M.firmas.roles,
      M.listaCotejo.titulo,
      ...M.listaCotejo.columnas,
      datos.criterios[0],
      "Quispe Rojas, Ana",
    ];
    let desde = 0;
    for (const t of esperado) {
      const en = texto.indexOf(t, desde);
      expect({ t, en: en >= 0 }).toEqual({ t, en: true });
      desde = en + t.length;
    }
    expect(texto).toContain("23/11/2026 - 26/11/2026");
    expect(texto).toContain("90 minutos");
    expect(texto).not.toContain(M.borrador);
  });

  it("sin lista de cotejo no agrega anexo", async () => {
    const texto = textoDelDocx(await generarSesionDocx({ ...datos, listasCotejo: [] }));
    expect(texto).not.toContain(DOCUMENTO_SESION.listaCotejo.titulo);
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
