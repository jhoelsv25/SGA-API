import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import { AnioLectivoCls } from "../../../common/anio-lectivo";
import { AuditService } from "../../../common/services/audit.service";
import { AniosAcademicosService } from "../../anio-escolar/anios.service";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import {
  DIAS_PLANIFICACION_POR_DEFECTO,
  MENSAJES_AULA_VIRTUAL,
  MENSAJES_INTERACCION,
  ROLES_SEGUIMIENTO_MATERIALES,
  TAMANO_MAXIMO_MB_POR_DEFECTO,
  VARIABLES_MATERIAL,
} from "../constants";
import type { MaterialResponse } from "../dto";
import type {
  ContenidoMaterial,
  CursoAula,
  MaterialFila,
  PeriodoAula,
  UnidadFila,
} from "../interfaces";
import { AulaVirtualRepository } from "../repositories";
import { estadoPlazo, validarAnioParaInteraccion } from "../utils";

/**
 * Helper compartido para validaciones de contexto (año académico, periodo, curso,
 * unidad, material, permisos de docente/participante), auditoría y guardado en disco.
 */
@Injectable()
export class AulaContextoHelper {
  constructor(
    private readonly repository: AulaVirtualRepository,
    private readonly aniosService: AniosAcademicosService,
    private readonly anioLectivoCls: AnioLectivoCls,
    private readonly auditService: AuditService,
  ) {}

  async anioDeTrabajo(): Promise<string> {
    const anioId = this.anioLectivoCls.id();
    const anio = anioId
      ? await this.aniosService.findById(anioId)
      : await this.aniosService.findEnCurso();
    return anio.id;
  }

  async periodoEnCursoDelAnio(): Promise<PeriodoAula> {
    const anioId = await this.anioDeTrabajo();
    const periodo = await this.repository.findPeriodoEnCurso(anioId);
    if (!periodo) throw new NotFoundException(MENSAJES_AULA_VIRTUAL.BIMESTRE_NO_ENCONTRADO);
    return periodo;
  }

  async diasPlanificacion(): Promise<number> {
    return this.repository.leerVariableEntera(
      VARIABLES_MATERIAL.DIAS_PLANIFICACION,
      DIAS_PLANIFICACION_POR_DEFECTO,
    );
  }

  async tamanoMaximoMb(): Promise<number> {
    return this.repository.leerVariableEntera(
      VARIABLES_MATERIAL.TAMANO_MAXIMO_MB,
      TAMANO_MAXIMO_MB_POR_DEFECTO,
    );
  }

  esRolDeSeguimiento(usuario: AuthenticatedUser): boolean {
    return (ROLES_SEGUIMIENTO_MATERIALES as readonly string[]).includes(usuario.role);
  }

  async esDocenteDelCurso(curso: CursoAula, usuario: AuthenticatedUser): Promise<boolean> {
    if (!curso.docenteId) return false;
    const docenteId = await this.repository.findDocenteIdPorPersona(usuario.personaId);
    return docenteId === curso.docenteId;
  }

  /** Devuelve el id del docente asignado o rechaza si el usuario no lo es. */
  async exigirDocenteDelCurso(curso: CursoAula, usuario: AuthenticatedUser): Promise<string> {
    if (!(await this.esDocenteDelCurso(curso, usuario)) || !curso.docenteId) {
      throw new ForbiddenException(MENSAJES_AULA_VIRTUAL.AULA_AJENA);
    }
    return curso.docenteId;
  }

  async requerirCurso(cursoSeccionId: string): Promise<CursoAula> {
    const curso = await this.repository.findCurso(cursoSeccionId);
    if (!curso) throw new NotFoundException(MENSAJES_AULA_VIRTUAL.AULA_NO_ENCONTRADA);
    return curso;
  }

  async requerirUnidad(unidadId: string): Promise<UnidadFila> {
    const unidad = await this.repository.findUnidad(unidadId);
    if (!unidad) throw new NotFoundException(MENSAJES_AULA_VIRTUAL.UNIDAD_NO_ENCONTRADA);
    return unidad;
  }

  async requerirMaterial(materialId: string): Promise<MaterialFila> {
    const material = await this.repository.findMaterial(materialId);
    if (!material) throw new NotFoundException(MENSAJES_AULA_VIRTUAL.MATERIAL_NO_ENCONTRADO);
    return material;
  }

  async requerirPeriodo(periodoId: string): Promise<PeriodoAula> {
    const periodo = await this.repository.findPeriodo(periodoId);
    if (!periodo) throw new NotFoundException(MENSAJES_AULA_VIRTUAL.BIMESTRE_NO_ENCONTRADO);
    return periodo;
  }

  async periodoDeUnidad(unidad: UnidadFila): Promise<PeriodoAula> {
    if (!unidad.periodoId) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.BIMESTRE_NO_ENCONTRADO);
    }
    return this.requerirPeriodo(unidad.periodoId);
  }

  async periodoDeMaterial(material: MaterialFila): Promise<PeriodoAula> {
    if (!material.periodoId) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.BIMESTRE_NO_ENCONTRADO);
    }
    return this.requerirPeriodo(material.periodoId);
  }

  exigirBimestreAbierto(periodo: PeriodoAula): void {
    if (periodo.estado === "cerrado") {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.BIMESTRE_CERRADO);
    }
  }

  exigirDentroDelBimestre(fecha: string, periodo: PeriodoAula): void {
    if (fecha < periodo.fechaInicio || fecha > periodo.fechaFin) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.FECHA_FUERA_BIMESTRE);
    }
  }

  async verificarParticipante(
    curso: CursoAula,
    usuario: AuthenticatedUser,
    permitirDirectivo: boolean = false,
  ): Promise<{ esDocente: boolean; esEstudiante: boolean; matriculaId?: string }> {
    const esDocente = await this.esDocenteDelCurso(curso, usuario);
    if (esDocente) return { esDocente: true, esEstudiante: false };

    const matricula = await this.repository.obtenerMatriculaActivaEstudiante(
      usuario.personaId,
      curso.seccionId,
    );
    if (matricula) {
      return { esDocente: false, esEstudiante: true, matriculaId: matricula.id };
    }

    if (permitirDirectivo && this.esRolDeSeguimiento(usuario)) {
      return { esDocente: false, esEstudiante: false };
    }

    throw new ForbiddenException(MENSAJES_INTERACCION.SIN_ACCESO);
  }

  async verificarAnioAbierto(cursoSeccionId: string): Promise<void> {
    const anio = await this.repository.obtenerAnioPorCursoSeccion(cursoSeccionId);
    const validacion = validarAnioParaInteraccion(anio?.estado);
    if (!validacion.valido) {
      throw new BadRequestException(validacion.mensaje);
    }
  }

  async resolverHijoApoderado(
    apoderadoPersonaId: string,
    seccionId: string,
    estudianteId?: string,
  ): Promise<string> {
    const hijos =
      (await this.repository.estudiantesDeApoderadoEnSeccion?.(apoderadoPersonaId, seccionId)) ??
      [];
    if (hijos.length === 0) {
      throw new ForbiddenException(MENSAJES_AULA_VIRTUAL.SIN_ACCESO_AULA);
    }
    const hijo = estudianteId
      ? hijos.find((h) => h.estudianteId === estudianteId || h.personaId === estudianteId)
      : hijos[0];
    if (!hijo) {
      throw new ForbiddenException(MENSAJES_AULA_VIRTUAL.SIN_ACCESO_AULA);
    }
    return hijo.matriculaId;
  }

  async armarMaterial(
    material: MaterialFila,
    hoy: string,
    conGestion: boolean,
  ): Promise<MaterialResponse> {
    const sesion =
      material.horarioId && material.fechaProgramada
        ? await this.repository.findSesionDeBloque(material.horarioId, material.fechaProgramada)
        : null;
    const cambios =
      conGestion && material.esPlanificado
        ? await this.repository.historialCambiosFecha(material.id)
        : [];
    return {
      id: material.id,
      unidadId: material.unidadId,
      titulo: material.titulo,
      descripcion: material.descripcion,
      tipo: material.tipo,
      url: material.url,
      archivoNombre: material.archivoNombre,
      esPlanificado: material.esPlanificado,
      esExtra: !material.esPlanificado,
      visible: material.visible,
      vigente: material.vigente,
      fechaProgramada: material.fechaProgramada,
      fechaCongelada: material.fechaCongelada,
      publicadoEn: material.publicadoEn,
      plazo:
        material.esPlanificado && material.fechaProgramada
          ? estadoPlazo(material.fechaProgramada, material.publicadoEn, hoy)
          : null,
      horarioId: material.horarioId,
      sesionClase: sesion,
      solicitudAbierta: cambios.some((c) => c.estado === "solicitada"),
      cambiosDeFecha: cambios,
    };
  }

  async auditar(
    accion: "crear" | "actualizar" | "eliminar",
    tabla: string,
    registroId: string,
    usuarioId: string,
    valorAnterior: Record<string, unknown> | null,
    valorNuevo: Record<string, unknown>,
    ip?: string,
  ): Promise<void> {
    await this.auditService.log({
      usuarioId,
      accion,
      tabla,
      registroId,
      valorAnterior,
      valorNuevo,
      direccionIp: ip,
    });
  }

  async guardarArchivoLocal(
    subcarpeta: string,
    archivo: Express.Multer.File,
    prefijoFecha: boolean = false,
  ): Promise<ContenidoMaterial> {
    const carpeta = path.join(process.cwd(), "uploads", subcarpeta);
    await fs.promises.mkdir(carpeta, { recursive: true });
    const extension = path.extname(archivo.originalname).toLowerCase();
    const nombreBase = prefijoFecha ? `${Date.now()}-${randomUUID().slice(0, 8)}` : randomUUID();
    const nombreGuardado = `${nombreBase}${extension}`;
    await fs.promises.writeFile(path.join(carpeta, nombreGuardado), archivo.buffer);
    return {
      url: `/uploads/${subcarpeta}/${nombreGuardado}`,
      archivoNombre: archivo.originalname.slice(0, 255),
      archivoTamanoBytes: archivo.size,
    };
  }
}
