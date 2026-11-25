import { Injectable, Optional } from "@nestjs/common";
import { obtenerTodasLasFilas } from "../../../common/excel/reporte-excel.builder";
import { ApoderadosService } from "../../apoderados/apoderados.service";
import type { ApoderadoQueryDto } from "../../apoderados/dto";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import { DocentesService } from "../../docentes/docentes.service";
import type { DocenteQueryDto } from "../../docentes/dto";
import { EstudiantesService } from "../../estudiantes/estudiantes.service";
import type { EstudianteQueryDto } from "../../estudiantes/dto";
import { CAMPOS_PERSONA, PLANTILLAS, TIPO_IMPORTACION } from "../../importacion/constants";
import { InstitucionService } from "../../institucion/institucion.service";
import type { PersonaQueryDto } from "../../personas/dto";
import { PersonasService } from "../../personas/personas.service";
import type { UserQueryDto } from "../../users/dto";
import { UsersService } from "../../users/users.service";
import {
  ExportacionContextoHelper,
  type FilaReporte,
  type ReporteGenerado,
  columna,
  columnasDePlantilla,
  filaPersona,
  siNo,
} from "./exportacion-base.helper";

/**
 * Servicio especializado en exportación Excel de padrones y directorio:
 * personas, estudiantes, docentes, apoderados y usuarios.
 */
@Injectable()
export class ExportacionPadronService {
  private readonly ctx: ExportacionContextoHelper;

  constructor(
    private readonly personas: PersonasService,
    private readonly estudiantes: EstudiantesService,
    private readonly docentes: DocentesService,
    private readonly apoderados: ApoderadosService,
    private readonly users: UsersService,
    institucion: InstitucionService,
    @Optional() contexto?: ExportacionContextoHelper,
  ) {
    this.ctx = contexto ?? new ExportacionContextoHelper(institucion);
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
    return this.ctx.generar(user, "personas", "Padrón de personas", columnas, filas, {
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
    return this.ctx.generar(user, "estudiantes", "Estudiantes", columnas, filas, {
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
    return this.ctx.generar(user, "docentes", "Docentes", columnas, filas, { Búsqueda: q.search });
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
    const filas: FilaReporte[] = data.flatMap((a) => {
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
    return this.ctx.generar(user, "apoderados", "Apoderados", columnas, filas, {
      Búsqueda: q.search,
    });
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
    return this.ctx.generar(user, "usuarios", "Usuarios del sistema", columnas, filas, {
      Búsqueda: q.search,
    });
  }
}
