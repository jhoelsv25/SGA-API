export const AREAS_CURRICULARES = [
  "matematica",
  "comunicacion",
  "ingles",
  "arte_cultura",
  "ciencias_sociales",
  "dpcc",
  "educacion_fisica",
  "educacion_religiosa",
  "ciencia_tecnologia",
  "ept",
  "taller",
  "tutoria",
] as const;

export type AreaCurricular = (typeof AREAS_CURRICULARES)[number];

export const AREA_CURRICULAR_LABELS: Record<AreaCurricular, string> = {
  matematica: "Matemática",
  comunicacion: "Comunicación",
  ingles: "Inglés",
  arte_cultura: "Arte y Cultura",
  ciencias_sociales: "Ciencias Sociales",
  dpcc: "Desarrollo Personal, Ciudadanía y Cívica (DPCC)",
  educacion_fisica: "Educación Física",
  educacion_religiosa: "Educación Religiosa",
  ciencia_tecnologia: "Ciencia y Tecnología",
  ept: "Educación para el Trabajo (EPT)",
  taller: "Taller",
  tutoria: "Tutoría",
};
