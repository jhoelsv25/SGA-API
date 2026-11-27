export const TIPOS_MARCACION = ["entrada", "salida"] as const;
export type TipoMarcacion = (typeof TIPOS_MARCACION)[number];

export const RESULTADOS_MARCACION = [
  "puntual",
  "tardanza",
  "salida_anticipada",
  "fuera_de_turno",
] as const;
export type ResultadoMarcacion = (typeof RESULTADOS_MARCACION)[number];

export const ORIGENES_MARCACION = ["kiosko", "intranet", "manual", "biometrico"] as const;
export type OrigenMarcacion = (typeof ORIGENES_MARCACION)[number];

export const TIPOS_PERSONA_MARCACION = ["estudiantes", "docentes", "administrativos"] as const;
export type TipoPersonaMarcacion = (typeof TIPOS_PERSONA_MARCACION)[number];

export const PROPOSITO_EQUIPO_MARCACION = "marcacion";
export const LIMITE_REPORTE_POR_DEFECTO = 50;
export const LIMITE_REPORTE_MAXIMO = 200;

/**
 * Variable del sistema: minutos en los que una marcación de otra vía (kiosko, manual o reloj) se toma como la
 * misma asistencia ya registrada y no como una entrada o salida nueva. 0 la desactiva. El valor por defecto
 * se confirma con el colegio (P-44).
 */
/** false: el docente usa el horario del Reglamento Interno (turno de docentes). true: el de sus clases. */
export const VARIABLE_HORARIO_POR_CLASES = {
  codigo: "asistencia.docente_horario_segun_clases",
} as const;

export const VARIABLE_MINUTOS_ENTRE_VIAS = {
  codigo: "marcacion.minutos_duplicado_entre_vias",
  porDefecto: 30,
} as const;

/**
 * Variable del sistema: segundos en los que otra marca del personal en el kiosko es la misma lectura
 * (doble toque, reintento o carné leído dos veces) y no la salida. 0 la desactiva (P-100).
 */
export const VARIABLE_SEGUNDOS_DOBLE_LECTURA = {
  codigo: "marcacion.segundos_doble_lectura_kiosko",
  porDefecto: 60,
} as const;

export const MENSAJES_MARCACION = {
  CODIGO_O_PIN_INCORRECTO: "Código o PIN incorrecto.",
  CREDENCIAL_INACTIVA: "Su credencial no está activa. Acérquese a secretaría.",
  EQUIPO_EQUIVOCADO: "Este kiosko no es para su tipo de usuario.",
  SIN_MATRICULA: "No tiene matrícula vigente. Acérquese a secretaría.",
  FUERA_DE_HORARIO: "Marcación registrada fuera del horario permitido.",
  OBSERVACION_REQUERIDA: "Indique el motivo de la marcación manual.",
  EQUIPO_NO_AUTORIZADO: "Este equipo no está autorizado. Comuníquese con el área de TI.",
  EQUIPO_SIN_PROPOSITO: "Este equipo no está habilitado para marcación.",
  PERSONA_NO_ENCONTRADA: "La persona no existe o no puede marcar asistencia.",
  MARCACION_NO_ENCONTRADA: "La marcación no existe.",
  SOLO_ENTRADA_ESTUDIANTES: "Los estudiantes solo registran entrada.",
  SIN_TURNO: "No hay un turno configurado para este tipo de usuario.",
  MOTIVO_JUSTIFICACION_REQUERIDO: "Indique el motivo de la justificación.",
  NO_JUSTIFICABLE: "Solo se puede justificar una tardanza o una salida anticipada.",
  YA_JUSTIFICADA: "Esta marcación ya está justificada.",
  HORA_INVALIDA: "La hora debe tener el formato HH:mm.",
  FECHA_FUTURA: "No se puede registrar una marcación en una fecha futura.",
  YA_MARCO_ENTRADA_Y_SALIDA: "Ya registró su entrada y su salida hoy.",
  YA_MARCO_SALIDA: "Ya registró su salida.",
  MARCA_INTERMEDIA: "No cuenta: ya hay una entrada anterior y una salida posterior.",
  SALIDA_ANTES_DE_ENTRADA: "La salida debe ser posterior a la entrada registrada.",
  ENTRADA_DESPUES_DE_SALIDA: "La entrada debe ser anterior a la salida registrada.",
  DUPLICADA_ENTRE_VIAS:
    "Ya existe una marcación de esta persona en esa franja, hecha por otra vía.",
} as const;

export const mensajeYaMarcoReciente = (hora: string): string =>
  `Ya tiene una marcación registrada a las ${hora}.`;

export const mensajeEntrada = (nombre: string, hora: string): string =>
  `Bienvenido(a), ${nombre}. Entrada registrada a las ${hora}.`;

export const mensajeTardanza = (nombre: string, hora: string, minutos: number): string =>
  `${nombre}, entrada registrada a las ${hora} con ${minutos} minutos de tardanza.`;

export const mensajeSalida = (nombre: string, hora: string): string =>
  `Hasta luego, ${nombre}. Salida registrada a las ${hora}.`;

export const mensajeYaMarcoEntrada = (hora: string): string =>
  `Ya registró su entrada hoy a las ${hora}.`;
