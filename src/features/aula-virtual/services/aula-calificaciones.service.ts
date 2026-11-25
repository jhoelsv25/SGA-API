import { ForbiddenException, Injectable, Optional } from "@nestjs/common";
import { AnioLectivoCls } from "../../../common/anio-lectivo";
import { AuditService } from "../../../common/services/audit.service";
import { AniosAcademicosService } from "../../anio-escolar/anios.service";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import { MENSAJES_AULA_VIRTUAL, type TipoTarea } from "../constants";
import type { FilaEstudianteLibroNotas, LibroNotasResponse } from "../dto";
import { AulaVirtualRepository } from "../repositories";
import {
  calcularNotaDeIntentos,
  calcularNotaFinalPonderada,
  convertirNotaALiteral,
  generarExcelLibroNotas,
  type ContextoLibroNotas,
} from "../utils";
import { AulaContextoHelper } from "./aula-contexto.helper";

/**
 * Servicio de dominio para consolidación del libro de notas, exportación a Excel
 * y consulta de calificaciones de estudiante/apoderado (RF-016).
 */
@Injectable()
export class AulaCalificacionesService {
  private readonly ctx: AulaContextoHelper;

  constructor(
    private readonly repository: AulaVirtualRepository,
    aniosService: AniosAcademicosService,
    anioLectivoCls: AnioLectivoCls,
    auditService: AuditService,
    @Optional() contexto?: AulaContextoHelper,
  ) {
    this.ctx =
      contexto ?? new AulaContextoHelper(repository, aniosService, anioLectivoCls, auditService);
  }

  async obtenerLibroNotas(
    usuario: AuthenticatedUser,
    cursoSeccionId: string,
    periodoId?: string,
  ): Promise<LibroNotasResponse> {
    const curso = await this.ctx.requerirCurso(cursoSeccionId);
    const esDocente = await this.ctx.esDocenteDelCurso(curso, usuario);
    const esDirectivo = this.ctx.esRolDeSeguimiento(usuario);
    if (!esDocente && !esDirectivo) {
      throw new ForbiddenException(MENSAJES_AULA_VIRTUAL.SIN_ACCESO_AULA);
    }
    const periodo = periodoId
      ? await this.ctx.requerirPeriodo(periodoId)
      : await this.ctx.periodoEnCursoDelAnio();

    const [tareas, estudiantes, pesosConfig] = await Promise.all([
      this.repository.listarTareas(cursoSeccionId, { periodoId: periodo.id, soloPublicadas: true }),
      this.repository.listarEstudiantesDeSeccion(curso.seccionId),
      this.repository.obtenerPesosVariables(),
    ]);

    const filasEstudiantes: FilaEstudianteLibroNotas[] = [];

    for (const est of estudiantes) {
      const notasPorTarea: Record<
        string,
        { nota: number | null; estado: string; esTardia: boolean }
      > = {};
      const notasAgrupadasPorTipo: Partial<Record<TipoTarea, number[]>> = {
        examen: [],
        cuestionario: [],
        trabajo: [],
        proyecto: [],
      };

      for (const t of tareas) {
        const entregas = await this.repository.findEntregasDeEstudiante(t.id, est.matriculaId);
        const calificadas = entregas.filter((e) => e.nota !== null && e.nota !== undefined);

        if (calificadas.length > 0) {
          const notaTarea = calcularNotaDeIntentos(
            calificadas.map((e) => e.nota as number),
            t.calculoNotaIntentos,
          );
          const ultima = entregas[entregas.length - 1];
          notasPorTarea[t.id] = {
            nota: notaTarea,
            estado: ultima.estado,
            esTardia: ultima.esTardia,
          };
          if (!notasAgrupadasPorTipo[t.tipo]) notasAgrupadasPorTipo[t.tipo] = [];
          notasAgrupadasPorTipo[t.tipo]!.push(notaTarea);
        } else if (entregas.length > 0) {
          const ultima = entregas[entregas.length - 1];
          notasPorTarea[t.id] = { nota: null, estado: ultima.estado, esTardia: ultima.esTardia };
        } else {
          notasPorTarea[t.id] = { nota: null, estado: "sin_entregar", esTardia: false };
        }
      }

      const ponderacion = calcularNotaFinalPonderada(notasAgrupadasPorTipo, pesosConfig);
      filasEstudiantes.push({
        matriculaId: est.matriculaId,
        estudianteId: est.estudianteId,
        codigo: est.codigo,
        estudianteNombre: est.nombreCompleto,
        notasPorTarea,
        promediosPorTipo: ponderacion.promediosPorTipo,
        notaFinal: ponderacion.notaFinal,
        notaLiteral: convertirNotaALiteral(ponderacion.notaFinal),
      });
    }

    const tiposPresentes: Partial<Record<TipoTarea, number[]>> = {};
    for (const t of tareas) tiposPresentes[t.tipo] = [1];
    const { pesosEfectivos } = calcularNotaFinalPonderada(tiposPresentes, pesosConfig);

    return {
      cursoSeccionId,
      cursoNombre: curso.cursoNombre,
      seccionNombre: curso.seccionNombre,
      periodoId: periodo.id,
      periodoNombre: periodo.nombre,
      pesosConfig,
      pesosEfectivos,
      tareas: tareas.map((t) => ({
        id: t.id,
        titulo: t.titulo,
        tipo: t.tipo,
        fechaLimite: t.fechaLimite,
      })),
      estudiantes: filasEstudiantes,
    };
  }

  async exportarExcelLibroNotas(
    usuario: AuthenticatedUser,
    cursoSeccionId: string,
    periodoId: string | undefined,
    contexto: ContextoLibroNotas,
  ): Promise<Buffer> {
    const libro = await this.obtenerLibroNotas(usuario, cursoSeccionId, periodoId);
    return generarExcelLibroNotas(
      {
        cursoNombre: libro.cursoNombre,
        seccionNombre: libro.seccionNombre,
        periodoNombre: libro.periodoNombre,
        tareas: libro.tareas,
        estudiantes: libro.estudiantes.map((e) => ({
          codigo: e.codigo,
          nombreCompleto: e.estudianteNombre,
          notasPorTarea: Object.fromEntries(
            Object.entries(e.notasPorTarea).map(([tId, info]) => [tId, info.nota]),
          ),
          promediosPorTipo: e.promediosPorTipo,
          notaFinal: e.notaFinal,
          notaLiteral: e.notaLiteral,
        })),
      },
      contexto,
    );
  }

  async obtenerNotasEstudiante(
    usuario: AuthenticatedUser,
    estudianteId: string,
    periodoId?: string,
  ): Promise<Record<string, unknown>[]> {
    if (usuario.role === "Estudiante" && estudianteId !== usuario.personaId) {
      throw new ForbiddenException(MENSAJES_AULA_VIRTUAL.SIN_ACCESO_AULA);
    }
    if (usuario.role === "Apoderado") {
      const esSuHijo =
        (await this.repository.esApoderadoDeEstudiante?.(usuario.personaId, estudianteId)) ?? false;
      if (!esSuHijo) {
        throw new ForbiddenException(MENSAJES_AULA_VIRTUAL.SIN_ACCESO_AULA);
      }
    }

    const anioId = await this.ctx.anioDeTrabajo();
    const periodoTarget = periodoId
      ? await this.ctx.requerirPeriodo(periodoId)
      : await this.ctx.periodoEnCursoDelAnio();

    const cursosEstudiante = await this.repository.cursosDelEstudiante(estudianteId, anioId);
    const resultado: Record<string, unknown>[] = [];

    for (const c of cursosEstudiante) {
      const curso = await this.ctx.requerirCurso(c.cursoSeccionId);
      const tareas = await this.repository.listarTareas(c.cursoSeccionId, {
        periodoId: periodoTarget.id,
        soloPublicadas: true,
      });
      const matricula = await this.repository.findMatriculaDeEstudiante(
        curso.seccionId,
        estudianteId,
      );
      if (!matricula) continue;

      const tareasConNota: Record<string, unknown>[] = [];
      const notasAgrupadas: Partial<Record<TipoTarea, number[]>> = {};

      for (const t of tareas) {
        const entregas = await this.repository.findEntregasDeEstudiante(t.id, matricula.id);
        const calificadas = entregas.filter((e) => e.nota !== null && e.nota !== undefined);
        let nota: number | null = null;
        if (calificadas.length > 0) {
          nota = calcularNotaDeIntentos(
            calificadas.map((e) => e.nota as number),
            t.calculoNotaIntentos,
          );
          if (!notasAgrupadas[t.tipo]) notasAgrupadas[t.tipo] = [];
          notasAgrupadas[t.tipo]!.push(nota);
        }
        tareasConNota.push({
          tareaId: t.id,
          titulo: t.titulo,
          tipo: t.tipo,
          fechaLimite: t.fechaLimite,
          nota,
          estadoEntrega: entregas[entregas.length - 1]?.estado || "sin_entregar",
        });
      }

      const pesosConfig = await this.repository.obtenerPesosVariables();
      const ponderacion = calcularNotaFinalPonderada(notasAgrupadas, pesosConfig);

      resultado.push({
        cursoSeccionId: c.cursoSeccionId,
        cursoNombre: c.cursoNombre,
        seccionNombre: c.seccionNombre,
        docenteNombre: c.docenteNombre,
        tareas: tareasConNota,
        promediosPorTipo: ponderacion.promediosPorTipo,
        notaFinal: ponderacion.notaFinal,
        notaLiteral: convertirNotaALiteral(ponderacion.notaFinal),
      });
    }

    return resultado;
  }
}
