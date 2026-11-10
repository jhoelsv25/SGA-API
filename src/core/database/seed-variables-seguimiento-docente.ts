/**
 * Variables del sistema del seguimiento docente (RF-004 V3).
 *
 * Valores por defecto tomados de RF-011 V3, RF-013 V2 y RF-023 V1. Los mínimos y máximos
 * siguen el supuesto de P-75: enteros no negativos y sin máximo, salvo
 * `observacion.cantidad_objetivo_anual` (de 2 a 3). La duración de la hora pedagógica
 * exige mínimo 1 para no dividir entre cero.
 */
export interface VariableSeedSeguimiento {
  codigo: string;
  descripcion: string;
  modulo: string;
  tipo: "entero" | "lista";
  valor: string;
  unidad: string | null;
  valorMinimo: number | null;
  valorMaximo: number | null;
}

export const VARIABLES_SEGUIMIENTO_DOCENTE: VariableSeedSeguimiento[] = [
  {
    codigo: "sesion.alerta_salida_minutos",
    descripcion:
      "Minutos antes del fin del bloque en que se alerta una sesión en curso sin firma de salida",
    modulo: "sesiones",
    tipo: "entero",
    valor: "10",
    unidad: "minutos",
    valorMinimo: 0,
    valorMaximo: null,
  },
  {
    codigo: "sesion.alerta_minutos_perdidos_umbral",
    descripcion:
      "Minutos perdidos en el día a partir de los cuales se alerta al docente. 0 desactiva la alerta",
    modulo: "sesiones",
    tipo: "entero",
    valor: "45",
    unidad: "minutos",
    valorMinimo: 0,
    valorMaximo: null,
  },
  {
    codigo: "sesion.alerta_minutos_perdidos_umbral_semana",
    descripcion:
      "Minutos perdidos en la semana (lunes a viernes) a partir de los cuales se alerta. 0 desactiva la alerta",
    modulo: "sesiones",
    tipo: "entero",
    valor: "120",
    unidad: "minutos",
    valorMinimo: 0,
    valorMaximo: null,
  },
  {
    codigo: "sesion.justificacion_aviso_dias",
    descripcion:
      "Días hábiles sin respuesta tras los cuales una solicitud de justificación se marca vencida y se avisa al aprobador",
    modulo: "sesiones",
    tipo: "entero",
    valor: "3",
    unidad: "días hábiles",
    valorMinimo: 0,
    valorMaximo: null,
  },
  {
    codigo: "sesion.justificacion_motivos_con_documento",
    descripcion: "Motivos de justificación que exigen adjuntar un documento (separados por comas)",
    modulo: "sesiones",
    tipo: "lista",
    valor: "descanso_medico,comision_de_servicio,licencia",
    unidad: null,
    valorMinimo: null,
    valorMaximo: null,
  },
  {
    codigo: "sesion.permisos_personales_max_anio",
    descripcion:
      "Días de permiso personal por docente y año lectivo; al superarlo se avisa y se pide confirmar, sin bloquear",
    modulo: "sesiones",
    tipo: "entero",
    valor: "3",
    unidad: "días por año lectivo",
    valorMinimo: 0,
    valorMaximo: null,
  },
  {
    codigo: "sesion.minutos_hora_pedagogica",
    descripcion:
      "Duración de una hora pedagógica para mostrar horas programadas, dictadas y perdidas",
    modulo: "sesiones",
    tipo: "entero",
    valor: "45",
    unidad: "minutos",
    valorMinimo: 1,
    valorMaximo: null,
  },
  {
    codigo: "consolidado.dias_para_decidir",
    descripcion:
      "Días de gracia para que el Director decida un consolidado antes de contarlo sin decisión",
    modulo: "consolidado",
    tipo: "entero",
    valor: "0",
    unidad: "días",
    valorMinimo: 0,
    valorMaximo: null,
  },
  {
    codigo: "observacion.anticipacion_minima_dias",
    descripcion: "Anticipación mínima con que se avisa al docente de una observación de aula",
    modulo: "observacion",
    tipo: "entero",
    valor: "2",
    unidad: "días",
    valorMinimo: 0,
    valorMaximo: null,
  },
  {
    codigo: "observacion.cantidad_objetivo_anual",
    descripcion:
      "Meta de observaciones de aula por docente y año lectivo; no impide programar más ni menos",
    modulo: "observacion",
    tipo: "entero",
    valor: "2",
    unidad: "observaciones por docente y año lectivo",
    valorMinimo: 2,
    valorMaximo: 3,
  },
  {
    codigo: "observacion.plazo_descargo_dias",
    descripcion: "Plazo del docente para dejar su comentario tras la retroalimentación",
    modulo: "observacion",
    tipo: "entero",
    valor: "7",
    unidad: "días calendario",
    valorMinimo: 0,
    valorMaximo: null,
  },
];
