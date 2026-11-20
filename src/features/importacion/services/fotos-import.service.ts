import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, extname, join, parse } from "node:path";
import { inflateRawSync } from "node:zlib";
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue, Job } from "bullmq";
import { randomUUID } from "node:crypto";
import { AuditService } from "../../../common/services/audit.service";
import { QUEUES } from "../../../core/queues/queues.constants";
import { PersonasRepository } from "../../personas/repositories/personas.repository";
import { EstudiantesRepository } from "../../estudiantes/repositories/estudiantes.repository";
import { DocentesRepository } from "../../docentes/repositories/docentes.repository";
import type {
  EstadoFotosJobDto,
  IniciarFotosJobResponseDto,
  ResultadoFotosDto,
  TipoFotosPermitido,
} from "../dto";

export interface FotosJobPayload {
  tipo: TipoFotosPermitido;
  carpetaTemporal: string;
  totalArchivos: number;
  usuarioId: string;
  ip?: string;
}

@Injectable()
export class FotosImportService {
  private readonly logger = new Logger(FotosImportService.name);

  constructor(
    @InjectQueue(QUEUES.IMPORTACION) private readonly colaImportacion: Queue,
    private readonly personasRepositorio: PersonasRepository,
    private readonly estudiantesRepositorio: EstudiantesRepository,
    private readonly docentesRepositorio: DocentesRepository,
    private readonly auditoriaServicio: AuditService,
  ) {}

  /**
   * Extrae archivos de un buffer ZIP utilizando descomposición nativa sin dependencias externas.
   */
  extraerArchivosZip(buffer: Buffer): Array<{ nombre: string; buffer: Buffer }> {
    const archivos: Array<{ nombre: string; buffer: Buffer }> = [];

    // Localizar End of Central Directory (EOCD)
    let eocdOffset = -1;
    for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
      if (buffer.readUInt32LE(i) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset === -1) {
      // Intentar lectura secuencial de cabeceras locales
      let offset = 0;
      while (offset < buffer.length - 30) {
        if (buffer.readUInt32LE(offset) !== 0x04034b50) break;
        const metodo = buffer.readUInt16LE(offset + 8);
        const tamanoCompreso = buffer.readUInt32LE(offset + 18);
        const longitudNombre = buffer.readUInt16LE(offset + 26);
        const longitudExtra = buffer.readUInt16LE(offset + 28);
        const nombre = buffer.toString("utf8", offset + 30, offset + 30 + longitudNombre);
        const inicioDatos = offset + 30 + longitudNombre + longitudExtra;

        if (tamanoCompreso > 0 && inicioDatos + tamanoCompreso <= buffer.length) {
          const datosCrudos = buffer.subarray(inicioDatos, inicioDatos + tamanoCompreso);
          let contenido: Buffer | null = null;
          if (metodo === 8) {
            contenido = inflateRawSync(datosCrudos);
          } else if (metodo === 0) {
            contenido = Buffer.from(datosCrudos);
          }

          if (contenido && !nombre.endsWith("/") && !nombre.includes("__MACOSX")) {
            archivos.push({ nombre: basename(nombre), buffer: contenido });
          }
        }
        offset = inicioDatos + tamanoCompreso;
      }
      return archivos;
    }

    const cantidadEntradas = buffer.readUInt16LE(eocdOffset + 10);
    const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
    let puntero = cdOffset;

    for (let i = 0; i < cantidadEntradas; i++) {
      if (puntero + 46 > buffer.length) break;
      if (buffer.readUInt32LE(puntero) !== 0x02014b50) break;

      const metodo = buffer.readUInt16LE(puntero + 10);
      const tamanoCompreso = buffer.readUInt32LE(puntero + 20);
      const longitudNombre = buffer.readUInt16LE(puntero + 28);
      const longitudExtra = buffer.readUInt16LE(puntero + 30);
      const longitudComentario = buffer.readUInt16LE(puntero + 32);
      const offsetCabeceraLocal = buffer.readUInt32LE(puntero + 42);
      const nombreCompleto = buffer.toString("utf8", puntero + 46, puntero + 46 + longitudNombre);

      if (
        !nombreCompleto.endsWith("/") &&
        !nombreCompleto.includes("__MACOSX") &&
        !basename(nombreCompleto).startsWith(".")
      ) {
        if (offsetCabeceraLocal + 30 <= buffer.length) {
          const longNombreLocal = buffer.readUInt16LE(offsetCabeceraLocal + 26);
          const longExtraLocal = buffer.readUInt16LE(offsetCabeceraLocal + 28);
          const inicioDatos = offsetCabeceraLocal + 30 + longNombreLocal + longExtraLocal;
          const datosCrudos = buffer.subarray(inicioDatos, inicioDatos + tamanoCompreso);

          let contenido: Buffer | null = null;
          if (metodo === 8) {
            contenido = inflateRawSync(datosCrudos);
          } else if (metodo === 0) {
            contenido = Buffer.from(datosCrudos);
          }

          if (contenido) {
            archivos.push({ nombre: basename(nombreCompleto), buffer: contenido });
          }
        }
      }

      puntero += 46 + longitudNombre + longitudExtra + longitudComentario;
    }

    return archivos;
  }

  /**
   * Verifica los bytes mágicos para validar que el buffer corresponda a JPEG, PNG o WEBP real.
   */
  validarMagicBytes(buffer: Buffer): boolean {
    if (buffer.length < 12) return false;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return true;
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return true;
    }
    // WEBP: 'RIFF' .... 'WEBP'
    if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
      return true;
    }

    return false;
  }

  /**
   * Recibe los archivos subidos (imágenes sueltas o un .zip), los valida, desempaqueta en disco
   * temporal y encola el trabajo de asignación en segundo plano con BullMQ.
   */
  async prepararYEncolar(
    tipo: TipoFotosPermitido,
    archivos: Express.Multer.File[],
    usuarioId: string,
    ip?: string,
  ): Promise<IniciarFotosJobResponseDto> {
    if (!archivos || archivos.length === 0) {
      throw new BadRequestException(
        "Debe adjuntar al menos una imagen o un archivo comprimido .zip.",
      );
    }

    const carpetaId = randomUUID();
    const raizTemporal = join(process.cwd(), "uploads", "temp-fotos", carpetaId);
    mkdirSync(raizTemporal, { recursive: true });

    let fotosValidas = 0;

    for (const archivo of archivos) {
      const ext = extname(archivo.originalname).toLowerCase();

      if (ext === ".zip") {
        try {
          const entradas = this.extraerArchivosZip(archivo.buffer);
          for (const entrada of entradas) {
            const extEntrada = extname(entrada.nombre).toLowerCase();
            if (
              [".jpg", ".jpeg", ".png", ".webp"].includes(extEntrada) &&
              this.validarMagicBytes(entrada.buffer)
            ) {
              const rutaDestino = join(raizTemporal, entrada.nombre);
              writeFileSync(rutaDestino, entrada.buffer);
              fotosValidas++;
            }
          }
        } catch (error) {
          this.logger.warn(
            `Error al descomprimir archivo zip ${archivo.originalname}: ${(error as Error).message}`,
          );
        }
      } else if (
        [".jpg", ".jpeg", ".png", ".webp"].includes(ext) &&
        this.validarMagicBytes(archivo.buffer)
      ) {
        const rutaDestino = join(raizTemporal, archivo.originalname);
        writeFileSync(rutaDestino, archivo.buffer);
        fotosValidas++;
      }
    }

    if (fotosValidas === 0) {
      rmSync(raizTemporal, { recursive: true, force: true });
      throw new BadRequestException(
        "No se encontraron imágenes válidas (JPG, PNG o WEBP) en los archivos o en el ZIP proporcionado.",
      );
    }

    const payload: FotosJobPayload = {
      tipo,
      carpetaTemporal: raizTemporal,
      totalArchivos: fotosValidas,
      usuarioId,
      ip,
    };

    const job = await this.colaImportacion.add("importar-fotos", payload, {
      attempts: 2,
      removeOnComplete: false,
      removeOnFail: false,
    });

    return {
      jobId: String(job.id),
      mensaje: `Se recibieron ${fotosValidas} fotos válidas. Procesando emparejamiento en segundo plano...`,
      totalArchivos: fotosValidas,
    };
  }

  /**
   * Procesa foto por foto en segundo plano:
   * Empareja cada archivo con la persona mediante DNI o Código y actualiza `personas.foto_url`.
   */
  async procesarFotosJob(
    payload: FotosJobPayload,
    job: Job<FotosJobPayload>,
  ): Promise<ResultadoFotosDto> {
    const { tipo, carpetaTemporal, totalArchivos, usuarioId, ip } = payload;
    this.logger.log(`Iniciando procesamiento de ${totalArchivos} fotos (${tipo}) en job ${job.id}`);

    const resultado: ResultadoFotosDto = {
      total: 0,
      exitosos: 0,
      omitidos: 0,
      asignados: [],
      detallesOmitidos: [],
    };

    if (!existsSync(carpetaTemporal)) {
      throw new Error(`La carpeta temporal ${carpetaTemporal} no existe.`);
    }

    const carpetaFotosFinal = join(process.cwd(), "uploads", "fotos");
    mkdirSync(carpetaFotosFinal, { recursive: true });

    const archivosEnCarpeta = readdirSync(carpetaTemporal);
    resultado.total = archivosEnCarpeta.length;

    let procesados = 0;

    for (const nombreArchivo of archivosEnCarpeta) {
      procesados++;
      const rutaOrigen = join(carpetaTemporal, nombreArchivo);
      const parsed = parse(nombreArchivo);
      const identificador = parsed.name.trim();
      const extension = parsed.ext.toLowerCase();

      try {
        let personaIdEncontrada: string | null = null;
        let nombreCompletoEncontrado = "";

        // 1. Buscar primero por número de documento (DNI o carnet de extranjería)
        let personaPorDoc = await this.personasRepositorio.findByDocumento("dni", identificador);
        if (!personaPorDoc) {
          personaPorDoc = await this.personasRepositorio.findByDocumento(
            "carne_extranjeria",
            identificador,
          );
        }

        if (personaPorDoc) {
          personaIdEncontrada = personaPorDoc.id;
          nombreCompletoEncontrado = personaPorDoc.nombreCompleto;
        }

        // 2. Si no se encontró por DNI, buscar por código institucional
        if (!personaIdEncontrada) {
          if (tipo === "estudiantes") {
            const estudiante = await this.estudiantesRepositorio.findByCodigo(identificador);
            if (estudiante) {
              personaIdEncontrada = estudiante.personaId;
              nombreCompletoEncontrado = estudiante.persona.nombreCompleto;
            }
          } else if (tipo === "docentes") {
            const docente = await this.docentesRepositorio.findByCodigo(identificador);
            if (docente) {
              personaIdEncontrada = docente.personaId;
              nombreCompletoEncontrado = docente.persona.nombreCompleto;
            }
          }
        }

        if (personaIdEncontrada) {
          // Copiar archivo a uploads/fotos/persona-<id>.<ext>
          const nombreFinal = `persona-${personaIdEncontrada}${extension}`;
          const rutaDestino = join(carpetaFotosFinal, nombreFinal);
          const contenido = readFileSync(rutaOrigen);
          writeFileSync(rutaDestino, contenido);

          const fotoUrlRelativa = `/uploads/fotos/${nombreFinal}`;
          await this.personasRepositorio.update(personaIdEncontrada, {
            fotoUrl: fotoUrlRelativa,
          });

          resultado.exitosos++;
          resultado.asignados.push({
            archivo: nombreArchivo,
            personaId: personaIdEncontrada,
            nombreCompleto: nombreCompletoEncontrado,
            fotoUrl: fotoUrlRelativa,
          });
        } else {
          resultado.omitidos++;
          resultado.detallesOmitidos.push({
            archivo: nombreArchivo,
            motivo: `No se encontró ningún ${tipo === "estudiantes" ? "estudiante" : "docente"} con DNI o código "${identificador}".`,
          });
        }
      } catch (err) {
        resultado.omitidos++;
        resultado.detallesOmitidos.push({
          archivo: nombreArchivo,
          motivo: `Error al procesar: ${(err as Error).message}`,
        });
      }

      const porcentaje = Math.round((procesados / resultado.total) * 100);
      await job.updateProgress(porcentaje);
    }

    // Limpiar carpeta temporal al finalizar
    try {
      rmSync(carpetaTemporal, { recursive: true, force: true });
    } catch {
      // Ignorar error de limpieza
    }

    // Auditoría de acción mutacional
    await this.auditoriaServicio.log({
      accion: "actualizar",
      tabla: "personas_fotos_masivas",
      registroId: String(job.id),
      usuarioId,
      valorNuevo: {
        tipo,
        total: resultado.total,
        exitosos: resultado.exitosos,
        omitidos: resultado.omitidos,
      },
      direccionIp: ip,
    });

    this.logger.log(
      `Job ${job.id} de fotos finalizado: ${resultado.exitosos} asignadas, ${resultado.omitidos} omitidas.`,
    );

    return resultado;
  }

  /**
   * Consulta el estado del job en BullMQ para seguimiento en tiempo real desde el frontend.
   */
  async consultarEstadoJob(jobId: string): Promise<EstadoFotosJobDto> {
    const job = await this.colaImportacion.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`No se encontró el trabajo con ID "${jobId}".`);
    }

    const state = await job.getState();
    const progreso = typeof job.progress === "number" ? job.progress : 0;

    let estadoMapeado: "esperando" | "procesando" | "completado" | "fallido" = "esperando";
    if (state === "completed") {
      estadoMapeado = "completado";
    } else if (state === "failed") {
      estadoMapeado = "fallido";
    } else if (state === "active") {
      estadoMapeado = "procesando";
    }

    return {
      id: String(job.id),
      estado: estadoMapeado,
      progreso,
      resultado: (job.returnvalue as ResultadoFotosDto) || undefined,
      error: job.failedReason || undefined,
    };
  }
}
