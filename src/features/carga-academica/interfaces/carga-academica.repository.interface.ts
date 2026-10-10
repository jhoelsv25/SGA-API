import type { CargaAcademicaItemDto, CursoDocenteItemDto } from "../dto";
import type { CursoSeccionDetalle } from "./carga-academica.interface";

export interface ICargaAcademicaRepository {
  findCursoSeccionById(id: string): Promise<CursoSeccionDetalle | null>;
  findBySeccion(seccionId: string): Promise<CargaAcademicaItemDto[]>;
  horasAsignadasDocente(
    anioId: string,
    docenteId: string,
    exceptoCursoSeccionId?: string,
  ): Promise<number>;
  updateDocente(id: string, docenteId: string | null): Promise<CargaAcademicaItemDto>;
  findByDocente(anioId: string, docenteId: string): Promise<CursoDocenteItemDto[]>;
}
