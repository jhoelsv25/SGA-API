export function nombrePersona(nombres: string, paterno: string, materno: string | null): string {
  return [nombres, paterno, materno].filter(Boolean).join(" ");
}
