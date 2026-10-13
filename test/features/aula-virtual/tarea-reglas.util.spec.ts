import {
  calcularNotaDeIntentos,
  calcularNotaFinalPonderada,
  convertirNotaALiteral,
  evaluarIntentoPreguntas,
  puedenRevelarseRespuestas,
  validarExtensionArchivo,
  validarPublicacionTarea,
  type PreguntaDef,
} from "../../../src/features/aula-virtual/utils/tarea-reglas.util";

describe("tarea-reglas.util (RF-016)", () => {
  describe("validarPublicacionTarea", () => {
    const ahora = "2027-05-10T10:00:00Z";

    it("CP-RF016-01: permite publicar un trabajo con fecha límite futura", () => {
      const res = validarPublicacionTarea(
        {
          tipo: "trabajo",
          fechaLimite: "2027-05-20T23:59:00Z",
        },
        ahora,
      );
      expect(res.valida).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it("CP-RF016-05: cuestionario sin preguntas rechaza publicación", () => {
      const res = validarPublicacionTarea(
        {
          tipo: "cuestionario",
          fechaLimite: "2027-05-20T23:59:00Z",
          preguntas: [],
        },
        ahora,
      );
      expect(res.valida).toBe(false);
      expect(res.error).toBe("Agregue al menos una pregunta antes de publicar.");
    });

    it("CP-RF016-06: pregunta cerrada sin opción correcta rechaza publicación", () => {
      const res = validarPublicacionTarea(
        {
          tipo: "cuestionario",
          fechaLimite: "2027-05-20T23:59:00Z",
          preguntas: [
            {
              id: "p1",
              tipo: "opcion_unica",
              puntaje: 2,
              enunciado: "¿Cuánto es 2 + 2?",
              opciones: [
                { texto: "3", esCorrecta: false },
                { texto: "4", esCorrecta: false },
              ],
            },
          ],
        },
        ahora,
      );
      expect(res.valida).toBe(false);
      expect(res.error).toBe("Marque al menos una opción correcta en cada pregunta cerrada.");
    });

    it("CP-RF016-07: fecha límite anterior a la publicación rechaza publicación", () => {
      const res = validarPublicacionTarea(
        {
          tipo: "trabajo",
          fechaLimite: "2027-05-09T23:59:00Z",
        },
        ahora,
      );
      expect(res.valida).toBe(false);
      expect(res.error).toBe("La fecha límite debe ser posterior a la fecha de publicación.");
    });
  });

  describe("validarExtensionArchivo", () => {
    it("CP-RF016-14: rechaza formato DOCX si solo se permite PDF", () => {
      expect(validarExtensionArchivo("tarea.docx", "pdf")).toBe(false);
      expect(validarExtensionArchivo("tarea.pdf", "pdf")).toBe(true);
    });

    it("acepta 'imagen' y 'documento' como alias de múltiples extensiones", () => {
      expect(validarExtensionArchivo("foto.png", "imagen, pdf")).toBe(true);
      expect(validarExtensionArchivo("foto.jpg", "imagen")).toBe(true);
      expect(validarExtensionArchivo("ejercicio.docx", "documento")).toBe(true);
      expect(validarExtensionArchivo("audio.mp3", "pdf, docx")).toBe(false);
    });
  });

  describe("evaluarIntentoPreguntas", () => {
    it("CP-RF016-15: califica automáticamente preguntas cerradas y calcula nota vigesimal", () => {
      const preguntas: PreguntaDef[] = Array.from({ length: 10 }, (_, i) => ({
        id: `p${i + 1}`,
        tipo: "opcion_unica",
        puntaje: 2,
        enunciado: `Pregunta ${i + 1}`,
        opciones: [
          { id: `opt_corr_${i + 1}`, texto: "Correcta", esCorrecta: true },
          { id: `opt_inc_${i + 1}`, texto: "Incorrecta", esCorrecta: false },
        ],
      }));

      // 8 respuestas correctas y 2 incorrectas
      const respuestas: Record<string, string> = {};
      for (let i = 0; i < 8; i++) {
        respuestas[`p${i + 1}`] = `opt_corr_${i + 1}`;
      }
      respuestas["p9"] = "opt_inc_9";
      respuestas["p10"] = "opt_inc_10";

      const resultado = evaluarIntentoPreguntas(preguntas, respuestas);

      expect(resultado.todasCerradas).toBe(true);
      expect(resultado.calificada).toBe(true);
      expect(resultado.puntajeObtenido).toBe(16);
      expect(resultado.puntajePosible).toBe(20);
      expect(resultado.notaVigesimal).toBe(16.0);
    });

    it("CP-RF016-19: examen con preguntas abiertas queda sin calificar completa", () => {
      const preguntas: PreguntaDef[] = [
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `p${i + 1}`,
          tipo: "opcion_unica" as const,
          puntaje: 2,
          enunciado: `Pregunta cerrada ${i + 1}`,
          opciones: [{ id: `c_${i + 1}`, texto: "A", esCorrecta: true }],
        })),
        {
          id: "p9",
          tipo: "respuesta_corta",
          puntaje: 2,
          enunciado: "Explique la fotosíntesis",
        },
        {
          id: "p10",
          tipo: "respuesta_corta",
          puntaje: 2,
          enunciado: "Explique la respiración celular",
        },
      ];

      const respuestas: Record<string, string> = {
        p1: "c_1",
        p9: "Es el proceso...",
      };

      const resultado = evaluarIntentoPreguntas(preguntas, respuestas);

      expect(resultado.todasCerradas).toBe(false);
      expect(resultado.calificada).toBe(false);
      expect(resultado.respuestasDetalle["p9"].calificada).toBe(false);
    });
  });

  describe("calcularNotaDeIntentos", () => {
    it("CP-RF016-17: toma la más alta por defecto", () => {
      expect(calcularNotaDeIntentos([12, 16, 14], "mas_alta")).toBe(16);
    });

    it("toma la última nota cuando está configurado", () => {
      expect(calcularNotaDeIntentos([12, 16, 14], "ultima")).toBe(14);
    });

    it("calcula el promedio de notas", () => {
      expect(calcularNotaDeIntentos([12, 16, 14], "promedio")).toBe(14.0);
    });
  });

  describe("puedenRevelarseRespuestas", () => {
    const limite = "2027-05-20T23:59:00Z";

    it("CP-RF016-16: no revela respuestas mientras queden intentos pendientes antes de fecha límite", () => {
      const visible = puedenRevelarseRespuestas(
        "al_terminar_intentos",
        1,
        3,
        limite,
        "2027-05-15T12:00:00Z",
      );
      expect(visible).toBe(false);
    });

    it("CP-RF016-17: revela respuestas al agotar los intentos", () => {
      const visible = puedenRevelarseRespuestas(
        "al_terminar_intentos",
        3,
        3,
        limite,
        "2027-05-15T12:00:00Z",
      );
      expect(visible).toBe(true);
    });
  });

  describe("calcularNotaFinalPonderada (v2.0, CP-RF016-30, CP-RF016-31)", () => {
    it("CP-RF016-30: calcula promedio ponderado según pesos configurados", () => {
      const notas = {
        examen: [16],
        cuestionario: [18],
        trabajo: [14],
        proyecto: [15],
      };
      const pesos = {
        examen: 40,
        cuestionario: 20,
        trabajo: 20,
        proyecto: 20,
      };

      const resultado = calcularNotaFinalPonderada(notas, pesos);
      // 16 * 0.40 + 18 * 0.20 + 14 * 0.20 + 15 * 0.20 = 6.4 + 3.6 + 2.8 + 3.0 = 15.80
      expect(resultado.notaFinal).toBe(15.8);
      expect(resultado.pesosEfectivos.examen).toBe(40);
    });

    it("CP-RF016-31: redistribuye proporcionalmente el peso si un tipo no tiene tareas en el bimestre", () => {
      const notas = {
        examen: [16],
        cuestionario: [18],
        trabajo: [14],
      }; // No hubo proyectos
      const pesos = {
        examen: 40,
        cuestionario: 20,
        trabajo: 20,
        proyecto: 20,
      };

      const resultado = calcularNotaFinalPonderada(notas, pesos);
      // Suma pesos presentes: 40 + 20 + 20 = 80
      // examen: 40 / 80 = 50%
      // cuestionario: 20 / 80 = 25%
      // trabajo: 20 / 80 = 25%
      expect(resultado.pesosEfectivos.examen).toBe(50);
      expect(resultado.pesosEfectivos.cuestionario).toBe(25);
      expect(resultado.pesosEfectivos.trabajo).toBe(25);
      expect(resultado.pesosEfectivos.proyecto).toBeUndefined();

      // Nota: 16 * 0.50 + 18 * 0.25 + 14 * 0.25 = 8.0 + 4.5 + 3.5 = 16.0
      expect(resultado.notaFinal).toBe(16.0);
    });
  });

  describe("convertirNotaALiteral (CP-RF016-27)", () => {
    it("convierte a escalas AD, A, B, C", () => {
      expect(convertirNotaALiteral(19)).toBe("AD");
      expect(convertirNotaALiteral(18)).toBe("AD");
      expect(convertirNotaALiteral(15.5)).toBe("A");
      expect(convertirNotaALiteral(14)).toBe("A");
      expect(convertirNotaALiteral(12)).toBe("B");
      expect(convertirNotaALiteral(11)).toBe("B");
      expect(convertirNotaALiteral(10.5)).toBe("C");
      expect(convertirNotaALiteral(0)).toBe("C");
    });
  });
});
