import { BadRequestException } from "@nestjs/common";
import { MAX_TOLERANCIA_MIN, MIN_TOLERANCIA_MIN } from "../constants";

export function timeStringToMinutes(timeStr: string): number {
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) {
    throw new BadRequestException(`Formato de hora inválido: ${timeStr}. Use HH:mm o HH:mm:ss.`);
  }
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new BadRequestException(`Formato de hora inválido: ${timeStr}.`);
  }
  return hours * 60 + minutes;
}

export interface ValidateTurnoTimesParams {
  horaEntrada: string;
  horaSalida: string;
  ventanaEntradaInicio: string;
  ventanaEntradaFin: string;
  ventanaSalidaInicio: string;
  ventanaSalidaFin: string;
  toleranciaMin: number;
  diasLaborables: string;
}

export function validateTurnoTimes(params: ValidateTurnoTimesParams): void {
  // 1. Días laborables
  if (!params.diasLaborables || params.diasLaborables.trim().length === 0) {
    throw new BadRequestException("Seleccione al menos un día laborable.");
  }

  // 2. Tolerancia
  if (params.toleranciaMin < MIN_TOLERANCIA_MIN || params.toleranciaMin > MAX_TOLERANCIA_MIN) {
    throw new BadRequestException("La tolerancia debe estar entre 0 y 60 minutos.");
  }

  const entrada = timeStringToMinutes(params.horaEntrada);
  const salida = timeStringToMinutes(params.horaSalida);
  const vEntradaInicio = timeStringToMinutes(params.ventanaEntradaInicio);
  const vEntradaFin = timeStringToMinutes(params.ventanaEntradaFin);
  const vSalidaInicio = timeStringToMinutes(params.ventanaSalidaInicio);
  const vSalidaFin = timeStringToMinutes(params.ventanaSalidaFin);

  // 3. Salida posterior a entrada
  if (salida <= entrada) {
    throw new BadRequestException("La hora de salida debe ser posterior a la hora de entrada.");
  }

  // 4. Ventana de entrada válida
  if (vEntradaFin <= vEntradaInicio) {
    throw new BadRequestException("El fin de la ventana de entrada debe ser posterior al inicio.");
  }
  if (entrada < vEntradaInicio || entrada > vEntradaFin) {
    throw new BadRequestException("La hora oficial debe estar dentro de su ventana de marcado.");
  }

  // 5. Ventana de salida válida
  if (vSalidaFin <= vSalidaInicio) {
    throw new BadRequestException("El fin de la ventana de salida debe ser posterior al inicio.");
  }
  if (salida < vSalidaInicio || salida > vSalidaFin) {
    throw new BadRequestException("La hora oficial debe estar dentro de su ventana de marcado.");
  }

  // 6. Ventana de salida empieza después de que termina la ventana de entrada
  if (vSalidaInicio < vEntradaFin) {
    throw new BadRequestException(
      "La ventana de salida debe empezar después de la ventana de entrada.",
    );
  }
}
