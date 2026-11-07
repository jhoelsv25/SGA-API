import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue, Job } from "bullmq";
import { AuditService } from "../../common/services/audit.service";
import { QUEUES } from "../../core/queues/queues.constants";
import type { TipoDocumento } from "../personas/constants";
import type { CreatePersonaDto, PersonaResponseDto } from "../personas/dto";
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
import type { IEntidadImportHandler, ProcesarFilaResult, Sexo } from "./interfaces";
import {
  ApoderadosImportService,
  DocentesImportService,
  EstudiantesImportService,
  PersonasImportService,
} from "./services";
import {
  construirExcelCredenciales,
  generarPlantillaExcel as construirPlantillaExcel,
  getOptStr,
  getStr,
  normalizarSexo,
  normalizarTipoDocumento,
  validarEstructuraPersonaFila,
} from "./utils";

@Injectable()
export class ImportacionService {
  private readonly logger = new Logger(ImportacionService.name);

  constructor(
    private readonly personasRepository: PersonasRepository,
    private readonly personasImportService: PersonasImportService,
    private readonly estudiantesImportService: EstudiantesImportService,
    private readonly docentesImportService: DocentesImportService,
    private readonly apoderadosImportService: ApoderadosImportService,
    private readonly auditService: AuditService,
    @InjectQueue(QUEUES.IMPORTACION)
    private readonly importacionQueue: Queue,
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

  async previsualizar(dto: PrevisualizarImportacionDto): Promise<VistaPreviaResponseDto> {
    if (!dto.filas || dto.filas.length === 0) {
      throw new BadRequestException(IMPORTACION_MESSAGES.SIN_FILAS);
    }

    if (dto.filas.length > IMPORTACION_MAX_FILAS) {
      throw new BadRequestException(IMPORTACION_MESSAGES.LIMITE_FILAS_SUPERADO);
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
      const fila = dto.filas[i];
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

    return {
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
    const tipoDocumento = normalizarTipoDocumento(getStr(datos, "tipoDocumento", "tipo_documento"));
    if (!tipoDocumento) {
      return {
        numeroFila,
        datos,
        estado: "error",
        accion: "omitir",
        mensaje: IMPORTACION_MESSAGES.TIPO_DOCUMENTO_INVALIDO,
      };
    }
    const numeroDocumento = getStr(datos, "numeroDocumento", "numero_documento");
    const nombres = getStr(datos, "nombres");
    const apellidoPaterno = getStr(datos, "apellidoPaterno", "apellido_paterno");
    const fechaNacimiento = getOptStr(datos, "fechaNacimiento", "fecha_nacimiento");

    if (!normalizarSexo(getStr(datos, "sexo"))) {
      return {
        numeroFila,
        datos,
        estado: "error",
        accion: "omitir",
        mensaje: IMPORTACION_MESSAGES.SEXO_INVALIDO,
      };
    }

    const validacion = validarEstructuraPersonaFila(
      tipoDocumento,
      numeroDocumento,
      nombres,
      apellidoPaterno,
      fechaNacimiento,
    );

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
      tipoDocumento,
      numeroDocumento,
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
    if (!dto.filas || dto.filas.length === 0) {
      throw new BadRequestException(IMPORTACION_MESSAGES.SIN_FILAS);
    }

    if (dto.filas.length > IMPORTACION_MAX_FILAS) {
      throw new BadRequestException(IMPORTACION_MESSAGES.LIMITE_FILAS_SUPERADO);
    }

    const job = await this.importacionQueue.add(
      "procesar-lote",
      { dto, actorId, ip },
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

  async ejecutarProcesoLote(
    dto: EjecutarImportacionDto,
    actorId: string,
    ip?: string,
    job?: Job,
  ): Promise<EjecutarImportacionResponseDto> {
    const handler = this.obtenerHandler(dto.tipo);
    const credencialesEmitidas: CredencialEmitidaDto[] = [];
    let importadosCount = 0;
    let omitidosCount = 0;
    const totalFilas = dto.filas.length;

    for (let i = 0; i < totalFilas; i++) {
      const fila = dto.filas[i];
      try {
        const resultado = await this.procesarFila(handler, fila, actorId, ip);
        if (resultado) {
          importadosCount++;
          if (resultado.credencial) {
            credencialesEmitidas.push(resultado.credencial);
          }
        } else {
          omitidosCount++;
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
    const tipoDocumento = (normalizarTipoDocumento(
      getStr(datos, "tipoDocumento", "tipo_documento"),
    ) ?? "dni") as TipoDocumento;
    const numeroDocumento = getStr(datos, "numeroDocumento", "numero_documento");
    const nombres = getStr(datos, "nombres");
    const apellidoPaterno = getStr(datos, "apellidoPaterno", "apellido_paterno");
    const apellidoMaterno = getOptStr(datos, "apellidoMaterno", "apellido_materno");
    const sexo: Sexo = normalizarSexo(getStr(datos, "sexo")) ?? "M";
    const fechaNacimiento = getOptStr(datos, "fechaNacimiento", "fecha_nacimiento");
    const celular = getOptStr(datos, "celular");
    const correo = getOptStr(datos, "correo");
    const direccion = getOptStr(datos, "direccion");
    const distrito = getOptStr(datos, "distrito");

    const personaExistente = await this.personasRepository.findByDocumento(
      tipoDocumento,
      numeroDocumento,
    );

    const basePersona: CreatePersonaDto = {
      tipoDocumento,
      numeroDocumento,
      nombres,
      apellidoPaterno,
      apellidoMaterno,
      sexo,
      fechaNacimiento,
      celular,
      correo,
      direccion,
      distrito,
    };

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

  async generarReporteCredencialesExcel(jobId: string): Promise<Buffer> {
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

    return construirExcelCredenciales(credenciales);
  }
}
