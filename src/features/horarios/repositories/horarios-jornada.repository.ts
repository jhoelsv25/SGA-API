import { Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import { and, asc, eq, inArray } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import {
  cursos,
  cursosSeccion,
  horarios,
  planEstudios,
  secciones,
  turnos,
  variablesSistema,
} from "../../../core/database/schema";
import { VARIABLES_JORNADA } from "../constants";
import type {
  CursoPlanDetalle,
  CursoSeccionDetalle,
  ParametrosJornadaResultado,
} from "../interfaces";
import { convertirHoraAMinutos, normalizarHora } from "../utils";

/**
 * Repositorio especializado en parámetros de jornada escolar, turnos,
 * carga horaria por curso y plan de estudios por sección.
 */
@Injectable()
export class HorariosJornadaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async horasPorCurso(seccionId: string): Promise<Record<string, number>> {
    const [{ minutosHoraPedagogica }, bloquesClase] = await Promise.all([
      this.obtenerParametrosJornada(),
      this.db
        .select({
          cursoSeccionId: horarios.cursoSeccionId,
          horaInicio: horarios.horaInicio,
          horaFin: horarios.horaFin,
        })
        .from(horarios)
        .where(and(eq(horarios.seccionId, seccionId), eq(horarios.tipoBloque, "clase"))),
    ]);

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
    return this.db
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
}
