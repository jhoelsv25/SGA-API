import { Inject, Injectable, Optional } from "@nestjs/common";
import { Database, DRIZZLE } from "../../../core/database";
import { ObservacionesBaseRepository } from "./observaciones-base.repository";
import { ObservacionesCatalogoRepository } from "./observaciones-catalogo.repository";
import { ObservacionesEvaluacionRepository } from "./observaciones-evaluacion.repository";
import type { BloqueHorario, DatosNuevaObservacion } from "./observaciones-shared.helper";

export type { BloqueHorario, DatosNuevaObservacion };

/**
 * Fachada cohesiva de repositorio para Observaciones de Aula que delega en
 * repositorios especializados (base/programación, evaluación e instrumentos/reportes).
 */
@Injectable()
export class ObservacionesAulaRepository {
  private readonly baseRepo: ObservacionesBaseRepository;
  private readonly evalRepo: ObservacionesEvaluacionRepository;
  private readonly catalogoRepo: ObservacionesCatalogoRepository;

  constructor(
    @Inject(DRIZZLE) db: Database,
    @Optional() baseRepo?: ObservacionesBaseRepository,
    @Optional() evalRepo?: ObservacionesEvaluacionRepository,
    @Optional() catalogoRepo?: ObservacionesCatalogoRepository,
  ) {
    this.baseRepo = baseRepo ?? new ObservacionesBaseRepository(db);
    this.evalRepo = evalRepo ?? new ObservacionesEvaluacionRepository(db);
    this.catalogoRepo = catalogoRepo ?? new ObservacionesCatalogoRepository(db);
  }

  obtener(...args: Parameters<ObservacionesBaseRepository["obtener"]>) {
    return this.baseRepo.obtener(...args);
  }
  listar(...args: Parameters<ObservacionesBaseRepository["listar"]>) {
    return this.baseRepo.listar(...args);
  }
  listarDelDocente(...args: Parameters<ObservacionesBaseRepository["listarDelDocente"]>) {
    return this.baseRepo.listarDelDocente(...args);
  }
  crear(...args: Parameters<ObservacionesBaseRepository["crear"]>) {
    return this.baseRepo.crear(...args);
  }
  actualizar(...args: Parameters<ObservacionesBaseRepository["actualizar"]>) {
    return this.baseRepo.actualizar(...args);
  }
  cerrarNotas(...args: Parameters<ObservacionesBaseRepository["cerrarNotas"]>) {
    return this.baseRepo.cerrarNotas(...args);
  }
  obtenerDocente(...args: Parameters<ObservacionesBaseRepository["obtenerDocente"]>) {
    return this.baseRepo.obtenerDocente(...args);
  }
  obtenerDocenteDePersona(
    ...args: Parameters<ObservacionesBaseRepository["obtenerDocenteDePersona"]>
  ) {
    return this.baseRepo.obtenerDocenteDePersona(...args);
  }
  obtenerCursoSeccion(...args: Parameters<ObservacionesBaseRepository["obtenerCursoSeccion"]>) {
    return this.baseRepo.obtenerCursoSeccion(...args);
  }
  bloquesDelCurso(...args: Parameters<ObservacionesBaseRepository["bloquesDelCurso"]>) {
    return this.baseRepo.bloquesDelCurso(...args);
  }
  periodoDeFecha(...args: Parameters<ObservacionesBaseRepository["periodoDeFecha"]>) {
    return this.baseRepo.periodoDeFecha(...args);
  }
  sesionDeHorario(...args: Parameters<ObservacionesBaseRepository["sesionDeHorario"]>) {
    return this.baseRepo.sesionDeHorario(...args);
  }
  anioEnCurso() {
    return this.baseRepo.anioEnCurso();
  }
  valoresVariables(...args: Parameters<ObservacionesBaseRepository["valoresVariables"]>) {
    return this.baseRepo.valoresVariables(...args);
  }
  usuarioDeDocente(...args: Parameters<ObservacionesBaseRepository["usuarioDeDocente"]>) {
    return this.baseRepo.usuarioDeDocente(...args);
  }
  obtenerUsuario(...args: Parameters<ObservacionesBaseRepository["obtenerUsuario"]>) {
    return this.baseRepo.obtenerUsuario(...args);
  }
  usuarioTieneOpcion(...args: Parameters<ObservacionesBaseRepository["usuarioTieneOpcion"]>) {
    return this.baseRepo.usuarioTieneOpcion(...args);
  }
  usuariosConOpcion(...args: Parameters<ObservacionesBaseRepository["usuariosConOpcion"]>) {
    return this.baseRepo.usuariosConOpcion(...args);
  }
  usuarioActivo(...args: Parameters<ObservacionesBaseRepository["usuarioActivo"]>) {
    return this.baseRepo.usuarioActivo(...args);
  }
  registrarAlertaEnviada(
    ...args: Parameters<ObservacionesBaseRepository["registrarAlertaEnviada"]>
  ) {
    return this.baseRepo.registrarAlertaEnviada(...args);
  }
  observacionesDelObservador(
    ...args: Parameters<ObservacionesBaseRepository["observacionesDelObservador"]>
  ) {
    return this.baseRepo.observacionesDelObservador(...args);
  }
  registrarCambio(...args: Parameters<ObservacionesBaseRepository["registrarCambio"]>) {
    return this.baseRepo.registrarCambio(...args);
  }
  cambios(...args: Parameters<ObservacionesBaseRepository["cambios"]>) {
    return this.baseRepo.cambios(...args);
  }

  agregarNota(...args: Parameters<ObservacionesEvaluacionRepository["agregarNota"]>) {
    return this.evalRepo.agregarNota(...args);
  }
  obtenerNota(...args: Parameters<ObservacionesEvaluacionRepository["obtenerNota"]>) {
    return this.evalRepo.obtenerNota(...args);
  }
  editarNota(...args: Parameters<ObservacionesEvaluacionRepository["editarNota"]>) {
    return this.evalRepo.editarNota(...args);
  }
  notas(...args: Parameters<ObservacionesEvaluacionRepository["notas"]>) {
    return this.evalRepo.notas(...args);
  }
  calificacionesVigentes(
    ...args: Parameters<ObservacionesEvaluacionRepository["calificacionesVigentes"]>
  ) {
    return this.evalRepo.calificacionesVigentes(...args);
  }
  historialCalificaciones(
    ...args: Parameters<ObservacionesEvaluacionRepository["historialCalificaciones"]>
  ) {
    return this.evalRepo.historialCalificaciones(...args);
  }
  guardarBorrador(...args: Parameters<ObservacionesEvaluacionRepository["guardarBorrador"]>) {
    return this.evalRepo.guardarBorrador(...args);
  }
  nuevaVersionCalificacion(
    ...args: Parameters<ObservacionesEvaluacionRepository["nuevaVersionCalificacion"]>
  ) {
    return this.evalRepo.nuevaVersionCalificacion(...args);
  }
  crearCompromiso(...args: Parameters<ObservacionesEvaluacionRepository["crearCompromiso"]>) {
    return this.evalRepo.crearCompromiso(...args);
  }
  obtenerCompromisoFila(
    ...args: Parameters<ObservacionesEvaluacionRepository["obtenerCompromisoFila"]>
  ) {
    return this.evalRepo.obtenerCompromisoFila(...args);
  }
  compromisoVigente(...args: Parameters<ObservacionesEvaluacionRepository["compromisoVigente"]>) {
    return this.evalRepo.compromisoVigente(...args);
  }
  compromisosVigentes(
    ...args: Parameters<ObservacionesEvaluacionRepository["compromisosVigentes"]>
  ) {
    return this.evalRepo.compromisosVigentes(...args);
  }
  historialCompromisos(
    ...args: Parameters<ObservacionesEvaluacionRepository["historialCompromisos"]>
  ) {
    return this.evalRepo.historialCompromisos(...args);
  }
  editarCompromisoEnSitio(
    ...args: Parameters<ObservacionesEvaluacionRepository["editarCompromisoEnSitio"]>
  ) {
    return this.evalRepo.editarCompromisoEnSitio(...args);
  }
  nuevaVersionCompromiso(
    ...args: Parameters<ObservacionesEvaluacionRepository["nuevaVersionCompromiso"]>
  ) {
    return this.evalRepo.nuevaVersionCompromiso(...args);
  }
  cerrarCompromiso(...args: Parameters<ObservacionesEvaluacionRepository["cerrarCompromiso"]>) {
    return this.evalRepo.cerrarCompromiso(...args);
  }
  compromisosPorRevisar(
    ...args: Parameters<ObservacionesEvaluacionRepository["compromisosPorRevisar"]>
  ) {
    return this.evalRepo.compromisosPorRevisar(...args);
  }
  comentarioDe(...args: Parameters<ObservacionesEvaluacionRepository["comentarioDe"]>) {
    return this.evalRepo.comentarioDe(...args);
  }
  crearComentario(...args: Parameters<ObservacionesEvaluacionRepository["crearComentario"]>) {
    return this.evalRepo.crearComentario(...args);
  }
  crearArchivo(...args: Parameters<ObservacionesEvaluacionRepository["crearArchivo"]>) {
    return this.evalRepo.crearArchivo(...args);
  }
  archivos(...args: Parameters<ObservacionesEvaluacionRepository["archivos"]>) {
    return this.evalRepo.archivos(...args);
  }

  instrumentoVigente() {
    return this.catalogoRepo.instrumentoVigente();
  }
  instrumento(...args: Parameters<ObservacionesCatalogoRepository["instrumento"]>) {
    return this.catalogoRepo.instrumento(...args);
  }
  instrumentos() {
    return this.catalogoRepo.instrumentos();
  }
  existeCodigoInstrumento(
    ...args: Parameters<ObservacionesCatalogoRepository["existeCodigoInstrumento"]>
  ) {
    return this.catalogoRepo.existeCodigoInstrumento(...args);
  }
  crearInstrumento(...args: Parameters<ObservacionesCatalogoRepository["crearInstrumento"]>) {
    return this.catalogoRepo.crearInstrumento(...args);
  }
  marcarInstrumentoVigente(
    ...args: Parameters<ObservacionesCatalogoRepository["marcarInstrumentoVigente"]>
  ) {
    return this.catalogoRepo.marcarInstrumentoVigente(...args);
  }
  docentesActivos() {
    return this.catalogoRepo.docentesActivos();
  }
  conteosPorDocente(...args: Parameters<ObservacionesCatalogoRepository["conteosPorDocente"]>) {
    return this.catalogoRepo.conteosPorDocente(...args);
  }
  calificacionesDelAnio(
    ...args: Parameters<ObservacionesCatalogoRepository["calificacionesDelAnio"]>
  ) {
    return this.catalogoRepo.calificacionesDelAnio(...args);
  }
  ultimaRetroalimentadaDelPeriodo(
    ...args: Parameters<ObservacionesCatalogoRepository["ultimaRetroalimentadaDelPeriodo"]>
  ) {
    return this.catalogoRepo.ultimaRetroalimentadaDelPeriodo(...args);
  }
}
