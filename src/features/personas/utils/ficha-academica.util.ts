import { ConflictException } from "@nestjs/common";

export type TipoFichaAcademica = "docente" | "estudiante";

/** Códigos estables que el frontend usa para decidir qué mostrar (no depender del texto). */
export const FICHA_ACADEMICA_CODES = {
  ACTIVA: "FICHA_ACADEMICA_ACTIVA",
  CON_DEPENDENCIAS: "FICHA_CON_DEPENDENCIAS",
} as const;

/** Estados en los que una ficha cuenta como vigente (impide tener la otra). */
export const ESTADOS_FICHA_VIGENTE: Record<TipoFichaAcademica, readonly string[]> = {
  docente: ["activo", "licencia"],
  estudiante: ["activo"],
};

export interface FichaAcademicaVigente {
  tipo: TipoFichaAcademica;
  id: string;
  codigo: string;
  estado: string;
}

export const FICHA_MESSAGES = {
  DOCENTE_CON_CARGA:
    "No se puede dar de baja: el docente tiene cursos asignados en el año académico vigente. Reasígnelos primero.",
  ESTUDIANTE_CON_MATRICULA:
    "No se puede dar de baja: el estudiante tiene una matrícula activa. Retírelo o trasládelo primero desde Matrícula.",
  DOCENTE_NO_CESADO: "Solo se puede reactivar un docente cesado.",
  ESTUDIANTE_NO_DE_BAJA: "Solo se puede reactivar un estudiante retirado o trasladado.",
  ESTUDIANTE_EGRESADO: "Un estudiante egresado no puede reactivarse.",
  DOCENTE_REACTIVADO:
    "Docente reactivado. Si perdió su credencial de marcación o su cargo, vuelva a emitirlos.",
  ESTUDIANTE_REACTIVADO: "Estudiante reactivado.",
  ESTUDIANTE_DE_BAJA: "Estudiante dado de baja correctamente.",
} as const;

export function esFichaVigente(tipo: TipoFichaAcademica, estado: string): boolean {
  return ESTADOS_FICHA_VIGENTE[tipo].includes(estado);
}

export function conflictoFichaVigente(
  destino: TipoFichaAcademica,
  ficha: FichaAcademicaVigente,
): ConflictException {
  const actual = ficha.tipo === "docente" ? "docente" : "estudiante";
  return new ConflictException({
    statusCode: 409,
    code: FICHA_ACADEMICA_CODES.ACTIVA,
    message: `Esta persona tiene una ficha de ${actual} activa. Para registrarla como ${destino} primero debe darse de baja esa ficha.`,
    fichaActiva: ficha,
    destino,
  });
}

export function conflictoConDependencias(message: string): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: FICHA_ACADEMICA_CODES.CON_DEPENDENCIAS,
    message,
  });
}
