import { Inject, Injectable } from "@nestjs/common";
import { Database, DRIZZLE } from "../../../core/database";
import { matriculas } from "../../../core/database/schema";
import {
  DatosConstanciaMatricula,
  EstudianteParaMatricula,
  ResumenSeccionPromocionRow,
  SeccionConVacantes,
} from "../interfaces";
import { MatriculaQueryDto, MatriculaResponseDto, PaginatedMatriculasResponseDto } from "../dto";
import type { MatriculasRepositoryDeps, MatriculasRepositoryCalls } from "./matriculas/deps";
import * as parte1 from "./matriculas/find-matricula-by-id";
import * as parte2 from "./matriculas/listar-secciones-activas-de-anio";
import * as parte3 from "./matriculas/obtener-resumen-promocion-por-anio";
import * as parte4 from "./matriculas/map-to-response-dto";

@Injectable()
export class MatriculasRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private dependencias(): MatriculasRepositoryDeps {
    return {
      db: this.db,
    };
  }

  private llamadas(): MatriculasRepositoryCalls {
    return {
      findAnioById: (anioId) => this.findAnioById(anioId),
      findAnioParaMatricula: (anioId) => this.findAnioParaMatricula(anioId),
      findEstudiantesPorCodigosODocumentos: (identificadores) =>
        this.findEstudiantesPorCodigosODocumentos(identificadores),
      mapToResponseDto: (r) => this.mapToResponseDto(r),
    };
  }

  async findMatriculaById(id: string): Promise<MatriculaResponseDto | null> {
    return parte1.findMatriculaById(this.dependencias(), this.llamadas(), id);
  }

  async findMatriculaByEstudianteYAnio(
    estudianteId: string,
    anioAcademicoId: string,
  ): Promise<{ id: string; codigo: string; estado: string } | null> {
    return parte1.findMatriculaByEstudianteYAnio(
      this.dependencias(),
      estudianteId,
      anioAcademicoId,
    );
  }

  async findEstudianteById(estudianteId: string): Promise<EstudianteParaMatricula | null> {
    return parte1.findEstudianteById(this.dependencias(), estudianteId);
  }

  async findSeccionById(seccionId: string): Promise<SeccionConVacantes | null> {
    return parte1.findSeccionById(this.dependencias(), seccionId);
  }

  async findAnioById(anioId: string): Promise<{ id: string; anio: number; estado: string } | null> {
    return parte1.findAnioById(this.dependencias(), anioId);
  }

  async findAnioParaMatricula(
    anioId?: string,
  ): Promise<{ id: string; anio: number; estado: string } | null> {
    return parte1.findAnioParaMatricula(this.dependencias(), this.llamadas(), anioId);
  }

  async findEstudiantePorCodigoODocumento(
    identificador: string,
  ): Promise<EstudianteParaMatricula | null> {
    return parte1.findEstudiantePorCodigoODocumento(this.llamadas(), identificador);
  }

  async findEstudiantesPorCodigosODocumentos(
    identificadores: string[],
  ): Promise<EstudianteParaMatricula[]> {
    return parte1.findEstudiantesPorCodigosODocumentos(this.dependencias(), identificadores);
  }

  async findMatriculasDeEstudiantesEnAnio(
    estudianteIds: string[],
    anioAcademicoId: string,
  ): Promise<Array<{ estudianteId: string; id: string; codigo: string; estado: string }>> {
    return parte1.findMatriculasDeEstudiantesEnAnio(
      this.dependencias(),
      estudianteIds,
      anioAcademicoId,
    );
  }

  async listarSeccionesActivasDeAnio(anioAcademicoId: string): Promise<SeccionConVacantes[]> {
    return parte2.listarSeccionesActivasDeAnio(this.dependencias(), anioAcademicoId);
  }

  async obtenerResumen(
    query?: MatriculaQueryDto,
    anioClsId?: string,
  ): Promise<{
    totalMatriculados: number;
    totalRetirados: number;
    totalTrasladados: number;
    vacantesTotales: number;
    vacantesOcupadas: number;
    vacantesDisponibles: number;
  }> {
    return parte2.obtenerResumen(this.dependencias(), this.llamadas(), query, anioClsId);
  }

  async hasApoderadoPrincipal(estudianteId: string): Promise<boolean> {
    return parte2.hasApoderadoPrincipal(this.dependencias(), estudianteId);
  }

  async getNextCorrelativo(anio: number): Promise<number> {
    return parte2.getNextCorrelativo(this.dependencias(), anio);
  }

  async countMatriculadosActivosEnSeccion(seccionId: string): Promise<number> {
    return parte2.countMatriculadosActivosEnSeccion(this.dependencias(), seccionId);
  }

  async hasActividadRegistrada(matriculaId: string): Promise<boolean> {
    return parte2.hasActividadRegistrada(this.dependencias(), matriculaId);
  }

  async create(data: {
    estudianteId: string;
    seccionId: string;
    anioAcademicoId: string;
    codigo: string;
    fechaMatricula: string;
    tipo: string;
    esRepitente?: boolean;
    colegioProcedencia?: string | null;
    observaciones?: string | null;
    registradoPorId?: string | null;
  }): Promise<string> {
    return parte2.create(this.dependencias(), data);
  }

  async update(id: string, data: Partial<typeof matriculas.$inferInsert>): Promise<void> {
    return parte2.update(this.dependencias(), id, data);
  }

  async delete(id: string): Promise<void> {
    return parte2.deleteRecord(this.dependencias(), id);
  }

  async actualizarEstadoEstudiante(
    estudianteId: string,
    nuevoEstado: "activo" | "retirado" | "trasladado" | "egresado",
  ): Promise<void> {
    return parte2.actualizarEstadoEstudiante(this.dependencias(), estudianteId, nuevoEstado);
  }

  /**
   * Marca al estudiante como egresado y anula sus credenciales físicas (QR/carné) activas,
   * conservando su historial académico y acceso de consulta a libretas/constancias.
   */
  async egresarEstudianteYDesactivarCredenciales(estudianteId: string): Promise<void> {
    return parte2.egresarEstudianteYDesactivarCredenciales(this.dependencias(), estudianteId);
  }

  async obtenerResumenPromocionPorAnio(
    anioOrigenId: string,
    anioDestinoId?: string,
  ): Promise<ResumenSeccionPromocionRow[]> {
    return parte3.obtenerResumenPromocionPorAnio(this.dependencias(), anioOrigenId, anioDestinoId);
  }

  async desactivarEstudianteYCredenciales(
    estudianteId: string,
    nuevoEstado: "retirado" | "trasladado",
    actorId: string,
  ): Promise<void> {
    return parte3.desactivarEstudianteYCredenciales(
      this.dependencias(),
      estudianteId,
      nuevoEstado,
      actorId,
    );
  }

  async findMatriculas(query?: MatriculaQueryDto): Promise<PaginatedMatriculasResponseDto> {
    return parte3.findMatriculas(this.dependencias(), query);
  }

  async obtenerEstudiantesCulminadosSeccion(
    seccionOrigenId: string,
  ): Promise<EstudianteParaMatricula[]> {
    return parte3.obtenerEstudiantesCulminadosSeccion(this.dependencias(), seccionOrigenId);
  }

  async getDatosConstancia(matriculaId: string): Promise<DatosConstanciaMatricula | null> {
    return parte3.getDatosConstancia(this.dependencias(), matriculaId);
  }

  private mapToResponseDto(r: {
    id: string;
    codigo: string;
    fechaMatricula: string;
    tipo: string;
    estado: string;
    esRepitente: boolean;
    colegioProcedencia?: string | null;
    fechaRetiro?: string | null;
    motivoRetiro?: string | null;
    observaciones?: string | null;
    creadoEn: string;
    anioAcademicoId: string;
    anioNumero: number;
    gradoId: string;
    gradoNumero: number;
    gradoNombre: string;
    seccionId: string;
    seccionNombre: string;
    estudianteId: string;
    codigoEstudiante: string;
    estudianteEstado: string;
    personaNombres: string;
    personaApellidoPaterno: string;
    personaApellidoMaterno?: string | null;
    personaTipoDocumento: string;
    personaNumeroDocumento: string;
  }): MatriculaResponseDto {
    return parte4.mapToResponseDto(r);
  }
}
