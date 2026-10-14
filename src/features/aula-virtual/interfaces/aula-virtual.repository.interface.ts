import type {
  AccionActividadAula,
  CalculoNotaIntentos,
  EstadoEntrega,
  EstadoSolicitudFecha,
  EstadoTarea,
  RevelarRespuestas,
  TipoMaterial,
  TipoModeracion,
  TipoPregunta,
  TipoTarea,
} from "../constants";

export interface CursoAula {
  id: string;
  docenteId: string | null;
  seccionId: string;
  anioAcademicoId: string;
  cursoNombre: string;
  seccionNombre: string;
}

export interface PeriodoAula {
  id: string;
  anioAcademicoId: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
}

export interface UnidadFila {
  id: string;
  cursoSeccionId: string;
  periodoId: string | null;
  titulo: string;
  descripcion: string | null;
  orden: number;
  fechaInicio: string | null;
  fechaFin: string | null;
  publicada: boolean;
}

export interface MaterialFila {
  id: string;
  unidadId: string;
  cursoSeccionId: string;
  periodoId: string | null;
  docenteId: string;
  titulo: string;
  descripcion: string | null;
  tipo: TipoMaterial;
  url: string | null;
  archivoNombre: string | null;
  archivoTamanoBytes: number | null;
  horarioId: string | null;
  esPlanificado: boolean;
  fechaCongelada: boolean;
  vigente: boolean;
  visible: boolean;
  orden: number;
  fechaProgramada: string | null;
  publicadoEn: string | null;
  sesionClaseId: string | null;
}

export interface HorarioBloque {
  id: string;
  cursoSeccionId: string | null;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  tipoBloque: string;
}

export interface SesionEnlazada {
  id: string;
  fecha: string;
  tema: string | null;
}

export interface NuevaUnidad {
  cursoSeccionId: string;
  periodoId: string;
  titulo: string;
  descripcion: string | null;
  orden: number;
  fechaInicio: string;
  fechaFin: string;
  publicada: boolean;
}

export interface NuevoMaterial {
  unidadId: string;
  docenteId: string;
  titulo: string;
  descripcion: string | null;
  tipo: TipoMaterial;
  horarioId: string | null;
  esPlanificado: boolean;
  fechaCongelada: boolean;
  fechaProgramada: string | null;
  orden: number;
}

export interface ContenidoMaterial {
  url: string;
  archivoNombre: string | null;
  archivoTamanoBytes: number | null;
}

export interface SolicitudFila {
  id: string;
  materialId: string;
  materialTitulo: string;
  cursoSeccionId: string;
  cursoNombre: string;
  seccionNombre: string;
  docenteNombre: string;
  fechaAnterior: string;
  fechaSolicitada: string;
  motivo: string;
  estado: EstadoSolicitudFecha;
  solicitadoPorId: string;
  solicitadoEn: string;
  resueltoEn: string | null;
  respuesta: string | null;
}

export interface CambioFechaHistorial {
  id: string;
  fechaAnterior: string;
  fechaSolicitada: string;
  motivo: string;
  estado: EstadoSolicitudFecha;
  solicitadoEn: string;
  resueltoEn: string | null;
  respuesta: string | null;
}

export interface FilaSeguimiento {
  docenteId: string;
  docenteNombre: string;
  cursoSeccionId: string;
  cursoNombre: string;
  seccionNombre: string;
  planificados: number;
  aTiempo: number;
  fueraDePlazo: number;
  noPublicados: number;
  solicitudesPendientes: number;
}

export interface CursoAulaResumen {
  cursoSeccionId: string;
  cursoNombre: string;
  seccionNombre: string;
  docenteNombre: string | null;
}

export interface IAulaVirtualRepository {
  findDocenteIdPorPersona(personaId: string): Promise<string | null>;
  findCurso(cursoSeccionId: string): Promise<CursoAula | null>;
  findPeriodo(periodoId: string): Promise<PeriodoAula | null>;
  findPeriodoEnCurso(anioAcademicoId: string): Promise<PeriodoAula | null>;
  leerVariableEntera(codigo: string, porDefecto: number): Promise<number>;
  cursosDelDocente(docenteId: string, anioAcademicoId: string): Promise<CursoAulaResumen[]>;
  cursosDelEstudiante(personaId: string, anioAcademicoId: string): Promise<CursoAulaResumen[]>;
  estudianteTieneMatriculaEnSeccion(personaId: string, seccionId: string): Promise<boolean>;

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

  /* === RF-016: Tareas, Entregas y Calificación === */
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

  // RF-017: Interacción y Actividad del Curso
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
    datos: {
      contenido?: string | null;
      adjuntoUrl?: string | null;
    },
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
}

export interface TareaFila {
  id: string;
  cursoSeccionId: string;
  periodoId: string | null;
  unidadId: string | null;
  sesionClaseId: string | null;
  titulo: string;
  instrucciones: string | null;
  tipo: TipoTarea;
  puntajeMaximo: number;
  publicadaEn: string | null;
  fechaLimite: string;
  permiteEntregaTardia: boolean;
  intentosMaximos: number;
  limiteTiempoMinutos: number | null;
  calculoNotaIntentos: CalculoNotaIntentos;
  revelarRespuestas: RevelarRespuestas;
  tiposArchivo: string | null;
  estado: EstadoTarea;
  creadoEn: string;
  actualizadoEn: string;
}

export interface PreguntaConOpciones {
  id: string;
  tareaId: string;
  enunciado: string;
  tipo: TipoPregunta;
  puntaje: number;
  orden: number;
  opciones: Array<{ id: string; texto: string; esCorrecta: boolean; orden: number }>;
}

export interface TareaConPreguntas extends TareaFila {
  preguntas: PreguntaConOpciones[];
}

export interface EntregaFila {
  id: string;
  tareaId: string;
  matriculaId: string;
  estudianteId?: string;
  estudianteNombre?: string;
  intento: number;
  iniciadoEn: string;
  entregadaEn: string | null;
  texto: string | null;
  archivoUrl: string | null;
  archivoNombre: string | null;
  archivoTamanoBytes: number | null;
  enlaceUrl: string | null;
  respuestas: Record<string, unknown> | null;
  esTardia: boolean;
  estado: EstadoEntrega;
  nota: number | null;
  retroalimentacion: string | null;
  calificadaPorId: string | null;
  calificadaEn: string | null;
}

export interface NuevaTarea {
  cursoSeccionId: string;
  periodoId?: string | null;
  unidadId?: string | null;
  sesionClaseId?: string | null;
  titulo: string;
  instrucciones?: string | null;
  tipo: TipoTarea;
  fechaLimite: string;
  permiteEntregaTardia?: boolean;
  intentosMaximos?: number;
  limiteTiempoMinutos?: number | null;
  calculoNotaIntentos?: CalculoNotaIntentos;
  revelarRespuestas?: RevelarRespuestas;
  tiposArchivo?: string | null;
  estado?: EstadoTarea;
}

export interface PublicacionMuroFila {
  id: string;
  cursoSeccionId: string;
  autorId: string;
  autorNombre: string;
  autorRol?: string;
  contenido: string;
  adjuntoUrl: string | null;
  fijada: boolean;
  vigente: boolean;
  creadoEn: string;
  actualizadoEn: string;
  ocultadoPorId: string | null;
  ocultadoEn: string | null;
  motivoOcultamiento: string | null;
  comentariosCount?: number;
}

export interface ComentarioMuroFila {
  id: string;
  publicacionId: string;
  autorId: string;
  autorNombre: string;
  autorRol?: string;
  contenido: string;
  vigente: boolean;
  creadoEn: string;
  actualizadoEn: string;
  ocultadoPorId: string | null;
  ocultadoEn: string | null;
  motivoOcultamiento: string | null;
}

export interface MensajeChatFila {
  id: string;
  cursoSeccionId: string;
  emisorId: string;
  emisorNombre: string;
  emisorRol?: string;
  contenido: string;
  adjuntoUrl: string | null;
  vigente: boolean;
  enviadoEn: string;
  actualizadoEn?: string | null;
  ocultadoPorId: string | null;
  ocultadoEn: string | null;
  motivoOcultamiento: string | null;
}

export interface HistorialModeracionFila {
  id: string;
  tipo: TipoModeracion;
  cursoSeccionId: string;
  contenido: string | null;
  adjuntoUrl: string | null;
  autorNombre: string;
  ocultadoPorNombre: string;
  ocultadoEn: string;
  motivoOcultamiento: string;
}

export interface ActividadEstudianteMaterial {
  matriculaId: string;
  estudianteId: string;
  codigo: string;
  nombreCompleto: string;
  visualizo: boolean;
  visualizoEn: string | null;
  descargo: boolean;
  descargoEn: string | null;
}

export interface ActividadEstudianteTarea {
  matriculaId: string;
  estudianteId: string;
  codigo: string;
  nombreCompleto: string;
  abrio: boolean;
  abrioEn: string | null;
  completo: boolean;
  completoEn: string | null;
}
