import {
  BadRequestException,
  Injectable,
  Logger,
  Optional,
  type MessageEvent,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { InjectQueue } from "@nestjs/bullmq";
import type { Job, Queue } from "bullmq";
import { AnioLectivoCls } from "../../common/anio-lectivo";
import { AuditService } from "../../common/services/audit.service";
import { QUEUES } from "../../core/queues/queues.constants";
import type { PersonaResponseDto } from "../personas/dto";
import { PersonasRepository } from "../personas/repositories/personas.repository";
import {
  IMPORTACION_MAX_FILAS,
  IMPORTACION_MESSAGES,
  TIPO_IMPORTACION,
  type TipoImportacion,
} from "./constants";
import type {
  CredencialEmitidaDto,
  EjecutarImportacionDto,
  EjecutarImportacionResponseDto,
  EstadoImportacionJobDto,
  FilaPrevisualizadaDto,
  IniciarImportacionResponseDto,
  PrevisualizarImportacionDto,
  VistaPreviaResponseDto,
} from "./dto";
import type { IEntidadImportHandler, ProcesarFilaResult } from "./interfaces";
import {
  ApoderadosImportService,
  CargaAcademicaImportService,
  DocentesImportService,
  EstudiantesImportService,
  HorariosImportService,
  LoteTemporalImportService,
  MatriculasImportService,
  PersonasImportService,
  TrabajosImportService,
} from "./services";
import {
  type ContextoReporteCredenciales,
  generarPlantillaExcel as construirPlantillaExcel,
  leerFilasDesdeExcelBuffer,
  parsearPersonaDeFila,
  validarPersonaFila,
  type ValidacionFilaPersonaResultado,
} from "./utils";

@Injectable()
export class ImportacionService {
  private readonly logger = new Logger(ImportacionService.name);
  private readonly loteTemporalSvc: LoteTemporalImportService;
  private readonly trabajosSvc: TrabajosImportService;

  constructor(
    private readonly personasRepository: PersonasRepository,
    private readonly personasImportService: PersonasImportService,
    private readonly estudiantesImportService: EstudiantesImportService,
    private readonly docentesImportService: DocentesImportService,
    private readonly apoderadosImportService: ApoderadosImportService,
    private readonly auditService: AuditService,
    @InjectQueue(QUEUES.IMPORTACION)
    private readonly importacionQueue: Queue,
    @Optional() private readonly matriculasImportService?: MatriculasImportService,
    @Optional() private readonly anioLectivoCls?: AnioLectivoCls,
    @Optional() private readonly cargaAcademicaImportService?: CargaAcademicaImportService,
    @Optional() private readonly horariosImportService?: HorariosImportService,
    @Optional() loteTemporalSvc?: LoteTemporalImportService,
    @Optional() trabajosSvc?: TrabajosImportService,
  ) {
    this.loteTemporalSvc = loteTemporalSvc ?? new LoteTemporalImportService(importacionQueue);
    this.trabajosSvc = trabajosSvc ?? new TrabajosImportService(importacionQueue);
  }

  private obtenerHandler(tipo: TipoImportacion): IEntidadImportHandler {
    switch (tipo) {
      case TIPO_IMPORTACION.PERSONAS:
        return this.personasImportService;
      case TIPO_IMPORTACION.ESTUDIANTES:
        return this.estudiantesImportService;
      case TIPO_IMPORTACION.DOCENTES:
        return this.docentesImportService;
      case TIPO_IMPORTACION.APODERADOS:
        return this.apoderadosImportService;
      default:
        throw new BadRequestException("Tipo de importación no soportado.");
    }
  }

  async previsualizarArchivo(
    tipo: TipoImportacion,
    archivo: Express.Multer.File | undefined,
  ): Promise<VistaPreviaResponseDto> {
    if (!archivo?.buffer || archivo.buffer.length === 0) {
      throw new BadRequestException("Debe adjuntar un archivo Excel (.xlsx).");
    }

    const filas = await leerFilasDesdeExcelBuffer(archivo.buffer);
    return this.previsualizar({ tipo, filas });
  }

  async previsualizar(dto: PrevisualizarImportacionDto): Promise<VistaPreviaResponseDto> {
    if (!dto.filas || dto.filas.length === 0) {
      throw new BadRequestException(IMPORTACION_MESSAGES.SIN_FILAS);
    }

    if (dto.filas.length > IMPORTACION_MAX_FILAS) {
      throw new BadRequestException(IMPORTACION_MESSAGES.LIMITE_FILAS_SUPERADO);
    }

    if (
      dto.tipo === TIPO_IMPORTACION.MATRICULAS ||
      dto.tipo === TIPO_IMPORTACION.CARGA_ACADEMICA ||
      dto.tipo === TIPO_IMPORTACION.HORARIOS
    ) {
      const anioId = this.anioLectivoCls?.id();
      const resultado = await this.previsualizarAcademico(dto.tipo, dto.filas, anioId);

      let loteId: string | undefined;
      if (resultado.validasCount > 0) {
        const filasValidas = resultado.filasAnalizadas
          .filter((f) => f.estado === "valida")
          .map((f) => f.datos);
        loteId = await this.loteTemporalSvc.guardarLote(dto.tipo, filasValidas);
      }

      return {
        loteId,
        totalFilas: dto.filas.length,
        validasCount: resultado.validasCount,
        omitidasCount: resultado.omitidasCount,
        erroresCount: resultado.erroresCount,
        filas: resultado.filasAnalizadas,
      };
    }

    const handler = this.obtenerHandler(dto.tipo);
    const filasAnalizadas: FilaPrevisualizadaDto[] = [];
    const codigosEnLote = new Set<string>();
    const principalesPorEstudiante = new Set<string>();
    const cachePersonas = new Map<string, PersonaResponseDto | null>();

    let validasCount = 0;
    let omitidasCount = 0;
    let erroresCount = 0;

    for (let i = 0; i < dto.filas.length; i++) {
      const filaRaw = dto.filas[i];
      const fila: Record<string, unknown> = Array.isArray(filaRaw)
        ? Object.assign({}, filaRaw)
        : filaRaw;
      const numeroFila = i + 2;

      const analizada = await this.analizarFila(
        handler,
        fila,
        numeroFila,
        codigosEnLote,
        principalesPorEstudiante,
        cachePersonas,
      );

      filasAnalizadas.push(analizada);

      if (analizada.estado === "valida") validasCount++;
      else if (analizada.estado === "ya_registrada") omitidasCount++;
      else if (analizada.estado === "error") erroresCount++;
    }

    let loteId: string | undefined;
    if (validasCount > 0) {
      const filasValidas = filasAnalizadas.filter((f) => f.estado === "valida").map((f) => f.datos);
      loteId = await this.loteTemporalSvc.guardarLote(dto.tipo, filasValidas);
    }

    return {
      loteId,
      totalFilas: dto.filas.length,
      validasCount,
      omitidasCount,
      erroresCount,
      filas: filasAnalizadas,
    };
  }

  private async previsualizarAcademico(
    tipo: TipoImportacion,
    filas: Record<string, unknown>[],
    anioId?: string,
  ): Promise<{
    filasAnalizadas: FilaPrevisualizadaDto[];
    validasCount: number;
    omitidasCount: number;
    erroresCount: number;
  }> {
    if (tipo === TIPO_IMPORTACION.MATRICULAS) {
      if (!this.matriculasImportService) {
        throw new BadRequestException(
          "El servicio de importación de matrículas no está disponible.",
        );
      }
      return this.matriculasImportService.previsualizarFilas(filas, anioId);
    }

    if (tipo === TIPO_IMPORTACION.CARGA_ACADEMICA) {
      if (!this.cargaAcademicaImportService) {
        throw new BadRequestException(
          "El servicio de importación de carga académica no está disponible.",
        );
      }
      return this.cargaAcademicaImportService.previsualizarFilas(filas, anioId);
    }

    if (!this.horariosImportService) {
      throw new BadRequestException("El servicio de importación de horarios no está disponible.");
    }
    return this.horariosImportService.previsualizarFilas(filas, anioId);
  }

  private async buscarPersonaCacheada(
    tipoDocumento: string,
    numeroDocumento: string,
    cache?: Map<string, PersonaResponseDto | null>,
  ): Promise<PersonaResponseDto | null> {
    const clave = `${tipoDocumento}:${numeroDocumento}`;
    if (cache && cache.has(clave)) return cache.get(clave) ?? null;

    const persona = await this.personasRepository.findByDocumento(tipoDocumento, numeroDocumento);
    if (cache) cache.set(clave, persona);
    return persona;
  }

  private async analizarFila(
    handler: IEntidadImportHandler,
    datos: Record<string, unknown>,
    numeroFila: number,
    codigosEnLote: Set<string>,
    principalesPorEstudiante: Set<string>,
    cachePersonas?: Map<string, PersonaResponseDto | null>,
  ): Promise<FilaPrevisualizadaDto> {
    const validacion: ValidacionFilaPersonaResultado = validarPersonaFila(datos);
    if (!validacion.esValida) {
      return { numeroFila, datos, estado: "error", accion: "omitir", mensaje: validacion.mensaje };
    }

    const personaExistente = await this.buscarPersonaCacheada(
      validacion.tipoDocumento,
      validacion.numeroDocumento,
      cachePersonas,
    );

    return handler.analizar({
      numeroFila,
      datos,
      personaExistente,
      codigosEnLote,
      principalesPorEstudiante,
    });
  }

  async ejecutar(
    dto: EjecutarImportacionDto,
    actorId: string,
    ip?: string,
  ): Promise<IniciarImportacionResponseDto> {
    const filas = dto.loteId
      ? await this.loteTemporalSvc.recuperarLote(dto.loteId, dto.tipo)
      : (dto.filas ?? []);

    if (filas.length === 0) throw new BadRequestException(IMPORTACION_MESSAGES.SIN_FILAS);
    if (filas.length > IMPORTACION_MAX_FILAS) {
      throw new BadRequestException(IMPORTACION_MESSAGES.LIMITE_FILAS_SUPERADO);
    }

    const payloadDto: EjecutarImportacionDto = { tipo: dto.tipo, filas };
    const anioAcademicoId = this.anioLectivoCls?.id();

    const job = await this.importacionQueue.add(
      "procesar-lote",
      { dto: payloadDto, actorId, ip, anioAcademicoId },
      { attempts: 1, removeOnComplete: false, removeOnFail: false },
    );

    return {
      jobId: String(job.id),
      estado: "en_cola",
      mensaje: "Importación masiva iniciada en segundo plano con BullMQ.",
    };
  }

  consultarEstadoJob(jobId: string): Promise<EstadoImportacionJobDto> {
    return this.trabajosSvc.consultarEstadoJob(jobId);
  }

  streamProgresoJob(jobId: string): Observable<MessageEvent> {
    return this.trabajosSvc.streamProgresoJob(jobId);
  }

  private async procesarFilaAcademica(
    tipo: TipoImportacion,
    fila: Record<string, unknown>,
    anioAcademicoId: string | undefined,
    actorId: string,
    ip?: string,
  ): Promise<boolean> {
    if (tipo === TIPO_IMPORTACION.MATRICULAS) {
      if (!this.matriculasImportService) {
        throw new BadRequestException(
          "El servicio de importación de matrículas no está disponible.",
        );
      }
      return this.matriculasImportService.procesarFila(fila, anioAcademicoId, actorId, ip);
    }
    if (tipo === TIPO_IMPORTACION.CARGA_ACADEMICA) {
      if (!this.cargaAcademicaImportService) {
        throw new BadRequestException(
          "El servicio de importación de carga académica no está disponible.",
        );
      }
      return this.cargaAcademicaImportService.procesarFila(fila, anioAcademicoId, actorId, ip);
    }
    if (!this.horariosImportService) {
      throw new BadRequestException("El servicio de importación de horarios no está disponible.");
    }
    return this.horariosImportService.procesarFila(fila, actorId, ip);
  }

  async ejecutarProcesoLote(
    dto: EjecutarImportacionDto,
    actorId: string,
    ip?: string,
    job?: Job,
    anioAcademicoId?: string,
  ): Promise<EjecutarImportacionResponseDto> {
    const esAcademico =
      dto.tipo === TIPO_IMPORTACION.MATRICULAS ||
      dto.tipo === TIPO_IMPORTACION.CARGA_ACADEMICA ||
      dto.tipo === TIPO_IMPORTACION.HORARIOS;
    const handler = esAcademico ? null : this.obtenerHandler(dto.tipo);
    const credencialesEmitidas: CredencialEmitidaDto[] = [];
    let importadosCount = 0;
    let omitidosCount = 0;
    const filas = dto.filas ?? [];
    const totalFilas = filas.length;

    for (let i = 0; i < totalFilas; i++) {
      const fila = filas[i];
      try {
        if (esAcademico) {
          const ok = await this.procesarFilaAcademica(dto.tipo, fila, anioAcademicoId, actorId, ip);
          if (ok) importadosCount++;
          else omitidosCount++;
        } else {
          const resultado = await this.procesarFila(handler!, fila, actorId, ip);
          if (resultado) {
            importadosCount++;
            if (resultado.credencial) credencialesEmitidas.push(resultado.credencial);
          } else {
            omitidosCount++;
          }
        }
      } catch (err: unknown) {
        const mensaje = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Error al importar fila: ${mensaje}`);
        omitidosCount++;
      }

      if (job && totalFilas > 0) {
        const pct = Math.round(((i + 1) / totalFilas) * 100);
        await job.updateProgress(pct);
      }
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "importaciones",
      valorNuevo: { tipo: dto.tipo, importados: importadosCount, omitidos: omitidosCount },
      direccionIp: ip,
    });

    return {
      importadosCount,
      omitidosCount,
      mensaje: IMPORTACION_MESSAGES.IMPORTACION_EXITO(importadosCount, dto.tipo, omitidosCount),
      credenciales: credencialesEmitidas,
    };
  }

  private async procesarFila(
    handler: IEntidadImportHandler,
    datos: Record<string, unknown>,
    actorId: string,
    ip?: string,
  ): Promise<ProcesarFilaResult | null> {
    const basePersona = parsearPersonaDeFila(datos);
    const personaExistente = await this.personasRepository.findByDocumento(
      basePersona.tipoDocumento,
      basePersona.numeroDocumento,
    );
    return handler.procesar({ datos, basePersona, personaExistente, actorId, ip });
  }

  async generarPlantillaExcel(tipo: TipoImportacion): Promise<Buffer> {
    return construirPlantillaExcel(tipo);
  }

  generarReporteCredencialesExcel(
    jobId: string,
    contexto: ContextoReporteCredenciales,
  ): Promise<Buffer> {
    return this.trabajosSvc.generarReporteCredencialesExcel(jobId, contexto);
  }
}
