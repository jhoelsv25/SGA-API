import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, inArray, isNull, ne, sql, type SQL } from "drizzle-orm";
import { alias, type PgUpdateSetSource } from "drizzle-orm/pg-core";
import { Database, DRIZZLE } from "../../../core/database";
import {
  alertasSesionEnviadas,
  aniosAcademicos,
  cursos,
  cursosSeccion,
  docentes,
  grados,
  horarios,
  instrumentosObservacion,
  menus,
  observacionesAula,
  observacionesAulaArchivos,
  observacionesAulaCalificaciones,
  observacionesAulaCambios,
  observacionesAulaComentarios,
  observacionesAulaCompromisos,
  observacionesAulaNotas,
  periodosAcademicos,
  personas,
  rolMenus,
  roles,
  secciones,
  sesionesClase,
  usuarioRoles,
  usuarios,
  variablesSistema,
} from "../../../core/database/schema";
import type { EstadoObservacion } from "../constants";
import type {
  ArchivoFila,
  CalificacionFila,
  CambioFila,
  ComentarioFila,
  CompromisoObsFila,
  FiltrosObservacion,
  InstrumentoContenido,
  InstrumentoFila,
  NotaFila,
  ObservacionFila,
} from "../interfaces";

const personaDocente = alias(personas, "persona_docente");
const personaObservador = alias(personas, "persona_observador");

const nombre = (p: { nombres: unknown; apellidoPaterno: unknown; apellidoMaterno: unknown }) =>
  sql<string>`concat_ws(' ', ${p.nombres}, ${p.apellidoPaterno}, ${p.apellidoMaterno})`;
const texto = (columna: unknown) => sql<string>`${columna}::text`;
const textoNulo = (columna: unknown) => sql<string | null>`${columna}::text`;

const camposObservacion = {
  id: observacionesAula.id,
  docenteId: observacionesAula.docenteId,
  docentePersonaId: docentes.personaId,
  docenteNombre: nombre(personaDocente),
  docenteApellido: personaDocente.apellidoPaterno,
  docenteDocumento: personaDocente.numeroDocumento,
  cursoSeccionId: observacionesAula.cursoSeccionId,
  cursoNombre: cursos.nombre,
  seccionNombre: secciones.nombre,
  gradoNombre: grados.nombre,
  horarioId: observacionesAula.horarioId,
  sesionClaseId: observacionesAula.sesionClaseId,
  periodoId: observacionesAula.periodoId,
  periodoNombre: periodosAcademicos.nombre,
  periodoEstado: periodosAcademicos.estado,
  observadorUsuarioId: observacionesAula.observadorUsuarioId,
  observadorPersonaId: usuarios.personaId,
  observadorNombre: nombre(personaObservador),
  instrumentoId: observacionesAula.instrumentoId,
  observacionAnteriorId: observacionesAula.observacionAnteriorId,
  fecha: texto(observacionesAula.fecha),
  horaInicioProgramada: texto(observacionesAula.horaInicioProgramada),
  horaFinProgramada: texto(observacionesAula.horaFinProgramada),
  estado: sql<EstadoObservacion>`${observacionesAula.estado}`,
  avisadoEn: textoNulo(observacionesAula.avisadoEn),
  horaInicioReal: textoNulo(observacionesAula.horaInicioReal),
  horaFinReal: textoNulo(observacionesAula.horaFinReal),
  minutosTotales: observacionesAula.minutosTotales,
  estudiantesPresentes: observacionesAula.estudiantesPresentes,
  retroFecha: textoNulo(observacionesAula.retroFecha),
  retroHoraInicio: textoNulo(observacionesAula.retroHoraInicio),
  retroHoraFin: textoNulo(observacionesAula.retroHoraFin),
  retroResumen: observacionesAula.retroResumen,
  retroalimentadaEn: textoNulo(observacionesAula.retroalimentadaEn),
  enteradoEn: textoNulo(observacionesAula.enteradoEn),
  motivoCancelacion: observacionesAula.motivoCancelacion,
  creadoEn: texto(observacionesAula.creadoEn),
};

export interface DatosNuevaObservacion {
  docenteId: string;
  cursoSeccionId: string;
  horarioId: string;
  sesionClaseId: string | null;
  periodoId: string;
  observadorUsuarioId: string;
  instrumentoId: string;
  observacionAnteriorId: string | null;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  creadoPorId: string;
}

export interface BloqueHorario {
  id: string;
  horaInicio: string;
  horaFin: string;
}

@Injectable()
export class ObservacionesAulaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // ---------------------------------------------------------------- consulta base
  private consulta() {
    return this.db
      .select(camposObservacion)
      .from(observacionesAula)
      .innerJoin(docentes, eq(docentes.id, observacionesAula.docenteId))
      .innerJoin(personaDocente, eq(personaDocente.id, docentes.personaId))
      .innerJoin(cursosSeccion, eq(cursosSeccion.id, observacionesAula.cursoSeccionId))
      .innerJoin(cursos, eq(cursos.id, cursosSeccion.cursoId))
      .innerJoin(secciones, eq(secciones.id, cursosSeccion.seccionId))
      .innerJoin(grados, eq(grados.id, secciones.gradoId))
      .innerJoin(periodosAcademicos, eq(periodosAcademicos.id, observacionesAula.periodoId))
      .innerJoin(usuarios, eq(usuarios.id, observacionesAula.observadorUsuarioId))
      .innerJoin(personaObservador, eq(personaObservador.id, usuarios.personaId));
  }

  async obtener(id: string): Promise<ObservacionFila | null> {
    const [fila] = await this.consulta().where(eq(observacionesAula.id, id)).limit(1);
    return fila ?? null;
  }

  async listar(filtros: FiltrosObservacion): Promise<ObservacionFila[]> {
    const condiciones: SQL[] = [];
    if (filtros.docenteId) condiciones.push(eq(observacionesAula.docenteId, filtros.docenteId));
    if (filtros.estado) condiciones.push(eq(observacionesAula.estado, filtros.estado));
    if (filtros.periodoId) condiciones.push(eq(observacionesAula.periodoId, filtros.periodoId));
    if (filtros.anioAcademicoId) {
      condiciones.push(eq(periodosAcademicos.anioAcademicoId, filtros.anioAcademicoId));
    }
    if (filtros.desde) condiciones.push(sql`${observacionesAula.fecha} >= ${filtros.desde}::date`);
    if (filtros.hasta) condiciones.push(sql`${observacionesAula.fecha} <= ${filtros.hasta}::date`);
    return await this.consulta()
      .where(condiciones.length ? and(...condiciones) : undefined)
      .orderBy(desc(observacionesAula.fecha), asc(observacionesAula.horaInicioProgramada));
  }

  /** Observaciones del docente visibles para él: solo las retroalimentadas y las programadas. */
  async listarDelDocente(docenteId: string): Promise<ObservacionFila[]> {
    return await this.consulta()
      .where(
        and(
          eq(observacionesAula.docenteId, docenteId),
          inArray(observacionesAula.estado, ["programada", "retroalimentada"]),
        ),
      )
      .orderBy(desc(observacionesAula.fecha));
  }

  async crear(datos: DatosNuevaObservacion): Promise<string> {
    const [fila] = await this.db
      .insert(observacionesAula)
      .values({
        docenteId: datos.docenteId,
        cursoSeccionId: datos.cursoSeccionId,
        horarioId: datos.horarioId,
        sesionClaseId: datos.sesionClaseId,
        periodoId: datos.periodoId,
        observadorUsuarioId: datos.observadorUsuarioId,
        instrumentoId: datos.instrumentoId,
        observacionAnteriorId: datos.observacionAnteriorId,
        fecha: datos.fecha,
        horaInicioProgramada: datos.horaInicio,
        horaFinProgramada: datos.horaFin,
        creadoPorId: datos.creadoPorId,
        avisadoEn: sql`CURRENT_TIMESTAMP`,
      })
      .returning({ id: observacionesAula.id });
    return fila.id;
  }

  async actualizar(id: string, cambios: PgUpdateSetSource<typeof observacionesAula>) {
    await this.db
      .update(observacionesAula)
      .set({ ...cambios, actualizadoEn: sql`CURRENT_TIMESTAMP` })
      .where(eq(observacionesAula.id, id));
  }

  /** Marca la observación como notas cerradas, ya con la duración y la hora de fin. */
  async cerrarNotas(id: string, horaFin: string, minutos: number) {
    await this.actualizar(id, {
      estado: "notas_cerradas",
      horaFinReal: horaFin,
      minutosTotales: minutos,
      notasCerradasEn: sql`CURRENT_TIMESTAMP`,
    });
  }

  // ---------------------------------------------------------------- referencias
  async obtenerDocente(docenteId: string) {
    const [fila] = await this.db
      .select({ id: docentes.id, personaId: docentes.personaId })
      .from(docentes)
      .where(and(eq(docentes.id, docenteId), isNull(docentes.eliminadoEn)))
      .limit(1);
    return fila ?? null;
  }

  async obtenerDocenteDePersona(personaId: string) {
    const [fila] = await this.db
      .select({ id: docentes.id })
      .from(docentes)
      .where(and(eq(docentes.personaId, personaId), isNull(docentes.eliminadoEn)))
      .limit(1);
    return fila ?? null;
  }

  async obtenerCursoSeccion(id: string) {
    const [fila] = await this.db
      .select({ id: cursosSeccion.id, docenteId: cursosSeccion.docenteId })
      .from(cursosSeccion)
      .where(eq(cursosSeccion.id, id))
      .limit(1);
    return fila ?? null;
  }

  async bloquesDelCurso(cursoSeccionId: string, diaSemana: number): Promise<BloqueHorario[]> {
    return await this.db
      .select({
        id: horarios.id,
        horaInicio: texto(horarios.horaInicio),
        horaFin: texto(horarios.horaFin),
      })
      .from(horarios)
      .where(
        and(
          eq(horarios.cursoSeccionId, cursoSeccionId),
          eq(horarios.diaSemana, diaSemana),
          eq(horarios.tipoBloque, "clase"),
        ),
      )
      .orderBy(asc(horarios.horaInicio));
  }

  async periodoDeFecha(fecha: string) {
    const [fila] = await this.db
      .select({
        id: periodosAcademicos.id,
        estado: periodosAcademicos.estado,
        anioAcademicoId: periodosAcademicos.anioAcademicoId,
        nombre: periodosAcademicos.nombre,
      })
      .from(periodosAcademicos)
      .where(
        and(
          sql`${periodosAcademicos.fechaInicio} <= ${fecha}::date`,
          sql`${periodosAcademicos.fechaFin} >= ${fecha}::date`,
        ),
      )
      .limit(1);
    return fila ?? null;
  }

  async sesionDeHorario(horarioId: string, fecha: string): Promise<string | null> {
    const [fila] = await this.db
      .select({ id: sesionesClase.id })
      .from(sesionesClase)
      .where(and(eq(sesionesClase.horarioId, horarioId), eq(sesionesClase.fecha, fecha)))
      .limit(1);
    return fila?.id ?? null;
  }

  async anioEnCurso(): Promise<string | null> {
    const [fila] = await this.db
      .select({ id: aniosAcademicos.id })
      .from(aniosAcademicos)
      .where(inArray(aniosAcademicos.estado, ["en_curso", "reabierto"]))
      .orderBy(desc(aniosAcademicos.anio))
      .limit(1);
    return fila?.id ?? null;
  }

  async valoresVariables(codigos: readonly string[]): Promise<Map<string, string>> {
    const filas = await this.db
      .select({ codigo: variablesSistema.codigo, valor: variablesSistema.valor })
      .from(variablesSistema)
      .where(
        and(inArray(variablesSistema.codigo, [...codigos]), eq(variablesSistema.vigente, true)),
      );
    return new Map(filas.map((f) => [f.codigo, f.valor]));
  }

  // ---------------------------------------------------------------- usuarios
  async usuarioDeDocente(docenteId: string): Promise<string | null> {
    const [fila] = await this.db
      .select({ id: usuarios.id })
      .from(docentes)
      .innerJoin(usuarios, eq(usuarios.personaId, docentes.personaId))
      .where(and(eq(docentes.id, docenteId), eq(usuarios.estado, "activo")))
      .limit(1);
    return fila?.id ?? null;
  }

  async obtenerUsuario(usuarioId: string) {
    const [fila] = await this.db
      .select({ id: usuarios.id, personaId: usuarios.personaId, estado: usuarios.estado })
      .from(usuarios)
      .where(and(eq(usuarios.id, usuarioId), isNull(usuarios.eliminadoEn)))
      .limit(1);
    return fila ?? null;
  }

  /** El usuario tiene, en alguno de sus roles vigentes, la opción de menú (o es Administrador). */
  async usuarioTieneOpcion(usuarioId: string, ruta: string): Promise<boolean> {
    const [fila] = await this.db
      .select({ id: usuarioRoles.id })
      .from(usuarioRoles)
      .innerJoin(roles, eq(roles.id, usuarioRoles.rolId))
      .leftJoin(rolMenus, eq(rolMenus.rolId, roles.id))
      .leftJoin(menus, eq(menus.id, rolMenus.menuId))
      .where(
        and(
          eq(usuarioRoles.usuarioId, usuarioId),
          eq(usuarioRoles.vigente, true),
          sql`(${roles.nombre} = 'Administrador' OR ${menus.ruta} = ${ruta})`,
        ),
      )
      .limit(1);
    return Boolean(fila);
  }

  /** Usuarios activos con la opción de menú, para avisos (sin repetir). */
  async usuariosConOpcion(ruta: string): Promise<string[]> {
    const filas = await this.db
      .selectDistinct({ id: usuarios.id })
      .from(usuarios)
      .innerJoin(usuarioRoles, eq(usuarioRoles.usuarioId, usuarios.id))
      .innerJoin(rolMenus, eq(rolMenus.rolId, usuarioRoles.rolId))
      .innerJoin(menus, eq(menus.id, rolMenus.menuId))
      .where(
        and(
          eq(menus.ruta, ruta),
          eq(usuarioRoles.vigente, true),
          eq(usuarios.estado, "activo"),
          isNull(usuarios.eliminadoEn),
        ),
      );
    return filas.map((f) => f.id);
  }

  async usuarioActivo(usuarioId: string): Promise<boolean> {
    const u = await this.obtenerUsuario(usuarioId);
    return Boolean(u && u.estado === "activo");
  }

  async registrarAlertaEnviada(clave: string): Promise<boolean> {
    const filas = await this.db
      .insert(alertasSesionEnviadas)
      .values({ clave })
      .onConflictDoNothing()
      .returning({ clave: alertasSesionEnviadas.clave });
    return filas.length === 1;
  }

  // ---------------------------------------------------------------- cruces
  /** Observaciones activas del observador ese día que se cruzan con el horario dado. */
  async observacionesDelObservador(
    observadorUsuarioId: string,
    fecha: string,
    excluirId?: string,
  ): Promise<Array<{ id: string; horaInicio: string; horaFin: string }>> {
    const condiciones = [
      eq(observacionesAula.observadorUsuarioId, observadorUsuarioId),
      eq(observacionesAula.fecha, fecha),
      ne(observacionesAula.estado, "cancelada"),
    ];
    if (excluirId) condiciones.push(ne(observacionesAula.id, excluirId));
    return await this.db
      .select({
        id: observacionesAula.id,
        horaInicio: texto(observacionesAula.horaInicioProgramada),
        horaFin: texto(observacionesAula.horaFinProgramada),
      })
      .from(observacionesAula)
      .where(and(...condiciones));
  }

  // ---------------------------------------------------------------- cambios
  async registrarCambio(datos: {
    observacionId: string;
    tipo: "reprogramacion" | "cancelacion";
    fechaAnterior: string;
    horaAnterior: string;
    fechaNueva?: string;
    horaNueva?: string;
    motivo: string;
    usuarioId: string;
  }) {
    await this.db.insert(observacionesAulaCambios).values({
      observacionId: datos.observacionId,
      tipo: datos.tipo,
      fechaAnterior: datos.fechaAnterior,
      horaAnterior: datos.horaAnterior,
      fechaNueva: datos.fechaNueva ?? null,
      horaNueva: datos.horaNueva ?? null,
      motivo: datos.motivo,
      usuarioId: datos.usuarioId,
    });
  }

  async cambios(observacionId: string): Promise<CambioFila[]> {
    return await this.db
      .select({
        id: observacionesAulaCambios.id,
        tipo: sql<"reprogramacion" | "cancelacion">`${observacionesAulaCambios.tipo}`,
        fechaAnterior: textoNulo(observacionesAulaCambios.fechaAnterior),
        horaAnterior: textoNulo(observacionesAulaCambios.horaAnterior),
        fechaNueva: textoNulo(observacionesAulaCambios.fechaNueva),
        horaNueva: textoNulo(observacionesAulaCambios.horaNueva),
        motivo: observacionesAulaCambios.motivo,
        usuarioId: observacionesAulaCambios.usuarioId,
        creadoEn: texto(observacionesAulaCambios.creadoEn),
      })
      .from(observacionesAulaCambios)
      .where(eq(observacionesAulaCambios.observacionId, observacionId))
      .orderBy(asc(observacionesAulaCambios.creadoEn));
  }

  // ---------------------------------------------------------------- notas
  private readonly camposNota = {
    id: observacionesAulaNotas.id,
    observacionId: observacionesAulaNotas.observacionId,
    desempeno: observacionesAulaNotas.desempeno,
    aspecto: observacionesAulaNotas.aspecto,
    texto: observacionesAulaNotas.texto,
    horaAproximada: textoNulo(observacionesAulaNotas.horaAproximada),
    creadoEn: texto(observacionesAulaNotas.creadoEn),
  };

  async agregarNota(datos: {
    observacionId: string;
    desempeno: number;
    aspecto?: string;
    texto: string;
    horaAproximada?: string;
  }): Promise<NotaFila> {
    const [fila] = await this.db
      .insert(observacionesAulaNotas)
      .values({
        observacionId: datos.observacionId,
        desempeno: datos.desempeno,
        aspecto: datos.aspecto ?? null,
        texto: datos.texto,
        horaAproximada: datos.horaAproximada ?? null,
      })
      .returning({ id: observacionesAulaNotas.id });
    return (await this.obtenerNota(fila.id)) as NotaFila;
  }

  async obtenerNota(id: string): Promise<NotaFila | null> {
    const [fila] = await this.db
      .select(this.camposNota)
      .from(observacionesAulaNotas)
      .where(eq(observacionesAulaNotas.id, id))
      .limit(1);
    return fila ?? null;
  }

  async editarNota(id: string, textoNuevo: string) {
    await this.db
      .update(observacionesAulaNotas)
      .set({ texto: textoNuevo, actualizadoEn: sql`CURRENT_TIMESTAMP` })
      .where(eq(observacionesAulaNotas.id, id));
  }

  async notas(observacionId: string): Promise<NotaFila[]> {
    return await this.db
      .select(this.camposNota)
      .from(observacionesAulaNotas)
      .where(eq(observacionesAulaNotas.observacionId, observacionId))
      .orderBy(asc(observacionesAulaNotas.desempeno), asc(observacionesAulaNotas.creadoEn));
  }

  // ---------------------------------------------------------------- calificaciones
  private readonly camposCalificacion = {
    id: observacionesAulaCalificaciones.id,
    observacionId: observacionesAulaCalificaciones.observacionId,
    desempeno: observacionesAulaCalificaciones.desempeno,
    nivel: sql<1 | 2 | 3 | 4>`${observacionesAulaCalificaciones.nivel}`,
    fundamento: observacionesAulaCalificaciones.fundamento,
    version: observacionesAulaCalificaciones.version,
    vigente: observacionesAulaCalificaciones.vigente,
    motivoCambio: observacionesAulaCalificaciones.motivoCambio,
    creadoPorId: observacionesAulaCalificaciones.creadoPorId,
    creadoEn: texto(observacionesAulaCalificaciones.creadoEn),
  };

  async calificacionesVigentes(observacionId: string): Promise<CalificacionFila[]> {
    return await this.db
      .select(this.camposCalificacion)
      .from(observacionesAulaCalificaciones)
      .where(
        and(
          eq(observacionesAulaCalificaciones.observacionId, observacionId),
          eq(observacionesAulaCalificaciones.vigente, true),
        ),
      )
      .orderBy(asc(observacionesAulaCalificaciones.desempeno));
  }

  async historialCalificaciones(observacionId: string): Promise<CalificacionFila[]> {
    return await this.db
      .select(this.camposCalificacion)
      .from(observacionesAulaCalificaciones)
      .where(eq(observacionesAulaCalificaciones.observacionId, observacionId))
      .orderBy(
        asc(observacionesAulaCalificaciones.desempeno),
        desc(observacionesAulaCalificaciones.version),
      );
  }

  /** Borrador: se edita en el lugar mientras la calificación no esté cerrada (sin versión). */
  async guardarBorrador(
    observacionId: string,
    desempeno: number,
    nivel: number,
    fundamento: string,
    usuarioId: string,
  ) {
    const [existente] = await this.db
      .select({ id: observacionesAulaCalificaciones.id })
      .from(observacionesAulaCalificaciones)
      .where(
        and(
          eq(observacionesAulaCalificaciones.observacionId, observacionId),
          eq(observacionesAulaCalificaciones.desempeno, desempeno),
          eq(observacionesAulaCalificaciones.vigente, true),
        ),
      )
      .limit(1);
    if (existente) {
      await this.db
        .update(observacionesAulaCalificaciones)
        .set({ nivel, fundamento, creadoPorId: usuarioId })
        .where(eq(observacionesAulaCalificaciones.id, existente.id));
      return;
    }
    await this.db
      .insert(observacionesAulaCalificaciones)
      .values({ observacionId, desempeno, nivel, fundamento, creadoPorId: usuarioId });
  }

  /** Corrección posterior al cierre: versión nueva vigente; la anterior queda con vigencia 0. */
  async nuevaVersionCalificacion(
    vigente: CalificacionFila,
    cambios: { nivel: number; fundamento: string },
    motivo: string,
    usuarioId: string,
  ): Promise<number> {
    return await this.db.transaction(async (tx) => {
      await tx
        .update(observacionesAulaCalificaciones)
        .set({ vigente: false })
        .where(eq(observacionesAulaCalificaciones.id, vigente.id));
      await tx.insert(observacionesAulaCalificaciones).values({
        observacionId: vigente.observacionId,
        desempeno: vigente.desempeno,
        nivel: cambios.nivel,
        fundamento: cambios.fundamento,
        version: vigente.version + 1,
        motivoCambio: motivo,
        creadoPorId: usuarioId,
      });
      return vigente.version + 1;
    });
  }

  // ---------------------------------------------------------------- compromisos
  private readonly camposCompromiso = {
    id: observacionesAulaCompromisos.id,
    compromisoId: observacionesAulaCompromisos.compromisoId,
    observacionId: observacionesAulaCompromisos.observacionId,
    desempeno: observacionesAulaCompromisos.desempeno,
    descripcion: observacionesAulaCompromisos.descripcion,
    fechaRevision: texto(observacionesAulaCompromisos.fechaRevision),
    estado: sql<"pendiente" | "cumplido" | "no_cumplido">`${observacionesAulaCompromisos.estado}`,
    observacionCierre: observacionesAulaCompromisos.observacionCierre,
    cerradoEn: textoNulo(observacionesAulaCompromisos.cerradoEn),
    version: observacionesAulaCompromisos.version,
    vigente: observacionesAulaCompromisos.vigente,
    motivoCambio: observacionesAulaCompromisos.motivoCambio,
    creadoPorId: observacionesAulaCompromisos.creadoPorId,
    creadoEn: texto(observacionesAulaCompromisos.creadoEn),
  };

  async crearCompromiso(datos: {
    observacionId: string;
    desempeno: number;
    descripcion: string;
    fechaRevision: string;
    creadoPorId: string;
  }): Promise<CompromisoObsFila> {
    const id = randomUUID();
    await this.db.insert(observacionesAulaCompromisos).values({
      id,
      compromisoId: id,
      observacionId: datos.observacionId,
      desempeno: datos.desempeno,
      descripcion: datos.descripcion,
      fechaRevision: datos.fechaRevision,
      creadoPorId: datos.creadoPorId,
    });
    return (await this.obtenerCompromisoFila(id)) as CompromisoObsFila;
  }

  async obtenerCompromisoFila(id: string): Promise<CompromisoObsFila | null> {
    const [fila] = await this.db
      .select(this.camposCompromiso)
      .from(observacionesAulaCompromisos)
      .where(eq(observacionesAulaCompromisos.id, id))
      .limit(1);
    return fila ?? null;
  }

  async compromisoVigente(compromisoId: string): Promise<CompromisoObsFila | null> {
    const [fila] = await this.db
      .select(this.camposCompromiso)
      .from(observacionesAulaCompromisos)
      .where(
        and(
          eq(observacionesAulaCompromisos.compromisoId, compromisoId),
          eq(observacionesAulaCompromisos.vigente, true),
        ),
      )
      .limit(1);
    return fila ?? null;
  }

  async compromisosVigentes(observacionId: string): Promise<CompromisoObsFila[]> {
    return await this.db
      .select(this.camposCompromiso)
      .from(observacionesAulaCompromisos)
      .where(
        and(
          eq(observacionesAulaCompromisos.observacionId, observacionId),
          eq(observacionesAulaCompromisos.vigente, true),
        ),
      )
      .orderBy(asc(observacionesAulaCompromisos.fechaRevision));
  }

  async historialCompromisos(observacionId: string): Promise<CompromisoObsFila[]> {
    return await this.db
      .select(this.camposCompromiso)
      .from(observacionesAulaCompromisos)
      .where(eq(observacionesAulaCompromisos.observacionId, observacionId))
      .orderBy(
        asc(observacionesAulaCompromisos.compromisoId),
        desc(observacionesAulaCompromisos.version),
      );
  }

  async editarCompromisoEnSitio(id: string, descripcion: string, fechaRevision: string) {
    await this.db
      .update(observacionesAulaCompromisos)
      .set({ descripcion, fechaRevision })
      .where(eq(observacionesAulaCompromisos.id, id));
  }

  async nuevaVersionCompromiso(
    vigente: CompromisoObsFila,
    cambios: { descripcion: string; fechaRevision: string },
    motivo: string,
    usuarioId: string,
  ): Promise<number> {
    return await this.db.transaction(async (tx) => {
      await tx
        .update(observacionesAulaCompromisos)
        .set({ vigente: false })
        .where(eq(observacionesAulaCompromisos.id, vigente.id));
      await tx.insert(observacionesAulaCompromisos).values({
        compromisoId: vigente.compromisoId,
        observacionId: vigente.observacionId,
        desempeno: vigente.desempeno,
        descripcion: cambios.descripcion,
        fechaRevision: cambios.fechaRevision,
        estado: vigente.estado,
        observacionCierre: vigente.observacionCierre,
        version: vigente.version + 1,
        motivoCambio: motivo,
        creadoPorId: usuarioId,
      });
      return vigente.version + 1;
    });
  }

  async cerrarCompromiso(id: string, resultado: string, observacion: string, usuarioId: string) {
    await this.db
      .update(observacionesAulaCompromisos)
      .set({
        estado: resultado,
        observacionCierre: observacion,
        cerradoPorId: usuarioId,
        cerradoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(observacionesAulaCompromisos.id, id));
  }

  /** Compromisos pendientes de observaciones retroalimentadas cuya revisión es hasta la fecha. */
  async compromisosPorRevisar(
    hasta: string,
    soloEstaFecha = false,
  ): Promise<
    Array<
      CompromisoObsFila & {
        docenteApellido: string;
        docenteNombre: string;
        observadorUsuarioId: string;
        docenteId: string;
      }
    >
  > {
    return await this.db
      .select({
        ...this.camposCompromiso,
        docenteApellido: personaDocente.apellidoPaterno,
        docenteNombre: nombre(personaDocente),
        observadorUsuarioId: observacionesAula.observadorUsuarioId,
        docenteId: observacionesAula.docenteId,
      })
      .from(observacionesAulaCompromisos)
      .innerJoin(
        observacionesAula,
        eq(observacionesAula.id, observacionesAulaCompromisos.observacionId),
      )
      .innerJoin(docentes, eq(docentes.id, observacionesAula.docenteId))
      .innerJoin(personaDocente, eq(personaDocente.id, docentes.personaId))
      .where(
        and(
          eq(observacionesAulaCompromisos.vigente, true),
          eq(observacionesAulaCompromisos.estado, "pendiente"),
          eq(observacionesAula.estado, "retroalimentada"),
          soloEstaFecha
            ? sql`${observacionesAulaCompromisos.fechaRevision} = ${hasta}::date`
            : sql`${observacionesAulaCompromisos.fechaRevision} <= ${hasta}::date`,
        ),
      )
      .orderBy(asc(observacionesAulaCompromisos.fechaRevision));
  }

  // ---------------------------------------------------------------- comentario y archivos
  async comentarioDe(observacionId: string): Promise<ComentarioFila | null> {
    const [fila] = await this.db
      .select({
        id: observacionesAulaComentarios.id,
        texto: observacionesAulaComentarios.texto,
        creadoEn: texto(observacionesAulaComentarios.creadoEn),
      })
      .from(observacionesAulaComentarios)
      .where(eq(observacionesAulaComentarios.observacionId, observacionId))
      .limit(1);
    return fila ?? null;
  }

  /** false si el docente ya había comentado (un comentario por observación). */
  async crearComentario(observacionId: string, textoComentario: string, usuarioId: string) {
    const filas = await this.db
      .insert(observacionesAulaComentarios)
      .values({ observacionId, texto: textoComentario, usuarioId })
      .onConflictDoNothing()
      .returning({ id: observacionesAulaComentarios.id });
    return filas.length === 1;
  }

  async crearArchivo(datos: {
    observacionId: string;
    url: string;
    nombreOriginal: string;
    subidoPorId: string;
  }) {
    await this.db.insert(observacionesAulaArchivos).values(datos);
  }

  async archivos(observacionId: string): Promise<ArchivoFila[]> {
    return await this.db
      .select({
        id: observacionesAulaArchivos.id,
        url: observacionesAulaArchivos.url,
        nombreOriginal: observacionesAulaArchivos.nombreOriginal,
        retirado: observacionesAulaArchivos.retirado,
        creadoEn: texto(observacionesAulaArchivos.creadoEn),
      })
      .from(observacionesAulaArchivos)
      .where(eq(observacionesAulaArchivos.observacionId, observacionId))
      .orderBy(desc(observacionesAulaArchivos.creadoEn));
  }

  // ---------------------------------------------------------------- instrumentos
  private readonly camposInstrumento = {
    id: instrumentosObservacion.id,
    codigo: instrumentosObservacion.codigo,
    nombre: instrumentosObservacion.nombre,
    fuente: instrumentosObservacion.fuente,
    contenido: sql<InstrumentoContenido>`${instrumentosObservacion.contenido}`,
    vigente: instrumentosObservacion.vigente,
    creadoEn: texto(instrumentosObservacion.creadoEn),
  };

  async instrumentoVigente(): Promise<InstrumentoFila | null> {
    const [fila] = await this.db
      .select(this.camposInstrumento)
      .from(instrumentosObservacion)
      .where(eq(instrumentosObservacion.vigente, true))
      .limit(1);
    return fila ?? null;
  }

  async instrumento(id: string): Promise<InstrumentoFila | null> {
    const [fila] = await this.db
      .select(this.camposInstrumento)
      .from(instrumentosObservacion)
      .where(eq(instrumentosObservacion.id, id))
      .limit(1);
    return fila ?? null;
  }

  async instrumentos(): Promise<InstrumentoFila[]> {
    return await this.db
      .select(this.camposInstrumento)
      .from(instrumentosObservacion)
      .orderBy(desc(instrumentosObservacion.creadoEn));
  }

  async existeCodigoInstrumento(codigo: string): Promise<boolean> {
    const [fila] = await this.db
      .select({ id: instrumentosObservacion.id })
      .from(instrumentosObservacion)
      .where(eq(instrumentosObservacion.codigo, codigo))
      .limit(1);
    return Boolean(fila);
  }

  async crearInstrumento(
    datos: {
      codigo: string;
      nombre: string;
      fuente?: string;
      contenido: InstrumentoContenido;
      creadoPorId: string;
    },
    vigente: boolean,
  ): Promise<string> {
    return await this.db.transaction(async (tx) => {
      if (vigente) {
        await tx
          .update(instrumentosObservacion)
          .set({ vigente: false })
          .where(eq(instrumentosObservacion.vigente, true));
      }
      const [fila] = await tx
        .insert(instrumentosObservacion)
        .values({
          codigo: datos.codigo,
          nombre: datos.nombre,
          fuente: datos.fuente ?? null,
          contenido: datos.contenido,
          vigente,
          creadoPorId: datos.creadoPorId,
        })
        .returning({ id: instrumentosObservacion.id });
      return fila.id;
    });
  }

  async marcarInstrumentoVigente(id: string) {
    await this.db.transaction(async (tx) => {
      await tx
        .update(instrumentosObservacion)
        .set({ vigente: false })
        .where(eq(instrumentosObservacion.vigente, true));
      await tx
        .update(instrumentosObservacion)
        .set({ vigente: true })
        .where(eq(instrumentosObservacion.id, id));
    });
  }

  // ---------------------------------------------------------------- reportes
  async docentesActivos(): Promise<Array<{ id: string; nombre: string }>> {
    return await this.db
      .select({ id: docentes.id, nombre: nombre(personas) })
      .from(docentes)
      .innerJoin(personas, eq(personas.id, docentes.personaId))
      .where(and(isNull(docentes.eliminadoEn), eq(docentes.estado, "activo")))
      .orderBy(asc(personas.apellidoPaterno), asc(personas.nombres));
  }

  async conteosPorDocente(
    anioAcademicoId: string,
  ): Promise<Array<{ docenteId: string; estado: EstadoObservacion }>> {
    return await this.db
      .select({
        docenteId: observacionesAula.docenteId,
        estado: sql<EstadoObservacion>`${observacionesAula.estado}`,
      })
      .from(observacionesAula)
      .innerJoin(periodosAcademicos, eq(periodosAcademicos.id, observacionesAula.periodoId))
      .where(
        and(
          eq(periodosAcademicos.anioAcademicoId, anioAcademicoId),
          ne(observacionesAula.estado, "cancelada"),
        ),
      );
  }

  /** Calificaciones vigentes de observaciones ya calificadas o retroalimentadas del año. */
  async calificacionesDelAnio(anioAcademicoId: string): Promise<
    Array<{
      observacionId: string;
      docenteId: string;
      fecha: string;
      observadorNombre: string;
      desempeno: number;
      nivel: 1 | 2 | 3 | 4;
    }>
  > {
    return await this.db
      .select({
        observacionId: observacionesAula.id,
        docenteId: observacionesAula.docenteId,
        fecha: texto(observacionesAula.fecha),
        observadorNombre: nombre(personaObservador),
        desempeno: observacionesAulaCalificaciones.desempeno,
        nivel: sql<1 | 2 | 3 | 4>`${observacionesAulaCalificaciones.nivel}`,
      })
      .from(observacionesAulaCalificaciones)
      .innerJoin(
        observacionesAula,
        eq(observacionesAula.id, observacionesAulaCalificaciones.observacionId),
      )
      .innerJoin(periodosAcademicos, eq(periodosAcademicos.id, observacionesAula.periodoId))
      .innerJoin(usuarios, eq(usuarios.id, observacionesAula.observadorUsuarioId))
      .innerJoin(personaObservador, eq(personaObservador.id, usuarios.personaId))
      .where(
        and(
          eq(periodosAcademicos.anioAcademicoId, anioAcademicoId),
          eq(observacionesAulaCalificaciones.vigente, true),
          inArray(observacionesAula.estado, ["calificada", "retroalimentada"]),
        ),
      )
      .orderBy(asc(observacionesAula.fecha));
  }

  /** Última observación retroalimentada del docente en un bimestre. */
  async ultimaRetroalimentadaDelPeriodo(docenteId: string, periodoId: string) {
    const [fila] = await this.db
      .select({ id: observacionesAula.id, fecha: texto(observacionesAula.fecha) })
      .from(observacionesAula)
      .where(
        and(
          eq(observacionesAula.docenteId, docenteId),
          eq(observacionesAula.periodoId, periodoId),
          eq(observacionesAula.estado, "retroalimentada"),
        ),
      )
      .orderBy(desc(observacionesAula.fecha))
      .limit(1);
    return fila ?? null;
  }
}
