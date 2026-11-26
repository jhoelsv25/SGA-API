import { Inject, Injectable, Optional } from "@nestjs/common";
import { Database, DRIZZLE } from "../../../core/database";
import type { EstadoSolicitudFecha, TipoModeracion, TipoPregunta, TipoTarea } from "../constants";
import type {
  ActividadEstudianteMaterial,
  ActividadEstudianteTarea,
  CambioFechaHistorial,
  ComentarioMuroFila,
  ContenidoMaterial,
  CursoAula,
  CursoAulaResumen,
  EntregaFila,
  FilaSeguimiento,
  HistorialModeracionFila,
  HorarioBloque,
  IAulaVirtualRepository,
  MaterialFila,
  MensajeChatFila,
  NuevaTarea,
  NuevaUnidad,
  NuevoMaterial,
  PeriodoAula,
  PublicacionMuroFila,
  SesionEnlazada,
  SolicitudFila,
  TareaConPreguntas,
  TareaFila,
  UnidadFila,
} from "../interfaces";
import { AulaAccesoRepository } from "./aula-acceso.repository";
import { AulaActividadRepository } from "./aula-actividad.repository";
import { AulaEntregasRepository } from "./aula-entregas.repository";
import { AulaInteraccionRepository } from "./aula-interaccion.repository";
import { AulaMaterialesRepository } from "./aula-materiales.repository";
import { AulaTareasRepository } from "./aula-tareas.repository";

/**
 * Fachada cohesiva de repositorio para Aula Virtual que delega en repositorios
 * especializados por dominio (acceso, materiales, tareas, entregas, interacción y actividad).
 */
@Injectable()
export class AulaVirtualRepository implements IAulaVirtualRepository {
  private readonly accesoRepo: AulaAccesoRepository;
  private readonly materialesRepo: AulaMaterialesRepository;
  private readonly tareasRepo: AulaTareasRepository;
  private readonly entregasRepo: AulaEntregasRepository;
  private readonly interaccionRepo: AulaInteraccionRepository;
  private readonly actividadRepo: AulaActividadRepository;

  constructor(
    @Inject(DRIZZLE) db: Database,
    @Optional() accesoRepo?: AulaAccesoRepository,
    @Optional() materialesRepo?: AulaMaterialesRepository,
    @Optional() tareasRepo?: AulaTareasRepository,
    @Optional() interaccionRepo?: AulaInteraccionRepository,
    @Optional() actividadRepo?: AulaActividadRepository,
    @Optional() entregasRepo?: AulaEntregasRepository,
  ) {
    this.accesoRepo = accesoRepo ?? new AulaAccesoRepository(db);
    this.materialesRepo = materialesRepo ?? new AulaMaterialesRepository(db);
    this.tareasRepo = tareasRepo ?? new AulaTareasRepository(db);
    this.entregasRepo = entregasRepo ?? new AulaEntregasRepository(db);
    this.interaccionRepo = interaccionRepo ?? new AulaInteraccionRepository(db);
    this.actividadRepo =
      actividadRepo ?? new AulaActividadRepository(db, this.accesoRepo, this.entregasRepo);
  }

  findDocenteIdPorPersona(personaId: string): Promise<string | null> {
    return this.accesoRepo.findDocenteIdPorPersona(personaId);
  }

  findCurso(cursoSeccionId: string): Promise<CursoAula | null> {
    return this.accesoRepo.findCurso(cursoSeccionId);
  }

  findPeriodo(periodoId: string): Promise<PeriodoAula | null> {
    return this.accesoRepo.findPeriodo(periodoId);
  }

  findPeriodoEnCurso(anioAcademicoId: string): Promise<PeriodoAula | null> {
    return this.accesoRepo.findPeriodoEnCurso(anioAcademicoId);
  }

  leerVariableEntera(codigo: string, porDefecto: number): Promise<number> {
    return this.accesoRepo.leerVariableEntera(codigo, porDefecto);
  }

  cursosDelDocente(docenteId: string, anioAcademicoId: string): Promise<CursoAulaResumen[]> {
    return this.accesoRepo.cursosDelDocente(docenteId, anioAcademicoId);
  }

  cursosDelEstudiante(personaId: string, anioAcademicoId: string): Promise<CursoAulaResumen[]> {
    return this.accesoRepo.cursosDelEstudiante(personaId, anioAcademicoId);
  }

  estudianteTieneMatriculaEnSeccion(personaId: string, seccionId: string): Promise<boolean> {
    return this.accesoRepo.estudianteTieneMatriculaEnSeccion(personaId, seccionId);
  }

  cursosDelAnio(anioAcademicoId: string): Promise<CursoAulaResumen[]> {
    return this.accesoRepo.cursosDelAnio(anioAcademicoId);
  }

  cursosDelApoderado(
    apoderadoPersonaId: string,
    anioAcademicoId: string,
  ): Promise<CursoAulaResumen[]> {
    return this.accesoRepo.cursosDelApoderado(apoderadoPersonaId, anioAcademicoId);
  }

  apoderadoTieneHijoEnSeccion(apoderadoPersonaId: string, seccionId: string): Promise<boolean> {
    return this.accesoRepo.apoderadoTieneHijoEnSeccion(apoderadoPersonaId, seccionId);
  }

  esApoderadoDeEstudiante(
    apoderadoPersonaId: string,
    estudiantePersonaIdOId: string,
  ): Promise<boolean> {
    return this.accesoRepo.esApoderadoDeEstudiante(apoderadoPersonaId, estudiantePersonaIdOId);
  }

  estudiantesDeApoderadoEnSeccion(apoderadoPersonaId: string, seccionId: string) {
    return this.accesoRepo.estudiantesDeApoderadoEnSeccion(apoderadoPersonaId, seccionId);
  }

  usuariosConRol(nombresRol: readonly string[]): Promise<string[]> {
    return this.accesoRepo.usuariosConRol(nombresRol);
  }

  usuariosEstudiantesDeSeccion(seccionId: string, anioAcademicoId: string): Promise<string[]> {
    return this.accesoRepo.usuariosEstudiantesDeSeccion(seccionId, anioAcademicoId);
  }

  obtenerAnioPorCursoSeccion(cursoSeccionId: string) {
    return this.accesoRepo.obtenerAnioPorCursoSeccion(cursoSeccionId);
  }

  obtenerDocenteUsuarioId(cursoSeccionId: string): Promise<string | null> {
    return this.accesoRepo.obtenerDocenteUsuarioId(cursoSeccionId);
  }

  obtenerMatriculaActivaEstudiante(personaId: string, seccionId: string) {
    return this.accesoRepo.obtenerMatriculaActivaEstudiante(personaId, seccionId);
  }

  listarUnidades(cursoSeccionId: string, soloPublicadas: boolean): Promise<UnidadFila[]> {
    return this.materialesRepo.listarUnidades(cursoSeccionId, soloPublicadas);
  }

  findUnidad(unidadId: string): Promise<UnidadFila | null> {
    return this.materialesRepo.findUnidad(unidadId);
  }

  siguienteOrdenUnidad(cursoSeccionId: string): Promise<number> {
    return this.materialesRepo.siguienteOrdenUnidad(cursoSeccionId);
  }

  crearUnidad(datos: NuevaUnidad): Promise<UnidadFila> {
    return this.materialesRepo.crearUnidad(datos);
  }

  actualizarUnidad(unidadId: string, datos: Partial<NuevaUnidad>): Promise<UnidadFila> {
    return this.materialesRepo.actualizarUnidad(unidadId, datos);
  }

  listarMateriales(
    cursoSeccionId: string,
    opciones: { soloPublicados: boolean },
  ): Promise<MaterialFila[]> {
    return this.materialesRepo.listarMateriales(cursoSeccionId, opciones);
  }

  findMaterial(materialId: string): Promise<MaterialFila | null> {
    return this.materialesRepo.findMaterial(materialId);
  }

  siguienteOrdenMaterial(unidadId: string): Promise<number> {
    return this.materialesRepo.siguienteOrdenMaterial(unidadId);
  }

  crearMaterial(datos: NuevoMaterial): Promise<MaterialFila> {
    return this.materialesRepo.crearMaterial(datos);
  }

  actualizarMaterial(
    materialId: string,
    datos: Partial<{
      titulo: string;
      descripcion: string | null;
      horarioId: string | null;
      fechaProgramada: string | null;
      visible: boolean;
    }>,
  ): Promise<MaterialFila> {
    return this.materialesRepo.actualizarMaterial(materialId, datos);
  }

  publicarMaterial(
    materialId: string,
    contenido: ContenidoMaterial,
    publicadoEn: string,
    actorId: string,
  ): Promise<MaterialFila> {
    return this.materialesRepo.publicarMaterial(materialId, contenido, publicadoEn, actorId);
  }

  reemplazarContenido(
    materialId: string,
    contenido: ContenidoMaterial,
    actorId: string,
  ): Promise<MaterialFila> {
    return this.materialesRepo.reemplazarContenido(materialId, contenido, actorId);
  }

  retirarMaterial(materialId: string): Promise<void> {
    return this.materialesRepo.retirarMaterial(materialId);
  }

  findHorario(horarioId: string): Promise<HorarioBloque | null> {
    return this.materialesRepo.findHorario(horarioId);
  }

  bloquesDelCurso(cursoSeccionId: string): Promise<HorarioBloque[]> {
    return this.materialesRepo.bloquesDelCurso(cursoSeccionId);
  }

  findSesionDeBloque(horarioId: string, fecha: string): Promise<SesionEnlazada | null> {
    return this.materialesRepo.findSesionDeBloque(horarioId, fecha);
  }

  findSolicitudAbierta(materialId: string): Promise<{ id: string } | null> {
    return this.materialesRepo.findSolicitudAbierta(materialId);
  }

  crearSolicitud(datos: {
    materialId: string;
    fechaAnterior: string;
    fechaSolicitada: string;
    motivo: string;
    solicitadoPorId: string;
  }): Promise<{ id: string }> {
    return this.materialesRepo.crearSolicitud(datos);
  }

  findSolicitud(solicitudId: string): Promise<SolicitudFila | null> {
    return this.materialesRepo.findSolicitud(solicitudId);
  }

  listarSolicitudes(filtro: {
    estado?: EstadoSolicitudFecha;
    solicitadoPorId?: string;
    anioAcademicoId?: string;
  }): Promise<SolicitudFila[]> {
    return this.materialesRepo.listarSolicitudes(filtro);
  }

  historialCambiosFecha(materialId: string): Promise<CambioFechaHistorial[]> {
    return this.materialesRepo.historialCambiosFecha(materialId);
  }

  aprobarSolicitud(
    solicitudId: string,
    resueltoPorId: string,
    respuesta: string | null,
  ): Promise<void> {
    return this.materialesRepo.aprobarSolicitud(solicitudId, resueltoPorId, respuesta);
  }

  rechazarSolicitud(solicitudId: string, resueltoPorId: string, respuesta: string): Promise<void> {
    return this.materialesRepo.rechazarSolicitud(solicitudId, resueltoPorId, respuesta);
  }

  seguimiento(periodoId: string, hoy: string): Promise<FilaSeguimiento[]> {
    return this.materialesRepo.seguimiento(periodoId, hoy);
  }

  listarTareas(
    cursoSeccionId: string,
    opciones: { soloPublicadas?: boolean; unidadId?: string; periodoId?: string },
  ): Promise<TareaFila[]> {
    return this.tareasRepo.listarTareas(cursoSeccionId, opciones);
  }

  findTarea(tareaId: string): Promise<TareaConPreguntas | null> {
    return this.tareasRepo.findTarea(tareaId);
  }

  crearTarea(datos: NuevaTarea): Promise<TareaFila> {
    return this.tareasRepo.crearTarea(datos);
  }

  actualizarTarea(tareaId: string, datos: Partial<NuevaTarea>): Promise<TareaFila> {
    return this.tareasRepo.actualizarTarea(tareaId, datos);
  }

  publicarTarea(tareaId: string, publicadaEn: string): Promise<TareaFila> {
    return this.tareasRepo.publicarTarea(tareaId, publicadaEn);
  }

  cerrarTarea(tareaId: string, cerradaEn: string): Promise<TareaFila> {
    return this.tareasRepo.cerrarTarea(tareaId, cerradaEn);
  }

  eliminarTarea(tareaId: string): Promise<void> {
    return this.tareasRepo.eliminarTarea(tareaId);
  }

  guardarPreguntasTarea(
    tareaId: string,
    preguntas: Array<{
      enunciado: string;
      tipo: TipoPregunta;
      puntaje: number;
      orden: number;
      opciones?: Array<{ texto: string; esCorrecta: boolean; orden: number }>;
    }>,
  ): Promise<void> {
    return this.tareasRepo.guardarPreguntasTarea(tareaId, preguntas);
  }

  findEntrega(entregaId: string): Promise<EntregaFila | null> {
    return this.entregasRepo.findEntrega(entregaId);
  }

  findEntregasDeTarea(tareaId: string): Promise<EntregaFila[]> {
    return this.entregasRepo.findEntregasDeTarea(tareaId);
  }

  findEntregasDeEstudiante(tareaId: string, matriculaId: string): Promise<EntregaFila[]> {
    return this.entregasRepo.findEntregasDeEstudiante(tareaId, matriculaId);
  }

  findEntregaActiva(tareaId: string, matriculaId: string): Promise<EntregaFila | null> {
    return this.entregasRepo.findEntregaActiva(tareaId, matriculaId);
  }

  guardarEntrega(
    datos: Parameters<AulaEntregasRepository["guardarEntrega"]>[0],
  ): Promise<EntregaFila> {
    return this.entregasRepo.guardarEntrega(datos);
  }

  calificarEntrega(
    entregaId: string,
    datos: Parameters<AulaEntregasRepository["calificarEntrega"]>[1],
  ): Promise<EntregaFila> {
    return this.entregasRepo.calificarEntrega(entregaId, datos);
  }

  devolverEntrega(
    entregaId: string,
    retroalimentacion: string,
    calificadaPorId: string,
  ): Promise<EntregaFila> {
    return this.entregasRepo.devolverEntrega(entregaId, retroalimentacion, calificadaPorId);
  }

  findMatriculaDeEstudiante(seccionId: string, estudiantePersonaIdOId: string) {
    return this.entregasRepo.findMatriculaDeEstudiante(seccionId, estudiantePersonaIdOId);
  }

  listarEstudiantesDeSeccion(seccionId: string) {
    return this.entregasRepo.listarEstudiantesDeSeccion(seccionId);
  }

  obtenerPesosVariables(): Promise<Record<TipoTarea, number>> {
    return this.entregasRepo.obtenerPesosVariables();
  }

  findTareasParaVentana(desde: string, hasta: string) {
    return this.tareasRepo.findTareasParaVentana(desde, hasta);
  }

  findEstudiantesSinEntrega(tareaId: string, seccionId: string, anioAcademicoId: string) {
    return this.entregasRepo.findEstudiantesSinEntrega(tareaId, seccionId, anioAcademicoId);
  }

  yaSeNotifico(usuarioId: string, enlaceUrl: string): Promise<boolean> {
    return this.tareasRepo.yaSeNotifico(usuarioId, enlaceUrl);
  }

  listarPublicacionesMuro(
    cursoSeccionId: string,
    verOcultos: boolean,
  ): Promise<PublicacionMuroFila[]> {
    return this.interaccionRepo.listarPublicacionesMuro(cursoSeccionId, verOcultos);
  }

  obtenerPublicacion(id: string): Promise<PublicacionMuroFila | null> {
    return this.interaccionRepo.obtenerPublicacion(id);
  }

  crearPublicacion(...args: Parameters<AulaInteraccionRepository["crearPublicacion"]>) {
    return this.interaccionRepo.crearPublicacion(...args);
  }

  actualizarPublicacion(...args: Parameters<AulaInteraccionRepository["actualizarPublicacion"]>) {
    return this.interaccionRepo.actualizarPublicacion(...args);
  }

  fijarPublicacion(id: string, fijada: boolean): Promise<PublicacionMuroFila> {
    return this.interaccionRepo.fijarPublicacion(id, fijada);
  }

  listarComentarios(publicacionId: string, verOcultos: boolean): Promise<ComentarioMuroFila[]> {
    return this.interaccionRepo.listarComentarios(publicacionId, verOcultos);
  }

  obtenerComentario(id: string): Promise<ComentarioMuroFila | null> {
    return this.interaccionRepo.obtenerComentario(id);
  }

  crearComentario(...args: Parameters<AulaInteraccionRepository["crearComentario"]>) {
    return this.interaccionRepo.crearComentario(...args);
  }

  actualizarComentario(id: string, datos: { contenido: string }): Promise<ComentarioMuroFila> {
    return this.interaccionRepo.actualizarComentario(id, datos);
  }

  listarMensajesChat(...args: Parameters<AulaInteraccionRepository["listarMensajesChat"]>) {
    return this.interaccionRepo.listarMensajesChat(...args);
  }

  obtenerMensajeChat(id: string): Promise<MensajeChatFila | null> {
    return this.interaccionRepo.obtenerMensajeChat(id);
  }

  enviarMensajeChat(...args: Parameters<AulaInteraccionRepository["enviarMensajeChat"]>) {
    return this.interaccionRepo.enviarMensajeChat(...args);
  }

  actualizarUltimaLecturaChat(
    ...args: Parameters<AulaInteraccionRepository["actualizarUltimaLecturaChat"]>
  ) {
    return this.interaccionRepo.actualizarUltimaLecturaChat(...args);
  }

  contarMensajesNoLeidosChat(cursoSeccionId: string, usuarioId: string): Promise<number> {
    return this.interaccionRepo.contarMensajesNoLeidosChat(cursoSeccionId, usuarioId);
  }

  ocultarContenido(...args: Parameters<AulaInteraccionRepository["ocultarContenido"]>) {
    return this.interaccionRepo.ocultarContenido(...args);
  }

  restaurarContenido(tipo: TipoModeracion, id: string): Promise<void> {
    return this.interaccionRepo.restaurarContenido(tipo, id);
  }

  listarHistorialModeracion(cursoSeccionId: string): Promise<HistorialModeracionFila[]> {
    return this.interaccionRepo.listarHistorialModeracion(cursoSeccionId);
  }

  registrarActividad(...args: Parameters<AulaActividadRepository["registrarActividad"]>) {
    return this.actividadRepo.registrarActividad(...args);
  }

  obtenerActividadMaterial(
    materialId: string,
    cursoSeccionId: string,
  ): Promise<ActividadEstudianteMaterial[]> {
    return this.actividadRepo.obtenerActividadMaterial(materialId, cursoSeccionId);
  }

  obtenerActividadTarea(
    tareaId: string,
    cursoSeccionId: string,
  ): Promise<ActividadEstudianteTarea[]> {
    return this.actividadRepo.obtenerActividadTarea(tareaId, cursoSeccionId);
  }
}
