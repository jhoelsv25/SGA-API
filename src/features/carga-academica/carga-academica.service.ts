import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { AnioLectivoCls } from "../../common/anio-lectivo";
import { AuditService } from "../../common/services/audit.service";
import { CacheService } from "../../core/cache/cache.service";
import { AniosAcademicosService } from "../anio-escolar/anios.service";
import { DocentesRepository } from "../docentes";
import { MENSAJES_CARGA_ACADEMICA, TABLA_CURSOS_SECCION } from "./constants";
import {
  AsignarDocenteDto,
  AsignarDocenteResultadoDto,
  CargaDocenteDetalleDto,
  CargaSeccionResponseDto,
} from "./dto";
import { CargaAcademicaRepository } from "./repositories";
import { construirMensajeExcesoJornada } from "./utils";

@Injectable()
export class CargaAcademicaService {
  constructor(
    private readonly cargaRepo: CargaAcademicaRepository,
    private readonly docentesRepo: DocentesRepository,
    private readonly aniosService: AniosAcademicosService,
    private readonly anioLectivoCls: AnioLectivoCls,
    private readonly auditService: AuditService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async asignarDocente(
    cursoSeccionId: string,
    dto: AsignarDocenteDto,
    actorId: string,
    ip?: string,
  ): Promise<AsignarDocenteResultadoDto> {
    const cursoSeccion = await this.cargaRepo.findCursoSeccionById(cursoSeccionId);
    if (!cursoSeccion) {
      throw new NotFoundException(MENSAJES_CARGA_ACADEMICA.CURSO_SECCION_NO_ENCONTRADO);
    }

    if (cursoSeccion.seccionEstado === "cerrada") {
      throw new BadRequestException(MENSAJES_CARGA_ACADEMICA.SECCION_CERRADA);
    }

    const anio = await this.resolverAnio(true);

    if (dto.docenteId) {
      const docente = await this.docentesRepo.findById(dto.docenteId);
      if (!docente || docente.estado !== "activo") {
        throw new BadRequestException(MENSAJES_CARGA_ACADEMICA.DOCENTE_INACTIVO);
      }

      const horasActuales = await this.cargaRepo.horasAsignadasDocente(
        anio.id,
        dto.docenteId,
        cursoSeccionId,
      );
      const horasTotales = horasActuales + cursoSeccion.horasPlan;
      const excede = horasTotales > docente.jornadaHoras;

      if (excede && !dto.confirmarExceso) {
        throw new ConflictException({
          message: construirMensajeExcesoJornada(horasTotales, docente.jornadaHoras),
          requiereConfirmacion: true,
        });
      }

      const item = await this.cargaRepo.updateDocente(cursoSeccionId, dto.docenteId);
      await this.cacheService?.del(`horarios:seccion:${cursoSeccion.seccionId}`);

      await this.auditService.log({
        usuarioId: actorId,
        accion: "actualizar",
        tabla: TABLA_CURSOS_SECCION,
        registroId: cursoSeccionId,
        valorAnterior: { docenteId: cursoSeccion.docenteId },
        valorNuevo: { docenteId: dto.docenteId },
        direccionIp: ip,
      });

      return {
        item,
        cargaDocente: {
          horasAsignadas: horasTotales,
          jornadaHoras: docente.jornadaHoras,
          excede,
        },
      };
    }

    // Desasignación de docente (docenteId: null)
    const item = await this.cargaRepo.updateDocente(cursoSeccionId, null);
    await this.cacheService?.del(`horarios:seccion:${cursoSeccion.seccionId}`);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: TABLA_CURSOS_SECCION,
      registroId: cursoSeccionId,
      valorAnterior: { docenteId: cursoSeccion.docenteId },
      valorNuevo: { docenteId: null },
      direccionIp: ip,
    });

    return {
      item,
      cargaDocente: {
        horasAsignadas: 0,
        jornadaHoras: 0,
        excede: false,
      },
    };
  }

  async findBySeccion(seccionId: string): Promise<CargaSeccionResponseDto> {
    const items = await this.cargaRepo.findBySeccion(seccionId);
    return {
      seccionId,
      items,
    };
  }

  async findByDocente(docenteId: string): Promise<CargaDocenteDetalleDto> {
    const anio = await this.resolverAnio(false);
    const docente = await this.docentesRepo.findById(docenteId);
    if (!docente) {
      throw new NotFoundException(MENSAJES_CARGA_ACADEMICA.DOCENTE_NO_ENCONTRADO);
    }

    const cursos = await this.cargaRepo.findByDocente(anio.id, docenteId);
    const horasAsignadas = cursos.reduce((acc, c) => acc + c.horas, 0);
    const excede = horasAsignadas > docente.jornadaHoras;

    return {
      docenteId,
      jornadaHoras: docente.jornadaHoras,
      horasAsignadas,
      excede,
      cursos,
    };
  }

  private async resolverAnio(requiereEscritura: boolean) {
    const id = this.anioLectivoCls.id();
    const anio = id ? await this.aniosService.findById(id) : await this.aniosService.findEnCurso();
    if (requiereEscritura && anio.estado === "cerrado") {
      throw new BadRequestException(MENSAJES_CARGA_ACADEMICA.ANIO_CERRADO);
    }
    return anio;
  }
}
