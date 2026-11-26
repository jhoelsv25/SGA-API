import type {
  AccionActividadAula,
  EstadoEntrega,
  EstadoSolicitudFecha,
  TipoModeracion,
  TipoPregunta,
  TipoTarea,
} from "../constants";
import type {
  ActividadEstudianteMaterial,
  ActividadEstudianteTarea,
  ComentarioMuroFila,
  HistorialModeracionFila,
  MensajeChatFila,
  PublicacionMuroFila,
} from "./aula-interaccion.interface";
import type {
  CambioFechaHistorial,
  ContenidoMaterial,
  CursoAula,
  CursoAulaResumen,
  FilaSeguimiento,
  HorarioBloque,
  MaterialFila,
  NuevaUnidad,
  NuevoMaterial,
  PeriodoAula,
  SesionEnlazada,
  SolicitudFila,
  UnidadFila,
} from "./aula-materiales.interface";
import type {
  EntregaFila,
  NuevaTarea,
  TareaConPreguntas,
  TareaFila,
} from "./aula-tareas.interface";

export * from "./aula-materiales.interface";
export * from "./aula-tareas.interface";
export * from "./aula-interaccion.interface";

export interface IAulaVirtualRepository {
  findDocenteIdPorPersona(personaId: string): Promise<string | null>;
  findCurso(cursoSeccionId: string): Promise<CursoAula | null>;
  findPeriodo(periodoId: string): Promise<PeriodoAula | null>;
  findPeriodoEnCurso(anioAcademicoId: string): Promise<PeriodoAula | null>;
  leerVariableEntera(codigo: string, porDefecto: number): Promise<number>;
  cursosDelDocente(docenteId: string, anioAcademicoId: string): Promise<CursoAulaResumen[]>;
  cursosDelEstudiante(personaId: string, anioAcademicoId: string): Promise<CursoAulaResumen[]>;
  cursosDelAnio(anioAcademicoId: string): Promise<CursoAulaResumen[]>;
  cursosDelApoderado(
    apoderadoPersonaId: string,
    anioAcademicoId: string,
  ): Promise<CursoAulaResumen[]>;
  estudianteTieneMatriculaEnSeccion(personaId: string, seccionId: string): Promise<boolean>;
  apoderadoTieneHijoEnSeccion(apoderadoPersonaId: string, seccionId: string): Promise<boolean>;
  esApoderadoDeEstudiante(
    apoderadoPersonaId: string,
    estudiantePersonaIdOId: string,
  ): Promise<boolean>;
  estudiantesDeApoderadoEnSeccion(
    apoderadoPersonaId: string,
    seccionId: string,
  ): Promise<
    Array<{
      estudianteId: string;
      personaId: string;
      matriculaId: string;
      nombreCompleto: string;
    }>
  >;

  listarUnidades(cursoSeccionId: string, soloPublicadas: boolean): Promise<UnidadFila[]>;
  findUnidad(unidadId: string): Promise<UnidadFila | null>;
  siguienteOrdenUnidad(cursoSeccionId: string): Promise<number>;
  crearUnidad(datos: NuevaUnidad): Promise<UnidadFila>;
  actualizarUnidad(unidadId: string, datos: Partial<NuevaUnidad>): Promise<UnidadFila>;

  listarMateriales(
    cursoSeccionId: string,
    opciones: { soloPublicados: boolean },
  ): Promise<MaterialFila[]>;
  findMaterial(materialId: string): Promise<MaterialFila | null>;
  siguienteOrdenMaterial(unidadId: string): Promise<number>;
  crearMaterial(datos: NuevoMaterial): Promise<MaterialFila>;
  actualizarMaterial(
    materialId: string,
    datos: Partial<{
      titulo: string;
      descripcion: string | null;
      horarioId: string | null;
      fechaProgramada: string | null;
      visible: boolean;
    }>,
  ): Promise<MaterialFila>;
  publicarMaterial(
    materialId: string,
    contenido: ContenidoMaterial,
    publicadoEn: string,
    actorId: string,
  ): Promise<MaterialFila>;
  reemplazarContenido(
    materialId: string,
    contenido: ContenidoMaterial,
    actorId: string,
  ): Promise<MaterialFila>;
  retirarMaterial(materialId: string): Promise<void>;

  findHorario(horarioId: string): Promise<HorarioBloque | null>;
  bloquesDelCurso(cursoSeccionId: string): Promise<HorarioBloque[]>;
  findSesionDeBloque(horarioId: string, fecha: string): Promise<SesionEnlazada | null>;

  findSolicitudAbierta(materialId: string): Promise<{ id: string } | null>;
  crearSolicitud(datos: {
    materialId: string;
    fechaAnterior: string;
    fechaSolicitada: string;
    motivo: string;
    solicitadoPorId: string;
  }): Promise<{ id: string }>;
  findSolicitud(solicitudId: string): Promise<SolicitudFila | null>;
  listarSolicitudes(filtro: {
    estado?: EstadoSolicitudFecha;
    solicitadoPorId?: string;
    anioAcademicoId?: string;
  }): Promise<SolicitudFila[]>;
  historialCambiosFecha(materialId: string): Promise<CambioFechaHistorial[]>;
  aprobarSolicitud(
    solicitudId: string,
    resueltoPorId: string,
    respuesta: string | null,
  ): Promise<void>;
  rechazarSolicitud(solicitudId: string, resueltoPorId: string, respuesta: string): Promise<void>;

  usuariosConRol(roles: readonly string[]): Promise<string[]>;
  usuariosEstudiantesDeSeccion(seccionId: string, anioAcademicoId: string): Promise<string[]>;
  seguimiento(periodoId: string, hoy: string): Promise<FilaSeguimiento[]>;

  listarTareas(
    cursoSeccionId: string,
    opciones: { soloPublicadas?: boolean; unidadId?: string; periodoId?: string },
  ): Promise<TareaFila[]>;
  findTarea(tareaId: string): Promise<TareaConPreguntas | null>;
  crearTarea(datos: NuevaTarea): Promise<TareaFila>;
  actualizarTarea(tareaId: string, datos: Partial<NuevaTarea>): Promise<TareaFila>;
  publicarTarea(tareaId: string, publicadaEn: string): Promise<TareaFila>;
  cerrarTarea(tareaId: string, cerradaEn: string): Promise<TareaFila>;
  eliminarTarea(tareaId: string): Promise<void>;
  guardarPreguntasTarea(
    tareaId: string,
    preguntas: Array<{
      enunciado: string;
      tipo: TipoPregunta;
      puntaje: number;
      orden: number;
      opciones?: Array<{ texto: string; esCorrecta: boolean; orden: number }>;
    }>,
  ): Promise<void>;

  findEntrega(entregaId: string): Promise<EntregaFila | null>;
  findEntregasDeTarea(tareaId: string): Promise<EntregaFila[]>;
  findEntregasDeEstudiante(tareaId: string, matriculaId: string): Promise<EntregaFila[]>;
  findEntregaActiva(tareaId: string, matriculaId: string): Promise<EntregaFila | null>;
  guardarEntrega(datos: {
    tareaId: string;
    matriculaId: string;
    intento: number;
    iniciadoEn?: string;
    entregadaEn?: string | null;
    texto?: string | null;
    archivoUrl?: string | null;
    archivoNombre?: string | null;
    archivoTamanoBytes?: number | null;
    enlaceUrl?: string | null;
    respuestas?: Record<string, unknown> | null;
    esTardia?: boolean;
    estado?: EstadoEntrega;
    nota?: number | null;
    retroalimentacion?: string | null;
    calificadaPorId?: string | null;
    calificadaEn?: string | null;
  }): Promise<EntregaFila>;
  calificarEntrega(
    entregaId: string,
    datos: {
      nota: number;
      retroalimentacion?: string | null;
      calificadaPorId: string;
      calificadaEn: string;
      respuestas?: Record<string, unknown> | null;
      estado?: EstadoEntrega;
    },
  ): Promise<EntregaFila>;
  devolverEntrega(
    entregaId: string,
    retroalimentacion: string,
    calificadaPorId: string,
  ): Promise<EntregaFila>;

  findMatriculaDeEstudiante(
    seccionId: string,
    estudiantePersonaIdOId: string,
  ): Promise<{ id: string; estudianteId: string; codigo: string; nombreCompleto: string } | null>;
  listarEstudiantesDeSeccion(
    seccionId: string,
  ): Promise<
    Array<{ matriculaId: string; estudianteId: string; codigo: string; nombreCompleto: string }>
  >;
  obtenerPesosVariables(): Promise<Record<TipoTarea, number>>;

  obtenerAnioPorCursoSeccion(
    cursoSeccionId: string,
  ): Promise<{ id: string; anio: number; estado: string } | null>;
  obtenerDocenteUsuarioId(cursoSeccionId: string): Promise<string | null>;
  obtenerMatriculaActivaEstudiante(
    personaId: string,
    seccionId: string,
  ): Promise<{ id: string; estudianteId: string } | null>;
  listarPublicacionesMuro(
    cursoSeccionId: string,
    verOcultos: boolean,
  ): Promise<PublicacionMuroFila[]>;
  obtenerPublicacion(id: string): Promise<PublicacionMuroFila | null>;
  crearPublicacion(datos: {
    cursoSeccionId: string;
    autorId: string;
    contenido?: string | null;
    adjuntoUrl?: string | null;
    fijada?: boolean;
  }): Promise<PublicacionMuroFila>;
  actualizarPublicacion(
    id: string,
    datos: { contenido?: string | null; adjuntoUrl?: string | null },
  ): Promise<PublicacionMuroFila>;
  fijarPublicacion(id: string, fijada: boolean): Promise<PublicacionMuroFila>;
  listarComentarios(publicacionId: string, verOcultos: boolean): Promise<ComentarioMuroFila[]>;
  obtenerComentario(id: string): Promise<ComentarioMuroFila | null>;
  crearComentario(datos: {
    publicacionId: string;
    autorId: string;
    contenido: string;
  }): Promise<ComentarioMuroFila>;
  actualizarComentario(id: string, datos: { contenido: string }): Promise<ComentarioMuroFila>;
  listarMensajesChat(
    cursoSeccionId: string,
    verOcultos: boolean,
    limite?: number,
  ): Promise<MensajeChatFila[]>;
  obtenerMensajeChat(id: string): Promise<MensajeChatFila | null>;
  enviarMensajeChat(datos: {
    cursoSeccionId: string;
    emisorId: string;
    contenido: string;
    adjuntoUrl?: string | null;
  }): Promise<MensajeChatFila>;
  actualizarUltimaLecturaChat(
    cursoSeccionId: string,
    usuarioId: string,
    fecha?: Date,
  ): Promise<void>;
  contarMensajesNoLeidosChat(cursoSeccionId: string, usuarioId: string): Promise<number>;
  ocultarContenido(
    tipo: TipoModeracion,
    id: string,
    ocultadoPorId: string,
    motivo: string,
  ): Promise<void>;
  restaurarContenido(tipo: TipoModeracion, id: string): Promise<void>;
  listarHistorialModeracion(cursoSeccionId: string): Promise<HistorialModeracionFila[]>;
  registrarActividad(datos: {
    matriculaId: string;
    materialId?: string | null;
    tareaId?: string | null;
    accion: AccionActividadAula;
  }): Promise<void>;
  obtenerActividadMaterial(
    materialId: string,
    cursoSeccionId: string,
  ): Promise<ActividadEstudianteMaterial[]>;
  obtenerActividadTarea(
    tareaId: string,
    cursoSeccionId: string,
  ): Promise<ActividadEstudianteTarea[]>;
  findTareasParaVentana(
    desde: string,
    hasta: string,
  ): Promise<
    Array<{
      id: string;
      titulo: string;
      tipo: TipoTarea;
      fechaLimite: string;
      permiteEntregaTardia: boolean;
      cursoSeccionId: string;
      cursoNombre: string;
      seccionNombre: string;
      seccionId: string;
      anioAcademicoId: string;
    }>
  >;
  findEstudiantesSinEntrega(
    tareaId: string,
    seccionId: string,
    anioAcademicoId: string,
  ): Promise<Array<{ usuarioId: string; matriculaId: string }>>;
  yaSeNotifico(usuarioId: string, enlaceUrl: string): Promise<boolean>;
}
