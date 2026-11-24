/** RF-024 V1: planificación de la sesión de aprendizaje. */

export const ESTADOS_PLANIFICACION = ["borrador", "lista", "ejecutada"] as const;
export type EstadoPlanificacion = (typeof ESTADOS_PLANIFICACION)[number];

export const MOMENTOS = ["inicio", "desarrollo", "cierre"] as const;
export type Momento = (typeof MOMENTOS)[number];

export const TIPOS_OPCION_CATALOGO = [
  "nivel_logro",
  "instrumento_evaluacion",
  "momento_didactico",
  "tipo_material",
  "referencia",
] as const;
export type TipoOpcionCatalogo = (typeof TIPOS_OPCION_CATALOGO)[number];

export const ROL_ADMINISTRADOR = "Administrador";
export const GRADO_MINIMO = 1;
export const GRADO_MAXIMO = 5;

export const MENSAJES_PLANIFICACION = {
  GUARDADA: "Planificación guardada como borrador.",
  WORD_SOLO_LISTA: "Marque la sesión como lista para descargarla en Word.",
  LISTA: "Planificación lista. El supervisor ya puede verla.",
  NO_ENCONTRADA: "La planificación no existe.",
  BLOQUE_NO_ENCONTRADO: "El bloque del horario no existe o no es suyo.",
  OTRO_DOCENTE: "Esta sesión está asignada a otro docente.",
  NO_ES_DOCENTE: "Su usuario no corresponde a un docente activo.",
  YA_EJECUTADA: "La sesión ya se firmó. La planificación no se puede modificar.",
  BIMESTRE_CERRADO: "El bimestre está cerrado. La planificación ya no se puede modificar.",
  FECHA_SIN_BIMESTRE: "La fecha no cae dentro de un bimestre del año lectivo.",
  DIA_NO_COINCIDE: "La fecha no corresponde al día de la semana de ese bloque del horario.",
  FALTA_COMPETENCIA:
    "Complete el propósito, al menos una competencia con su desempeño y los tres momentos didácticos.",
  COMPETENCIA_NO_ENCONTRADA: "Una de las competencias elegidas no existe en el catálogo.",
  COMPETENCIA_OTRA_AREA: "Una competencia elegida no pertenece al área del curso.",
  DESEMPENO_NO_ENCONTRADO: "Uno de los desempeños elegidos no existe en el catálogo.",
  MOMENTOS_REPETIDOS: "Cada momento (inicio, desarrollo, cierre) solo puede aparecer una vez.",
  COPIA_SIN_DESTINOS: "Indique al menos un destino para la copia.",
  COPIA_HECHA: (n: number) => `Planificación copiada a ${n} ${n === 1 ? "bloque" : "bloques"}.`,
  COMENTARIO_ENVIADO: "Comentario enviado al docente.",
  HORAS_REGISTRADAS: "Horas reales registradas.",
  SUPERVISOR_NO_EDITA: "El supervisor solo puede ver, comentar y registrar las horas reales.",
  SESION_NO_ENCONTRADA: "La sesión no existe.",
  HORAS_INVALIDAS: "La hora de fin debe ser posterior a la de inicio.",
  HORAS_FALTAN: "Indique la hora de inicio y de fin en que estuvo en el aula.",
  DESEMPENO_CATALOGO_NO_ENCONTRADO: "El desempeño del catálogo no existe.",
  tiemposNoCuadran: (suma: number, bloque: number) =>
    `Los tiempos de Inicio, Desarrollo y Cierre suman ${suma} min; el bloque dura ${bloque}.`,
} as const;
