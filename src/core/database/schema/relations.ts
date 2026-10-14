import { relations } from "drizzle-orm/relations";
import {
  modulos,
  menus,
  personas,
  usuarios,
  roles,
  rolMenus,
  usuarioRoles,
  sesiones,
  aniosAcademicos,
  periodosAcademicos,
  calendarioEventos,
  cursos,
  planEstudios,
  grados,
  docentes,
  estudiantes,
  apoderados,
  credenciales,
  secciones,
  cursosSeccion,
  horarios,
  matriculas,
  libretas,
  asistenciasEstudiante,
  marcaciones,
  turnos,
  sesionesClase,
  ausenciasSesion,
  evidenciasAusencia,
  consolidadosDocente,
  incidenciasConducta,
  observacionesEstudiante,
  comunicados,
  notificaciones,
  unidadesAprendizaje,
  materiales,
  tareas,
  preguntasTarea,
  opcionesPregunta,
  entregasTarea,
  publicacionesAula,
  comentariosPublicacion,
  mensajesChat,
  chatLecturas,
  actividadAula,
  estudianteApoderados,
  equiposAutorizados,
  variablesSistema,
} from "./tables";

export const modulosRelations = relations(modulos, ({ many }) => ({
  menus: many(menus),
}));

export const menusRelations = relations(menus, ({ one, many }) => ({
  modulo: one(modulos, {
    fields: [menus.moduloId],
    references: [modulos.id],
  }),
  menu: one(menus, {
    fields: [menus.menuPadreId],
    references: [menus.id],
    relationName: "menus_menuPadreId_menus_id",
  }),
  menus: many(menus, {
    relationName: "menus_menuPadreId_menus_id",
  }),
  rolMenus: many(rolMenus),
}));

export const usuariosRelations = relations(usuarios, ({ one, many }) => ({
  persona: one(personas, {
    fields: [usuarios.personaId],
    references: [personas.id],
  }),
  role: one(roles, {
    fields: [usuarios.rolId],
    references: [roles.id],
  }),
  sesiones: many(sesiones),
  calendarioEventos: many(calendarioEventos),
  matriculas: many(matriculas),
  libretas: many(libretas),
  asistenciasEstudiantes: many(asistenciasEstudiante),
  marcaciones: many(marcaciones),
  ausenciasSesions: many(ausenciasSesion),
  consolidadosDocentes: many(consolidadosDocente),
  incidenciasConductas: many(incidenciasConducta),
  observacionesEstudiantes: many(observacionesEstudiante),
  comunicados: many(comunicados),
  notificaciones: many(notificaciones),
  entregasTareas: many(entregasTarea),
  publicacionesAulas: many(publicacionesAula, {
    relationName: "publicacionesAula_autorId_usuarios_id",
  }),
  publicacionesAulas_ocultadoPor: many(publicacionesAula, {
    relationName: "publicacionesAula_ocultadoPorId_usuarios_id",
  }),
  comentariosPublicacions: many(comentariosPublicacion, {
    relationName: "comentariosPublicacion_autorId_usuarios_id",
  }),
  comentariosPublicacions_ocultadoPor: many(comentariosPublicacion, {
    relationName: "comentariosPublicacion_ocultadoPorId_usuarios_id",
  }),
  mensajesChats_emisorId: many(mensajesChat, {
    relationName: "mensajesChat_emisorId_usuarios_id",
  }),
  mensajesChats_receptorId: many(mensajesChat, {
    relationName: "mensajesChat_receptorId_usuarios_id",
  }),
  mensajesChats_ocultadoPorId: many(mensajesChat, {
    relationName: "mensajesChat_ocultadoPorId_usuarios_id",
  }),
  chatLecturas: many(chatLecturas),
  equiposAutorizados: many(equiposAutorizados),
}));

export const equiposAutorizadosRelations = relations(equiposAutorizados, ({ one }) => ({
  autorizadoPor: one(usuarios, {
    fields: [equiposAutorizados.autorizadoPorId],
    references: [usuarios.id],
  }),
}));

export const personasRelations = relations(personas, ({ many }) => ({
  usuarios: many(usuarios),
  docentes: many(docentes),
  estudiantes: many(estudiantes),
  apoderados: many(apoderados),
  credenciales: many(credenciales),
  marcaciones: many(marcaciones),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  usuarios: many(usuarios),
  usuarioRoles: many(usuarioRoles),
  rolMenus: many(rolMenus),
}));

export const rolMenusRelations = relations(rolMenus, ({ one }) => ({
  role: one(roles, {
    fields: [rolMenus.rolId],
    references: [roles.id],
  }),
  menu: one(menus, {
    fields: [rolMenus.menuId],
    references: [menus.id],
  }),
}));

export const sesionesRelations = relations(sesiones, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [sesiones.usuarioId],
    references: [usuarios.id],
  }),
}));

export const periodosAcademicosRelations = relations(periodosAcademicos, ({ one, many }) => ({
  aniosAcademico: one(aniosAcademicos, {
    fields: [periodosAcademicos.anioAcademicoId],
    references: [aniosAcademicos.id],
  }),
  libretas: many(libretas),
  consolidadosDocentes: many(consolidadosDocente),
  incidenciasConductas: many(incidenciasConducta),
  unidadesAprendizajes: many(unidadesAprendizaje),
}));

export const aniosAcademicosRelations = relations(aniosAcademicos, ({ many }) => ({
  periodosAcademicos: many(periodosAcademicos),
  calendarioEventos: many(calendarioEventos),
  secciones: many(secciones),
}));

export const calendarioEventosRelations = relations(calendarioEventos, ({ one }) => ({
  aniosAcademico: one(aniosAcademicos, {
    fields: [calendarioEventos.anioAcademicoId],
    references: [aniosAcademicos.id],
  }),
  usuario: one(usuarios, {
    fields: [calendarioEventos.creadoPorId],
    references: [usuarios.id],
  }),
}));

export const planEstudiosRelations = relations(planEstudios, ({ one }) => ({
  curso: one(cursos, {
    fields: [planEstudios.cursoId],
    references: [cursos.id],
  }),
  grado: one(grados, {
    fields: [planEstudios.gradoId],
    references: [grados.id],
  }),
}));

export const cursosRelations = relations(cursos, ({ many }) => ({
  planEstudios: many(planEstudios),
  cursosSeccions: many(cursosSeccion),
}));

export const gradosRelations = relations(grados, ({ many }) => ({
  planEstudios: many(planEstudios),
  secciones: many(secciones),
  comunicados: many(comunicados),
}));

export const docentesRelations = relations(docentes, ({ one, many }) => ({
  persona: one(personas, {
    fields: [docentes.personaId],
    references: [personas.id],
  }),
  secciones: many(secciones),
  cursosSeccions: many(cursosSeccion),
  sesionesClases: many(sesionesClase),
  consolidadosDocentes: many(consolidadosDocente),
  materiales: many(materiales),
}));

export const estudiantesRelations = relations(estudiantes, ({ one, many }) => ({
  persona: one(personas, {
    fields: [estudiantes.personaId],
    references: [personas.id],
  }),
  matriculas: many(matriculas),
  estudianteApoderados: many(estudianteApoderados),
}));

export const apoderadosRelations = relations(apoderados, ({ one, many }) => ({
  persona: one(personas, {
    fields: [apoderados.personaId],
    references: [personas.id],
  }),
  estudianteApoderados: many(estudianteApoderados),
}));

export const credencialesRelations = relations(credenciales, ({ one, many }) => ({
  persona: one(personas, {
    fields: [credenciales.personaId],
    references: [personas.id],
  }),
  marcaciones: many(marcaciones),
}));

export const seccionesRelations = relations(secciones, ({ one, many }) => ({
  aniosAcademico: one(aniosAcademicos, {
    fields: [secciones.anioAcademicoId],
    references: [aniosAcademicos.id],
  }),
  grado: one(grados, {
    fields: [secciones.gradoId],
    references: [grados.id],
  }),
  docente: one(docentes, {
    fields: [secciones.tutorId],
    references: [docentes.id],
  }),
  cursosSeccions: many(cursosSeccion),
  horarios: many(horarios),
  matriculas: many(matriculas),
  comunicados: many(comunicados),
}));

export const cursosSeccionRelations = relations(cursosSeccion, ({ one, many }) => ({
  curso: one(cursos, {
    fields: [cursosSeccion.cursoId],
    references: [cursos.id],
  }),
  docente: one(docentes, {
    fields: [cursosSeccion.docenteId],
    references: [docentes.id],
  }),
  seccione: one(secciones, {
    fields: [cursosSeccion.seccionId],
    references: [secciones.id],
  }),
  horarios: many(horarios),
  asistenciasEstudiantes: many(asistenciasEstudiante),
  unidadesAprendizajes: many(unidadesAprendizaje),
  tareas: many(tareas),
  publicacionesAulas: many(publicacionesAula),
  mensajesChats: many(mensajesChat),
  chatLecturas: many(chatLecturas),
}));

export const horariosRelations = relations(horarios, ({ one, many }) => ({
  cursosSeccion: one(cursosSeccion, {
    fields: [horarios.cursoSeccionId],
    references: [cursosSeccion.id],
  }),
  seccione: one(secciones, {
    fields: [horarios.seccionId],
    references: [secciones.id],
  }),
  sesionesClases: many(sesionesClase),
}));

export const matriculasRelations = relations(matriculas, ({ one, many }) => ({
  estudiante: one(estudiantes, {
    fields: [matriculas.estudianteId],
    references: [estudiantes.id],
  }),
  usuario: one(usuarios, {
    fields: [matriculas.registradoPorId],
    references: [usuarios.id],
  }),
  seccione: one(secciones, {
    fields: [matriculas.seccionId],
    references: [secciones.id],
  }),
  libretas: many(libretas),
  asistenciasEstudiantes: many(asistenciasEstudiante),
  incidenciasConductas: many(incidenciasConducta),
  observacionesEstudiantes: many(observacionesEstudiante),
  entregasTareas: many(entregasTarea),
  actividadAulas: many(actividadAula),
}));

export const libretasRelations = relations(libretas, ({ one }) => ({
  matricula: one(matriculas, {
    fields: [libretas.matriculaId],
    references: [matriculas.id],
  }),
  periodosAcademico: one(periodosAcademicos, {
    fields: [libretas.periodoId],
    references: [periodosAcademicos.id],
  }),
  usuario: one(usuarios, {
    fields: [libretas.subidoPorId],
    references: [usuarios.id],
  }),
}));

export const asistenciasEstudianteRelations = relations(asistenciasEstudiante, ({ one }) => ({
  cursosSeccion: one(cursosSeccion, {
    fields: [asistenciasEstudiante.cursoSeccionId],
    references: [cursosSeccion.id],
  }),
  matricula: one(matriculas, {
    fields: [asistenciasEstudiante.matriculaId],
    references: [matriculas.id],
  }),
  usuario: one(usuarios, {
    fields: [asistenciasEstudiante.registradoPorId],
    references: [usuarios.id],
  }),
}));

export const marcacionesRelations = relations(marcaciones, ({ one }) => ({
  credenciale: one(credenciales, {
    fields: [marcaciones.credencialId],
    references: [credenciales.id],
  }),
  usuario: one(usuarios, {
    fields: [marcaciones.justificadaPorId],
    references: [usuarios.id],
  }),
  persona: one(personas, {
    fields: [marcaciones.personaId],
    references: [personas.id],
  }),
  turno: one(turnos, {
    fields: [marcaciones.turnoId],
    references: [turnos.id],
  }),
}));

export const turnosRelations = relations(turnos, ({ many }) => ({
  marcaciones: many(marcaciones),
}));

export const sesionesClaseRelations = relations(sesionesClase, ({ one, many }) => ({
  docente: one(docentes, {
    fields: [sesionesClase.docenteId],
    references: [docentes.id],
  }),
  horario: one(horarios, {
    fields: [sesionesClase.horarioId],
    references: [horarios.id],
  }),
  ausenciasSesions: many(ausenciasSesion),
  notificaciones: many(notificaciones),
  materiales: many(materiales),
  tareas: many(tareas),
}));

export const ausenciasSesionRelations = relations(ausenciasSesion, ({ one, many }) => ({
  usuario: one(usuarios, {
    fields: [ausenciasSesion.registradoPorId],
    references: [usuarios.id],
  }),
  sesionesClase: one(sesionesClase, {
    fields: [ausenciasSesion.sesionClaseId],
    references: [sesionesClase.id],
  }),
  evidenciasAusencias: many(evidenciasAusencia),
}));

export const evidenciasAusenciaRelations = relations(evidenciasAusencia, ({ one }) => ({
  ausenciasSesion: one(ausenciasSesion, {
    fields: [evidenciasAusencia.ausenciaId],
    references: [ausenciasSesion.id],
  }),
}));

export const consolidadosDocenteRelations = relations(consolidadosDocente, ({ one }) => ({
  docente: one(docentes, {
    fields: [consolidadosDocente.docenteId],
    references: [docentes.id],
  }),
  usuario: one(usuarios, {
    fields: [consolidadosDocente.generadoPorId],
    references: [usuarios.id],
  }),
  periodosAcademico: one(periodosAcademicos, {
    fields: [consolidadosDocente.periodoId],
    references: [periodosAcademicos.id],
  }),
}));

export const incidenciasConductaRelations = relations(incidenciasConducta, ({ one }) => ({
  matricula: one(matriculas, {
    fields: [incidenciasConducta.matriculaId],
    references: [matriculas.id],
  }),
  periodosAcademico: one(periodosAcademicos, {
    fields: [incidenciasConducta.periodoId],
    references: [periodosAcademicos.id],
  }),
  usuario: one(usuarios, {
    fields: [incidenciasConducta.registradoPorId],
    references: [usuarios.id],
  }),
}));

export const observacionesEstudianteRelations = relations(observacionesEstudiante, ({ one }) => ({
  matricula: one(matriculas, {
    fields: [observacionesEstudiante.matriculaId],
    references: [matriculas.id],
  }),
  usuario: one(usuarios, {
    fields: [observacionesEstudiante.registradoPorId],
    references: [usuarios.id],
  }),
}));

export const comunicadosRelations = relations(comunicados, ({ one, many }) => ({
  usuario: one(usuarios, {
    fields: [comunicados.autorId],
    references: [usuarios.id],
  }),
  grado: one(grados, {
    fields: [comunicados.gradoId],
    references: [grados.id],
  }),
  seccione: one(secciones, {
    fields: [comunicados.seccionId],
    references: [secciones.id],
  }),
  notificaciones: many(notificaciones),
}));

export const notificacionesRelations = relations(notificaciones, ({ one }) => ({
  comunicado: one(comunicados, {
    fields: [notificaciones.comunicadoId],
    references: [comunicados.id],
  }),
  sesionesClase: one(sesionesClase, {
    fields: [notificaciones.sesionClaseId],
    references: [sesionesClase.id],
  }),
  usuario: one(usuarios, {
    fields: [notificaciones.usuarioId],
    references: [usuarios.id],
  }),
}));

export const unidadesAprendizajeRelations = relations(unidadesAprendizaje, ({ one, many }) => ({
  cursosSeccion: one(cursosSeccion, {
    fields: [unidadesAprendizaje.cursoSeccionId],
    references: [cursosSeccion.id],
  }),
  periodosAcademico: one(periodosAcademicos, {
    fields: [unidadesAprendizaje.periodoId],
    references: [periodosAcademicos.id],
  }),
  materiales: many(materiales),
  tareas: many(tareas),
}));

export const materialesRelations = relations(materiales, ({ one, many }) => ({
  docente: one(docentes, {
    fields: [materiales.publicadoPorId],
    references: [docentes.id],
  }),
  sesionesClase: one(sesionesClase, {
    fields: [materiales.sesionClaseId],
    references: [sesionesClase.id],
  }),
  unidadesAprendizaje: one(unidadesAprendizaje, {
    fields: [materiales.unidadId],
    references: [unidadesAprendizaje.id],
  }),
  actividadAulas: many(actividadAula),
}));

export const tareasRelations = relations(tareas, ({ one, many }) => ({
  cursosSeccion: one(cursosSeccion, {
    fields: [tareas.cursoSeccionId],
    references: [cursosSeccion.id],
  }),
  sesionesClase: one(sesionesClase, {
    fields: [tareas.sesionClaseId],
    references: [sesionesClase.id],
  }),
  unidadesAprendizaje: one(unidadesAprendizaje, {
    fields: [tareas.unidadId],
    references: [unidadesAprendizaje.id],
  }),
  preguntasTareas: many(preguntasTarea),
  entregasTareas: many(entregasTarea),
  actividadAulas: many(actividadAula),
}));

export const preguntasTareaRelations = relations(preguntasTarea, ({ one, many }) => ({
  tarea: one(tareas, {
    fields: [preguntasTarea.tareaId],
    references: [tareas.id],
  }),
  opcionesPreguntas: many(opcionesPregunta),
}));

export const opcionesPreguntaRelations = relations(opcionesPregunta, ({ one }) => ({
  preguntasTarea: one(preguntasTarea, {
    fields: [opcionesPregunta.preguntaId],
    references: [preguntasTarea.id],
  }),
}));

export const entregasTareaRelations = relations(entregasTarea, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [entregasTarea.calificadaPorId],
    references: [usuarios.id],
  }),
  matricula: one(matriculas, {
    fields: [entregasTarea.matriculaId],
    references: [matriculas.id],
  }),
  tarea: one(tareas, {
    fields: [entregasTarea.tareaId],
    references: [tareas.id],
  }),
}));

export const publicacionesAulaRelations = relations(publicacionesAula, ({ one, many }) => ({
  usuario: one(usuarios, {
    fields: [publicacionesAula.autorId],
    references: [usuarios.id],
    relationName: "publicacionesAula_autorId_usuarios_id",
  }),
  ocultadoPor: one(usuarios, {
    fields: [publicacionesAula.ocultadoPorId],
    references: [usuarios.id],
    relationName: "publicacionesAula_ocultadoPorId_usuarios_id",
  }),
  cursosSeccion: one(cursosSeccion, {
    fields: [publicacionesAula.cursoSeccionId],
    references: [cursosSeccion.id],
  }),
  comentariosPublicacions: many(comentariosPublicacion),
}));

export const comentariosPublicacionRelations = relations(comentariosPublicacion, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [comentariosPublicacion.autorId],
    references: [usuarios.id],
    relationName: "comentariosPublicacion_autorId_usuarios_id",
  }),
  ocultadoPor: one(usuarios, {
    fields: [comentariosPublicacion.ocultadoPorId],
    references: [usuarios.id],
    relationName: "comentariosPublicacion_ocultadoPorId_usuarios_id",
  }),
  publicacionesAula: one(publicacionesAula, {
    fields: [comentariosPublicacion.publicacionId],
    references: [publicacionesAula.id],
  }),
}));

export const mensajesChatRelations = relations(mensajesChat, ({ one }) => ({
  cursosSeccion: one(cursosSeccion, {
    fields: [mensajesChat.cursoSeccionId],
    references: [cursosSeccion.id],
  }),
  usuario_emisorId: one(usuarios, {
    fields: [mensajesChat.emisorId],
    references: [usuarios.id],
    relationName: "mensajesChat_emisorId_usuarios_id",
  }),
  usuario_receptorId: one(usuarios, {
    fields: [mensajesChat.receptorId],
    references: [usuarios.id],
    relationName: "mensajesChat_receptorId_usuarios_id",
  }),
  usuario_ocultadoPorId: one(usuarios, {
    fields: [mensajesChat.ocultadoPorId],
    references: [usuarios.id],
    relationName: "mensajesChat_ocultadoPorId_usuarios_id",
  }),
}));

export const chatLecturasRelations = relations(chatLecturas, ({ one }) => ({
  cursosSeccion: one(cursosSeccion, {
    fields: [chatLecturas.cursoSeccionId],
    references: [cursosSeccion.id],
  }),
  usuario: one(usuarios, {
    fields: [chatLecturas.usuarioId],
    references: [usuarios.id],
  }),
}));

export const actividadAulaRelations = relations(actividadAula, ({ one }) => ({
  materiale: one(materiales, {
    fields: [actividadAula.materialId],
    references: [materiales.id],
  }),
  matricula: one(matriculas, {
    fields: [actividadAula.matriculaId],
    references: [matriculas.id],
  }),
  tarea: one(tareas, {
    fields: [actividadAula.tareaId],
    references: [tareas.id],
  }),
}));

export const estudianteApoderadosRelations = relations(estudianteApoderados, ({ one }) => ({
  apoderado: one(apoderados, {
    fields: [estudianteApoderados.apoderadoId],
    references: [apoderados.id],
  }),
  estudiante: one(estudiantes, {
    fields: [estudianteApoderados.estudianteId],
    references: [estudiantes.id],
  }),
}));

export const variablesSistemaRelations = relations(variablesSistema, ({ one }) => ({
  actualizadoPor: one(usuarios, {
    fields: [variablesSistema.actualizadoPorId],
    references: [usuarios.id],
  }),
}));
