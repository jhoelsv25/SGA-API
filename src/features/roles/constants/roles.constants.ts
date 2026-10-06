export const ROLES_DEL_SISTEMA = [
  "Administrador",
  "Director",
  "Subdirector",
  "Soporte TI",
  "Secretaria",
  "Docente",
  "Estudiante",
  "Apoderado",
] as const;

export type RolDelSistema = (typeof ROLES_DEL_SISTEMA)[number];

export function esRolDelSistema(nombre: string): boolean {
  return (ROLES_DEL_SISTEMA as readonly string[]).includes(nombre);
}
