/**
 * Interfaces internas del dominio de carga académica.
 */

export interface CursoSeccionDetalle {
  id: string;
  seccionId: string;
  cursoId: string;
  cursoNombre: string;
  docenteId: string | null;
  horasPlan: number;
  anioAcademicoId: string;
  seccionEstado?: string;
}
