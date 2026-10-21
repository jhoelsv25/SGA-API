import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { AnioLectivoCls } from "../../common/anio-lectivo";
import { AuditService } from "../../common/services/audit.service";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { AniosAcademicosService } from "../anio-escolar/anios.service";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import { VariablesSistemaService } from "../variables-sistema/variables-sistema.service";
import { ahoraEnColegio } from "../marcaciones/utils";
import { TurnosRepository } from "../turnos/repositories/turnos.repository";
import {
  MENSAJES_ASISTENCIA,
  ROLES_CONSULTA_ASISTENCIA,
  ROLES_JUSTIFICAN_FALTA,
  mensajeAsistenciaGuardada,
  type EstadoAsistencia,
} from "./constants";
import type {
  AsistenciaCursoDto,
  AsistenciaEstudianteResponseDto,
  AsistenciaSeccionResponseDto,
  ConsultaAsistenciaQueryDto,
  EstudianteListaAsistenciaDto,
  EstudianteVinculadoDto,
  GuardarAsistenciaDto,
  GuardarAsistenciaResponseDto,
  JustificarFaltaDto,
  ListaAsistenciaSesionResponseDto,
  ResumenEstudianteSeccionDto,
  SeccionConsultableDto,
} from "./dto";
import type { SesionParaAsistencia } from "./interfaces";
import { AsistenciaClaseRepository } from "./repositories";
import { diasConClases, faltasAlColegio, resumirEstados } from "./utils";

@Injectable()
export class AsistenciaClaseService {
  constructor(
    private readonly repository: AsistenciaClaseRepository,
    private readonly turnosRepository: TurnosRepository,
    private readonly aniosService: AniosAcademicosService,
    private readonly anioLectivoCls: AnioLectivoCls,
    private readonly auditService: AuditService,
    @Optional() private readonly notificacionesService?: NotificacionesService,
    @Optional() private readonly variablesService?: VariablesSistemaService,
  ) {}

  /** Lista de la sesión: todos presentes por defecto, con la señal "No marcó ingreso". */
  async listaDeSesion(
    sesionId: string,
    usuario: AuthenticatedUser,
  ): Promise<ListaAsistenciaSesionResponseDto> {
    const sesion = await this.requireSesion(sesionId);
    const docenteId = await this.repository.findDocenteIdPorPersona(usuario.personaId);
    const puedeVer =
      this.esRolDeConsulta(usuario) ||
      docenteId === sesion.docenteId ||
      docenteId === sesion.tutorId;
    if (!puedeVer) {
      throw new ForbiddenException(MENSAJES_ASISTENCIA.SESION_AJENA);
    }
    const estudiantes = await this.repository.listarEstudiantesDeSesion(sesion);
    return {
      sesionId: sesion.id,
      fecha: sesion.fecha,
      cursoSeccionId: sesion.cursoSeccionId,
      cursoNombre: sesion.cursoNombre,
      seccionNombre: sesion.seccionNombre,
      editable: (await this.esEditable(sesion)) && Boolean(sesion.firmadaInicioEn),
      estudiantes,
    };
  }

  async guardar(
    sesionId: string,
    dto: GuardarAsistenciaDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<GuardarAsistenciaResponseDto> {
    const sesion = await this.requireSesion(sesionId);
    const docenteId = await this.repository.findDocenteIdPorPersona(usuario.personaId);
    if (!docenteId || docenteId !== sesion.docenteId) {
      throw new ForbiddenException(MENSAJES_ASISTENCIA.SESION_AJENA);
    }
    if (!(await this.esEditable(sesion))) {
      throw new ForbiddenException(MENSAJES_ASISTENCIA.FUERA_DE_PLAZO);
    }
    if (!sesion.firmadaInicioEn) {
      throw new BadRequestException(MENSAJES_ASISTENCIA.SESION_SIN_FIRMA);
    }

    const lista = await this.repository.listarEstudiantesDeSesion(sesion);
    const vigentes = new Set(lista.map((e) => e.matriculaId));
    if (dto.excepciones.some((e) => !vigentes.has(e.matriculaId))) {
      throw new BadRequestException(MENSAJES_ASISTENCIA.ESTUDIANTE_FUERA_DE_LISTA);
    }
    const excepciones = new Map(dto.excepciones.map((e) => [e.matriculaId, e.estado]));

    const finales = lista.map((e) => {
      const excepcion: EstadoAsistencia = excepciones.get(e.matriculaId) ?? "presente";
      const estado: EstadoAsistencia = e.estado === "falta_justificada" ? e.estado : excepcion;
      return { estudiante: e, estado };
    });

    await this.repository.guardarAsistencia(
      sesion,
      finales
        .filter((f) => f.estudiante.estado !== "falta_justificada")
        .map((f) => ({ matriculaId: f.estudiante.matriculaId, estado: f.estado })),
      usuario.id,
    );

    const resumen = resumirEstados(finales.map((f) => f.estado));
    await this.auditarGuardado(sesion, finales, lista, usuario.id, ip);

    // Enviar alerta a apoderados si el switch está encendido en configuración
    await this.despacharAlertasInasistencia(sesion, finales);

    return {
      mensaje: mensajeAsistenciaGuardada(resumen.presentes, resumen.tardanzas, resumen.faltas),
      resumen,
    };
  }

  /** La Secretaria o el tutor de la sección cambian una falta a falta_justificada. */
  async justificarFalta(
    id: string,
    dto: JustificarFaltaDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<{ id: string; estado: EstadoAsistencia }> {
    const motivo = dto.motivo?.trim();
    if (!motivo) {
      throw new BadRequestException(MENSAJES_ASISTENCIA.MOTIVO_REQUERIDO);
    }
    const registro = await this.repository.findRegistro(id);
    if (!registro) {
      throw new NotFoundException(MENSAJES_ASISTENCIA.ASISTENCIA_NO_ENCONTRADA);
    }
    const docenteId = await this.repository.findDocenteIdPorPersona(usuario.personaId);
    const esSecretaria = (ROLES_JUSTIFICAN_FALTA as readonly string[]).includes(usuario.role);
    const esTutor = docenteId !== null && docenteId === registro.tutorId;
    if (!esSecretaria && !esTutor) {
      throw new ForbiddenException(MENSAJES_ASISTENCIA.SIN_PERMISO_JUSTIFICAR);
    }
    if (registro.estado !== "falta") {
      throw new BadRequestException(MENSAJES_ASISTENCIA.SOLO_FALTA_SE_JUSTIFICA);
    }

    await this.repository.justificarFalta(id, motivo, dto.documentoUrl?.trim() || null, usuario.id);
    await this.auditService.log({
      usuarioId: usuario.id,
      accion: "actualizar",
      tabla: "asistencias_estudiante",
      registroId: id,
      valorAnterior: { estado: "falta" },
      valorNuevo: {
        estado: "falta_justificada",
        motivo,
        documentoUrl: dto.documentoUrl ?? null,
        fecha: registro.fecha,
      },
      direccionIp: ip,
    });
    return { id, estado: "falta_justificada" };
  }

  /** Estudiantes que el usuario puede consultar: el propio o los hijos del apoderado. */
  async misEstudiantes(usuario: AuthenticatedUser): Promise<EstudianteVinculadoDto[]> {
    return this.repository.estudiantesVinculados(usuario.personaId);
  }

  /** Secciones que el usuario puede consultar: todas para directivos, las que tutoriza para un docente. */
  async misSecciones(usuario: AuthenticatedUser): Promise<SeccionConsultableDto[]> {
    const anioId = this.anioLectivoCls.id();
    const anio = anioId
      ? await this.aniosService.findById(anioId)
      : await this.aniosService.findEnCurso();
    if (this.esRolDeConsulta(usuario)) {
      return this.repository.seccionesConsultables(anio.id, null);
    }
    const docenteId = await this.repository.findDocenteIdPorPersona(usuario.personaId);
    return docenteId ? this.repository.seccionesConsultables(anio.id, docenteId) : [];
  }

  async consultarEstudiante(
    estudianteId: string,
    query: ConsultaAsistenciaQueryDto,
    usuario: AuthenticatedUser,
  ): Promise<AsistenciaEstudianteResponseDto> {
    this.validarRango(query);
    const estudiante = await this.repository.findEstudiante(estudianteId);
    if (!estudiante) {
      throw new NotFoundException(MENSAJES_ASISTENCIA.ESTUDIANTE_NO_ENCONTRADO);
    }
    const matricula = await this.repository.matriculaParaConsulta(
      estudianteId,
      query.desde,
      query.hasta,
    );

    const docenteId = await this.repository.findDocenteIdPorPersona(usuario.personaId);
    const permitido =
      this.esRolDeConsulta(usuario) ||
      usuario.personaId === estudiante.personaId ||
      (docenteId !== null && docenteId === matricula?.tutorId) ||
      (await this.repository.esApoderadoDe(usuario.personaId, estudianteId));
    if (!permitido) {
      throw new ForbiddenException(MENSAJES_ASISTENCIA.SIN_PERMISO_CONSULTA);
    }

    const entradas = await this.repository.entradasDePersonas(
      [estudiante.personaId],
      query.desde,
      query.hasta,
    );
    const faltas = matricula
      ? await this.calcularFaltasColegio(
          [{ ...matricula, personaId: estudiante.personaId }],
          new Map([[estudiante.personaId, new Set(entradas.map((e) => e.fecha))]]),
          query,
        ).then((m) => m.get(matricula.id) ?? [])
      : [];

    const filasCurso = matricula
      ? await this.repository.asistenciaPorCurso([matricula.id], query.desde, query.hasta)
      : [];
    const porCurso = new Map<string, AsistenciaCursoDto>();
    for (const fila of filasCurso) {
      const actual = porCurso.get(fila.cursoSeccionId) ?? {
        cursoSeccionId: fila.cursoSeccionId,
        cursoNombre: fila.cursoNombre,
        totales: resumirEstados([]),
        incidencias: [],
      };
      const totales = resumirEstados([fila.estado]);
      actual.totales = {
        presentes: actual.totales.presentes + totales.presentes,
        tardanzas: actual.totales.tardanzas + totales.tardanzas,
        faltas: actual.totales.faltas + totales.faltas,
        faltasJustificadas: actual.totales.faltasJustificadas + totales.faltasJustificadas,
      };
      if (fila.estado !== "presente") {
        actual.incidencias.push({
          id: fila.id,
          fecha: fila.fecha,
          estado: fila.estado,
          justificacion: fila.justificacion,
        });
      }
      porCurso.set(fila.cursoSeccionId, actual);
    }

    return {
      estudianteId,
      nombreCompleto: estudiante.nombreCompleto,
      desde: query.desde,
      hasta: query.hasta,
      colegio: {
        entradas: entradas.map(({ fecha, hora, resultado, minutosTardanza, justificada }) => ({
          fecha,
          hora,
          resultado,
          minutosTardanza,
          justificada,
        })),
        faltasAlColegio: faltas,
        puntuales: entradas.filter((e) => e.resultado === "puntual").length,
        tardanzas: entradas.filter((e) => e.resultado === "tardanza").length,
        fueraDeTurno: entradas.filter((e) => e.resultado === "fuera_de_turno").length,
      },
      cursos: [...porCurso.values()],
    };
  }

  /** Asistencia de la sección completa: el tutor o los roles de consulta. */
  async consultarSeccion(
    seccionId: string,
    query: ConsultaAsistenciaQueryDto,
    usuario: AuthenticatedUser,
  ): Promise<AsistenciaSeccionResponseDto> {
    this.validarRango(query);
    const seccion = await this.repository.findSeccion(seccionId);
    if (!seccion) {
      throw new NotFoundException(MENSAJES_ASISTENCIA.SECCION_NO_ENCONTRADA);
    }
    const docenteId = await this.repository.findDocenteIdPorPersona(usuario.personaId);
    const esTutor = docenteId !== null && docenteId === seccion.tutorId;
    if (!this.esRolDeConsulta(usuario) && !esTutor) {
      throw new ForbiddenException(MENSAJES_ASISTENCIA.SIN_PERMISO_SECCION);
    }

    const matriculas = await this.repository.matriculasDeSeccion(seccionId);
    const entradas = await this.repository.entradasDePersonas(
      matriculas.map((m) => m.personaId),
      query.desde,
      query.hasta,
    );
    const fechasPorPersona = new Map<string, Set<string>>();
    for (const e of entradas) {
      const fechas = fechasPorPersona.get(e.personaId) ?? new Set<string>();
      fechas.add(e.fecha);
      fechasPorPersona.set(e.personaId, fechas);
    }

    const faltasPorMatricula = await this.calcularFaltasColegio(
      matriculas.map((m) => ({
        id: m.matriculaId,
        personaId: m.personaId,
        anioAcademicoId: seccion.anioAcademicoId,
        fechaMatricula: m.fechaMatricula,
        fechaRetiro: m.fechaRetiro,
      })),
      fechasPorPersona,
      query,
    );
    const filasCurso = await this.repository.asistenciaPorCurso(
      matriculas.map((m) => m.matriculaId),
      query.desde,
      query.hasta,
    );

    const estudiantes: ResumenEstudianteSeccionDto[] = matriculas.map((m) => ({
      estudianteId: m.estudianteId,
      nombreCompleto: m.nombreCompleto,
      faltasColegio: faltasPorMatricula.get(m.matriculaId)?.length ?? 0,
      tardanzasColegio: entradas.filter(
        (e) => e.personaId === m.personaId && e.resultado === "tardanza",
      ).length,
      clases: resumirEstados(
        filasCurso.filter((f) => f.matriculaId === m.matriculaId).map((f) => f.estado),
      ),
    }));

    const dias = await this.diasConClasesDe(seccion.anioAcademicoId, query);
    return {
      seccionId,
      seccionNombre: seccion.nombre,
      desde: query.desde,
      hasta: query.hasta,
      diasConClases: dias.length,
      estudiantes,
    };
  }

  // --- privados -------------------------------------------------------------

  private async requireSesion(sesionId: string): Promise<SesionParaAsistencia> {
    const sesion = await this.repository.findSesion(sesionId);
    if (!sesion) {
      throw new NotFoundException(MENSAJES_ASISTENCIA.SESION_NO_ENCONTRADA);
    }
    return sesion;
  }

  /** Se modifica el mismo día de la sesión y mientras su bimestre siga abierto. */
  private async esEditable(sesion: SesionParaAsistencia): Promise<boolean> {
    if (sesion.fecha !== ahoraEnColegio().fecha) return false;
    return !(await this.aniosService.sesionesBloqueadasEn(sesion.fecha));
  }

  private esRolDeConsulta(usuario: AuthenticatedUser): boolean {
    return (ROLES_CONSULTA_ASISTENCIA as readonly string[]).includes(usuario.role);
  }

  private validarRango(query: ConsultaAsistenciaQueryDto): void {
    if (query.hasta < query.desde) {
      throw new BadRequestException(MENSAJES_ASISTENCIA.RANGO_INVALIDO);
    }
  }

  private async diasConClasesDe(
    anioAcademicoId: string,
    query: ConsultaAsistenciaQueryDto,
  ): Promise<string[]> {
    const turno = await this.turnosRepository.findByAplicaA("estudiantes");
    if (!turno) return [];
    const suspensiones = await this.repository.suspensiones(
      anioAcademicoId,
      query.desde,
      query.hasta,
    );
    return diasConClases(
      query.desde,
      query.hasta,
      ahoraEnColegio().fecha,
      turno.diasLaborables,
      suspensiones,
    );
  }

  /** Falta al colegio = día con clases sin entrada; se calcula, no se guarda. */
  private async calcularFaltasColegio(
    matriculas: {
      id: string;
      personaId: string;
      anioAcademicoId: string;
      fechaMatricula: string;
      fechaRetiro: string | null;
    }[],
    fechasPorPersona: Map<string, Set<string>>,
    query: ConsultaAsistenciaQueryDto,
  ): Promise<Map<string, string[]>> {
    const resultado = new Map<string, string[]>();
    const anioId = matriculas[0]?.anioAcademicoId;
    if (!anioId) return resultado;
    const dias = await this.diasConClasesDe(anioId, query);
    for (const m of matriculas) {
      resultado.set(
        m.id,
        faltasAlColegio(
          dias,
          fechasPorPersona.get(m.personaId) ?? new Set<string>(),
          m.fechaMatricula,
          m.fechaRetiro,
        ),
      );
    }
    return resultado;
  }

  private async auditarGuardado(
    sesion: SesionParaAsistencia,
    finales: { estudiante: EstudianteListaAsistenciaDto; estado: EstadoAsistencia }[],
    previa: EstudianteListaAsistenciaDto[],
    actorId: string,
    ip?: string,
  ): Promise<void> {
    const primeraVez = previa.every((e) => e.asistenciaId === null);
    const cambios = finales
      .filter((f) => f.estudiante.estado !== f.estado)
      .map((f) => ({
        matriculaId: f.estudiante.matriculaId,
        de: f.estudiante.estado,
        a: f.estado,
      }));
    if (!primeraVez && cambios.length === 0) return;

    const resumen = resumirEstados(finales.map((f) => f.estado));
    await this.auditService.log({
      usuarioId: actorId,
      accion: primeraVez ? "crear" : "actualizar",
      tabla: "asistencias_estudiante",
      registroId: sesion.id,
      valorNuevo: {
        cursoSeccionId: sesion.cursoSeccionId,
        fecha: sesion.fecha,
        resumen,
        ...(primeraVez ? {} : { cambios }),
      },
      direccionIp: ip,
    });
  }

  /**
   * Despacha alertas a los apoderados si el switch 'notificacion.aviso_inasistencia_apoderado'
   * está habilitado en la base de datos (RF-004 / RF-010).
   */
  private async despacharAlertasInasistencia(
    sesion: SesionParaAsistencia,
    finales: Array<{ estudiante: EstudianteListaAsistenciaDto; estado: EstadoAsistencia }>,
  ): Promise<void> {
    if (!this.notificacionesService || !this.variablesService) return;

    try {
      const activo = await this.variablesService.isActiva(
        "notificacion.aviso_inasistencia_apoderado",
        true,
      );
      if (!activo) return;

      const faltas = finales.filter((f) => f.estado === "falta");
      if (faltas.length === 0) return;

      const matriculaIds = faltas.map((f) => f.estudiante.matriculaId);
      const destinatarios = await this.repository.findApoderadosUsuariosDeMatriculas(matriculaIds);

      for (const dest of destinatarios) {
        await this.notificacionesService.enviar({
          usuarioId: dest.usuarioId,
          titulo: "Aviso de inasistencia",
          mensaje: `El estudiante ${dest.estudianteNombre} ha registrado falta el día ${sesion.fecha} en la clase de ${sesion.cursoNombre}.`,
          tipo: "alerta",
          enlaceUrl: "/portal/mi-asistencia",
        });
      }
    } catch {
      // Silenciar errores de despacho para no bloquear la transacción principal
    }
  }
}
