import { TIPO_IMPORTACION, type TipoImportacion } from "./importacion.constants";
import {
  CAMPOS_CARGA_ACADEMICA,
  CAMPOS_HORARIO,
  CAMPOS_MATRICULA,
} from "./plantillas-campos-academico.constants";
import {
  CAMPOS_APODERADO,
  CAMPOS_DOCENTE,
  CAMPOS_DOCENTE_FICHA,
  CAMPOS_ESTUDIANTE,
  CAMPOS_ESTUDIANTE_FICHA,
  CAMPOS_PERSONA,
  type CampoPlantilla,
} from "./plantillas-campos-personas.constants";

export * from "./plantillas-campos-academico.constants";
export * from "./plantillas-campos-personas.constants";

export interface DefinicionPlantilla {
  titulo: string;
  campos: CampoPlantilla[];
}

/** Columnas de cada plantilla: primero lo propio de la ficha, luego la persona, luego el resto de la ficha. */
export const PLANTILLAS: Record<TipoImportacion, DefinicionPlantilla> = {
  [TIPO_IMPORTACION.PERSONAS]: { titulo: "Personas", campos: [...CAMPOS_PERSONA] },
  [TIPO_IMPORTACION.ESTUDIANTES]: {
    titulo: "Estudiantes",
    campos: [...CAMPOS_ESTUDIANTE, ...CAMPOS_PERSONA, ...CAMPOS_ESTUDIANTE_FICHA],
  },
  [TIPO_IMPORTACION.DOCENTES]: {
    titulo: "Docentes",
    campos: [...CAMPOS_DOCENTE, ...CAMPOS_PERSONA, ...CAMPOS_DOCENTE_FICHA],
  },
  [TIPO_IMPORTACION.APODERADOS]: {
    titulo: "Apoderados",
    campos: [...CAMPOS_APODERADO, ...CAMPOS_PERSONA],
  },
  [TIPO_IMPORTACION.MATRICULAS]: {
    titulo: "Matrículas",
    campos: [...CAMPOS_MATRICULA],
  },
  [TIPO_IMPORTACION.CARGA_ACADEMICA]: {
    titulo: "Carga Académica",
    campos: [...CAMPOS_CARGA_ACADEMICA],
  },
  [TIPO_IMPORTACION.HORARIOS]: {
    titulo: "Horarios",
    campos: [...CAMPOS_HORARIO],
  },
};
