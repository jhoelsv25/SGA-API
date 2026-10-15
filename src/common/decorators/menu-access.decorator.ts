import { SetMetadata } from "@nestjs/common";

export const MENU_ACCESS_KEY = "menuAccess";

/**
 * RF-002 V2 (Roles-Menú): el endpoint solo lo usa un rol que tenga asignado el
 * menú con esa ruta. El Administrador tiene acceso a todo.
 * Admite una o varias rutas: si se configuran múltiples opciones, el usuario
 * puede acceder si su rol tiene asignada al menos una de ellas.
 */
export const MenuAccess = (...rutas: (string | string[])[]) => {
  const lista = rutas.flat();
  return SetMetadata(MENU_ACCESS_KEY, lista.length === 1 ? lista[0] : lista);
};
