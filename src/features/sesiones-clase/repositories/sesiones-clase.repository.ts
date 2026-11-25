import { Inject, Injectable, Optional } from "@nestjs/common";
import { Database, DRIZZLE } from "../../../core/database";
import type { EstadoJustificacion } from "../constants";
import type { ISesionesClaseRepository } from "../interfaces";
import { SesionesFirmasRepository } from "./sesiones-firmas.repository";
import { SesionesJustificacionesRepository } from "./sesiones-justificaciones.repository";
import { SesionesLecturaRepository } from "./sesiones-lectura.repository";

/**
 * Fachada cohesiva de repositorio para Sesiones de Clase que delega en
 * repositorios especializados (lectura, firmas/ciclo y justificaciones/alertas).
 */
@Injectable()
export class SesionesClaseRepository implements ISesionesClaseRepository {
  private readonly lecturaRepo: SesionesLecturaRepository;
  private readonly firmasRepo: SesionesFirmasRepository;
  private readonly justificacionesRepo: SesionesJustificacionesRepository;

  constructor(
    @Inject(DRIZZLE) db: Database,
    @Optional() lecturaRepo?: SesionesLecturaRepository,
    @Optional() firmasRepo?: SesionesFirmasRepository,
    @Optional() justificacionesRepo?: SesionesJustificacionesRepository,
  ) {
    this.lecturaRepo = lecturaRepo ?? new SesionesLecturaRepository(db);
    this.firmasRepo = firmasRepo ?? new SesionesFirmasRepository(db);
    this.justificacionesRepo = justificacionesRepo ?? new SesionesJustificacionesRepository(db);
  }

  bloquesDelDia(...args: Parameters<SesionesLecturaRepository["bloquesDelDia"]>) {
    return this.lecturaRepo.bloquesDelDia(...args);
  }

  insertarSesiones(...args: Parameters<SesionesFirmasRepository["insertarSesiones"]>) {
    return this.firmasRepo.insertarSesiones(...args);
  }

  cerrarDia(...args: Parameters<SesionesFirmasRepository["cerrarDia"]>) {
    return this.firmasRepo.cerrarDia(...args);
  }

  findUsuariosDeDocentes(...args: Parameters<SesionesLecturaRepository["findUsuariosDeDocentes"]>) {
    return this.lecturaRepo.findUsuariosDeDocentes(...args);
  }

  findById(...args: Parameters<SesionesLecturaRepository["findById"]>) {
    return this.lecturaRepo.findById(...args);
  }

  sesionesDelDia(...args: Parameters<SesionesLecturaRepository["sesionesDelDia"]>) {
    return this.lecturaRepo.sesionesDelDia(...args);
  }

  sesionesDeDocente(...args: Parameters<SesionesLecturaRepository["sesionesDeDocente"]>) {
    return this.lecturaRepo.sesionesDeDocente(...args);
  }

  ultimosTemasDocente(...args: Parameters<SesionesLecturaRepository["ultimosTemasDocente"]>) {
    return this.lecturaRepo.ultimosTemasDocente(...args);
  }

  cursoSeccionDeSesion(...args: Parameters<SesionesLecturaRepository["cursoSeccionDeSesion"]>) {
    return this.lecturaRepo.cursoSeccionDeSesion(...args);
  }

  firmarIngreso(...args: Parameters<SesionesFirmasRepository["firmarIngreso"]>) {
    return this.firmasRepo.firmarIngreso(...args);
  }

  firmarSalida(...args: Parameters<SesionesFirmasRepository["firmarSalida"]>) {
    return this.firmasRepo.firmarSalida(...args);
  }

  actualizarTema(...args: Parameters<SesionesFirmasRepository["actualizarTema"]>) {
    return this.firmasRepo.actualizarTema(...args);
  }

  reemplazar(...args: Parameters<SesionesFirmasRepository["reemplazar"]>) {
    return this.firmasRepo.reemplazar(...args);
  }

  solicitarJustificacion(
    ...args: Parameters<SesionesJustificacionesRepository["solicitarJustificacion"]>
  ) {
    return this.justificacionesRepo.solicitarJustificacion(...args);
  }

  resolverJustificacion(
    id: string,
    estado: Extract<EstadoJustificacion, "aprobada" | "rechazada">,
    usuarioId: string,
    comentario: string | null,
  ) {
    return this.justificacionesRepo.resolverJustificacion(id, estado, usuarioId, comentario);
  }

  justificacionesPorEstado(
    ...args: Parameters<SesionesJustificacionesRepository["justificacionesPorEstado"]>
  ) {
    return this.justificacionesRepo.justificacionesPorEstado(...args);
  }

  minutosPerdidosPorDocente(
    ...args: Parameters<SesionesJustificacionesRepository["minutosPerdidosPorDocente"]>
  ) {
    return this.justificacionesRepo.minutosPerdidosPorDocente(...args);
  }

  registrarAlertaEnviada(
    ...args: Parameters<SesionesJustificacionesRepository["registrarAlertaEnviada"]>
  ) {
    return this.justificacionesRepo.registrarAlertaEnviada(...args);
  }

  usuariosConRol(...args: Parameters<SesionesLecturaRepository["usuariosConRol"]>) {
    return this.lecturaRepo.usuariosConRol(...args);
  }

  diasSinClases(...args: Parameters<SesionesJustificacionesRepository["diasSinClases"]>) {
    return this.justificacionesRepo.diasSinClases(...args);
  }

  diasPermisoPersonal(
    ...args: Parameters<SesionesJustificacionesRepository["diasPermisoPersonal"]>
  ) {
    return this.justificacionesRepo.diasPermisoPersonal(...args);
  }

  docenteDePersona(...args: Parameters<SesionesLecturaRepository["docenteDePersona"]>) {
    return this.lecturaRepo.docenteDePersona(...args);
  }

  docenteActivo(...args: Parameters<SesionesLecturaRepository["docenteActivo"]>) {
    return this.lecturaRepo.docenteActivo(...args);
  }

  valoresVariables(...args: Parameters<SesionesLecturaRepository["valoresVariables"]>) {
    return this.lecturaRepo.valoresVariables(...args);
  }
}
