import { SetMetadata } from "@nestjs/common";

export const MENU_ACCESS_KEY = "menuAccess";

/**
 * RF-002 V2 (Roles-Menú): el endpoint solo lo usa un rol que tenga asignado el
 * menú con esa ruta. El Administrador tiene acceso a todo.
 */
export const MenuAccess = (ruta: string) => SetMetadata(MENU_ACCESS_KEY, ruta);
