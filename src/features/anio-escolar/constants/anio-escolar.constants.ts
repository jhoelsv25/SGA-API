export const ESTADOS_ANIO = ["planificado", "en_curso", "cerrado", "reabierto"] as const;
export type EstadoAnio = (typeof ESTADOS_ANIO)[number];

export const ESTADOS_BIMESTRE = ["planificado", "en_curso", "cerrado"] as const;
export type EstadoBimestre = (typeof ESTADOS_BIMESTRE)[number];

export const NOMBRES_BIMESTRE = ["I", "II", "III", "IV"] as const;

export const ZONA_HORARIA_COLEGIO = "America/Lima";

export const MENSAJES = {
  anioRepetido: (anio: number) => `Ya existe el año escolar ${anio}.`,
  fechasInvertidas: "La fecha de fin debe ser posterior a la fecha de inicio.",
  bimestreFuera: "Las fechas del bimestre deben estar dentro del año escolar.",
  bimestresSuperpuestos: "El bimestre no puede empezar antes de que termine el anterior.",
  bimestresIncompletos: "Complete las fechas de los 4 bimestres antes de iniciar el año.",
  otroAnioEnCurso: "Ya hay un año escolar en curso. Ciérrelo antes de iniciar otro.",
  bimestreFueraDeOrden: "Debe cerrar el bimestre anterior antes de iniciar este.",
  anioConBimestresAbiertos: "No se puede cerrar el año: hay bimestres sin cerrar.",
  reaperturaIncompleta: "Indique el motivo y la fecha límite de la reapertura.",
} as const;
