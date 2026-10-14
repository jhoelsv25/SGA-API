import * as path from "path";
import {
  MENSAJES_TAREA,
  type CalculoNotaIntentos,
  type RevelarRespuestas,
  type TipoPregunta,
  type TipoTarea,
} from "../constants";

export interface OpcionPreguntaDef {
  id?: string;
  texto: string;
  esCorrecta: boolean;
  orden?: number;
}

export interface PreguntaDef {
  id: string;
  tipo: TipoPregunta;
  puntaje: number;
  enunciado: string;
  orden?: number;
  opciones?: OpcionPreguntaDef[];
}

export interface ValidacionPublicacionResult {
  valida: boolean;
  error?: string;
}

/**
 * Valida reglas de negocio para publicar una tarea (CP-RF016-05, CP-RF016-06, CP-RF016-07).
 */
export function validarPublicacionTarea(
  tarea: {
    tipo: TipoTarea;
    fechaLimite: string;
    preguntas?: PreguntaDef[];
  },
  ahoraIso: string = new Date().toISOString(),
): ValidacionPublicacionResult {
  if (tarea.fechaLimite <= ahoraIso) {
    return { valida: false, error: MENSAJES_TAREA.FECHA_LIMITE_INVALIDA };
  }

  if (tarea.tipo === "cuestionario" || tarea.tipo === "examen") {
    const preguntas = tarea.preguntas || [];
    if (preguntas.length === 0) {
      return { valida: false, error: MENSAJES_TAREA.CUESTIONARIO_SIN_PREGUNTAS };
    }

    for (const p of preguntas) {
      if (p.tipo === "opcion_unica" || p.tipo === "opcion_multiple") {
        const opciones = p.opciones || [];
        const tieneCorrecta = opciones.some((o) => o.esCorrecta);
        if (!tieneCorrecta) {
          return { valida: false, error: MENSAJES_TAREA.PREGUNTA_SIN_CORRECTA };
        }
      }
    }
  }

  return { valida: true };
}

/**
 * Valida la extensión de un archivo contra los formatos permitidos (CP-RF016-14).
 * Acepta string separados por coma (ej: "pdf, imagen, docx") o array.
 */
export function validarExtensionArchivo(
  nombreArchivo: string,
  formatosPermitidos?: string | string[] | null,
): boolean {
  if (!formatosPermitidos) return true;

  const listaFormatos = Array.isArray(formatosPermitidos)
    ? formatosPermitidos
    : formatosPermitidos.split(",").map((s) => s.trim().toLowerCase());

  if (listaFormatos.length === 0 || (listaFormatos.length === 1 && listaFormatos[0] === "")) {
    return true;
  }

  const ext = path.extname(nombreArchivo).toLowerCase().replace(/^\./, "");
  if (!ext) return false;

  const imagenes = ["jpg", "jpeg", "png", "webp", "gif"];
  const documentos = ["pdf", "doc", "docx", "txt"];

  return listaFormatos.some((f) => {
    const limpio = f.replace(/^\./, "");
    if (limpio === "imagen") return imagenes.includes(ext);
    if (limpio === "documento") return documentos.includes(ext);
    return limpio === ext;
  });
}

/**
 * Evalúa automáticamente un intento de preguntas (CP-RF016-15, CP-RF016-19).
 */
export function evaluarIntentoPreguntas(
  preguntas: PreguntaDef[],
  respuestas: Record<string, string | string[]>,
): {
  todasCerradas: boolean;
  calificada: boolean;
  puntajeObtenido: number;
  puntajePosible: number;
  notaVigesimal: number;
  respuestasDetalle: Record<
    string,
    {
      respuesta: string | string[];
      puntajeObtenido: number;
      calificada: boolean;
      esCorrecta?: boolean;
    }
  >;
} {
  let puntajePosible = 0;
  let puntajeObtenido = 0;
  let todasCerradas = true;
  const respuestasDetalle: Record<
    string,
    {
      respuesta: string | string[];
      puntajeObtenido: number;
      calificada: boolean;
      esCorrecta?: boolean;
    }
  > = {};

  for (const p of preguntas) {
    const ptsPregunta = Number(p.puntaje) || 1;
    puntajePosible += ptsPregunta;
    const resp = respuestas[p.id];

    if (p.tipo === "respuesta_corta") {
      todasCerradas = false;
      respuestasDetalle[p.id] = {
        respuesta: resp ?? "",
        puntajeObtenido: 0,
        calificada: false,
      };
      continue;
    }

    const opciones = p.opciones || [];
    const idsCorrectas = opciones.filter((o) => o.esCorrecta).map((o) => o.id || o.texto);

    if (p.tipo === "opcion_unica") {
      const respVal = typeof resp === "string" ? resp : (resp?.[0] ?? "");
      const esCorrecta = idsCorrectas.includes(respVal);
      const pts = esCorrecta ? ptsPregunta : 0;
      puntajeObtenido += pts;
      respuestasDetalle[p.id] = {
        respuesta: respVal,
        puntajeObtenido: pts,
        calificada: true,
        esCorrecta,
      };
    } else if (p.tipo === "opcion_multiple") {
      const respArray = Array.isArray(resp) ? resp : resp ? [resp] : [];
      const setCorrectas = new Set(idsCorrectas);
      const setResp = new Set(respArray);
      const sonIguales =
        setCorrectas.size === setResp.size && [...setCorrectas].every((id) => setResp.has(id));
      const pts = sonIguales ? ptsPregunta : 0;
      puntajeObtenido += pts;
      respuestasDetalle[p.id] = {
        respuesta: respArray,
        puntajeObtenido: pts,
        calificada: true,
        esCorrecta: sonIguales,
      };
    }
  }

  const notaVigesimal =
    puntajePosible > 0 ? Number(((puntajeObtenido / puntajePosible) * 20).toFixed(2)) : 0;

  return {
    todasCerradas,
    calificada: todasCerradas,
    puntajeObtenido,
    puntajePosible,
    notaVigesimal,
    respuestasDetalle,
  };
}

/**
 * Calcula la nota de una tarea con múltiples intentos (CP-RF016-17, supuestos línea 33).
 */
export function calcularNotaDeIntentos(
  notas: number[],
  metodo: CalculoNotaIntentos = "mas_alta",
): number {
  if (!notas || notas.length === 0) return 0;

  switch (metodo) {
    case "mas_alta":
      return Number(Math.max(...notas).toFixed(2));
    case "ultima":
      return Number(notas[notas.length - 1].toFixed(2));
    case "promedio": {
      const suma = notas.reduce((acc, curr) => acc + curr, 0);
      return Number((suma / notas.length).toFixed(2));
    }
    default:
      return Number(Math.max(...notas).toFixed(2));
  }
}

/**
 * Determina si las respuestas correctas son visibles para el estudiante (CP-RF016-16, CP-RF016-17).
 */
export function puedenRevelarseRespuestas(
  politica: RevelarRespuestas,
  intentoActual: number,
  intentosMaximos: number,
  fechaLimiteIso: string,
  ahoraIso: string = new Date().toISOString(),
): boolean {
  switch (politica) {
    case "inmediato":
      return true;
    case "nunca":
      return false;
    case "despues_fecha_limite":
      return ahoraIso > fechaLimiteIso;
    case "al_terminar_intentos":
    default:
      return intentoActual >= intentosMaximos || ahoraIso > fechaLimiteIso;
  }
}

/**
 * Calcula la nota final ponderada por tipo de tarea del bimestre (v2.0, CP-RF016-30, CP-RF016-31).
 * Si en el bimestre no hay tareas de un tipo, su peso se reparte proporcionalmente entre los demás.
 */
export function calcularNotaFinalPonderada(
  notasPorTipo: Partial<Record<TipoTarea, number[]>>,
  pesosConfig: Record<TipoTarea, number> = {
    examen: 25,
    cuestionario: 25,
    trabajo: 25,
    proyecto: 25,
  },
): {
  notaFinal: number;
  promediosPorTipo: Partial<Record<TipoTarea, number>>;
  pesosEfectivos: Partial<Record<TipoTarea, number>>;
} {
  const tiposPresentes: TipoTarea[] = [];
  const promediosPorTipo: Partial<Record<TipoTarea, number>> = {};

  for (const tipo of Object.keys(pesosConfig) as TipoTarea[]) {
    const arr = notasPorTipo[tipo];
    if (arr && arr.length > 0) {
      tiposPresentes.push(tipo);
      const promedio = arr.reduce((a, b) => a + b, 0) / arr.length;
      promediosPorTipo[tipo] = Number(promedio.toFixed(2));
    }
  }

  if (tiposPresentes.length === 0) {
    return {
      notaFinal: 0,
      promediosPorTipo: {},
      pesosEfectivos: {},
    };
  }

  // Suma de los pesos de los tipos presentes
  const sumaPesosPresentes = tiposPresentes.reduce(
    (acc, tipo) => acc + (pesosConfig[tipo] ?? 0),
    0,
  );

  const pesosEfectivos: Partial<Record<TipoTarea, number>> = {};
  let notaFinalAcumulada = 0;

  for (const tipo of tiposPresentes) {
    const pesoOriginal = pesosConfig[tipo] ?? 0;
    // Si la suma es 0 (ej. todos los presentes tenían peso 0), repartir equitativamente
    const pesoNormalizado =
      sumaPesosPresentes > 0 ? pesoOriginal / sumaPesosPresentes : 1 / tiposPresentes.length;

    pesosEfectivos[tipo] = Number((pesoNormalizado * 100).toFixed(2));
    notaFinalAcumulada += (promediosPorTipo[tipo] ?? 0) * pesoNormalizado;
  }

  return {
    notaFinal: Number(notaFinalAcumulada.toFixed(2)),
    promediosPorTipo,
    pesosEfectivos,
  };
}

/**
 * Convierte una nota numérica vigesimal (0–20) a la escala literal oficial (CP-RF016-27, P-15).
 */
export function convertirNotaALiteral(nota: number): "AD" | "A" | "B" | "C" {
  const red = Math.round(nota * 100) / 100;
  if (red >= 18) return "AD";
  if (red >= 14) return "A";
  if (red >= 11) return "B";
  return "C";
}
