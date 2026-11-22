import { BadRequestException, Injectable, Optional } from "@nestjs/common";
import { AnioLectivoCls } from "../../common/anio-lectivo";
import {
  type ColumnaReporte,
  type HojaReporteExtra,
  generarReporteExcel,
  nombreArchivoReporte,
  obtenerTodasLasFilas,
  type ValorCelda,
} from "../../common/excel/reporte-excel.builder";
import { AniosAcademicosService } from "../anio-escolar/anios.service";
import { ApoderadosService } from "../apoderados/apoderados.service";
import type { ApoderadoQueryDto } from "../apoderados/dto";
import { AsistenciaClaseService } from "../asistencia-clase/asistencia-clase.service";
import { DocentesService } from "../docentes/docentes.service";
import type { DocenteQueryDto } from "../docentes/dto";
import { EstudiantesService } from "../estudiantes/estudiantes.service";
import type { EstudianteQueryDto } from "../estudiantes/dto";
import { CAMPOS_PERSONA, PLANTILLAS, TIPO_IMPORTACION } from "../importacion/constants";
import type { CampoPlantilla } from "../importacion/constants";
import { InstitucionService } from "../institucion/institucion.service";
import { LibretasService } from "../libretas/libretas.service";
import { MarcacionesService } from "../marcaciones/marcaciones.service";
import type { MatriculaQueryDto } from "../matriculas/dto";
import { MatriculasService } from "../matriculas/matriculas.service";
import type { PersonaQueryDto } from "../personas/dto";
import type { PersonaResponseDto } from "../personas/dto/persona-response.dto";
import { PersonasService } from "../personas/personas.service";
import { SeccionesService } from "../secciones/secciones.service";
import type { UserQueryDto } from "../users/dto";
import { UsersService } from "../users/users.service";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import type {
  ExportarAsistenciaPersonalQueryDto,
  ExportarAsistenciaSeccionQueryDto,
  ExportarLibretasQueryDto,
  ExportarMarcacionesQueryDto,
} from "./dto";

export interface ReporteGenerado {
  buffer: Buffer;
  nombreArchivo: string;
  totalFilas: number;
}

type Fila = Record<string, ValorCelda>;

const columnasDePlantilla = (campos: CampoPlantilla[]): ColumnaReporte[] =>
  campos.map((c) => ({
    header: c.header,
    key: c.key,
    ancho: c.ancho,
    tipo: c.tipo === "fecha" ? "fecha" : "texto",
    requerido: c.requerido,
  }));

const columna = (
  header: string,
  key: string,
  ancho: number,
  tipo?: "texto" | "fecha" | "numero",
  requerido?: boolean,
): ColumnaReporte => ({
  header,
  key,
  ancho,
  tipo,
  requerido,
});

const siNo = (v: boolean | null | undefined): string | null =>
  v === null || v === undefined ? null : v ? "SI" : "NO";

/** Fecha actual en zona horaria de Lima (AAAA-MM-DD). */
function fechaHoyLima(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Cuenta días laborables (lunes a viernes) entre dos fechas ISO inclusive, acotados hasta hoy. */
function contarDiasLaborables(desdeIso: string, hastaIso: string): number {
  const hoy = fechaHoyLima();
  const limite = hastaIso < hoy ? hastaIso : hoy;
  if (desdeIso > limite) return 0;

  const actual = new Date(`${desdeIso}T12:00:00Z`);
  const fin = new Date(`${limite}T12:00:00Z`);
  let total = 0;

  while (actual <= fin) {
    const dia = actual.getUTCDay();
    if (dia >= 1 && dia <= 5) {
      total += 1;
    }
    actual.setUTCDate(actual.getUTCDate() + 1);
  }
  return total;
}

function filaPersona(p: PersonaResponseDto): Fila {
  return {
    tipoDocumento: p.tipoDocumento,
    numeroDocumento: p.numeroDocumento,
    apellidoPaterno: p.apellidoPaterno,
    apellidoMaterno: p.apellidoMaterno,
    nombres: p.nombres,
    sexo: p.sexo,
    fechaNacimiento: p.fechaNacimiento,
    celular: p.celular,
    correo: p.correo,
    direccion: p.direccion,
    distrito: p.distrito,
  };
}

@Injectable()
export class ExportacionService {
  constructor(
    private readonly personas: PersonasService,
    private readonly estudiantes: EstudiantesService,
    private readonly docentes: DocentesService,
    private readonly apoderados: ApoderadosService,
    private readonly users: UsersService,
    private readonly institucion: InstitucionService,
    @Optional() private readonly matriculas?: MatriculasService,
    @Optional() private readonly marcaciones?: MarcacionesService,
    @Optional() private readonly libretas?: LibretasService,
    @Optional() private readonly anios?: AniosAcademicosService,
    @Optional() private readonly anioLectivo?: AnioLectivoCls,
    @Optional() private readonly asistenciaClase?: AsistenciaClaseService,
    @Optional() private readonly secciones?: SeccionesService,
  ) {}

  private async generar(
    user: AuthenticatedUser,
    modulo: string,
    titulo: string,
    columnas: ColumnaReporte[],
    filas: Fila[],
    filtros: Record<string, string | undefined>,
    opcionesExtra?: { anioAcademico?: string; hojasExtra?: HojaReporteExtra[] },
  ): Promise<ReporteGenerado> {
    const inst = await this.institucion.get().catch(() => null);
    const buffer = await generarReporteExcel({
      titulo,
      modulo,
      columnas,
      filas,
      filtros,
      generadoPor: user.username,
      institucion: inst?.nombre ?? "SGA Colegio",
      anioAcademico: opcionesExtra?.anioAcademico,
      hojasExtra: opcionesExtra?.hojasExtra,
    });
    return { buffer, nombreArchivo: nombreArchivoReporte(modulo), totalFilas: filas.length };
  }

  private async resolverAnioDeTrabajo(anioAcademicoId?: string) {
    if (!this.anios) return null;
    const id = anioAcademicoId ?? this.anioLectivo?.id();
    try {
      return id ? await this.anios.findById(id) : await this.anios.findEnCurso();
    } catch {
      return null;
    }
  }

  async personasExcel(q: PersonaQueryDto, user: AuthenticatedUser): Promise<ReporteGenerado> {
    const data = await obtenerTodasLasFilas((cursor, limit) =>
      this.personas.findAll({ ...q, cursor, limit }),
    );
    const columnas = [
      ...columnasDePlantilla(CAMPOS_PERSONA),
      columna("Condición en el padrón", "condicion", 22),
      columna("Fichas", "fichas", 28),
      columna("Cargo vigente", "cargoVigente", 24),
      columna("Registrado el", "creadoEn", 16, "fecha"),
    ];
    const filas = data.map((p) => ({
      ...filaPersona(p),
      condicion: p.esProvisional ? "Provisional" : "Completo",
      fichas: [
        p.fichas.esDocente && "Docente",
        p.fichas.esEstudiante && "Estudiante",
        p.fichas.esApoderado && "Apoderado",
      ]
        .filter(Boolean)
        .join(", "),
      cargoVigente: p.cargoVigente,
      creadoEn: p.creadoEn,
    }));
    return this.generar(user, "personas", "Padrón de personas", columnas, filas, {
      Búsqueda: q.search,
      "Tipo de documento": q.tipoDocumento,
    });
  }

  async estudiantesExcel(q: EstudianteQueryDto, user: AuthenticatedUser): Promise<ReporteGenerado> {
    const data = await obtenerTodasLasFilas((cursor, limit) =>
      this.estudiantes.findAll({ ...q, cursor, limit }),
    );
    const campos = PLANTILLAS[TIPO_IMPORTACION.ESTUDIANTES].campos;
    const columnas = [
      ...columnasDePlantilla(campos),
      columna("Estado", "estado", 16),
      columna("Usuario del sistema", "usuario", 22),
    ];
    const filas = data.map((e) => ({
      ...filaPersona(e.persona),
      fechaIngreso: e.fechaIngreso,
      codigoSiagie: e.codigo,
      lenguaMaterna: e.lenguaMaterna,
      religion: e.religion,
      tieneDiscapacidad: siNo(e.tieneDiscapacidad),
      detalleDiscapacidad: e.detalleDiscapacidad,
      estado: e.estado,
      usuario: e.usuario?.nombreUsuario,
    }));
    return this.generar(user, "estudiantes", "Estudiantes", columnas, filas, {
      Búsqueda: q.search,
    });
  }

  async docentesExcel(q: DocenteQueryDto, user: AuthenticatedUser): Promise<ReporteGenerado> {
    const data = await obtenerTodasLasFilas((cursor, limit) =>
      this.docentes.findAll({ ...q, cursor, limit }),
    );
    const campos = PLANTILLAS[TIPO_IMPORTACION.DOCENTES].campos;
    const columnas = [
      ...columnasDePlantilla(campos),
      columna("Estado", "estado", 14),
      columna("Cargo vigente", "cargoVigente", 24),
      columna("Usuario del sistema", "usuario", 22),
    ];
    const filas = data.map((d) => ({
      ...filaPersona(d.persona),
      codigoDocente: d.codigo,
      tipoContrato: d.tipoContrato,
      jornada: String(d.jornadaHoras),
      fechaIngreso: d.fechaIngreso,
      especialidad: d.especialidad,
      tituloProfesional: d.tituloProfesional,
      estado: d.estado,
      cargoVigente: d.cargoVigente,
      usuario: d.usuario?.nombreUsuario,
    }));
    return this.generar(user, "docentes", "Docentes", columnas, filas, { Búsqueda: q.search });
  }

  /** Una fila por vínculo estudiante–apoderado (un apoderado sin vínculos sale en una fila sola). */
  async apoderadosExcel(q: ApoderadoQueryDto, user: AuthenticatedUser): Promise<ReporteGenerado> {
    const data = await obtenerTodasLasFilas((cursor, limit) =>
      this.apoderados.findAll({ ...q, cursor, limit }),
    );
    const campos = PLANTILLAS[TIPO_IMPORTACION.APODERADOS].campos;
    const columnas = [
      ...columnasDePlantilla(campos),
      columna("Ocupación", "ocupacion", 24),
      columna("Centro laboral", "centroLaboral", 28),
      columna("Estudiante", "estudiante", 32),
    ];
    const filas: Fila[] = data.flatMap((a) => {
      const base = {
        ...filaPersona(a.persona),
        ocupacion: a.ocupacion,
        centroLaboral: a.centroLaboral,
      };
      if (!a.estudiantes.length) return [base];
      return a.estudiantes.map((v) => ({
        ...base,
        codigoSiagieEstudiante: v.codigoSiagie,
        parentesco: v.parentesco,
        esPrincipal: siNo(v.esPrincipal),
        estudiante: v.nombreCompleto,
      }));
    });
    return this.generar(user, "apoderados", "Apoderados", columnas, filas, { Búsqueda: q.search });
  }

  async usuariosExcel(q: UserQueryDto, user: AuthenticatedUser): Promise<ReporteGenerado> {
    const data = await obtenerTodasLasFilas((cursor, limit) =>
      this.users.findUsers({ ...q, cursor, limit }),
    );
    const columnas = [
      columna("Usuario", "usuario", 22),
      columna("Número de documento", "documento", 20),
      columna("Apellidos y nombres", "nombre", 36),
      columna("Correo", "correo", 30),
      columna("Rol", "rol", 20),
      columna("Estado", "estado", 14),
      columna("Último acceso", "ultimoAcceso", 18, "fecha"),
      columna("Creado el", "creadoEn", 16, "fecha"),
    ];
    const filas = data.map((u) => ({
      usuario: u.nombreUsuario,
      documento: u.persona.numeroDocumento,
      nombre: `${u.persona.apellidoPaterno} ${u.persona.apellidoMaterno ?? ""} ${u.persona.nombres}`
        .replace(/\s+/g, " ")
        .trim(),
      correo: u.persona.correo,
      rol: u.rol.nombre,
      estado: u.estado,
      ultimoAcceso: u.ultimoAcceso,
      creadoEn: u.creadoEn,
    }));
    return this.generar(user, "usuarios", "Usuarios del sistema", columnas, filas, {
      Búsqueda: q.search,
    });
  }

  /** Nómina oficial de matrículas del año académico con los filtros activos. */
  async matriculasExcel(q: MatriculaQueryDto, user: AuthenticatedUser): Promise<ReporteGenerado> {
    if (!this.matriculas) {
      throw new BadRequestException("Servicio de matrículas no disponible.");
    }
    const anio = await this.resolverAnioDeTrabajo(q.anioAcademicoId);
    const anioAcademicoId = q.anioAcademicoId ?? anio?.id;

    const data = await obtenerTodasLasFilas((cursor, limit) =>
      this.matriculas!.findAll({ ...q, anioAcademicoId, cursor, limit }),
    );

    const columnas: ColumnaReporte[] = [
      columna("Código matrícula", "codigo", 18, "texto", true),
      columna("Año académico", "anioNumero", 14, "numero", true),
      columna("Grado", "gradoNombre", 20, "texto", true),
      columna("Sección", "seccionNombre", 12, "texto", true),
      columna("Código SIAGIE", "codigoEstudiante", 18, "texto", true),
      columna("Tipo documento", "tipoDocumento", 16, "texto", true),
      columna("Número documento", "numeroDocumento", 18, "texto", true),
      columna("Apellidos", "apellidos", 28, "texto", true),
      columna("Nombres", "nombres", 24, "texto", true),
      columna("Tipo matrícula", "tipo", 16, "texto"),
      columna("Repitente", "esRepitente", 12, "texto"),
      columna("Estado", "estado", 14, "texto"),
      columna("Fecha matrícula", "fechaMatricula", 16, "fecha"),
      columna("Fecha retiro", "fechaRetiro", 16, "fecha"),
      columna("Motivo retiro", "motivoRetiro", 28, "texto"),
      columna("Colegio procedencia", "colegioProcedencia", 28, "texto"),
    ];

    const filas: Fila[] = data.map((m) => ({
      codigo: m.codigo,
      anioNumero: m.anioNumero,
      gradoNombre: m.gradoNombre,
      seccionNombre: m.seccionNombre,
      codigoEstudiante: m.estudiante.codigo,
      tipoDocumento: m.estudiante.tipoDocumento,
      numeroDocumento: m.estudiante.numeroDocumento,
      apellidos: m.estudiante.apellidos,
      nombres: m.estudiante.nombres,
      tipo: m.tipo,
      esRepitente: siNo(m.esRepitente),
      estado: m.estado,
      fechaMatricula: m.fechaMatricula,
      fechaRetiro: m.fechaRetiro,
      motivoRetiro: m.motivoRetiro,
      colegioProcedencia: m.colegioProcedencia,
    }));

    return this.generar(
      user,
      "matriculas",
      "Nómina de matrículas",
      columnas,
      filas,
      {
        Tipo: q.tipo,
        Estado: q.estado,
        Búsqueda: q.search,
      },
      { anioAcademico: anio ? String(anio.anio) : undefined },
    );
  }

  /** Reporte Excel de asistencia / marcaciones filtrado por bimestre o rango de fechas. */
  async marcacionesExcel(
    q: ExportarMarcacionesQueryDto,
    user: AuthenticatedUser,
  ): Promise<ReporteGenerado> {
    if (!this.marcaciones) {
      throw new BadRequestException("Servicio de marcaciones no disponible.");
    }

    const anio = await this.resolverAnioDeTrabajo();
    let desde = q.desde;
    let hasta = q.hasta;
    let etiquetaPeriodo: string | undefined;

    if (q.periodoId) {
      const bimestre = anio?.bimestres.find((b) => b.id === q.periodoId);
      if (!bimestre) {
        throw new BadRequestException(
          "El período seleccionado no pertenece al año académico de trabajo.",
        );
      }
      desde = desde ?? bimestre.fechaInicio.slice(0, 10);
      hasta = hasta ?? bimestre.fechaFin.slice(0, 10);
      etiquetaPeriodo = `Bimestre ${bimestre.nombre}`;
    } else if (!desde || !hasta) {
      if (!anio) {
        throw new BadRequestException(
          "Indique un período o un rango de fechas (desde y hasta) para exportar asistencia.",
        );
      }
      desde = desde ?? anio.fechaInicio.slice(0, 10);
      hasta = hasta ?? anio.fechaFin.slice(0, 10);
    }

    const fechaInicio = desde;
    const fechaFin = hasta;

    const data = await obtenerTodasLasFilas((cursor, limit) =>
      this.marcaciones!.reporte({
        desde: fechaInicio,
        hasta: fechaFin,
        seccionId: q.seccionId,
        personaId: q.personaId,
        tipoPersona: q.tipoPersona,
        cursor,
        limit,
      }),
    );

    const columnas: ColumnaReporte[] = [
      columna("Fecha", "fecha", 14, "fecha", true),
      columna("Hora", "hora", 12, "texto", true),
      columna("Apellidos y nombres", "nombreCompleto", 34, "texto", true),
      columna("Tipo persona", "tipoPersona", 16, "texto", true),
      columna("Tipo marcación", "tipo", 16, "texto", true),
      columna("Origen", "origen", 14, "texto"),
      columna("Resultado", "resultado", 18, "texto", true),
      columna("Minutos tardanza", "minutosTardanza", 18, "numero"),
      columna("Justificada", "justificada", 14, "texto"),
      columna("Motivo justificación", "motivoJustificacion", 32, "texto"),
      columna("Observación", "observacion", 30, "texto"),
    ];

    const filas: Fila[] = data.map((m) => ({
      fecha: m.fechaHora.slice(0, 10),
      hora: m.fechaHora.slice(11, 19),
      nombreCompleto: m.nombreCompleto,
      tipoPersona: m.tipoPersona,
      tipo: m.tipo,
      origen: m.origen,
      resultado: m.resultado,
      minutosTardanza: m.minutosTardanza,
      justificada: siNo(m.justificada),
      motivoJustificacion: m.motivoJustificacion,
      observacion: m.observacion,
    }));

    return this.generar(
      user,
      "marcaciones",
      "Reporte de asistencia y marcaciones",
      columnas,
      filas,
      {
        Período: etiquetaPeriodo,
        Desde: fechaInicio,
        Hasta: fechaFin,
        "Tipo de persona": q.tipoPersona,
      },
      { anioAcademico: anio ? String(anio.anio) : undefined },
    );
  }

  /** Reporte Excel de entrega y lectura de Libretas SIAGIE (resumen por sección + detalle por estudiante). */
  async libretasExcel(
    q: ExportarLibretasQueryDto,
    user: AuthenticatedUser,
  ): Promise<ReporteGenerado> {
    if (!this.libretas) {
      throw new BadRequestException("Servicio de libretas no disponible.");
    }

    const anio = await this.resolverAnioDeTrabajo();
    const bimestre = anio?.bimestres.find((b) => b.id === q.periodoId);
    const actor = {
      id: user.id,
      roleId: user.roleId,
      role: user.role,
      personaId: user.personaId,
    };

    const seg = await this.libretas.seguimiento(q.periodoId, actor);
    let seccionesFiltradas = seg.secciones;
    let etiquetaGrado: string | undefined;

    if (q.seccionId) {
      seccionesFiltradas = seg.secciones.filter((s) => s.seccionId === q.seccionId);
    } else if (q.gradoId && this.secciones) {
      const delGrado = await this.secciones.findAll({ gradoId: q.gradoId, estado: "activa" });
      const idsGrado = new Set(delGrado.map((s) => s.id));
      seccionesFiltradas = seg.secciones.filter((s) => idsGrado.has(s.seccionId));
      etiquetaGrado = delGrado[0]?.gradoNombre;
    }

    const columnasResumen: ColumnaReporte[] = [
      columna("Grado", "gradoNombre", 22, "texto", true),
      columna("Sección", "seccionNombre", 12, "texto", true),
      columna("Programadas", "programadas", 14, "numero", true),
      columna("A tiempo", "aTiempo", 14, "numero", true),
      columna("Fuera de plazo", "fueraDePlazo", 16, "numero"),
      columna("Pendientes", "pendientes", 14, "numero"),
      columna("% A tiempo", "porcentajeATiempo", 14, "numero"),
      columna("Vistas por familia", "vistas", 18, "numero"),
    ];

    const filasResumen: Fila[] = seccionesFiltradas.map((s) => ({
      gradoNombre: s.gradoNombre,
      seccionNombre: s.seccionNombre,
      programadas: s.programadas,
      aTiempo: s.aTiempo,
      fueraDePlazo: s.fueraDePlazo,
      pendientes: s.pendientes,
      porcentajeATiempo: s.porcentajeATiempo,
      vistas: s.vistas,
    }));

    const filasDetalle: Fila[] = [];
    for (const sec of seccionesFiltradas) {
      const detalle = await this.libretas.detalle(sec.seccionId, q.periodoId, actor);
      for (const item of detalle) {
        filasDetalle.push({
          gradoNombre: sec.gradoNombre,
          seccionNombre: sec.seccionNombre,
          codigo: item.codigo,
          nombreCompleto: item.nombreCompleto,
          estado: item.estado,
          fechaLimite: item.fechaLimite,
          visto: siNo(Boolean(item.vistoEn)),
          vistoEn: item.vistoEn ? item.vistoEn.slice(0, 10) : null,
        });
      }
    }

    const columnasDetalle: ColumnaReporte[] = [
      columna("Grado", "gradoNombre", 22, "texto", true),
      columna("Sección", "seccionNombre", 12, "texto", true),
      columna("Código SIAGIE", "codigo", 18, "texto", true),
      columna("Estudiante", "nombreCompleto", 34, "texto", true),
      columna("Estado libreta", "estado", 16, "texto", true),
      columna("Fecha límite", "fechaLimite", 16, "fecha"),
      columna("Vista por familia", "visto", 18, "texto"),
      columna("Fecha primera vista", "vistoEn", 20, "fecha"),
    ];

    return this.generar(
      user,
      "libretas",
      "Seguimiento de libretas SIAGIE",
      columnasResumen,
      filasResumen,
      {
        Período: bimestre ? `Bimestre ${bimestre.nombre}` : q.periodoId,
        Grado: etiquetaGrado,
        Sección:
          q.seccionId && seccionesFiltradas[0]
            ? `${seccionesFiltradas[0].gradoNombre} ${seccionesFiltradas[0].seccionNombre}`
            : undefined,
      },
      {
        anioAcademico: anio ? String(anio.anio) : undefined,
        hojasExtra: [{ nombre: "Detalle", columnas: columnasDetalle, filas: filasDetalle }],
      },
    );
  }

  /** Asistencia consolidada (al colegio y por curso) de una sección, un grado o todo el colegio. */
  async asistenciaSeccionExcel(
    q: ExportarAsistenciaSeccionQueryDto,
    user: AuthenticatedUser,
  ): Promise<ReporteGenerado> {
    if (!this.asistenciaClase) {
      throw new BadRequestException("Servicio de asistencia en clase no disponible.");
    }

    const anio = await this.resolverAnioDeTrabajo();
    let desde = q.desde;
    let hasta = q.hasta;
    let etiquetaPeriodo: string | undefined;

    if (q.periodoId) {
      const bimestre = anio?.bimestres.find((b) => b.id === q.periodoId);
      if (!bimestre) {
        throw new BadRequestException(
          "El período seleccionado no pertenece al año académico de trabajo.",
        );
      }
      desde = desde ?? bimestre.fechaInicio.slice(0, 10);
      hasta = hasta ?? bimestre.fechaFin.slice(0, 10);
      etiquetaPeriodo = `Bimestre ${bimestre.nombre}`;
    } else if (!desde || !hasta) {
      if (!anio) {
        throw new BadRequestException(
          "Indique un período o un rango de fechas (desde y hasta) para exportar asistencia.",
        );
      }
      desde = desde ?? anio.fechaInicio.slice(0, 10);
      hasta = hasta ?? anio.fechaFin.slice(0, 10);
    }

    const fechaDesde = desde;
    const fechaHasta = hasta;

    let seccionIds: string[] = [];
    let etiquetaGrado: string | undefined;

    if (q.seccionId) {
      seccionIds = [q.seccionId];
    } else if (this.secciones) {
      const lista = await this.secciones.findAll({
        gradoId: q.gradoId,
        estado: "activa",
      });
      seccionIds = lista.map((s) => s.id);
      if (q.gradoId) etiquetaGrado = lista[0]?.gradoNombre;
    }

    if (seccionIds.length === 0) {
      throw new BadRequestException(
        "No se encontraron secciones activas para exportar la asistencia.",
      );
    }

    const filas: Fila[] = [];
    let rangoDesde = fechaDesde;
    let rangoHasta = fechaHasta;

    for (const seccionId of seccionIds) {
      const res = await this.asistenciaClase.consultarSeccion(
        seccionId,
        { desde: fechaDesde, hasta: fechaHasta },
        user,
      );
      rangoDesde = rangoDesde ?? res.desde;
      rangoHasta = rangoHasta ?? res.hasta;

      for (const est of res.estudiantes) {
        filas.push({
          seccion: res.seccionNombre,
          estudiante: est.nombreCompleto,
          diasConClases: res.diasConClases,
          faltasColegio: est.faltasColegio,
          tardanzasColegio: est.tardanzasColegio,
          presentesClase: est.clases.presentes,
          tardanzasClase: est.clases.tardanzas,
          faltasClase: est.clases.faltas,
          faltasJustificadas: est.clases.faltasJustificadas,
        });
      }
    }

    const columnas: ColumnaReporte[] = [
      columna("Sección", "seccion", 16, "texto", true),
      columna("Estudiante", "estudiante", 36, "texto", true),
      columna("Días con clases", "diasConClases", 16, "numero"),
      columna("Faltas al colegio", "faltasColegio", 18, "numero", true),
      columna("Tardanzas al colegio", "tardanzasColegio", 20, "numero"),
      columna("Presentes en clase", "presentesClase", 18, "numero"),
      columna("Tardanzas en clase", "tardanzasClase", 18, "numero"),
      columna("Faltas en clase", "faltasClase", 16, "numero", true),
      columna("Faltas justificadas", "faltasJustificadas", 18, "numero"),
    ];

    return this.generar(
      user,
      "asistencia-seccion",
      "Asistencia consolidada por sección",
      columnas,
      filas,
      {
        Período: etiquetaPeriodo,
        Grado: etiquetaGrado,
        Desde: rangoDesde,
        Hasta: rangoHasta,
      },
      { anioAcademico: anio ? String(anio.anio) : undefined },
    );
  }

  /** Asistencia consolidada de docentes y personal administrativo (resumen por persona + detalle de marcaciones). */
  async asistenciaPersonalExcel(
    q: ExportarAsistenciaPersonalQueryDto,
    user: AuthenticatedUser,
  ): Promise<ReporteGenerado> {
    if (!this.marcaciones) {
      throw new BadRequestException("Servicio de marcaciones no disponible.");
    }

    const anio = await this.resolverAnioDeTrabajo();
    let desde = q.desde;
    let hasta = q.hasta;
    let etiquetaPeriodo: string | undefined;

    if (q.periodoId) {
      const bimestre = anio?.bimestres.find((b) => b.id === q.periodoId);
      if (!bimestre) {
        throw new BadRequestException(
          "El período seleccionado no pertenece al año académico de trabajo.",
        );
      }
      desde = desde ?? bimestre.fechaInicio.slice(0, 10);
      hasta = hasta ?? bimestre.fechaFin.slice(0, 10);
      etiquetaPeriodo = `Bimestre ${bimestre.nombre}`;
    } else if (!desde || !hasta) {
      if (!anio) {
        throw new BadRequestException(
          "Indique un período o un rango de fechas (desde y hasta) para exportar asistencia del personal.",
        );
      }
      desde = desde ?? anio.fechaInicio.slice(0, 10);
      hasta = hasta ?? anio.fechaFin.slice(0, 10);
    }

    const fechaDesde = desde;
    const fechaHasta = hasta;
    const diasLaborables = contarDiasLaborables(fechaDesde, fechaHasta);

    const incluirDocentes = !q.tipoPersona || q.tipoPersona === "docentes";
    const incluirAdmins = !q.tipoPersona || q.tipoPersona === "administrativos";

    const marcacionesPersonal = [
      ...(incluirDocentes
        ? await obtenerTodasLasFilas((cursor, limit) =>
            this.marcaciones!.reporte({
              desde: fechaDesde,
              hasta: fechaHasta,
              tipoPersona: "docentes",
              cursor,
              limit,
            }),
          )
        : []),
      ...(incluirAdmins
        ? await obtenerTodasLasFilas((cursor, limit) =>
            this.marcaciones!.reporte({
              desde: fechaDesde,
              hasta: fechaHasta,
              tipoPersona: "administrativos",
              cursor,
              limit,
            }),
          )
        : []),
    ];

    interface AcumuladorPersonal {
      personaId: string;
      tipoPersonal: string;
      documento: string | null;
      nombreCompleto: string;
      cargoEspecialidad: string | null;
      fechasEntrada: Set<string>;
      puntuales: number;
      tardanzas: number;
      minutosTardanza: number;
      tardanzasJustificadas: number;
      salidasAnticipadas: number;
    }

    const mapa = new Map<string, AcumuladorPersonal>();

    if (incluirDocentes) {
      const docentesActivos = await obtenerTodasLasFilas((cursor, limit) =>
        this.docentes.findAll({ estado: "activo", cursor, limit }),
      );
      for (const d of docentesActivos) {
        const apellidos = [d.persona.apellidoPaterno, d.persona.apellidoMaterno]
          .filter(Boolean)
          .join(" ");
        const nombreCompleto = `${apellidos}, ${d.persona.nombres}`.replace(/\s+/g, " ").trim();
        mapa.set(d.personaId, {
          personaId: d.personaId,
          tipoPersonal: "Docente",
          documento: d.persona.numeroDocumento,
          nombreCompleto,
          cargoEspecialidad: d.cargoVigente ?? d.especialidad ?? null,
          fechasEntrada: new Set(),
          puntuales: 0,
          tardanzas: 0,
          minutosTardanza: 0,
          tardanzasJustificadas: 0,
          salidasAnticipadas: 0,
        });
      }
    }

    for (const m of marcacionesPersonal) {
      const fecha = m.fechaHora.slice(0, 10);
      let acc = mapa.get(m.personaId);
      if (!acc) {
        acc = {
          personaId: m.personaId,
          tipoPersonal: m.tipoPersona === "docentes" ? "Docente" : "Administrativo",
          documento: null,
          nombreCompleto: m.nombreCompleto,
          cargoEspecialidad: null,
          fechasEntrada: new Set(),
          puntuales: 0,
          tardanzas: 0,
          minutosTardanza: 0,
          tardanzasJustificadas: 0,
          salidasAnticipadas: 0,
        };
        mapa.set(m.personaId, acc);
      }

      if (m.tipo === "entrada") {
        acc.fechasEntrada.add(fecha);
        if (m.resultado === "puntual") {
          acc.puntuales += 1;
        } else if (m.resultado === "tardanza") {
          acc.tardanzas += 1;
          acc.minutosTardanza += m.minutosTardanza;
          if (m.justificada) acc.tardanzasJustificadas += 1;
        }
      } else if (m.tipo === "salida" && m.resultado === "salida_anticipada") {
        acc.salidasAnticipadas += 1;
      }
    }

    const resumenOrdenado = Array.from(mapa.values()).sort((a, b) =>
      a.nombreCompleto.localeCompare(b.nombreCompleto, "es"),
    );

    const filasResumen: Fila[] = resumenOrdenado.map((acc) => {
      const diasAsistidos = acc.fechasEntrada.size;
      const faltas = Math.max(0, diasLaborables - diasAsistidos);
      const puntualidadPct =
        diasAsistidos > 0 ? Math.round((acc.puntuales / diasAsistidos) * 100) : 0;

      return {
        tipoPersonal: acc.tipoPersonal,
        documento: acc.documento,
        nombreCompleto: acc.nombreCompleto,
        cargoEspecialidad: acc.cargoEspecialidad,
        diasLaborables,
        diasAsistidos,
        puntuales: acc.puntuales,
        tardanzas: acc.tardanzas,
        minutosTardanza: acc.minutosTardanza,
        tardanzasJustificadas: acc.tardanzasJustificadas,
        salidasAnticipadas: acc.salidasAnticipadas,
        faltas,
        puntualidadPct,
      };
    });

    const columnasResumen: ColumnaReporte[] = [
      columna("Tipo", "tipoPersonal", 16, "texto", true),
      columna("Documento", "documento", 14, "texto"),
      columna("Apellidos y nombres", "nombreCompleto", 34, "texto", true),
      columna("Cargo / Especialidad", "cargoEspecialidad", 24, "texto"),
      columna("Días laborables", "diasLaborables", 16, "numero"),
      columna("Días asistidos", "diasAsistidos", 15, "numero", true),
      columna("Puntuales", "puntuales", 13, "numero"),
      columna("Tardanzas", "tardanzas", 13, "numero", true),
      columna("Min. tardanza", "minutosTardanza", 15, "numero"),
      columna("Tard. justificadas", "tardanzasJustificadas", 18, "numero"),
      columna("Salidas anticipadas", "salidasAnticipadas", 18, "numero"),
      columna("Faltas (sin ingreso)", "faltas", 18, "numero", true),
      columna("% Puntualidad", "puntualidadPct", 15, "numero"),
    ];

    const columnasDetalle: ColumnaReporte[] = [
      columna("Fecha", "fecha", 14, "fecha", true),
      columna("Hora", "hora", 12, "texto", true),
      columna("Apellidos y nombres", "nombreCompleto", 34, "texto", true),
      columna("Tipo personal", "tipoPersona", 16, "texto", true),
      columna("Tipo marcación", "tipo", 16, "texto", true),
      columna("Origen", "origen", 14, "texto"),
      columna("Resultado", "resultado", 18, "texto", true),
      columna("Minutos tardanza", "minutosTardanza", 18, "numero"),
      columna("Justificada", "justificada", 14, "texto"),
      columna("Motivo justificación", "motivoJustificacion", 32, "texto"),
      columna("Observación", "observacion", 30, "texto"),
    ];

    const filasDetalle: Fila[] = marcacionesPersonal
      .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))
      .map((m) => ({
        fecha: m.fechaHora.slice(0, 10),
        hora: m.fechaHora.slice(11, 19),
        nombreCompleto: m.nombreCompleto,
        tipoPersona: m.tipoPersona === "docentes" ? "Docente" : "Administrativo",
        tipo: m.tipo,
        origen: m.origen,
        resultado: m.resultado,
        minutosTardanza: m.minutosTardanza,
        justificada: siNo(m.justificada),
        motivoJustificacion: m.motivoJustificacion,
        observacion: m.observacion,
      }));

    return this.generar(
      user,
      "asistencia-personal",
      "Asistencia consolidada de docentes y personal",
      columnasResumen,
      filasResumen,
      {
        Período: etiquetaPeriodo,
        Desde: fechaDesde,
        Hasta: fechaHasta,
        Personal:
          q.tipoPersona === "docentes"
            ? "Solo docentes"
            : q.tipoPersona === "administrativos"
              ? "Solo administrativos"
              : "Docentes y administrativos",
      },
      {
        anioAcademico: anio ? String(anio.anio) : undefined,
        hojasExtra: [{ nombre: "Detalle", columnas: columnasDetalle, filas: filasDetalle }],
      },
    );
  }
}
