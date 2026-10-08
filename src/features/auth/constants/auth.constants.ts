/**
 * Política de acceso (RF-001 V2, P-10). Los valores se leen de variables_sistema
 * (RF-004 HU4); los valores por defecto se usan si la variable no existe o no es un número.
 */
export const VAR_INTENTOS_BLOQUEO = "seguridad.intentos_fallidos_bloqueo";
export const VAR_LONGITUD_CONTRASENA = "seguridad.longitud_minima_contrasena";
export const DEFAULT_INTENTOS_BLOQUEO = 5;
export const DEFAULT_LONGITUD_CONTRASENA = 8;

/** La contraseña debe contener al menos una letra y un número. */
export const PASSWORD_LETRAS_Y_NUMEROS = /^(?=.*[A-Za-z])(?=.*\d).+$/;
