import { randomUUID } from "crypto";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  type MessageEvent,
} from "@nestjs/common";
import { Observable, timer } from "rxjs";
import { switchMap, takeWhile } from "rxjs/operators";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue, Job } from "bullmq";
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
  DocentesImportService,
  EstudiantesImportService,
  MatriculasImportService,
  PersonasImportService,
} from "./services";
import {
  construirExcelCredenciales,
  type ContextoReporteCredenciales,
  generarPlantillaExcel as construirPlantillaExcel,
  leerFilasDesdeExcelBuffer,
  parsearPersonaDeFila,
  validarPersonaFila,
  type ValidacionFilaPersonaResultado,
} from "./utils";

interface LoteTemporalGuardado {
  tipo: TipoImportacion;
  filas: Record<string, unknown>[];
  expiraEn: number;
}

interface ClienteRedisMinimo {
  set: (clave: string, valor: string, modo: "EX", segundos: number) => Promise<unknown>;
  get: (clave: string) => Promise<string | null>;
  del: (clave: string) => Promise<unknown>;
}

function esClienteRedis(valor: unknown): valor is ClienteRedisMinimo {
  return (
    typeof valor === "object" &&
    valor !== null &&
    "set" in valor &&
    typeof valor.set === "function" &&
    "get" in valor &&
    typeof valor.get === "function" &&
    "del" in valor &&
    typeof valor.del === "function"
  );
}

const TTL_LOTE_SEGUNDOS = 1800; // 30 minutos
const PREFIJO_CLAVE_LOTE = "importacion:lote:";

@Injectable()
export class ImportacionService {
  private readonly logger = new Logger(ImportacionService.name);
  private readonly lotesEnMemoria = new Map<string, LoteTemporalGuardado>();

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
  ) {}

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

  private async obtenerClienteRedis(): Promise<ClienteRedisMinimo | null> {
    const colaConCliente = this.importacionQueue as unknown as { client?: Promise<unknown> };
    const cliente: unknown = await colaConCliente.client;
    return esClienteRedis(cliente) ? cliente : null;
  }

  private async guardarLoteTemporal(
    tipo: TipoImportacion,
    filas: Record<string, unknown>[],
  ): Promise<string> {
    const loteId = randomUUID();
    const clave = `${PREFIJO_CLAVE_LOTE}${loteId}`;
    const payload = JSON.stringify({ tipo, filas });

    try {
      const redis = await this.obtenerClienteRedis();
      if (redis) {
        await redis.set(clave, payload, "EX", TTL_LOTE_SEGUNDOS);
        return loteId;
      }
    } catch (err: unknown) {
      this.logger.warn(
        `No se pudo guardar el lote ${loteId} en Redis; usando memoria local: ${String(err)}`,
      );
    }

    this.lotesEnMemoria.set(loteId, {
      tipo,
      filas,
      expiraEn: Date.now() + TTL_LOTE_SEGUNDOS * 1000,
    });
    return loteId;
  }

  private async recuperarLoteTemporal(
    loteId: string,
    tipoEsperado: TipoImportacion,
  ): Promise<Record<string, unknown>[]> {
    const clave = `${PREFIJO_CLAVE_LOTE}${loteId}`;

    try {
      const redis = await this.obtenerClienteRedis();
      if (redis) {
        const raw = await redis.get(clave);
        if (raw) {
          await redis.del(clave);
          const parsed = JSON.parse(raw) as {
            tipo: TipoImportacion;
            filas: Record<string, unknown>[];
          };
          if (parsed.tipo !== tipoEsperado) {
            throw new BadRequestException(
              "El lote previsualizado no corresponde al tipo de importación seleccionado.",
            );
          }
          return parsed.filas;
        }
      }
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn(`Error al leer lote ${loteId} desde Redis: ${String(err)}`);
    }

    const enMemoria = this.lotesEnMemoria.get(loteId);
    if (enMemoria) {
      this.lotesEnMemoria.delete(loteId);
      if (Date.now() > enMemoria.expiraEn) {
        throw new BadRequestException(
          "La vista previa expiró. Vuelva a subir el archivo Excel para continuar.",
        );
      }
      if (enMemoria.tipo !== tipoEsperado) {
        throw new BadRequestException(
          "El lote previsualizado no corresponde al tipo de importación seleccionado.",
        );
      }
      return enMemoria.filas;
    }

    throw new BadRequestException(
      "El lote previsualizado no existe o expiró. Vuelva a subir el archivo Excel.",
    );
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

    if (dto.tipo === TIPO_IMPORTACION.MATRICULAS) {
      if (!this.matriculasImportService) {
        throw new BadRequestException(
          "El servicio de importación de matrículas no está disponible.",
        );
      }
      const anioId = this.anioLectivoCls?.id();
      const { filasAnalizadas, validasCount, omitidasCount, erroresCount } =
        await this.matriculasImportService.previsualizarFilas(dto.filas, anioId);

      let loteId: string | undefined;
      if (validasCount > 0) {
        const filasValidas = filasAnalizadas
          .filter((f) => f.estado === "valida")
          .map((f) => f.datos);
        loteId = await this.guardarLoteTemporal(dto.tipo, filasValidas);
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

      if (analizada.estado === "valida") {
        validasCount++;
      } else if (analizada.estado === "ya_registrada") {
        omitidasCount++;
      } else if (analizada.estado === "error") {
        erroresCount++;
      }
    }

    let loteId: string | undefined;
    if (validasCount > 0) {
      const filasValidas = filasAnalizadas.filter((f) => f.estado === "valida").map((f) => f.datos);
      loteId = await this.guardarLoteTemporal(dto.tipo, filasValidas);
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

  private async buscarPersonaCacheada(
    tipoDocumento: string,
    numeroDocumento: string,
    cache?: Map<string, PersonaResponseDto | null>,
  ): Promise<PersonaResponseDto | null> {
    const clave = `${tipoDocumento}:${numeroDocumento}`;
    if (cache && cache.has(clave)) {
      return cache.get(clave) ?? null;
    }

    const persona = await this.personasRepository.findByDocumento(tipoDocumento, numeroDocumento);

    if (cache) {
      cache.set(clave, persona);
    }

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
      return {
        numeroFila,
        datos,
        estado: "error",
        accion: "omitir",
        mensaje: validacion.mensaje,
      };
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
      ? await this.recuperarLoteTemporal(dto.loteId, dto.tipo)
      : (dto.filas ?? []);

    if (filas.length === 0) {
      throw new BadRequestException(IMPORTACION_MESSAGES.SIN_FILAS);
    }

    if (filas.length > IMPORTACION_MAX_FILAS) {
      throw new BadRequestException(IMPORTACION_MESSAGES.LIMITE_FILAS_SUPERADO);
    }

    const payloadDto: EjecutarImportacionDto = { tipo: dto.tipo, filas };
    const anioAcademicoId = this.anioLectivoCls?.id();

    const job = await this.importacionQueue.add(
      "procesar-lote",
      { dto: payloadDto, actorId, ip, anioAcademicoId },
      {
        attempts: 1,
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    return {
      jobId: String(job.id),
      estado: "en_cola",
      mensaje: "Importación masiva iniciada en segundo plano con BullMQ.",
    };
  }

  async consultarEstadoJob(jobId: string): Promise<EstadoImportacionJobDto> {
    const job = await this.importacionQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Trabajo de importación con ID ${jobId} no encontrado.`);
    }

    const rawState = await job.getState();
    const progreso = typeof job.progress === "number" ? job.progress : 0;

    let estado: "en_cola" | "procesando" | "completado" | "fallido" = "en_cola";
    if (rawState === "active") estado = "procesando";
    else if (rawState === "completed") estado = "completado";
    else if (rawState === "failed") estado = "fallido";

    const returnvalue = job.returnvalue as EjecutarImportacionResponseDto | undefined;
    const mensaje =
      estado === "completado"
        ? returnvalue?.mensaje || "Importación masiva completada con éxito."
        : estado === "procesando"
          ? `Procesando registros (${progreso}%)...`
          : estado === "fallido"
            ? job.failedReason || "Error en el procesamiento del lote."
            : "En cola de espera BullMQ...";

    return {
      jobId: String(job.id),
      estado,
      progreso,
      mensaje,
      resultado: rawState === "completed" ? returnvalue : undefined,
      error:
        rawState === "failed"
          ? job.failedReason || "Error al procesar el archivo de importación."
          : undefined,
    };
  }

  streamProgresoJob(jobId: string): Observable<MessageEvent> {
    return timer(0, 800).pipe(
      switchMap(async () => {
        try {
          const estado = await this.consultarEstadoJob(jobId);
          return { data: estado };
        } catch (err: unknown) {
          const mensaje = err instanceof Error ? err.message : "Error al consultar estado.";
          return {
            data: {
              jobId,
              estado: "fallido",
              progreso: 0,
              error: mensaje,
            },
          };
        }
      }),
      takeWhile((evento) => {
        const data = evento.data as EstadoImportacionJobDto | undefined;
        return data?.estado !== "completado" && data?.estado !== "fallido";
      }, true),
    );
  }

  async ejecutarProcesoLote(
    dto: EjecutarImportacionDto,
    actorId: string,
    ip?: string,
    job?: Job,
    anioAcademicoId?: string,
  ): Promise<EjecutarImportacionResponseDto> {
    const esMatriculas = dto.tipo === TIPO_IMPORTACION.MATRICULAS;
    const handler = esMatriculas ? null : this.obtenerHandler(dto.tipo);
    const credencialesEmitidas: CredencialEmitidaDto[] = [];
    let importadosCount = 0;
    let omitidosCount = 0;
    const filas = dto.filas ?? [];
    const totalFilas = filas.length;

    for (let i = 0; i < totalFilas; i++) {
      const fila = filas[i];
      try {
        if (esMatriculas) {
          if (!this.matriculasImportService) {
            throw new BadRequestException(
              "El servicio de importación de matrículas no está disponible.",
            );
          }
          const ok = await this.matriculasImportService.procesarFila(
            fila,
            anioAcademicoId,
            actorId,
            ip,
          );
          if (ok) importadosCount++;
          else omitidosCount++;
        } else {
          const resultado = await this.procesarFila(handler!, fila, actorId, ip);
          if (resultado) {
            importadosCount++;
            if (resultado.credencial) {
              credencialesEmitidas.push(resultado.credencial);
            }
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
      valorNuevo: {
        tipo: dto.tipo,
        importados: importadosCount,
        omitidos: omitidosCount,
      },
      direccionIp: ip,
    });

    const mensaje = IMPORTACION_MESSAGES.IMPORTACION_EXITO(
      importadosCount,
      dto.tipo,
      omitidosCount,
    );

    return {
      importadosCount,
      omitidosCount,
      mensaje,
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

    return handler.procesar({
      datos,
      basePersona,
      personaExistente,
      actorId,
      ip,
    });
  }

  async generarPlantillaExcel(tipo: TipoImportacion): Promise<Buffer> {
    return construirPlantillaExcel(tipo);
  }

  async generarReporteCredencialesExcel(
    jobId: string,
    contexto: ContextoReporteCredenciales,
  ): Promise<Buffer> {
    const job = await this.importacionQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Trabajo de importación con ID ${jobId} no encontrado.`);
    }

    const estado = await job.getState();
    if (estado !== "completed") {
      throw new BadRequestException(
        `El trabajo de importación no ha finalizado (estado actual: ${estado}).`,
      );
    }

    const returnvalue = job.returnvalue as EjecutarImportacionResponseDto | undefined;
    const credenciales = returnvalue?.credenciales || [];

    return construirExcelCredenciales(credenciales, contexto);
  }
}
