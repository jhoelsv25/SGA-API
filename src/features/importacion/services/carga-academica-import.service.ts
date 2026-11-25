import { BadRequestException, Injectable } from "@nestjs/common";
import { AuditService } from "../../../common/services/audit.service";
import type { FilaPrevisualizadaDto } from "../dto";
import { ImportacionAcademicaRepository, type AnioImportacionAcademica } from "../repositories";
import {
  getOptStr,
  getStr,
  nombreCompletoDocente,
  normalizarSiNo,
  resolverCursoPorTexto,
  resolverDocentePorIdentificador,
  resolverSeccionPorGradoYNombre,
} from "../utils";

@Injectable()
export class CargaAcademicaImportService {
  constructor(
    private readonly repo: ImportacionAcademicaRepository,
    private readonly auditService: AuditService,
  ) {}

  private async resolverAnioValido(anioAcademicoId?: string): Promise<AnioImportacionAcademica> {
    const anio = await this.repo.findAnioParaImportacion(anioAcademicoId);
    if (!anio || anio.estado === "cerrado") {
      throw new BadRequestException(
        "No existe un año académico activo o planificado abierto para importar carga académica.",
      );
    }
    return anio;
  }

  async previsualizarFilas(
    filas: Record<string, unknown>[],
    anioAcademicoId?: string,
  ): Promise<{
    anioAcademicoId: string;
    filasAnalizadas: FilaPrevisualizadaDto[];
    validasCount: number;
    omitidasCount: number;
    erroresCount: number;
  }> {
    const anio = await this.resolverAnioValido(anioAcademicoId);

    const [secciones, cursos, docentes, planes, cursosSeccion] = await Promise.all([
      this.repo.listarSeccionesActivasConTutor(anio.id),
      this.repo.listarCursosActivos(),
      this.repo.listarDocentesConPersona(),
      this.repo.listarPlanEstudios(),
      this.repo.listarCursosSeccionDeAnio(anio.id),
    ]);

    const cursoSeccionMap = new Map(
      cursosSeccion.map((cs) => [`${cs.seccionId}:${cs.cursoId}`, cs]),
    );
    const planMap = new Map(planes.map((p) => [`${p.gradoId}:${p.cursoId}`, p]));

    const clavesVistas = new Set<string>();
    const filasAnalizadas: FilaPrevisualizadaDto[] = [];
    let validasCount = 0;
    let omitidasCount = 0;
    let erroresCount = 0;

    for (let i = 0; i < filas.length; i++) {
      const filaRaw = filas[i];
      const datos: Record<string, unknown> = Array.isArray(filaRaw)
        ? Object.assign({}, filaRaw)
        : filaRaw;
      const numeroFila = i + 2;

      const analizada = this.analizarFila({
        numeroFila,
        datos,
        anioId: anio.id,
        secciones,
        cursos,
        docentes,
        cursoSeccionMap,
        planMap,
        clavesVistas,
      });

      filasAnalizadas.push(analizada);
      if (analizada.estado === "valida") validasCount++;
      else if (analizada.estado === "ya_registrada") omitidasCount++;
      else erroresCount++;
    }

    return {
      anioAcademicoId: anio.id,
      filasAnalizadas,
      validasCount,
      omitidasCount,
      erroresCount,
    };
  }

  private analizarFila(params: {
    numeroFila: number;
    datos: Record<string, unknown>;
    anioId: string;
    secciones: Awaited<
      ReturnType<ImportacionAcademicaRepository["listarSeccionesActivasConTutor"]>
    >;
    cursos: Awaited<ReturnType<ImportacionAcademicaRepository["listarCursosActivos"]>>;
    docentes: Awaited<ReturnType<ImportacionAcademicaRepository["listarDocentesConPersona"]>>;
    cursoSeccionMap: Map<
      string,
      { id: string; seccionId: string; cursoId: string; docenteId: string | null }
    >;
    planMap: Map<
      string,
      { id: string; gradoId: string; cursoId: string; horasSemanales: number; activo: boolean }
    >;
    clavesVistas: Set<string>;
  }): FilaPrevisualizadaDto {
    const {
      numeroFila,
      datos,
      anioId,
      secciones,
      cursos,
      docentes,
      cursoSeccionMap,
      planMap,
      clavesVistas,
    } = params;

    const gradoTxt = getStr(datos, "grado");
    const seccionTxt = getStr(datos, "seccion");
    const cursoTxt = getStr(datos, "curso");
    const docenteTxt = getStr(datos, "docente", "codigoDocente", "numeroDocumento", "dni");
    const horasRaw = getOptStr(datos, "horasSemanales", "horas_semanales");
    const esTutorRaw = getOptStr(datos, "esTutor", "es_tutor");
    const esTutor = normalizarSiNo(esTutorRaw ?? "") === true;

    const seccion = resolverSeccionPorGradoYNombre(secciones, gradoTxt, seccionTxt);
    if (!seccion) {
      return {
        numeroFila,
        datos,
        estado: "error",
        accion: "omitir",
        mensaje: `No se encontró una sección activa para "${gradoTxt} ${seccionTxt}".`,
      };
    }

    const gradoSeccion = `${seccion.gradoNombre} - ${seccion.nombre}`;
    const curso = resolverCursoPorTexto(cursos, cursoTxt);
    if (!curso) {
      return {
        numeroFila,
        datos: { ...datos, gradoSeccion },
        estado: "error",
        accion: "omitir",
        mensaje: `No existe un curso activo que coincida con "${cursoTxt}".`,
      };
    }

    const docente = resolverDocentePorIdentificador(docentes, docenteTxt);
    if (!docente || docente.estado !== "activo") {
      return {
        numeroFila,
        datos: { ...datos, gradoSeccion, cursoNombre: curso.nombre },
        estado: "error",
        accion: "omitir",
        mensaje: `No se encontró un docente activo para "${docenteTxt}".`,
      };
    }

    const docenteNombre = nombreCompletoDocente(docente);
    let horasSemanales: number | undefined;
    if (horasRaw) {
      const n = Number(horasRaw);
      if (!Number.isInteger(n) || n <= 0 || n > 20) {
        return {
          numeroFila,
          datos: { ...datos, gradoSeccion, cursoNombre: curso.nombre, docenteNombre },
          estado: "error",
          accion: "omitir",
          mensaje: `Horas semanales inválidas ("${horasRaw}").`,
        };
      }
      horasSemanales = n;
    }

    const plan = planMap.get(`${seccion.gradoId}:${curso.id}`);
    if (!plan && !horasSemanales) {
      return {
        numeroFila,
        datos: { ...datos, gradoSeccion, cursoNombre: curso.nombre, docenteNombre },
        estado: "error",
        accion: "omitir",
        mensaje: `El curso ${curso.nombre} no está en el plan de estudios de ${seccion.gradoNombre} y no indicó horas semanales.`,
      };
    }

    const clave = `${seccion.id}:${curso.id}`;
    if (clavesVistas.has(clave)) {
      return {
        numeroFila,
        datos: { ...datos, gradoSeccion, cursoNombre: curso.nombre, docenteNombre },
        estado: "error",
        accion: "omitir",
        mensaje: `El curso ${curso.nombre} en ${gradoSeccion} está repetido en el archivo.`,
      };
    }
    clavesVistas.add(clave);

    const csExistente = cursoSeccionMap.get(clave);
    const yaTieneDocenteIgual = csExistente?.docenteId === docente.id;
    const tutorYaIgual = !esTutor || seccion.tutorId === docente.id;

    if (yaTieneDocenteIgual && tutorYaIgual) {
      return {
        numeroFila,
        datos: { ...datos, gradoSeccion, cursoNombre: curso.nombre, docenteNombre },
        estado: "ya_registrada",
        accion: "omitir",
        mensaje: "El docente ya está asignado a este curso en la sección.",
      };
    }

    const notaTutor = esTutor ? " + tutor de sección" : "";

    return {
      numeroFila,
      datos: {
        ...datos,
        _anioAcademicoId: anioId,
        _gradoId: seccion.gradoId,
        _seccionId: seccion.id,
        _cursoId: curso.id,
        _docenteId: docente.id,
        _horasSemanales: horasSemanales ?? plan?.horasSemanales ?? 0,
        _esTutor: esTutor,
        gradoSeccion,
        cursoNombre: curso.nombre,
        docenteNombre,
      },
      estado: "valida",
      accion: csExistente ? "reutilizar" : "crear",
      mensaje: `Asignará ${docenteNombre} a ${curso.nombre}${notaTutor}.`,
    };
  }

  async procesarFila(
    datos: Record<string, unknown>,
    anioAcademicoId: string | undefined,
    actorId: string,
    ip?: string,
  ): Promise<boolean> {
    const anioId = getOptStr(datos, "_anioAcademicoId") || anioAcademicoId;
    const gradoId = getOptStr(datos, "_gradoId");
    const seccionId = getOptStr(datos, "_seccionId");
    const cursoId = getOptStr(datos, "_cursoId");
    const docenteId = getOptStr(datos, "_docenteId");
    const horasRaw = datos._horasSemanales;
    const horasSemanales =
      typeof horasRaw === "number" ? horasRaw : Number(getOptStr(datos, "horasSemanales") || 0);
    const esTutor =
      datos._esTutor === true ||
      normalizarSiNo(getOptStr(datos, "esTutor", "es_tutor") ?? "") === true;

    if (!anioId || !gradoId || !seccionId || !cursoId || !docenteId) {
      return false;
    }

    if (horasSemanales > 0) {
      await this.repo.asegurarPlanEstudios(gradoId, cursoId, horasSemanales);
    }

    const { id: cursoSeccionId, anteriorDocenteId } = await this.repo.asegurarYAsignarCursoSeccion(
      seccionId,
      cursoId,
      docenteId,
    );

    if (esTutor) {
      await this.repo.asignarTutorSeccionSiLibre(anioId, seccionId, docenteId);
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "cursos_seccion",
      registroId: cursoSeccionId,
      valorAnterior: { docenteId: anteriorDocenteId },
      valorNuevo: { seccionId, cursoId, docenteId, esTutor },
      direccionIp: ip,
    });

    return true;
  }
}
