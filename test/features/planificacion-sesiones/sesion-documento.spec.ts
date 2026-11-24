import {
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

describe("RF-024 V1: documento de la sesión (HU4)", () => {
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
