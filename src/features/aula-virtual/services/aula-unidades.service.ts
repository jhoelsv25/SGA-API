import { BadRequestException, ForbiddenException, Injectable, Optional } from "@nestjs/common";
import { AnioLectivoCls } from "../../../common/anio-lectivo";
import { AuditService } from "../../../common/services/audit.service";
import { AniosAcademicosService } from "../../anio-escolar/anios.service";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import { ahoraEnColegio } from "../../marcaciones/utils";
import { MENSAJES_AULA_VIRTUAL } from "../constants";
import type {
  ActualizarUnidadDto,
  AulaVirtualResponse,
  CrearUnidadDto,
  CursoAulaResponse,
  UnidadResponse,
} from "../dto";
import type { UnidadFila } from "../interfaces";
import { AulaVirtualRepository } from "../repositories";
import { AulaContextoHelper } from "./aula-contexto.helper";

/**
 * Servicio de dominio para consulta del aula de un curso y gestión
 * de unidades de aprendizaje (RF-015 HU1).
 */
@Injectable()
export class AulaUnidadesService {
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

  /** Cursos con aula virtual del usuario: dicta (docente), supervisa (directivo), cursa (estudiante) o acompaña (apoderado). */
  async misCursos(usuario: AuthenticatedUser): Promise<CursoAulaResponse[]> {
    const anioId = await this.ctx.anioDeTrabajo();
    if (this.ctx.esRolDeSeguimiento(usuario)) {
      return this.repository.cursosDelAnio(anioId);
    }
    if (usuario.role === "Apoderado") {
      return this.repository.cursosDelApoderado(usuario.personaId, anioId);
    }
    const docenteId = await this.repository.findDocenteIdPorPersona(usuario.personaId);
    if (docenteId) {
      const dictados = await this.repository.cursosDelDocente(docenteId, anioId);
      if (dictados.length > 0) return dictados;
    }
    return this.repository.cursosDelEstudiante(usuario.personaId, anioId);
  }

  async obtenerAula(
    cursoSeccionId: string,
    usuario: AuthenticatedUser,
  ): Promise<AulaVirtualResponse> {
    const curso = await this.ctx.requerirCurso(cursoSeccionId);
    const esDocente = await this.ctx.esDocenteDelCurso(curso, usuario);
    const esDirectivo = this.ctx.esRolDeSeguimiento(usuario);
    const esApoderado = usuario.role === "Apoderado";
    let hijosEnCurso: AulaVirtualResponse["hijosEnCurso"] = undefined;

    if (!esDocente && !esDirectivo) {
      if (esApoderado) {
        const hijos =
          (await this.repository.estudiantesDeApoderadoEnSeccion?.(
            usuario.personaId,
            curso.seccionId,
          )) ?? [];
        if (hijos.length === 0) {
          throw new ForbiddenException(MENSAJES_AULA_VIRTUAL.SIN_ACCESO_AULA);
        }
        hijosEnCurso = hijos;
      } else {
        const matriculado = await this.repository.estudianteTieneMatriculaEnSeccion(
          usuario.personaId,
          curso.seccionId,
        );
        if (!matriculado) throw new ForbiddenException(MENSAJES_AULA_VIRTUAL.SIN_ACCESO_AULA);
      }
    }

    const verTodo = esDocente || esDirectivo;
    const rolEnAula: AulaVirtualResponse["rolEnAula"] = esDocente
      ? "docente"
      : esDirectivo
        ? "directivo"
        : esApoderado
          ? "apoderado"
          : "estudiante";

    const [unidades, materiales, dias, tamano, bloques] = await Promise.all([
      this.repository.listarUnidades(cursoSeccionId, !verTodo),
      this.repository.listarMateriales(cursoSeccionId, { soloPublicados: !verTodo }),
      this.ctx.diasPlanificacion(),
      this.ctx.tamanoMaximoMb(),
      esDocente ? this.repository.bloquesDelCurso(cursoSeccionId) : Promise.resolve([]),
    ]);
    const hoy = ahoraEnColegio().fecha;
    const respuestas = await Promise.all(
      materiales.map((m) => this.ctx.armarMaterial(m, hoy, verTodo)),
    );

    return {
      cursoSeccionId: curso.id,
      cursoNombre: curso.cursoNombre,
      seccionNombre: curso.seccionNombre,
      puedeAdministrar: esDocente,
      rolEnAula,
      puedeVerModeracion: verTodo,
      hijosEnCurso,
      diasPlanificacion: dias,
      tamanoMaximoMb: tamano,
      bloques: bloques.map((b) => ({
        id: b.id,
        diaSemana: b.diaSemana,
        horaInicio: b.horaInicio,
        horaFin: b.horaFin,
      })),
      unidades: unidades.map<UnidadResponse>((u) => ({
        id: u.id,
        periodoId: u.periodoId,
        titulo: u.titulo,
        descripcion: u.descripcion,
        orden: u.orden,
        fechaInicio: u.fechaInicio,
        fechaFin: u.fechaFin,
        publicada: u.publicada,
        materiales: respuestas.filter((m) => m.unidadId === u.id),
      })),
    };
  }

  async crearUnidad(
    cursoSeccionId: string,
    dto: CrearUnidadDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<UnidadFila> {
    const curso = await this.ctx.requerirCurso(cursoSeccionId);
    await this.ctx.exigirDocenteDelCurso(curso, usuario);
    if (dto.fechaFin < dto.fechaInicio) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.FECHAS_UNIDAD_INVERTIDAS);
    }
    const periodo = await this.ctx.requerirPeriodo(dto.periodoId);
    if (periodo.anioAcademicoId !== curso.anioAcademicoId) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.BIMESTRE_AJENO);
    }
    const unidad = await this.repository.crearUnidad({
      cursoSeccionId,
      periodoId: dto.periodoId,
      titulo: dto.titulo.trim(),
      descripcion: dto.descripcion?.trim() || null,
      orden: dto.orden ?? (await this.repository.siguienteOrdenUnidad(cursoSeccionId)),
      fechaInicio: dto.fechaInicio,
      fechaFin: dto.fechaFin,
      publicada: dto.publicada ?? true,
    });
    await this.ctx.auditar(
      "crear",
      "unidades_aprendizaje",
      unidad.id,
      usuario.id,
      null,
      { titulo: unidad.titulo, cursoSeccionId, periodoId: dto.periodoId },
      ip,
    );
    return unidad;
  }

  async actualizarUnidad(
    unidadId: string,
    dto: ActualizarUnidadDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<UnidadFila> {
    const unidad = await this.ctx.requerirUnidad(unidadId);
    const curso = await this.ctx.requerirCurso(unidad.cursoSeccionId);
    await this.ctx.exigirDocenteDelCurso(curso, usuario);
    const inicio = dto.fechaInicio ?? unidad.fechaInicio;
    const fin = dto.fechaFin ?? unidad.fechaFin;
    if (inicio && fin && fin < inicio) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.FECHAS_UNIDAD_INVERTIDAS);
    }
    const actualizada = await this.repository.actualizarUnidad(unidadId, {
      titulo: dto.titulo?.trim(),
      descripcion: dto.descripcion === undefined ? undefined : dto.descripcion.trim() || null,
      periodoId: dto.periodoId,
      fechaInicio: dto.fechaInicio,
      fechaFin: dto.fechaFin,
      orden: dto.orden,
      publicada: dto.publicada,
    });
    await this.ctx.auditar(
      "actualizar",
      "unidades_aprendizaje",
      unidadId,
      usuario.id,
      { titulo: unidad.titulo, publicada: unidad.publicada },
      { titulo: actualizada.titulo, publicada: actualizada.publicada },
      ip,
    );
    return actualizada;
  }
}
