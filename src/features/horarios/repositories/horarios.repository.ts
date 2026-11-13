import { Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import { and, asc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  aniosAcademicos,
  apoderados,
  cursos,
  cursosSeccion,
  docentes,
  estudiantes,
  estudianteApoderados,
  grados,
  horarios,
  matriculas,
  personas,
  planEstudios,
  secciones,
  sesionesClase,
  turnos,
  variablesSistema,
} from "../../../core/database/schema";
import { VARIABLES_JORNADA } from "../constants";
import type { BloqueDocenteResponseDto, BloqueHorarioResponseDto } from "../dto";
import type {
  CreateBloqueData,
  CruceDocenteResultado,
  CursoPlanDetalle,
  CursoSeccionDetalle,
  DocenteSimpleResultado,
  IHorariosRepository,
  MatriculaEstudianteResultado,
  ParametrosJornadaResultado,
  UpdateBloqueData,
} from "../interfaces";
import { convertirHoraAMinutos, normalizarHora } from "../utils";

@Injectable()
export class HorariosRepository implements IHorariosRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findBySeccion(seccionId: string): Promise<BloqueHorarioResponseDto[]> {
    const filas = await this.db
      .select({
        id: horarios.id,
        seccionId: horarios.seccionId,
        cursoSeccionId: horarios.cursoSeccionId,
        cursoNombre: cursos.nombre,
        colorHex: cursos.colorHex,
        docenteNombres: personas.nombres,
        docenteApellidoPaterno: personas.apellidoPaterno,
        docenteApellidoMaterno: personas.apellidoMaterno,
        diaSemana: horarios.diaSemana,
        horaInicio: horarios.horaInicio,
        horaFin: horarios.horaFin,
        tipoBloque: horarios.tipoBloque,
        aula: horarios.aula,
      })
      .from(horarios)
      .leftJoin(cursosSeccion, eq(horarios.cursoSeccionId, cursosSeccion.id))
      .leftJoin(cursos, eq(cursosSeccion.cursoId, cursos.id))
      .leftJoin(docentes, eq(cursosSeccion.docenteId, docentes.id))
      .leftJoin(personas, eq(docentes.personaId, personas.id))
      .where(eq(horarios.seccionId, seccionId))
      .orderBy(asc(horarios.diaSemana), asc(horarios.horaInicio));

    return filas.map((fila) => this.mapearFilaABloqueResponse(fila));
  }

  async findById(id: string): Promise<BloqueHorarioResponseDto | null> {
    const filas = await this.db
      .select({
        id: horarios.id,
        seccionId: horarios.seccionId,
        cursoSeccionId: horarios.cursoSeccionId,
        cursoNombre: cursos.nombre,
        colorHex: cursos.colorHex,
        docenteNombres: personas.nombres,
        docenteApellidoPaterno: personas.apellidoPaterno,
        docenteApellidoMaterno: personas.apellidoMaterno,
        diaSemana: horarios.diaSemana,
        horaInicio: horarios.horaInicio,
        horaFin: horarios.horaFin,
        tipoBloque: horarios.tipoBloque,
        aula: horarios.aula,
      })
      .from(horarios)
      .leftJoin(cursosSeccion, eq(horarios.cursoSeccionId, cursosSeccion.id))
      .leftJoin(cursos, eq(cursosSeccion.cursoId, cursos.id))
      .leftJoin(docentes, eq(cursosSeccion.docenteId, docentes.id))
      .leftJoin(personas, eq(docentes.personaId, personas.id))
      .where(eq(horarios.id, id))
      .limit(1);

    if (filas.length === 0) {
      return null;
    }

    return this.mapearFilaABloqueResponse(filas[0]);
  }

  async findSolapados(
    seccionId: string,
    dia: number,
    inicio: string,
    fin: string,
    exceptoId?: string,
  ): Promise<BloqueHorarioResponseDto[]> {
    const condiciones = [
      eq(horarios.seccionId, seccionId),
      eq(horarios.diaSemana, dia),
      sql`${horarios.horaInicio} < ${fin}::time`,
      sql`${horarios.horaFin} > ${inicio}::time`,
    ];

    if (exceptoId) {
      condiciones.push(ne(horarios.id, exceptoId));
    }

    const filas = await this.db
      .select({
        id: horarios.id,
        seccionId: horarios.seccionId,
        cursoSeccionId: horarios.cursoSeccionId,
        cursoNombre: cursos.nombre,
        colorHex: cursos.colorHex,
        docenteNombres: personas.nombres,
        docenteApellidoPaterno: personas.apellidoPaterno,
        docenteApellidoMaterno: personas.apellidoMaterno,
        diaSemana: horarios.diaSemana,
        horaInicio: horarios.horaInicio,
        horaFin: horarios.horaFin,
        tipoBloque: horarios.tipoBloque,
        aula: horarios.aula,
      })
      .from(horarios)
      .leftJoin(cursosSeccion, eq(horarios.cursoSeccionId, cursosSeccion.id))
      .leftJoin(cursos, eq(cursosSeccion.cursoId, cursos.id))
      .leftJoin(docentes, eq(cursosSeccion.docenteId, docentes.id))
      .leftJoin(personas, eq(docentes.personaId, personas.id))
      .where(and(...condiciones));

    return filas.map((fila) => this.mapearFilaABloqueResponse(fila));
  }

  async findCruceDocente(
    anioId: string,
    docenteIdOCursoSeccionId: string,
    dia: number,
    inicio: string,
    fin: string,
    exceptoSeccionId?: string,
  ): Promise<CruceDocenteResultado | null> {
    let docenteId = docenteIdOCursoSeccionId;

    const cs = await this.db
      .select({ docenteId: cursosSeccion.docenteId })
      .from(cursosSeccion)
      .where(eq(cursosSeccion.id, docenteIdOCursoSeccionId))
      .limit(1);

    if (cs.length > 0 && cs[0].docenteId) {
      docenteId = cs[0].docenteId;
    }

    if (!docenteId) {
      return null;
    }

    const condiciones = [
      eq(secciones.anioAcademicoId, anioId),
      eq(cursosSeccion.docenteId, docenteId),
      eq(horarios.diaSemana, dia),
      sql`${horarios.horaInicio} < ${fin}::time`,
      sql`${horarios.horaFin} > ${inicio}::time`,
    ];

    if (exceptoSeccionId) {
      condiciones.push(ne(secciones.id, exceptoSeccionId));
    }

    const filas = await this.db
      .select({
        docenteNombres: personas.nombres,
        docenteApellidoPaterno: personas.apellidoPaterno,
        docenteApellidoMaterno: personas.apellidoMaterno,
        gradoNumero: grados.numero,
        seccionNombre: secciones.nombre,
        diaSemana: horarios.diaSemana,
        horaInicio: horarios.horaInicio,
        horaFin: horarios.horaFin,
      })
      .from(horarios)
      .innerJoin(cursosSeccion, eq(horarios.cursoSeccionId, cursosSeccion.id))
      .innerJoin(secciones, eq(horarios.seccionId, secciones.id))
      .innerJoin(grados, eq(secciones.gradoId, grados.id))
      .innerJoin(docentes, eq(cursosSeccion.docenteId, docentes.id))
      .innerJoin(personas, eq(docentes.personaId, personas.id))
      .where(and(...condiciones))
      .limit(1);

    if (filas.length === 0) {
      return null;
    }

    const f = filas[0];
    const docenteNombre = [f.docenteNombres, f.docenteApellidoPaterno, f.docenteApellidoMaterno]
      .filter(Boolean)
      .join(" ");

    return {
      docenteNombre,
      gradoNumero: f.gradoNumero,
      seccionNombre: f.seccionNombre,
      diaSemana: f.diaSemana,
      horaInicio: normalizarHora(f.horaInicio),
      horaFin: normalizarHora(f.horaFin),
    };
  }

  async horasPorCurso(seccionId: string): Promise<Record<string, number>> {
    const { minutosHoraPedagogica } = await this.obtenerParametrosJornada();

    const bloquesClase = await this.db
      .select({
        cursoSeccionId: horarios.cursoSeccionId,
        horaInicio: horarios.horaInicio,
        horaFin: horarios.horaFin,
      })
      .from(horarios)
      .where(and(eq(horarios.seccionId, seccionId), eq(horarios.tipoBloque, "clase")));

    const resultado: Record<string, number> = {};

    for (const b of bloquesClase) {
      if (!b.cursoSeccionId) continue;
      const minInicio = convertirHoraAMinutos(b.horaInicio);
      const minFin = convertirHoraAMinutos(b.horaFin);
      const horasPedagogicas = Math.round((minFin - minInicio) / minutosHoraPedagogica);
      resultado[b.cursoSeccionId] = (resultado[b.cursoSeccionId] ?? 0) + horasPedagogicas;
    }

    return resultado;
  }

  async obtenerParametrosJornada(): Promise<ParametrosJornadaResultado> {
    const codigos = [
      VARIABLES_JORNADA.MINUTOS_HORA_PEDAGOGICA,
      VARIABLES_JORNADA.HORAS_PEDAGOGICAS_DIA,
      VARIABLES_JORNADA.RECREO_DESPUES_DE_HORA,
      VARIABLES_JORNADA.MINUTOS_RECREO,
    ];

    const filas = await this.db
      .select({
        codigo: variablesSistema.codigo,
        valor: variablesSistema.valor,
      })
      .from(variablesSistema)
      .where(and(inArray(variablesSistema.codigo, codigos), eq(variablesSistema.vigente, true)));

    const mapa = new Map<string, string>();
    for (const f of filas) {
      if (f.valor !== null && f.valor !== undefined) {
        mapa.set(f.codigo, f.valor);
      }
    }

    for (const codigo of codigos) {
      if (!mapa.has(codigo)) {
        throw new InternalServerErrorException(
          `Variable de sistema obligatoria '${codigo}' no encontrada o no vigente.`,
        );
      }
    }

    const minutosHoraPedagogica = parseInt(
      mapa.get(VARIABLES_JORNADA.MINUTOS_HORA_PEDAGOGICA)!,
      10,
    );
    const horasPedagogicasDia = parseInt(mapa.get(VARIABLES_JORNADA.HORAS_PEDAGOGICAS_DIA)!, 10);
    const recreoDespuesDeHora = parseInt(mapa.get(VARIABLES_JORNADA.RECREO_DESPUES_DE_HORA)!, 10);
    const minutosRecreo = parseInt(mapa.get(VARIABLES_JORNADA.MINUTOS_RECREO)!, 10);

    if (
      isNaN(minutosHoraPedagogica) ||
      minutosHoraPedagogica <= 0 ||
      isNaN(horasPedagogicasDia) ||
      horasPedagogicasDia <= 0 ||
      isNaN(recreoDespuesDeHora) ||
      recreoDespuesDeHora <= 0 ||
      isNaN(minutosRecreo) ||
      minutosRecreo <= 0
    ) {
      throw new InternalServerErrorException(
        "Una o más variables de jornada contienen valores inválidos o menores o iguales a cero.",
      );
    }

    return {
      minutosHoraPedagogica,
      horasPedagogicasDia,
      recreoDespuesDeHora,
      minutosRecreo,
    };
  }

  async horaEntradaEstudiantes(): Promise<string> {
    const filas = await this.db
      .select({ horaEntrada: turnos.horaEntrada })
      .from(turnos)
      .where(and(eq(turnos.aplicaA, "estudiantes"), eq(turnos.activo, true)))
      .limit(1);

    if (filas.length === 0 || !filas[0].horaEntrada) {
      throw new InternalServerErrorException(
        "No se encontró un turno activo configurado para estudiantes.",
      );
    }

    return normalizarHora(filas[0].horaEntrada);
  }

  async cursosSeccionPorSeccion(seccionId: string): Promise<CursoSeccionDetalle[]> {
    const filas = await this.db
      .select({
        cursoSeccionId: cursosSeccion.id,
        cursoId: cursosSeccion.cursoId,
        cursoNombre: cursos.nombre,
        docenteId: cursosSeccion.docenteId,
      })
      .from(cursosSeccion)
      .innerJoin(cursos, eq(cursosSeccion.cursoId, cursos.id))
      .where(eq(cursosSeccion.seccionId, seccionId))
      .orderBy(asc(cursos.nombre));

    return filas;
  }

  async horasPlanPorCurso(seccionId: string): Promise<Record<string, CursoPlanDetalle>> {
    const filas = await this.db
      .select({
        cursoSeccionId: cursosSeccion.id,
        cursoNombre: cursos.nombre,
        horasPlan: planEstudios.horasSemanales,
      })
      .from(cursosSeccion)
      .innerJoin(secciones, eq(cursosSeccion.seccionId, secciones.id))
      .innerJoin(
        planEstudios,
        and(
          eq(planEstudios.gradoId, secciones.gradoId),
          eq(planEstudios.cursoId, cursosSeccion.cursoId),
          eq(planEstudios.activo, true),
        ),
      )
      .innerJoin(cursos, eq(cursosSeccion.cursoId, cursos.id))
      .where(eq(cursosSeccion.seccionId, seccionId));

    const resultado: Record<string, CursoPlanDetalle> = {};
    for (const f of filas) {
      resultado[f.cursoSeccionId] = {
        cursoNombre: f.cursoNombre,
        horasPlan: f.horasPlan,
      };
    }

    return resultado;
  }

  async create(data: CreateBloqueData): Promise<BloqueHorarioResponseDto> {
    const [nuevo] = await this.db
      .insert(horarios)
      .values({
        seccionId: data.seccionId,
        cursoSeccionId: data.tipoBloque === "receso" ? null : (data.cursoSeccionId ?? null),
        diaSemana: data.diaSemana,
        horaInicio: data.horaInicio,
        horaFin: data.horaFin,
        tipoBloque: data.tipoBloque,
        aula: data.aula ?? null,
      })
      .returning({ id: horarios.id });

    const bloque = await this.findById(nuevo.id);
    if (!bloque) {
      throw new InternalServerErrorException(
        "No se pudo recuperar el bloque de horario recién registrado.",
      );
    }
    return bloque;
  }

  async update(id: string, data: UpdateBloqueData): Promise<BloqueHorarioResponseDto> {
    const valoresActualizar: Record<string, unknown> = {
      actualizadoEn: sql`CURRENT_TIMESTAMP`,
    };

    if (data.diaSemana !== undefined) valoresActualizar.diaSemana = data.diaSemana;
    if (data.horaInicio !== undefined) valoresActualizar.horaInicio = data.horaInicio;
    if (data.horaFin !== undefined) valoresActualizar.horaFin = data.horaFin;
    if (data.tipoBloque !== undefined) valoresActualizar.tipoBloque = data.tipoBloque;
    if (data.cursoSeccionId !== undefined) {
      valoresActualizar.cursoSeccionId = data.tipoBloque === "receso" ? null : data.cursoSeccionId;
    }
    if (data.aula !== undefined) valoresActualizar.aula = data.aula;

    await this.db.update(horarios).set(valoresActualizar).where(eq(horarios.id, id));

    const bloque = await this.findById(id);
    if (!bloque) {
      throw new InternalServerErrorException(
        "No se pudo recuperar el bloque de horario actualizado.",
      );
    }
    return bloque;
  }

  async delete(id: string): Promise<boolean> {
    await this.db.delete(horarios).where(eq(horarios.id, id));
    return true;
  }

  async tieneSesiones(id: string): Promise<boolean> {
    const resultado = await this.db
      .select({ id: sesionesClase.id })
      .from(sesionesClase)
      .where(eq(sesionesClase.horarioId, id))
      .limit(1);

    return resultado.length > 0;
  }

  async findByDocente(anioId: string, docenteId: string): Promise<BloqueDocenteResponseDto[]> {
    const filas = await this.db
      .select({
        id: horarios.id,
        diaSemana: horarios.diaSemana,
        horaInicio: horarios.horaInicio,
        horaFin: horarios.horaFin,
        cursoNombre: cursos.nombre,
        colorHex: cursos.colorHex,
        seccionNombre: secciones.nombre,
        gradoNumero: grados.numero,
        aula: horarios.aula,
      })
      .from(horarios)
      .innerJoin(cursosSeccion, eq(horarios.cursoSeccionId, cursosSeccion.id))
      .innerJoin(secciones, eq(horarios.seccionId, secciones.id))
      .innerJoin(grados, eq(secciones.gradoId, grados.id))
      .innerJoin(cursos, eq(cursosSeccion.cursoId, cursos.id))
      .where(and(eq(secciones.anioAcademicoId, anioId), eq(cursosSeccion.docenteId, docenteId)))
      .orderBy(asc(horarios.diaSemana), asc(horarios.horaInicio));

    return filas.map((f) => ({
      id: f.id,
      diaSemana: f.diaSemana,
      horaInicio: normalizarHora(f.horaInicio),
      horaFin: normalizarHora(f.horaFin),
      cursoNombre: f.cursoNombre,
      colorHex: f.colorHex,
      seccionNombre: f.seccionNombre,
      gradoNumero: f.gradoNumero,
      aula: f.aula,
    }));
  }

  async docentePorPersonaId(personaId: string): Promise<DocenteSimpleResultado | null> {
    const filas = await this.db
      .select({ id: docentes.id })
      .from(docentes)
      .where(or(eq(docentes.personaId, personaId), eq(docentes.id, personaId)))
      .limit(1);

    if (filas.length === 0) {
      return null;
    }

    return { id: filas[0].id };
  }

  async matriculaEstudiante(
    anioId: string,
    estudianteId: string,
  ): Promise<MatriculaEstudianteResultado | null> {
    const filas = await this.db
      .select({
        seccionId: matriculas.seccionId,
        estado: matriculas.estado,
      })
      .from(matriculas)
      .innerJoin(estudiantes, eq(matriculas.estudianteId, estudiantes.id))
      .where(
        and(
          eq(matriculas.anioAcademicoId, anioId),
          or(eq(matriculas.estudianteId, estudianteId), eq(estudiantes.personaId, estudianteId)),
        ),
      )
      .limit(1);

    if (filas.length === 0) {
      return null;
    }

    return {
      seccionId: filas[0].seccionId,
      estado: filas[0].estado,
    };
  }

  async esApoderadoDeEstudiante(
    apoderadoPersonaId: string,
    estudianteId: string,
  ): Promise<boolean> {
    const filas = await this.db
      .select({
        estudianteId: estudianteApoderados.estudianteId,
      })
      .from(estudianteApoderados)
      .innerJoin(apoderados, eq(estudianteApoderados.apoderadoId, apoderados.id))
      .innerJoin(estudiantes, eq(estudianteApoderados.estudianteId, estudiantes.id))
      .where(
        and(
          or(eq(apoderados.personaId, apoderadoPersonaId), eq(apoderados.id, apoderadoPersonaId)),
          or(
            eq(estudianteApoderados.estudianteId, estudianteId),
            eq(estudiantes.personaId, estudianteId),
          ),
        ),
      )
      .limit(1);

    return filas.length > 0;
  }

  async infoSeccion(
    seccionId: string,
  ): Promise<{ gradoNombre: string; seccionNombre: string; anio: number } | null> {
    const filas = await this.db
      .select({
        gradoNombre: grados.nombre,
        seccionNombre: secciones.nombre,
        anio: aniosAcademicos.anio,
      })
      .from(secciones)
      .innerJoin(grados, eq(secciones.gradoId, grados.id))
      .innerJoin(aniosAcademicos, eq(secciones.anioAcademicoId, aniosAcademicos.id))
      .where(eq(secciones.id, seccionId))
      .limit(1);

    return filas[0] ?? null;
  }

  private mapearFilaABloqueResponse(fila: {
    id: string;
    seccionId: string;
    cursoSeccionId: string | null;
    cursoNombre: string | null;
    colorHex: string | null;
    docenteNombres: string | null;
    docenteApellidoPaterno: string | null;
    docenteApellidoMaterno: string | null;
    diaSemana: number;
    horaInicio: string;
    horaFin: string;
    tipoBloque: string;
    aula: string | null;
  }): BloqueHorarioResponseDto {
    const docenteNombre = [
      fila.docenteNombres,
      fila.docenteApellidoPaterno,
      fila.docenteApellidoMaterno,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      id: fila.id,
      seccionId: fila.seccionId,
      cursoSeccionId: fila.cursoSeccionId,
      cursoNombre: fila.cursoNombre,
      colorHex: fila.colorHex,
      docenteNombre: docenteNombre || null,
      diaSemana: fila.diaSemana,
      horaInicio: normalizarHora(fila.horaInicio),
      horaFin: normalizarHora(fila.horaFin),
      tipoBloque: fila.tipoBloque as "clase" | "receso",
      aula: fila.aula,
    };
  }
}
