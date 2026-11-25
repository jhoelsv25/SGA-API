import { Injectable, Optional } from "@nestjs/common";
import { AnioLectivoCls } from "../../common/anio-lectivo";
import { AniosAcademicosService } from "../anio-escolar/anios.service";
import { ApoderadosService } from "../apoderados/apoderados.service";
import { AsistenciaClaseService } from "../asistencia-clase/asistencia-clase.service";
import { DocentesService } from "../docentes/docentes.service";
import { EstudiantesService } from "../estudiantes/estudiantes.service";
import { HorariosService } from "../horarios/horarios.service";
import { InstitucionService } from "../institucion/institucion.service";
import { LibretasService } from "../libretas/libretas.service";
import { MarcacionesService } from "../marcaciones/marcaciones.service";
import { MatriculasService } from "../matriculas/matriculas.service";
import { PersonasService } from "../personas/personas.service";
import { SeccionesService } from "../secciones/secciones.service";
import { UsersService } from "../users/users.service";
import {
  ExportacionAcademicaService,
  ExportacionAsistenciaService,
  ExportacionContextoHelper,
  ExportacionPadronService,
  type ReporteGenerado,
} from "./services";

export type { ReporteGenerado };

/**
 * Fachada cohesiva de Exportación Excel que conserva compatibilidad con
 * colas, controladores y pruebas unitarias, delegando en servicios por dominio.
 */
@Injectable()
export class ExportacionService {
  private readonly padronSvc: ExportacionPadronService;
  private readonly academicaSvc: ExportacionAcademicaService;
  private readonly asistenciaSvc: ExportacionAsistenciaService;

  constructor(
    personas: PersonasService,
    estudiantes: EstudiantesService,
    docentes: DocentesService,
    apoderados: ApoderadosService,
    users: UsersService,
    institucion: InstitucionService,
    @Optional() matriculas?: MatriculasService,
    @Optional() marcaciones?: MarcacionesService,
    @Optional() libretas?: LibretasService,
    @Optional() anios?: AniosAcademicosService,
    @Optional() anioLectivo?: AnioLectivoCls,
    @Optional() asistenciaClase?: AsistenciaClaseService,
    @Optional() secciones?: SeccionesService,
    @Optional() horarios?: HorariosService,
    @Optional() padronSvc?: ExportacionPadronService,
    @Optional() academicaSvc?: ExportacionAcademicaService,
    @Optional() asistenciaSvc?: ExportacionAsistenciaService,
  ) {
    const ctx = new ExportacionContextoHelper(institucion, anios, anioLectivo);
    this.padronSvc =
      padronSvc ??
      new ExportacionPadronService(
        personas,
        estudiantes,
        docentes,
        apoderados,
        users,
        institucion,
        ctx,
      );
    this.academicaSvc =
      academicaSvc ??
      new ExportacionAcademicaService(
        institucion,
        matriculas,
        libretas,
        secciones,
        horarios,
        anios,
        anioLectivo,
        ctx,
      );
    this.asistenciaSvc =
      asistenciaSvc ??
      new ExportacionAsistenciaService(
        docentes,
        institucion,
        marcaciones,
        asistenciaClase,
        secciones,
        anios,
        anioLectivo,
        ctx,
      );
  }

  personasExcel(...args: Parameters<ExportacionPadronService["personasExcel"]>) {
    return this.padronSvc.personasExcel(...args);
  }

  estudiantesExcel(...args: Parameters<ExportacionPadronService["estudiantesExcel"]>) {
    return this.padronSvc.estudiantesExcel(...args);
  }

  docentesExcel(...args: Parameters<ExportacionPadronService["docentesExcel"]>) {
    return this.padronSvc.docentesExcel(...args);
  }

  apoderadosExcel(...args: Parameters<ExportacionPadronService["apoderadosExcel"]>) {
    return this.padronSvc.apoderadosExcel(...args);
  }

  usuariosExcel(...args: Parameters<ExportacionPadronService["usuariosExcel"]>) {
    return this.padronSvc.usuariosExcel(...args);
  }

  matriculasExcel(...args: Parameters<ExportacionAcademicaService["matriculasExcel"]>) {
    return this.academicaSvc.matriculasExcel(...args);
  }

  marcacionesExcel(...args: Parameters<ExportacionAsistenciaService["marcacionesExcel"]>) {
    return this.asistenciaSvc.marcacionesExcel(...args);
  }

  libretasExcel(...args: Parameters<ExportacionAcademicaService["libretasExcel"]>) {
    return this.academicaSvc.libretasExcel(...args);
  }

  asistenciaSeccionExcel(
    ...args: Parameters<ExportacionAsistenciaService["asistenciaSeccionExcel"]>
  ) {
    return this.asistenciaSvc.asistenciaSeccionExcel(...args);
  }

  asistenciaPersonalExcel(
    ...args: Parameters<ExportacionAsistenciaService["asistenciaPersonalExcel"]>
  ) {
    return this.asistenciaSvc.asistenciaPersonalExcel(...args);
  }

  horariosExcel(...args: Parameters<ExportacionAcademicaService["horariosExcel"]>) {
    return this.academicaSvc.horariosExcel(...args);
  }
}
