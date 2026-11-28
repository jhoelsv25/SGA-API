export const CREDENCIAL_MESSAGES = {
  REEMITIDA_EXITO: "La credencial anterior quedó anulada y se emitió una nueva.",
  PIN_ACTUALIZADO: "El PIN de marcación ha sido actualizado correctamente.",
  CREDENCIAL_NOT_FOUND: "No se encontró una credencial activa para esta persona.",
  PERSONA_NOT_FOUND: "La persona especificada no existe.",
  MOTIVO_REQUERIDO: "Indique el motivo de la anulación de la credencial.",
  PIN_INVALIDO: "El PIN debe tener 4 dígitos numéricos.",
  PIN_ACTUAL_INCORRECTO: "El PIN actual ingresado no es correcto.",
  SIN_ACCESO: "No tiene permiso para ver la credencial de otra persona.",
} as const;

/** Roles que emiten carnés: ven los de cualquier persona y los descargan por lote. */
export const ROLES_EMISION_CARNES = [
  "Administrador",
  "Secretaria",
  "Director",
  "Subdirector",
] as const;

/** RF-007 V7: pantalla «Accesos y credenciales». */
export const ROLES_ACCESOS = ["Administrador", "Soporte TI"] as const;

export const ROLES_REEMISION = ["Administrador", "Secretaria", "Soporte TI"] as const;

/** RF-007: solo TI cambia el PIN de marcación; nadie cambia el suyo desde su cuenta. */
export const ROLES_CAMBIO_PIN = ["Soporte TI"] as const;
