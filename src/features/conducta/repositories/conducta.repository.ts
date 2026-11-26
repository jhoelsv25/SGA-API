import { Inject, Injectable } from "@nestjs/common";
import { Database, DRIZZLE } from "@/core/database";
import {
  IncidenciaItem,
  InfoMatriculaEstudiante,
  ObservacionItem,
  ResumenConductaEstudiante,
} from "../interfaces";
import {
  ActualizarIncidenciaDto,
  CrearIncidenciaDto,
  CrearObservacionDto,
  QueryIncidenciasDto,
  QueryObservacionesDto,
} from "../dto";
import type { ConductaRepositoryDeps, ConductaRepositoryCalls } from "./conducta/deps";
import * as parte1 from "./conducta/obtener-info-matricula";
import * as parte2 from "./conducta/crear-incidencia";
import * as parte3 from "./conducta/obtener-observacion-por-id";

@Injectable()
export class ConductaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private dependencias(): ConductaRepositoryDeps {
    return {
      db: this.db,
    };
  }

  private llamadas(): ConductaRepositoryCalls {
    return {
      obtenerInfoMatricula: (matriculaId) => this.obtenerInfoMatricula(matriculaId),
    };
  }

  /**
   * Obtiene la información académica, sección, tutor y apoderado principal de la matrícula.
   */
  async obtenerInfoMatricula(matriculaId: string): Promise<InfoMatriculaEstudiante | null> {
    return parte1.obtenerInfoMatricula(this.dependencias(), matriculaId);
  }

  /**
   * Verifica si un usuario docente dicta en la sección o es su tutor.
   */
  async esDocenteDeSeccion(usuarioId: string, seccionId: string): Promise<boolean> {
    return parte1.esDocenteDeSeccion(this.dependencias(), usuarioId, seccionId);
  }

  /**
   * Verifica si un usuario es tutor de una sección.
   */
  async esTutorDeSeccion(usuarioId: string, seccionId: string): Promise<boolean> {
    return parte1.esTutorDeSeccion(this.dependencias(), usuarioId, seccionId);
  }

  /**
   * Verifica si el usuario es apoderado registrado del estudiante de la matrícula.
   */
  async esApoderadoDeEstudiante(usuarioId: string, matriculaId: string): Promise<boolean> {
    return parte1.esApoderadoDeEstudiante(this.dependencias(), usuarioId, matriculaId);
  }

  /**
   * Verifica si el usuario es el estudiante mismo de la matrícula.
   */
  async esEstudianteDeMatricula(usuarioId: string, matriculaId: string): Promise<boolean> {
    return parte1.esEstudianteDeMatricula(this.dependencias(), usuarioId, matriculaId);
  }

  /**
   * Obtiene las matrículas asociadas a un usuario estudiante o apoderado.
   */
  async obtenerMatriculasDeUsuario(
    usuarioId: string,
    rol: "estudiante" | "apoderado",
  ): Promise<string[]> {
    return parte1.obtenerMatriculasDeUsuario(this.dependencias(), usuarioId, rol);
  }

  /**
   * Deduce el bimestre/periodo académico según la fecha.
   */
  async deducirPeriodoId(matriculaId: string, fecha: string): Promise<string> {
    return parte1.deducirPeriodoId(this.dependencias(), matriculaId, fecha);
  }

  /**
   * Inserta una nueva incidencia de conducta.
   */
  async crearIncidencia(
    dto: CrearIncidenciaDto,
    periodoId: string,
    registradoPorId: string,
    apoderadoNotificado: boolean,
  ): Promise<string> {
    return parte2.crearIncidencia(
      this.dependencias(),
      dto,
      periodoId,
      registradoPorId,
      apoderadoNotificado,
    );
  }

  /**
   * Obtiene una incidencia por su ID.
   */
  async obtenerIncidenciaPorId(id: string): Promise<IncidenciaItem | null> {
    return parte2.obtenerIncidenciaPorId(this.dependencias(), id);
  }

  /**
   * Actualiza los campos permitidos de una incidencia.
   */
  async actualizarIncidencia(id: string, dto: ActualizarIncidenciaDto): Promise<void> {
    return parte2.actualizarIncidencia(this.dependencias(), id, dto);
  }

  /**
   * Elimina una incidencia física (tras registrar auditoría con el motivo).
   */
  async eliminarIncidencia(id: string): Promise<void> {
    return parte2.eliminarIncidencia(this.dependencias(), id);
  }

  /**
   * Consulta incidencias con filtros y paginación por cursores.
   */
  async listarIncidencias(
    dto: QueryIncidenciasDto,
  ): Promise<{ data: IncidenciaItem[]; nextCursor: string | null; hasMore: boolean }> {
    return parte2.listarIncidencias(this.dependencias(), dto);
  }

  /**
   * Crea una observación tutorial o psicopedagógica.
   */
  async crearObservacion(dto: CrearObservacionDto, registradoPorId: string): Promise<string> {
    return parte2.crearObservacion(this.dependencias(), dto, registradoPorId);
  }

  /**
   * Obtiene una observación por su ID.
   */
  async obtenerObservacionPorId(id: string): Promise<ObservacionItem | null> {
    return parte3.obtenerObservacionPorId(this.dependencias(), id);
  }

  /**
   * Lista observaciones con filtros y paginación por cursores.
   */
  async listarObservaciones(
    dto: QueryObservacionesDto,
  ): Promise<{ data: ObservacionItem[]; nextCursor: string | null; hasMore: boolean }> {
    return parte3.listarObservaciones(this.dependencias(), dto);
  }

  /**
   * Resumen para la ficha del estudiante: métricas por bimestre y gravedad.
   */
  async obtenerResumenConducta(matriculaId: string): Promise<ResumenConductaEstudiante> {
    return parte3.obtenerResumenConducta(this.dependencias(), this.llamadas(), matriculaId);
  }
}
