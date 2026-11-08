import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import { LibretasService } from "../libretas/libretas.service";
import { MATRICULA_MESSAGES } from "./constants";
import {
  CambiarSeccionDto,
  CrearMatriculaDto,
  MatriculaCreatedResponseDto,
  MatriculaMasivaDto,
  MatriculaMasivaResultadoDto,
  MatricularLoteDto,
  MatriculaQueryDto,
  MatriculaResponseDto,
  PaginatedMatriculasResponseDto,
  RetirarMatriculaDto,
  TrasladarMatriculaDto,
} from "./dto";

import { MatriculasRepository } from "./repositories";
import { MatriculaMasivaService, MatriculaOperacionesService } from "./services";
import { generarCodigoMatricula, generarConstanciaMatriculaPdf } from "./utils";

@Injectable()
export class MatriculasService {
  constructor(
    private readonly matriculasRepository: MatriculasRepository,
    private readonly matriculaOperacionesService: MatriculaOperacionesService,
    private readonly matriculaMasivaService: MatriculaMasivaService,
    private readonly auditService: AuditService,
    @Optional() private readonly notificacionesService?: NotificacionesService,
    @Optional() private readonly libretasService?: LibretasService,
  ) {}

  /**
   * RF-009 HU1: Matrícula individual.
   * Valida estudiante activo, año planificado/en curso, sección activa con vacantes,
   * unicidad de matrícula en el año, colegio de procedencia si es traslado,
   * y avisa si no tiene apoderado principal registrado sin bloquear el guardado.
   */
  async matricular(
    dto: CrearMatriculaDto,
    actorId: string,
    ip?: string,
  ): Promise<MatriculaCreatedResponseDto> {
    // 1. Validar que el estudiante exista y esté activo
    const estudiante = await this.matriculasRepository.findEstudianteById(dto.estudianteId);
    if (!estudiante) {
      throw new NotFoundException("Estudiante no encontrado.");
    }
    if (estudiante.estado !== "activo") {
      throw new BadRequestException(MATRICULA_MESSAGES.ESTUDIANTE_NO_ACTIVO);
    }

    // 2. Validar año académico (planificado o en_curso)
    const anio = await this.matriculasRepository.findAnioById(dto.anioAcademicoId);
    if (!anio || (anio.estado !== "planificado" && anio.estado !== "en_curso")) {
      throw new BadRequestException(MATRICULA_MESSAGES.ANIO_NO_VALIDO);
    }

    // 3. Validar que el estudiante no esté ya matriculado en el mismo año escolar
    const matriculaExistente = await this.matriculasRepository.findMatriculaByEstudianteYAnio(
      dto.estudianteId,
      dto.anioAcademicoId,
    );
    if (matriculaExistente) {
      throw new ConflictException(`El estudiante ya está matriculado en el año ${anio.anio}.`);
    }

    // 4. Validar sección y vacantes
    const seccion = await this.matriculasRepository.findSeccionById(dto.seccionId);
    if (!seccion || seccion.estado !== "activa") {
      throw new BadRequestException(MATRICULA_MESSAGES.SECCION_NO_ENCONTRADA);
    }
    if (seccion.anioAcademicoId !== dto.anioAcademicoId) {
      throw new BadRequestException("La sección no corresponde al año académico indicado.");
    }
    if (seccion.vacantesDisponibles <= 0) {
      throw new ConflictException(
        `La sección ${seccion.gradoNombre} ${seccion.nombre} no tiene vacantes disponibles.`,
      );
    }

    // 5. Validar colegio de procedencia si el tipo es traslado
    if (dto.tipo === "traslado" && !dto.colegioProcedencia?.trim()) {
      throw new BadRequestException(MATRICULA_MESSAGES.FALTA_COLEGIO_PROCEDENCIA);
    }

    // 6. Generar código correlativo YYYY-000001
    const correlativo = await this.matriculasRepository.getNextCorrelativo(anio.anio);
    const codigo = generarCodigoMatricula(anio.anio, correlativo);
    const fecha = dto.fechaMatricula || new Date().toISOString().split("T")[0];

    // 7. Crear la matrícula
    const matriculaId = await this.matriculasRepository.create({
      estudianteId: dto.estudianteId,
      seccionId: dto.seccionId,
      anioAcademicoId: dto.anioAcademicoId,
      codigo,
      fechaMatricula: fecha,
      tipo: dto.tipo,
      esRepitente: dto.esRepitente ?? false,
      colegioProcedencia: dto.colegioProcedencia?.trim() || null,
      observaciones: dto.observaciones?.trim() || null,
      registradoPorId: actorId,
    });

    const creada = (await this.matriculasRepository.findMatriculaById(matriculaId))!;

    // 8. Verificar apoderado principal (avisa pero no impide según RF-009)
    const tieneApoderado = await this.matriculasRepository.hasApoderadoPrincipal(dto.estudianteId);
    const advertencia = tieneApoderado ? null : MATRICULA_MESSAGES.SIN_APODERADO_PRINCIPAL;

    // 9. Auditoría
    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "matriculas",
      registroId: matriculaId,
      valorNuevo: {
        codigo: creada.codigo,
        estudiante: creada.estudiante.apellidos,
        grado: creada.gradoNombre,
        seccion: creada.seccionNombre,
        tipo: creada.tipo,
      },
      direccionIp: ip,
    });

    // 10. Notificación (asíncrona vía BullMQ)
    if (this.notificacionesService) {
      await this.notificacionesService
        .enviar({
          usuarioId: actorId,
          titulo: "Matrícula registrada",
          mensaje: `Se matriculó exitosamente al estudiante ${creada.estudiante.nombres} ${creada.estudiante.apellidos} en ${creada.gradoNombre} - ${creada.seccionNombre}.`,
          tipo: "informacion",
          enlaceUrl: `/admin/enrollment/${creada.id}`,
          canales: ["in_app"],
        })
        .catch(() => undefined);
    }

    if (this.libretasService) {
      await this.libretasService.crearPendientesDeMatricula(matriculaId);
    }

    return {
      matricula: creada,
      advertencia,
    };
  }

  // ── Delegación a MatriculaMasivaService (HU2) ──

  async matricularMasivamente(
    dto: MatriculaMasivaDto,
    actorId: string,
    ip?: string,
  ): Promise<MatriculaMasivaResultadoDto> {
    return this.matriculaMasivaService.matricularMasivamente(dto, actorId, ip);
  }

  async matricularLote(
    dto: MatricularLoteDto,
    actorId: string,
    ip?: string,
  ): Promise<MatriculaMasivaResultadoDto> {
    return this.matriculaMasivaService.matricularLoteEstudiantes(dto, actorId, ip);
  }

  // ── Delegación a MatriculaOperacionesService (HU3) ──

  async retirar(
    id: string,
    dto: RetirarMatriculaDto,
    actorId: string,
    ip?: string,
  ): Promise<MatriculaResponseDto> {
    return this.matriculaOperacionesService.retirar(id, dto, actorId, ip);
  }

  async trasladar(
    id: string,
    dto: TrasladarMatriculaDto,
    actorId: string,
    ip?: string,
  ): Promise<MatriculaResponseDto> {
    return this.matriculaOperacionesService.trasladar(id, dto, actorId, ip);
  }

  async cambiarSeccion(
    id: string,
    dto: CambiarSeccionDto,
    actorId: string,
    ip?: string,
  ): Promise<MatriculaResponseDto> {
    return this.matriculaOperacionesService.cambiarSeccion(id, dto, actorId, ip);
  }

  async anular(id: string, actorId: string, ip?: string): Promise<{ message: string }> {
    return this.matriculaOperacionesService.anular(id, actorId, ip);
  }

  // ── Consultas y Constancias ──

  async findAll(query?: MatriculaQueryDto): Promise<PaginatedMatriculasResponseDto> {
    return this.matriculasRepository.findMatriculas(query);
  }

  async findById(id: string): Promise<MatriculaResponseDto> {
    const matricula = await this.matriculasRepository.findMatriculaById(id);
    if (!matricula) {
      throw new NotFoundException(MATRICULA_MESSAGES.MATRICULA_NO_ENCONTRADA);
    }
    return matricula;
  }

  async generarConstanciaPdf(id: string): Promise<Buffer> {
    const datos = await this.matriculasRepository.getDatosConstancia(id);
    if (!datos) {
      throw new NotFoundException(MATRICULA_MESSAGES.MATRICULA_NO_ENCONTRADA);
    }
    return generarConstanciaMatriculaPdf(datos);
  }
}
