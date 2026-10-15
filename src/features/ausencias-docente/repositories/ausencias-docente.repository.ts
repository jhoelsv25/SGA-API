import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  ausenciasSesion,
  cursos,
  cursosSeccion,
  docentes,
  evidenciasAusencia,
  grados,
  horarios,
  periodosAcademicos,
  personas,
  secciones,
  sesionesClase,
  usuarios,
  variablesSistema,
} from "../../../core/database/schema";
import type {
  AusenciaConDetalle,
  AusenciaFila,
  DatosCrearAusencia,
  DatosCrearEvidencia,
  DatosCrearVersion,
  FiltrosListarSupervisor,
  IAusenciasDocenteRepository,
  SesionParaAusencia,
} from "../interfaces";

@Injectable()
export class AusenciasDocenteRepository implements IAusenciasDocenteRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async buscarSesionParaAusencia(sesionId: string): Promise<SesionParaAusencia | null> {
    const [fila] = await this.db
      .select({
        id: sesionesClase.id,
        fecha: sql<string>`${sesionesClase.fecha}::text`,
        horaInicioPlan: sesionesClase.horaInicioPlan,
        horaFinPlan: sesionesClase.horaFinPlan,
        horarioHoraInicio: horarios.horaInicio,
        horarioHoraFin: horarios.horaFin,
        horaInicioReal: sesionesClase.horaInicioReal,
        horaFinReal: sesionesClase.horaFinReal,
        estado: sesionesClase.estado,
        docenteId: sesionesClase.docenteId,
        docentePersonaId: docentes.personaId,
        docenteNombres: personas.nombres,
        docenteApellidoPaterno: personas.apellidoPaterno,
        docenteApellidoMaterno: personas.apellidoMaterno,
        docenteUsuarioId: sql<string>`(
          SELECT u.id FROM usuarios u WHERE u.persona_id = ${docentes.personaId} LIMIT 1
        )`,
        cursoNombre: cursos.nombre,
        gradoNumero: grados.numero,
        seccionNombre: secciones.nombre,
        anioAcademicoId: secciones.anioAcademicoId,
      })
      .from(sesionesClase)
      .innerJoin(horarios, eq(sesionesClase.horarioId, horarios.id))
      .innerJoin(cursosSeccion, eq(horarios.cursoSeccionId, cursosSeccion.id))
      .innerJoin(cursos, eq(cursosSeccion.cursoId, cursos.id))
      .innerJoin(secciones, eq(horarios.seccionId, secciones.id))
      .innerJoin(grados, eq(secciones.gradoId, grados.id))
      .innerJoin(docentes, eq(sesionesClase.docenteId, docentes.id))
      .innerJoin(personas, eq(docentes.personaId, personas.id))
      .where(eq(sesionesClase.id, sesionId))
      .limit(1);

    if (!fila) {
      return null;
    }

    const horaInicioCompleta = fila.horaInicioPlan ?? fila.horarioHoraInicio;
    const horaFinCompleta = fila.horaFinPlan ?? fila.horarioHoraFin;

    const horaInicio = horaInicioCompleta ? horaInicioCompleta.slice(0, 5) : "";
    const horaFin = horaFinCompleta ? horaFinCompleta.slice(0, 5) : "";

    const docenteApellidoMaterno = fila.docenteApellidoMaterno
      ? ` ${fila.docenteApellidoMaterno}`
      : "";
    const docenteNombre = `${fila.docenteApellidoPaterno}${docenteApellidoMaterno}, ${fila.docenteNombres}`;
    const seccionNombre = `${fila.gradoNumero}.° ${fila.seccionNombre}`;

    return {
      id: fila.id,
      fecha: fila.fecha,
      horaInicio,
      horaFin,
      horaInicioReal: fila.horaInicioReal ? fila.horaInicioReal.slice(0, 5) : null,
      horaFinReal: fila.horaFinReal ? fila.horaFinReal.slice(0, 5) : null,
      estado: fila.estado,
      docenteId: fila.docenteId,
      docenteNombre,
      docentePersonaId: fila.docentePersonaId,
      docenteUsuarioId: fila.docenteUsuarioId ?? "",
      cursoNombre: fila.cursoNombre,
      seccionNombre,
      anioAcademicoId: fila.anioAcademicoId,
    };
  }

  async buscarAusenciasVigentesDeSesion(
    sesionId: string,
    exceptoId?: string,
  ): Promise<AusenciaFila[]> {
    const condiciones = [
      eq(ausenciasSesion.sesionClaseId, sesionId),
      eq(ausenciasSesion.vigente, true),
    ];
    if (exceptoId) {
      condiciones.push(ne(ausenciasSesion.id, exceptoId));
    }

    const filas = await this.db
      .select({
        id: ausenciasSesion.id,
        ausenciaRaizId: ausenciasSesion.ausenciaRaizId,
        sesionClaseId: ausenciasSesion.sesionClaseId,
        registradoPorId: ausenciasSesion.registradoPorId,
        horaDesde: ausenciasSesion.horaDesde,
        horaHasta: ausenciasSesion.horaHasta,
        minutos: ausenciasSesion.minutos,
        motivo: ausenciasSesion.motivo,
        observacion: ausenciasSesion.observacion,
        descargo: ausenciasSesion.descargo,
        descargoEn: ausenciasSesion.descargoEn,
        version: ausenciasSesion.version,
        vigente: ausenciasSesion.vigente,
        motivoCambio: ausenciasSesion.motivoCambio,
        anulada: ausenciasSesion.anulada,
        anuladaPorId: ausenciasSesion.anuladaPorId,
        anuladaEn: ausenciasSesion.anuladaEn,
        motivoAnulacion: ausenciasSesion.motivoAnulacion,
        registradoEn: ausenciasSesion.registradoEn,
      })
      .from(ausenciasSesion)
      .where(and(...condiciones))
      .orderBy(asc(ausenciasSesion.horaDesde));

    return filas.map((f) => ({
      ...f,
      horaDesde: f.horaDesde.slice(0, 5),
      horaHasta: f.horaHasta.slice(0, 5),
      minutos: f.minutos ?? 0,
    }));
  }

  async buscarPorId(id: string): Promise<AusenciaConDetalle | null> {
    const [fila] = await this.db
      .select({
        id: ausenciasSesion.id,
        ausenciaRaizId: ausenciasSesion.ausenciaRaizId,
        sesionClaseId: ausenciasSesion.sesionClaseId,
        registradoPorId: ausenciasSesion.registradoPorId,
        horaDesde: ausenciasSesion.horaDesde,
        horaHasta: ausenciasSesion.horaHasta,
        minutos: ausenciasSesion.minutos,
        motivo: ausenciasSesion.motivo,
        observacion: ausenciasSesion.observacion,
        descargo: ausenciasSesion.descargo,
        descargoEn: ausenciasSesion.descargoEn,
        version: ausenciasSesion.version,
        vigente: ausenciasSesion.vigente,
        motivoCambio: ausenciasSesion.motivoCambio,
        anulada: ausenciasSesion.anulada,
        anuladaPorId: ausenciasSesion.anuladaPorId,
        anuladaEn: ausenciasSesion.anuladaEn,
        motivoAnulacion: ausenciasSesion.motivoAnulacion,
        registradoEn: ausenciasSesion.registradoEn,
        registradorNombres: personas.nombres,
        registradorApellidoPaterno: personas.apellidoPaterno,
        registradorApellidoMaterno: personas.apellidoMaterno,
      })
      .from(ausenciasSesion)
      .innerJoin(usuarios, eq(ausenciasSesion.registradoPorId, usuarios.id))
      .innerJoin(personas, eq(usuarios.personaId, personas.id))
      .where(eq(ausenciasSesion.id, id))
      .limit(1);

    if (!fila) {
      return null;
    }

    const sesion = await this.buscarSesionParaAusencia(fila.sesionClaseId);
    if (!sesion) {
      return null;
    }

    const fotos = await this.db
      .select({
        id: evidenciasAusencia.id,
        ausenciaId: evidenciasAusencia.ausenciaId,
        archivoUrl: evidenciasAusencia.archivoUrl,
        tomadaEn: evidenciasAusencia.tomadaEn,
        orden: evidenciasAusencia.orden,
        vigente: evidenciasAusencia.vigente,
      })
      .from(evidenciasAusencia)
      .where(and(eq(evidenciasAusencia.ausenciaId, id), eq(evidenciasAusencia.vigente, true)))
      .orderBy(asc(evidenciasAusencia.orden));

    const registradorMaterno = fila.registradorApellidoMaterno
      ? ` ${fila.registradorApellidoMaterno}`
      : "";
    const registradoPorNombre =
      `${fila.registradorNombres} ${fila.registradorApellidoPaterno}${registradorMaterno}`.trim();

    return {
      id: fila.id,
      ausenciaRaizId: fila.ausenciaRaizId,
      sesionClaseId: fila.sesionClaseId,
      registradoPorId: fila.registradoPorId,
      horaDesde: fila.horaDesde.slice(0, 5),
      horaHasta: fila.horaHasta.slice(0, 5),
      minutos: fila.minutos ?? 0,
      motivo: fila.motivo,
      observacion: fila.observacion,
      descargo: fila.descargo,
      descargoEn: fila.descargoEn,
      version: fila.version,
      vigente: fila.vigente,
      motivoCambio: fila.motivoCambio,
      anulada: fila.anulada,
      anuladaPorId: fila.anuladaPorId,
      anuladaEn: fila.anuladaEn,
      motivoAnulacion: fila.motivoAnulacion,
      registradoEn: fila.registradoEn,
      sesion,
      fotos,
      registradoPorNombre,
    };
  }

  async buscarVersionesDeRaiz(raizId: string): Promise<AusenciaConDetalle[]> {
    const versiones = await this.db
      .select({ id: ausenciasSesion.id })
      .from(ausenciasSesion)
      .where(or(eq(ausenciasSesion.ausenciaRaizId, raizId), eq(ausenciasSesion.id, raizId)))
      .orderBy(desc(ausenciasSesion.version));

    const resultados: AusenciaConDetalle[] = [];
    for (const v of versiones) {
      const detalle = await this.buscarPorId(v.id);
      if (detalle) {
        resultados.push(detalle);
      }
    }
    return resultados;
  }

  async crearAusenciaConFotos(
    datos: DatosCrearAusencia,
    fotos: DatosCrearEvidencia[],
  ): Promise<AusenciaConDetalle> {
    const nuevoId = randomUUID();

    await this.db.transaction(async (tx) => {
      await tx.insert(ausenciasSesion).values({
        id: nuevoId,
        ausenciaRaizId: nuevoId,
        sesionClaseId: datos.sesionClaseId,
        registradoPorId: datos.registradoPorId,
        horaDesde: datos.horaDesde,
        horaHasta: datos.horaHasta,
        motivo: datos.motivo,
        observacion: datos.observacion ?? null,
        version: 1,
        vigente: true,
        anulada: false,
      });

      if (fotos.length > 0) {
        await tx.insert(evidenciasAusencia).values(
          fotos.map((f, idx) => ({
            id: randomUUID(),
            ausenciaId: nuevoId,
            archivoUrl: f.archivoUrl,
            tomadaEn: f.tomadaEn ?? null,
            orden: f.orden ?? idx + 1,
            vigente: true,
          })),
        );
      }
    });

    const creada = await this.buscarPorId(nuevoId);
    if (!creada) {
      throw new Error("No se pudo recuperar la ausencia recién creada.");
    }
    return creada;
  }

  async crearNuevaVersion(
    versionAnteriorId: string,
    datosVersion: DatosCrearVersion,
    fotosNuevas: DatosCrearEvidencia[],
    fotosRetiradasIds?: string[],
  ): Promise<AusenciaConDetalle> {
    const nuevoId = randomUUID();

    await this.db.transaction(async (tx) => {
      await tx
        .update(ausenciasSesion)
        .set({ vigente: false })
        .where(eq(ausenciasSesion.id, versionAnteriorId));

      await tx.insert(ausenciasSesion).values({
        id: nuevoId,
        ausenciaRaizId: datosVersion.ausenciaRaizId,
        sesionClaseId: datosVersion.sesionClaseId,
        registradoPorId: datosVersion.registradoPorId,
        horaDesde: datosVersion.horaDesde,
        horaHasta: datosVersion.horaHasta,
        motivo: datosVersion.motivo,
        observacion: datosVersion.observacion ?? null,
        version: datosVersion.version,
        motivoCambio: datosVersion.motivoCambio,
        vigente: true,
        anulada: false,
      });

      const fotosAnteriores = await tx
        .select()
        .from(evidenciasAusencia)
        .where(
          and(
            eq(evidenciasAusencia.ausenciaId, versionAnteriorId),
            eq(evidenciasAusencia.vigente, true),
          ),
        );

      const retiradasSet = new Set(fotosRetiradasIds ?? []);
      const fotosParaCopiar = fotosAnteriores.filter((f) => !retiradasSet.has(f.id));

      let ordenActual = 1;
      const insercionesEvidencias: Array<{
        id: string;
        ausenciaId: string;
        archivoUrl: string;
        tomadaEn: string | null;
        orden: number;
        vigente: boolean;
      }> = [];

      for (const fotoAnt of fotosParaCopiar) {
        insercionesEvidencias.push({
          id: randomUUID(),
          ausenciaId: nuevoId,
          archivoUrl: fotoAnt.archivoUrl,
          tomadaEn: fotoAnt.tomadaEn,
          orden: ordenActual++,
          vigente: true,
        });
      }

      for (const fotoNueva of fotosNuevas) {
        insercionesEvidencias.push({
          id: randomUUID(),
          ausenciaId: nuevoId,
          archivoUrl: fotoNueva.archivoUrl,
          tomadaEn: fotoNueva.tomadaEn ?? null,
          orden: ordenActual++,
          vigente: true,
        });
      }

      if (insercionesEvidencias.length > 0) {
        await tx.insert(evidenciasAusencia).values(insercionesEvidencias);
      }
    });

    const nuevaVersion = await this.buscarPorId(nuevoId);
    if (!nuevaVersion) {
      throw new Error("No se pudo recuperar la nueva versión creada.");
    }
    return nuevaVersion;
  }

  async anularAusencia(
    id: string,
    anuladaPorId: string,
    motivoAnulacion: string,
  ): Promise<AusenciaConDetalle> {
    await this.db
      .update(ausenciasSesion)
      .set({
        anulada: true,
        anuladaPorId,
        motivoAnulacion,
        anuladaEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(ausenciasSesion.id, id));

    const anulada = await this.buscarPorId(id);
    if (!anulada) {
      throw new Error("No se pudo recuperar la ausencia anulada.");
    }
    return anulada;
  }

  async guardarDescargo(id: string, descargo: string): Promise<void> {
    await this.db
      .update(ausenciasSesion)
      .set({
        descargo,
        descargoEn: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(ausenciasSesion.id, id));
  }

  async listarSupervisor(filtros: FiltrosListarSupervisor): Promise<AusenciaConDetalle[]> {
    const condiciones = [eq(ausenciasSesion.vigente, true)];

    if (filtros.docenteId) {
      condiciones.push(eq(sesionesClase.docenteId, filtros.docenteId));
    }
    if (filtros.fechaDesde) {
      condiciones.push(sql`${sesionesClase.fecha} >= ${filtros.fechaDesde}::date`);
    }
    if (filtros.fechaHasta) {
      condiciones.push(sql`${sesionesClase.fecha} <= ${filtros.fechaHasta}::date`);
    }
    if (filtros.periodoId) {
      condiciones.push(
        sql`EXISTS (
          SELECT 1 FROM periodos_academicos pa
          WHERE pa.id = ${filtros.periodoId}
            AND pa.fecha_inicio <= ${sesionesClase.fecha}
            AND pa.fecha_fin >= ${sesionesClase.fecha}
        )`,
      );
    }
    if (filtros.anioAcademicoId) {
      condiciones.push(eq(secciones.anioAcademicoId, filtros.anioAcademicoId));
    }

    const filas = await this.db
      .select({ id: ausenciasSesion.id })
      .from(ausenciasSesion)
      .innerJoin(sesionesClase, eq(ausenciasSesion.sesionClaseId, sesionesClase.id))
      .innerJoin(horarios, eq(sesionesClase.horarioId, horarios.id))
      .innerJoin(secciones, eq(horarios.seccionId, secciones.id))
      .where(and(...condiciones))
      .orderBy(desc(sesionesClase.fecha), desc(ausenciasSesion.horaDesde));

    const resultados: AusenciaConDetalle[] = [];
    for (const f of filas) {
      const detalle = await this.buscarPorId(f.id);
      if (detalle) {
        resultados.push(detalle);
      }
    }
    return resultados;
  }

  async listarPorDocente(
    docenteId: string,
    anioAcademicoId?: string,
  ): Promise<AusenciaConDetalle[]> {
    const condiciones = [eq(ausenciasSesion.vigente, true), eq(sesionesClase.docenteId, docenteId)];
    if (anioAcademicoId) {
      condiciones.push(eq(secciones.anioAcademicoId, anioAcademicoId));
    }

    const filas = await this.db
      .select({ id: ausenciasSesion.id })
      .from(ausenciasSesion)
      .innerJoin(sesionesClase, eq(ausenciasSesion.sesionClaseId, sesionesClase.id))
      .innerJoin(horarios, eq(sesionesClase.horarioId, horarios.id))
      .innerJoin(secciones, eq(horarios.seccionId, secciones.id))
      .where(and(...condiciones))
      .orderBy(desc(sesionesClase.fecha), desc(ausenciasSesion.horaDesde));

    const resultados: AusenciaConDetalle[] = [];
    for (const f of filas) {
      const detalle = await this.buscarPorId(f.id);
      if (detalle) {
        resultados.push(detalle);
      }
    }
    return resultados;
  }

  async docentePorPersonaId(personaId: string): Promise<{ id: string } | null> {
    const [doc] = await this.db
      .select({ id: docentes.id })
      .from(docentes)
      .where(eq(docentes.personaId, personaId))
      .limit(1);

    return doc ?? null;
  }

  async usuarioPorPersonaId(personaId: string): Promise<{ id: string } | null> {
    const [u] = await this.db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(
        and(
          eq(usuarios.personaId, personaId),
          eq(usuarios.estado, "activo"),
          isNull(usuarios.eliminadoEn),
        ),
      )
      .limit(1);

    return u ?? null;
  }

  async bimestreEstaBloqueado(fecha: string, _docenteId: string): Promise<boolean> {
    const [periodo] = await this.db
      .select({
        id: periodosAcademicos.id,
        estado: periodosAcademicos.estado,
      })
      .from(periodosAcademicos)
      .where(
        and(
          sql`${periodosAcademicos.fechaInicio} <= ${fecha}::date`,
          sql`${periodosAcademicos.fechaFin} >= ${fecha}::date`,
        ),
      )
      .limit(1);

    if (!periodo) {
      return false;
    }

    return periodo.estado === "cerrado";
  }

  async buscarPeriodoIdPorFecha(fecha: string): Promise<string | null> {
    const [periodo] = await this.db
      .select({ id: periodosAcademicos.id })
      .from(periodosAcademicos)
      .where(
        and(
          sql`${periodosAcademicos.fechaInicio} <= ${fecha}::date`,
          sql`${periodosAcademicos.fechaFin} >= ${fecha}::date`,
        ),
      )
      .limit(1);

    return periodo?.id ?? null;
  }

  async obtenerVariableSistema(codigo: string): Promise<string | null> {
    const [variable] = await this.db
      .select({ valor: variablesSistema.valor })
      .from(variablesSistema)
      .where(and(eq(variablesSistema.codigo, codigo), eq(variablesSistema.vigente, true)))
      .limit(1);

    return variable?.valor ?? null;
  }
}
