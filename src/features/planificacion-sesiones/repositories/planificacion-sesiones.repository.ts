import { Inject, Injectable } from "@nestjs/common";
import { Database, DRIZZLE } from "../../../core/database";
import type { EstadoPlanificacion, TipoOpcionCatalogo } from "../constants";
import type {
  BloqueDocente,
  ComentarioPlanificacion,
  CompetenciaPlanificada,
  DatosGuardarPlanificacion,
  MomentoPlanificado,
  PlanificacionFila,
} from "../interfaces";
import type { PlanificacionSesionesRepositoryDeps } from "./planificacion/deps";
import * as parte1 from "./planificacion/areas";
import * as parte2 from "./planificacion/bloques-base";
import * as parte3 from "./planificacion/base";
import * as parte4 from "./planificacion/planificaciones-del-dia";

@Injectable()
export class PlanificacionSesionesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private dependencias(): PlanificacionSesionesRepositoryDeps {
    return {
      db: this.db,
    };
  }

  // ─── Catálogo curricular ───────────────────────────────────────────────────
  areas() {
    return parte1.areas(this.dependencias());
  }

  async competencias(areaCodigo?: string) {
    return parte1.competencias(this.dependencias(), areaCodigo);
  }

  async competenciasPorIds(ids: string[]) {
    return parte1.competenciasPorIds(this.dependencias(), ids);
  }

  desempenos(competenciaId: string, grado?: number) {
    return parte1.desempenos(this.dependencias(), competenciaId, grado);
  }

  async desempenosPorIds(ids: string[]) {
    return parte1.desempenosPorIds(this.dependencias(), ids);
  }

  async desempeno(id: string) {
    return parte1.desempeno(this.dependencias(), id);
  }

  async crearDesempeno(competenciaId: string, grado: number, texto: string): Promise<string> {
    return parte1.crearDesempeno(this.dependencias(), competenciaId, grado, texto);
  }

  async actualizarDesempeno(id: string, texto: string): Promise<void> {
    return parte1.actualizarDesempeno(this.dependencias(), id, texto);
  }

  async competenciaExiste(id: string): Promise<boolean> {
    return parte1.competenciaExiste(this.dependencias(), id);
  }

  async enfoques() {
    return parte1.enfoques(this.dependencias());
  }

  opciones(tipo?: TipoOpcionCatalogo) {
    return parte1.opciones(this.dependencias(), tipo);
  }

  // ─── Docente y bloques del horario ────────────────────────────────────────
  async docenteDePersona(personaId: string): Promise<{ id: string; activo: boolean } | null> {
    return parte1.docenteDePersona(this.dependencias(), personaId);
  }

  private bloquesBase() {
    return parte2.bloquesBase(this.dependencias());
  }

  async bloque(horarioId: string): Promise<BloqueDocente | null> {
    return parte2.bloque(this.dependencias(), horarioId);
  }

  bloquesDeDocente(docenteId: string): Promise<BloqueDocente[]> {
    return parte2.bloquesDeDocente(this.dependencias(), docenteId);
  }

  async usuarioDeDocente(docenteId: string): Promise<string | null> {
    return parte2.usuarioDeDocente(this.dependencias(), docenteId);
  }

  // ─── Planificaciones ──────────────────────────────────────────────────────
  private base() {
    return parte3.base(this.dependencias());
  }

  async planificacion(id: string): Promise<PlanificacionFila | null> {
    return parte3.planificacion(this.dependencias(), id);
  }

  async planificacionDeBloque(horarioId: string, fecha: string): Promise<PlanificacionFila | null> {
    return parte3.planificacionDeBloque(this.dependencias(), horarioId, fecha);
  }

  async planificacionesDeDocente(docenteId: string, desde: string, hasta: string) {
    return parte3.planificacionesDeDocente(this.dependencias(), docenteId, desde, hasta);
  }

  /** Planificaciones de cualquier día, con el bloque y el docente, de la más reciente a la más antigua. */
  async historial(filtro: {
    desde: string;
    hasta: string;
    docenteId?: string;
    estado?: EstadoPlanificacion;
  }) {
    return parte3.historial(this.dependencias(), filtro);
  }

  async planificacionesDelDia(fecha: string) {
    return parte4.planificacionesDelDia(this.dependencias(), fecha);
  }

  async competenciasDe(planificacionId: string): Promise<CompetenciaPlanificada[]> {
    return parte4.competenciasDe(this.dependencias(), planificacionId);
  }

  async momentosDe(planificacionId: string): Promise<MomentoPlanificado[]> {
    return parte4.momentosDe(this.dependencias(), planificacionId);
  }

  async comentariosDe(planificacionId: string): Promise<ComentarioPlanificacion[]> {
    return parte4.comentariosDe(this.dependencias(), planificacionId);
  }

  /** Crea o reemplaza la planificación de un bloque con sus competencias y momentos, en una transacción. */
  async guardar(datos: DatosGuardarPlanificacion, existenteId: string | null): Promise<string> {
    return parte4.guardar(this.dependencias(), datos, existenteId);
  }

  async cambiarEstado(
    id: string,
    estado: EstadoPlanificacion,
    sesionClaseId?: string,
  ): Promise<void> {
    return parte4.cambiarEstado(this.dependencias(), id, estado, sesionClaseId);
  }

  async agregarComentario(
    planificacionId: string,
    usuarioId: string,
    texto: string,
  ): Promise<string> {
    return parte4.agregarComentario(this.dependencias(), planificacionId, usuarioId, texto);
  }

  // ─── Calendario y sesiones ────────────────────────────────────────────────
  async periodoDeFecha(fecha: string): Promise<{ id: string; estado: string } | null> {
    return parte4.periodoDeFecha(this.dependencias(), fecha);
  }

  async sesionDeBloque(horarioId: string, fecha: string) {
    return parte4.sesionDeBloque(this.dependencias(), horarioId, fecha);
  }

  async sesion(id: string) {
    return parte4.sesion(this.dependencias(), id);
  }

  async verificacionDeSesion(sesionId: string) {
    return parte4.verificacionDeSesion(this.dependencias(), sesionId);
  }

  async guardarVerificacion(
    sesionClaseId: string,
    datos: {
      enAula: boolean;
      horaInicio: string | null;
      horaFin: string | null;
      observacion: string | null;
      usuarioId: string;
    },
  ): Promise<void> {
    return parte4.guardarVerificacion(this.dependencias(), sesionClaseId, datos);
  }

  /** Sesiones de un día con su marca de planificación (panel del supervisor). */
  async sesionesConPlanificacion(fecha: string) {
    return parte4.sesionesConPlanificacion(this.dependencias(), fecha);
  }
}
