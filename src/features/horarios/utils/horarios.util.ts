import { InternalServerErrorException } from "@nestjs/common";
import { DIAS_SEMANA_MAP } from "../constants";

/**
 * Convierte una hora en formato "HH:mm" o "HH:mm:ss" a la cantidad de minutos transcurridos en el día.
 */
export function convertirHoraAMinutos(hora: string): number {
  if (!hora) return 0;
  const partes = hora.split(":");
  const horas = parseInt(partes[0], 10) || 0;
  const minutos = parseInt(partes[1], 10) || 0;
  return horas * 60 + minutos;
}

/**
 * Convierte una cantidad de minutos del día al formato estándar "HH:mm".
 */
export function minutosAHora(totalMinutos: number): string {
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  return `${horas.toString().padStart(2, "0")}:${minutos.toString().padStart(2, "0")}`;
}

/**
 * Normaliza una cadena de tiempo al formato estándar "HH:mm".
 */
export function normalizarHora(hora: string): string {
  if (!hora) return "";
  const partes = hora.split(":");
  if (partes.length >= 2) {
    return `${partes[0].padStart(2, "0")}:${partes[1].padStart(2, "0")}`;
  }
  return hora;
}

/**
 * Retorna el nombre en español del día escolar (1 = lunes ... 5 = viernes).
 */
export function obtenerNombreDiaSemana(dia: number): string {
  return DIAS_SEMANA_MAP[dia] ?? "lunes";
}

/**
 * Construye el mensaje oficial de conflicto cuando un docente ya dicta en otra sección.
 * Ejemplo: "El docente ya dicta en 4.° B el lunes de 08:30 a 09:15."
 * O al copiar horarios: "El docente Docente B ya dicta en 5.° C el lunes de 08:00 a 08:40."
 */
export function construirMensajeCruceDocente(
  cruce: {
    docenteNombre?: string;
    gradoNumero: number;
    seccionNombre: string;
    diaSemana: number;
    horaInicio: string;
    horaFin: string;
  },
  incluirNombreDocente = false,
): string {
  const diaNombre = obtenerNombreDiaSemana(cruce.diaSemana);
  const inicio = normalizarHora(cruce.horaInicio);
  const fin = normalizarHora(cruce.horaFin);
  const prefijoDocente =
    incluirNombreDocente && cruce.docenteNombre
      ? `El docente ${cruce.docenteNombre}`
      : "El docente";
  return `${prefijoDocente} ya dicta en ${cruce.gradoNumero}.° ${cruce.seccionNombre} el ${diaNombre} de ${inicio} a ${fin}.`;
}

/**
 * Construye el mensaje de advertencia cuando las horas del horario difieren del plan de estudios.
 * Ejemplo: "Matemática tiene 5 horas en el horario y 6 en el plan de estudios."
 */
export function construirAdvertenciaHorasPlan(
  cursoNombre: string,
  horasHorario: number,
  horasPlan: number,
): string {
  return `${cursoNombre} tiene ${horasHorario} horas en el horario y ${horasPlan} en el plan de estudios.`;
}

/**
 * Calcula las horas pedagógicas de un bloque a partir de su hora de inicio, fin y los minutos configurados en el sistema.
 */
export function calcularHorasPedagogicas(
  horaInicio: string,
  horaFin: string,
  minutosHoraPedagogica: number,
): number {
  if (!minutosHoraPedagogica || minutosHoraPedagogica <= 0) {
    throw new InternalServerErrorException(
      "Los minutos por hora pedagógica deben ser mayores a cero.",
    );
  }
  const minutos = convertirHoraAMinutos(horaFin) - convertirHoraAMinutos(horaInicio);
  return Math.round(minutos / minutosHoraPedagogica);
}
