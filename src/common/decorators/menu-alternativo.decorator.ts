import { SetMetadata } from "@nestjs/common";

export const MENU_ALTERNATIVO_KEY = "menuAlternativo";

/**
 * RF-002: además de los roles indicados en @Roles, deja pasar al rol que tenga
 * asignada esta opción en Roles-Menú. Solo amplía el acceso; nunca lo reduce.
 */
export const MenuAlternativo = (ruta: string) => SetMetadata(MENU_ALTERNATIVO_KEY, ruta);
