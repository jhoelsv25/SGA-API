/**
 * Aplicaciones (clientes) donde se muestra una opción de menú: `menus.aplicaciones`.
 * - `web`: el portal web.
 * - `escritorio`: la aplicación de escritorio.
 * - `app`: la aplicación móvil (aún sin uso).
 */
export const APLICACIONES_MENU = ["web", "escritorio", "app"] as const;
export type AplicacionMenu = (typeof APLICACIONES_MENU)[number];

/** Por defecto toda opción existente es del portal web. */
export const APLICACIONES_MENU_POR_DEFECTO: AplicacionMenu[] = ["web"];
