import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, inArray, isNull, ne, sql, type SQL } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import { Database, DRIZZLE } from "../../../core/database";
import {
  alertasSesionEnviadas,
  aniosAcademicos,
  cursosSeccion,
  docentes,
  horarios,
  menus,
  observacionesAula,
  observacionesAulaCambios,
  periodosAcademicos,
  rolMenus,
  roles,
  sesionesClase,
  usuarioRoles,
  usuarios,
  variablesSistema,
} from "../../../core/database/schema";
import type { CambioFila, FiltrosObservacion, ObservacionFila } from "../interfaces";
import {
  consultaBaseObservaciones,
  textoNuloSql,
  textoSql,
  type BloqueHorario,
  type DatosNuevaObservacion,
} from "./observaciones-shared.helper";

/**
 * Repositorio base para CRUD de observaciones de aula, consultas de referencias
 * académicas, permisos de usuario, cruces horarios e historial de reprogramaciones.
 */
@Injectable()
export class ObservacionesBaseRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async obtener(id: string): Promise<ObservacionFila | null> {
    const [fila] = await consultaBaseObservaciones(this.db)
      .where(eq(observacionesAula.id, id))
      .limit(1);
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
    return await consultaBaseObservaciones(this.db)
      .where(condiciones.length ? and(...condiciones) : undefined)
      .orderBy(desc(observacionesAula.fecha), asc(observacionesAula.horaInicioProgramada));
  }

  /** Observaciones del docente visibles para él: solo las retroalimentadas y las programadas. */
  async listarDelDocente(docenteId: string): Promise<ObservacionFila[]> {
    return await consultaBaseObservaciones(this.db)
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

  async cerrarNotas(id: string, horaFin: string, minutos: number) {
    await this.actualizar(id, {
      estado: "notas_cerradas",
      horaFinReal: horaFin,
      minutosTotales: minutos,
      notasCerradasEn: sql`CURRENT_TIMESTAMP`,
    });
  }

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
        horaInicio: textoSql(horarios.horaInicio),
        horaFin: textoSql(horarios.horaFin),
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
        horaInicio: textoSql(observacionesAula.horaInicioProgramada),
        horaFin: textoSql(observacionesAula.horaFinProgramada),
      })
      .from(observacionesAula)
      .where(and(...condiciones));
  }

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
        fechaAnterior: textoNuloSql(observacionesAulaCambios.fechaAnterior),
        horaAnterior: textoNuloSql(observacionesAulaCambios.horaAnterior),
        fechaNueva: textoNuloSql(observacionesAulaCambios.fechaNueva),
        horaNueva: textoNuloSql(observacionesAulaCambios.horaNueva),
        motivo: observacionesAulaCambios.motivo,
        usuarioId: observacionesAulaCambios.usuarioId,
        creadoEn: textoSql(observacionesAulaCambios.creadoEn),
      })
      .from(observacionesAulaCambios)
      .where(eq(observacionesAulaCambios.observacionId, observacionId))
      .orderBy(asc(observacionesAulaCambios.creadoEn));
  }
}
