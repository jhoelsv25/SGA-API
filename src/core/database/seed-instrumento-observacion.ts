/**
 * RF-023 V1, HU8: versión inicial del instrumento de observación («Instructivo 2025», Informe
 * 00545-2025-MINEDU/VMGP-DIGEDD-DIED). Los cinco desempeños, sus aspectos y los nombres y grupos
 * de los cuatro niveles salen del RF. El texto oficial de cada nivel NO está en el repositorio:
 * se deja un marcador y el Administrador lo reemplaza cargando una versión completa (P-80).
 */
export const CODIGO_INSTRUMENTO_INICIAL = "instructivo-2025";
export const NOMBRE_INSTRUMENTO_INICIAL = "Instructivo 2025 (Informe 00545-2025-MINEDU)";
export const FUENTE_INSTRUMENTO_INICIAL =
  "Rúbricas de observación de aula, instructivo 2025 — Informe 00545-2025-MINEDU/VMGP-DIGEDD-DIED";
export const TEXTO_NIVEL_PENDIENTE = "Texto oficial pendiente de cargar desde el instructivo 2025.";

const NIVELES = [
  { nivel: 1, nombre: "Muy deficiente", grupo: "insatisfactorio" },
  { nivel: 2, nombre: "En proceso", grupo: "insatisfactorio" },
  { nivel: 3, nombre: "Suficiente", grupo: "satisfactorio" },
  { nivel: 4, nombre: "Destacado", grupo: "satisfactorio" },
].map((n) => ({ ...n, descripcion: TEXTO_NIVEL_PENDIENTE }));

const DESEMPENOS = [
  {
    numero: 1,
    nombre: "Involucra activamente a los estudiantes en el proceso de aprendizaje",
    aspectos: [
      "Acciones para generar interés",
      "Proporción de estudiantes involucrados",
      "Comprensión del sentido de lo que aprenden",
    ],
  },
  {
    numero: 2,
    nombre: "Promueve el razonamiento, la creatividad y/o el pensamiento crítico",
    aspectos: [
      "Actividades e interacciones que estimulan ideas propias",
      "Relaciones entre conceptos",
      "Estrategias",
    ],
  },
  {
    numero: 3,
    nombre: "Evalúa el progreso de los aprendizajes para retroalimentar y adecuar su enseñanza",
    aspectos: [
      "Monitoreo del trabajo de los estudiantes durante la sesión",
      "Calidad de la retroalimentación o adaptación",
    ],
  },
  {
    numero: 4,
    nombre: "Propicia un ambiente de respeto y proximidad",
    aspectos: [
      "Respeto, cordialidad y calidez",
      "Sensibilidad a las necesidades de los estudiantes",
      "Intervención ante faltas de respeto",
    ],
  },
  {
    numero: 5,
    nombre: "Regula positivamente el comportamiento",
    aspectos: [
      "Claridad de las normas de convivencia",
      "Mecanismos formativos de prevención y redirección",
    ],
  },
];

export const CONTENIDO_INSTRUMENTO_INICIAL = {
  desempenos: DESEMPENOS.map((d) => ({ ...d, niveles: NIVELES })),
};
