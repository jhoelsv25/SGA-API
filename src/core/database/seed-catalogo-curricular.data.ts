/**
 * RF-024 V1, HU1: datos iniciales del catálogo curricular. Fuente: Currículo Nacional de la
 * Educación Básica (MINEDU, RM 281-2016; numeración de la tabla de competencias, pp. 31-36) y
 * «Listado de competencias por curso» del colegio. Las áreas usan los códigos de `cursos.area_curricular`.
 *
 * NO incluye los desempeños por grado: el CNEB general no los trae (están en el Programa Curricular
 * de Educación Secundaria, RM 649-2016-MINEDU). Se cargan aparte (P-91); mientras tanto el docente
 * escribe el «desempeño precisado» a mano.
 */

export interface CompetenciaSeed {
  /** Número en la tabla del CNEB (1 a 31). */
  numero: number;
  nombre: string;
  /** Código de `cursos.area_curricular`. */
  area: string;
  capacidades: string[];
}

export const AREAS_CURRICULARES = [
  { codigo: "matematica", nombre: "Matemática" },
  { codigo: "comunicacion", nombre: "Comunicación" },
  { codigo: "quechua", nombre: "Quechua (Lengua Originaria)" },
  { codigo: "ingles", nombre: "Inglés" },
  { codigo: "arte_cultura", nombre: "Arte y Cultura" },
  { codigo: "ciencias_sociales", nombre: "Ciencias Sociales" },
  { codigo: "dpcc", nombre: "Desarrollo Personal, Ciudadanía y Cívica" },
  { codigo: "educacion_fisica", nombre: "Educación Física" },
  { codigo: "educacion_religiosa", nombre: "Educación Religiosa" },
  { codigo: "ciencia_tecnologia", nombre: "Ciencia y Tecnología" },
  { codigo: "ept", nombre: "Educación para el Trabajo" },
] as const;

const ORAL = [
  "Obtiene información de textos orales",
  "Infiere e interpreta información de textos orales",
  "Adecúa, organiza y desarrolla las ideas de forma coherente y cohesionada",
  "Utiliza recursos no verbales y paraverbales de forma estratégica",
  "Interactúa estratégicamente con distintos interlocutores",
  "Reflexiona y evalúa la forma, el contenido y el contexto del texto oral",
];
const LEE = [
  "Obtiene información del texto escrito",
  "Infiere e interpreta información del texto",
  "Reflexiona y evalúa la forma, el contenido y el contexto del texto escrito",
];
const ESCRIBE = [
  "Adecúa el texto a la situación comunicativa",
  "Organiza y desarrolla las ideas de forma coherente y cohesionada",
  "Utiliza convenciones del lenguaje escrito de forma pertinente",
  "Reflexiona y evalúa la forma, el contenido y el contexto del texto escrito",
];

export const COMPETENCIAS_SEED: CompetenciaSeed[] = [
  {
    numero: 1,
    area: "dpcc",
    nombre: "Construye su identidad",
    capacidades: [
      "Se valora a sí mismo",
      "Autorregula sus emociones",
      "Reflexiona y argumenta éticamente",
      "Vive su sexualidad de manera integral y responsable de acuerdo a su etapa de desarrollo y madurez",
    ],
  },
  {
    numero: 2,
    area: "educacion_fisica",
    nombre: "Se desenvuelve de manera autónoma a través de su motricidad",
    capacidades: ["Comprende su cuerpo", "Se expresa corporalmente"],
  },
  {
    numero: 3,
    area: "educacion_fisica",
    nombre: "Asume una vida saludable",
    capacidades: [
      "Comprende las relaciones entre la actividad física, alimentación, postura e higiene y la salud",
      "Incorpora prácticas que mejoran su calidad de vida",
    ],
  },
  {
    numero: 4,
    area: "educacion_fisica",
    nombre: "Interactúa a través de sus habilidades sociomotrices",
    capacidades: [
      "Se relaciona utilizando sus habilidades sociomotrices",
      "Crea y aplica estrategias y tácticas de juego",
    ],
  },
  {
    numero: 5,
    area: "arte_cultura",
    nombre: "Aprecia de manera crítica manifestaciones artístico-culturales",
    capacidades: [
      "Percibe manifestaciones artístico-culturales",
      "Contextualiza las manifestaciones artístico-culturales",
      "Reflexiona creativa y críticamente sobre las manifestaciones artístico-culturales",
    ],
  },
  {
    numero: 6,
    area: "arte_cultura",
    nombre: "Crea proyectos desde los lenguajes artísticos",
    capacidades: [
      "Explora y experimenta los lenguajes de las artes",
      "Aplica procesos de creación",
      "Evalúa y comunica sus procesos y proyectos",
    ],
  },
  {
    numero: 7,
    area: "comunicacion",
    nombre: "Se comunica oralmente en su lengua materna",
    capacidades: ORAL,
  },
  {
    numero: 8,
    area: "comunicacion",
    nombre: "Lee diversos tipos de textos escritos en su lengua materna",
    capacidades: LEE,
  },
  {
    numero: 9,
    area: "comunicacion",
    nombre: "Escribe diversos tipos de textos en su lengua materna",
    capacidades: ESCRIBE,
  },
  {
    numero: 10,
    area: "comunicacion",
    nombre: "Se comunica oralmente en castellano como segunda lengua",
    capacidades: ORAL,
  },
  {
    numero: 11,
    area: "comunicacion",
    nombre: "Lee diversos tipos de textos escritos en castellano como segunda lengua",
    capacidades: LEE,
  },
  {
    numero: 12,
    area: "comunicacion",
    nombre: "Escribe diversos tipos de textos en castellano como segunda lengua",
    capacidades: ESCRIBE,
  },
  {
    numero: 13,
    area: "ingles",
    nombre: "Se comunica oralmente en inglés como lengua extranjera",
    capacidades: ORAL,
  },
  {
    numero: 14,
    area: "ingles",
    nombre: "Lee diversos tipos de textos escritos en inglés como lengua extranjera",
    capacidades: LEE,
  },
  {
    numero: 15,
    area: "ingles",
    nombre: "Escribe diversos tipos de textos en inglés como lengua extranjera",
    capacidades: ESCRIBE,
  },
  {
    numero: 16,
    area: "dpcc",
    nombre: "Convive y participa democráticamente en la búsqueda del bien común",
    capacidades: [
      "Interactúa con todas las personas",
      "Construye y asume acuerdos y normas",
      "Maneja conflictos de manera constructiva",
      "Delibera sobre asuntos públicos",
      "Participa en acciones que promueven el bienestar común",
    ],
  },
  {
    numero: 17,
    area: "ciencias_sociales",
    nombre: "Construye interpretaciones históricas",
    capacidades: [
      "Interpreta críticamente fuentes diversas",
      "Comprende el tiempo histórico",
      "Explica y argumenta procesos históricos",
    ],
  },
  {
    numero: 18,
    area: "ciencias_sociales",
    nombre: "Gestiona responsablemente el espacio y el ambiente",
    capacidades: [
      "Comprende las relaciones entre los elementos naturales y sociales",
      "Maneja fuentes de información para comprender el espacio geográfico y el ambiente",
      "Genera acciones para preservar el ambiente local y global",
    ],
  },
  {
    numero: 19,
    area: "ciencias_sociales",
    nombre: "Gestiona responsablemente los recursos económicos",
    capacidades: [
      "Comprende las relaciones entre los elementos del sistema económico y financiero",
      "Toma decisiones económicas y financieras",
    ],
  },
  {
    numero: 20,
    area: "ciencia_tecnologia",
    nombre: "Indaga mediante métodos científicos para construir conocimientos",
    capacidades: [
      "Problematiza situaciones",
      "Diseña estrategias para hacer indagación",
      "Genera y registra datos e información",
      "Analiza datos e información",
      "Evalúa y comunica el proceso y los resultados de su indagación",
    ],
  },
  {
    numero: 21,
    area: "ciencia_tecnologia",
    nombre:
      "Explica el mundo físico basándose en conocimientos sobre los seres vivos; materia y energía; biodiversidad, Tierra y universo",
    capacidades: [
      "Comprende y usa conocimientos sobre los seres vivos; materia y energía; biodiversidad, Tierra y universo",
      "Evalúa las implicancias del saber y del quehacer científico y tecnológico",
    ],
  },
  {
    numero: 22,
    area: "ciencia_tecnologia",
    nombre: "Diseña y construye soluciones tecnológicas para resolver problemas de su entorno",
    capacidades: [
      "Determina una alternativa de solución tecnológica",
      "Diseña la alternativa de solución tecnológica",
      "Implementa y valida alternativas de solución tecnológica",
      "Evalúa y comunica el funcionamiento y los impactos de su alternativa de solución tecnológica",
    ],
  },
  {
    numero: 23,
    area: "matematica",
    nombre: "Resuelve problemas de cantidad",
    capacidades: [
      "Traduce cantidades a expresiones numéricas",
      "Comunica su comprensión sobre los números y las operaciones",
      "Usa estrategias y procedimientos de estimación y cálculo",
      "Argumenta afirmaciones sobre las relaciones numéricas y las operaciones",
    ],
  },
  {
    numero: 24,
    area: "matematica",
    nombre: "Resuelve problemas de regularidad, equivalencia y cambio",
    capacidades: [
      "Traduce datos y condiciones a expresiones algebraicas",
      "Comunica su comprensión sobre las relaciones algebraicas",
      "Usa estrategias y procedimientos para encontrar reglas generales",
      "Argumenta afirmaciones sobre relaciones de cambio y equivalencia",
    ],
  },
  {
    numero: 25,
    area: "matematica",
    nombre: "Resuelve problemas de gestión de datos e incertidumbre",
    capacidades: [
      "Representa datos con gráficos y medidas estadísticas o probabilísticas",
      "Comunica la comprensión de los conceptos estadísticos y probabilísticos",
      "Usa estrategias y procedimientos para recopilar y procesar datos",
      "Sustenta conclusiones o decisiones basado en información obtenida",
    ],
  },
  {
    numero: 26,
    area: "matematica",
    nombre: "Resuelve problemas de forma, movimiento y localización",
    capacidades: [
      "Modela objetos con formas geométricas y sus transformaciones",
      "Comunica su comprensión sobre las formas y relaciones geométricas",
      "Usa estrategias y procedimientos para orientarse en el espacio",
      "Argumenta afirmaciones sobre relaciones geométricas",
    ],
  },
  {
    numero: 27,
    area: "ept",
    nombre: "Gestiona proyectos de emprendimiento económico o social",
    capacidades: [
      "Crea propuestas de valor",
      "Trabaja cooperativamente para lograr objetivos y metas",
      "Aplica habilidades técnicas",
      "Evalúa los resultados del proyecto de emprendimiento",
    ],
  },
  {
    numero: 30,
    area: "educacion_religiosa",
    nombre:
      "Construye su identidad como persona humana, amada por Dios, digna, libre y trascendente, comprendiendo la doctrina de su propia religión, abierto al diálogo con las que le son cercanas",
    capacidades: [
      "Conoce a Dios y asume su identidad religiosa como persona digna, libre y trascendente",
      "Cultiva y valora las manifestaciones religiosas de su entorno argumentando su fe de manera comprensible y respetuosa",
    ],
  },
  {
    numero: 31,
    area: "educacion_religiosa",
    nombre:
      "Asume la experiencia del encuentro personal y comunitario con Dios en su proyecto de vida en coherencia con su creencia religiosa",
    capacidades: [
      "Transforma su entorno desde el encuentro personal y comunitario con Dios y desde la fe que profesa",
      "Actúa coherentemente en razón de su fe según los principios de su conciencia moral en situaciones concretas de la vida",
    ],
  },
  {
    numero: 32,
    area: "quechua",
    nombre: "Se comunica oralmente en Quechua como lengua originaria",
    capacidades: ORAL,
  },
  {
    numero: 33,
    area: "quechua",
    nombre: "Lee diversos tipos de textos escritos en Quechua como lengua originaria",
    capacidades: LEE,
  },
  {
    numero: 34,
    area: "quechua",
    nombre: "Escribe diversos tipos de textos en Quechua como lengua originaria",
    capacidades: ESCRIBE,
  },
];

/** Competencias transversales (CNEB n.º 28 y 29): no pertenecen a un área. */
export const COMPETENCIAS_TRANSVERSALES_SEED: Omit<CompetenciaSeed, "area">[] = [
  {
    numero: 28,
    nombre: "Se desenvuelve en entornos virtuales generados por las TIC",
    capacidades: [
      "Personaliza entornos virtuales",
      "Gestiona información del entorno virtual",
      "Interactúa en entornos virtuales",
      "Crea objetos virtuales en diversos formatos",
    ],
  },
  {
    numero: 29,
    nombre: "Gestiona su aprendizaje de manera autónoma",
    capacidades: [
      "Define metas de aprendizaje",
      "Organiza acciones estratégicas para alcanzar sus metas de aprendizaje",
      "Monitorea y ajusta su desempeño durante el proceso de aprendizaje",
    ],
  },
];

/** Enfoques transversales del CNEB con sus valores. Las «acciones observables» se cargan aparte. */
export const ENFOQUES_TRANSVERSALES_SEED = [
  {
    nombre: "Enfoque de Derechos",
    valores: ["Conciencia de derechos", "Libertad y responsabilidad", "Diálogo y concertación"],
  },
  {
    nombre: "Enfoque Inclusivo o de Atención a la diversidad",
    valores: ["Respeto por las diferencias", "Equidad en la enseñanza", "Confianza en la persona"],
  },
  {
    nombre: "Enfoque Intercultural",
    valores: ["Respeto a la identidad cultural", "Justicia", "Diálogo intercultural"],
  },
  { nombre: "Enfoque Igualdad de Género", valores: ["Igualdad y Dignidad", "Justicia", "Empatía"] },
  {
    nombre: "Enfoque Ambiental",
    valores: [
      "Solidaridad planetaria y equidad intergeneracional",
      "Justicia y solidaridad",
      "Respeto a toda forma de vida",
    ],
  },
  {
    nombre: "Enfoque Orientación al bien común",
    valores: ["Equidad y justicia", "Solidaridad", "Empatía", "Responsabilidad"],
  },
  {
    nombre: "Enfoque Búsqueda de la Excelencia",
    valores: ["Flexibilidad y apertura", "Superación personal"],
  },
] as const;

/** Catálogos pequeños del modelo de sesión (listas desplegables del editor). */
export const NIVELES_LOGRO_SEED = [
  { codigo: "AD", nombre: "Logro destacado" },
  { codigo: "A", nombre: "Logro esperado" },
  { codigo: "B", nombre: "En proceso" },
  { codigo: "C", nombre: "En inicio" },
] as const;

export const INSTRUMENTOS_EVALUACION_SEED = [
  "Rúbrica",
  "Lista de cotejo",
  "Escala de valoración",
  "Guía de observación",
  "Prueba escrita",
  "Prueba oral",
  "Ficha de autoevaluación",
  "Ficha de coevaluación",
  "Portafolio",
  "Registro anecdótico",
] as const;

export const MOMENTOS_DIDACTICOS_SEED = [
  { codigo: "inicio", nombre: "Inicio", orden: 1 },
  { codigo: "desarrollo", nombre: "Desarrollo", orden: 2 },
  { codigo: "cierre", nombre: "Cierre", orden: 3 },
] as const;

export const TIPOS_MATERIAL_SEED = ["Impresos", "Manipulativos", "Digitales"] as const;

export const REFERENCIAS_POR_DEFECTO_SEED = [
  "Ministerio de Educación. (2016). Currículo Nacional de la Educación Básica.",
  "Ministerio de Educación. (2016). Programa Curricular de Educación Secundaria (RM 649-2016-MINEDU).",
] as const;
