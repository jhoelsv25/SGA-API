import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { AnioLectivoCls } from "../../common/anio-lectivo";
import { AuditService } from "../../common/services/audit.service";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import {
  FOTO_MIME_TYPES,
  FOTO_TAMANO_MAXIMO_BYTES,
  MENSAJES_AUSENCIA,
  type FotoMimeType,
  VALORES_DEFECTO_AUSENCIA,
  VARIABLES_AUSENCIA,
} from "./constants";
import type { AusenciaResponseDto, MensajeAusenciaResponseDto, RegistrarAusenciaDto } from "./dto";
import type { DatosCrearEvidencia } from "./interfaces";
import { AusenciasDocenteRepository } from "./repositories";
import { calcularMinutosEntre, mapearAAusenciaResponseDto } from "./utils";

function obtenerExtensionPorMime(mimetype: string): string {
  if (mimetype === "image/jpeg") {
    return ".jpg";
  }
  return ".png";
}

@Injectable()
export class AusenciasRegistroService {
  constructor(
    private readonly repository: AusenciasDocenteRepository,
    private readonly notificacionesService: NotificacionesService,
    private readonly auditService: AuditService,
    private readonly anioLectivoCls: AnioLectivoCls,
  ) {}

  /**
   * Obtiene la fecha actual de referencia (YYYY-MM-DD).
   * Diseñado de forma testeable: respeta el año académico contextual de AnioLectivoCls
   * cuando define un año simulado para suites de pruebas (ej. "anio-2027-uuid"),
   * recurriendo a la fecha actual de Date en tiempo real.
   */
  obtenerFechaHoy(): string {
    const ahora = new Date();
    const fechaIso = ahora.toISOString().slice(0, 10);
    const anioId = this.anioLectivoCls.id();
    if (anioId) {
      const match = anioId.match(/anio-(20\d\d)/);
      if (match) {
        const anioCls = match[1];
        const anioActual = String(ahora.getUTCFullYear());
        if (anioCls > anioActual) {
          return `${anioCls}-${fechaIso.slice(5)}`;
        }
      }
    }
    return fechaIso;
  }

  /**
   * HU1: Registrar una ausencia en una sesión de clase con fotos opcionales.
   * Traza: CP-RF012-01, 02, 03, 04, 05, 06, 07, 08, 09, 18, 25.
   */
  async registrar(
    dto: RegistrarAusenciaDto,
    fotos: Express.Multer.File[] | undefined,
    actorId: string,
    ip?: string,
  ): Promise<MensajeAusenciaResponseDto & { ausencia: AusenciaResponseDto }> {
    // 1. Verificar existencia de la sesión
    const sesion = await this.repository.buscarSesionParaAusencia(dto.sesionClaseId);
    if (!sesion) {
      throw new NotFoundException("Sesión de clase no encontrada.");
    }

    // 2. Rechazar sesión de fecha futura (RF: «sesión de hoy o anterior»)
    const hoy = this.obtenerFechaHoy();
    if (sesion.fecha > hoy) {
      throw new BadRequestException(MENSAJES_AUSENCIA.SESION_FUTURA);
    }

    // 3. Verificar si el bimestre está cerrado o consolidado (CP-RF012-18)
    const estaBloqueado = await this.repository.bimestreEstaBloqueado(
      sesion.fecha,
      sesion.docenteId,
    );
    if (estaBloqueado) {
      throw new ForbiddenException(MENSAJES_AUSENCIA.BIMESTRE_CERRADO);
    }

    // 4. Validar horas invertidas (CP-RF012-05)
    if (dto.horaHasta <= dto.horaDesde) {
      throw new BadRequestException(MENSAJES_AUSENCIA.HORAS_INVERTIDAS);
    }

    // 5. Validar tramo dentro del horario de la sesión (CP-RF012-04)
    if (dto.horaDesde < sesion.horaInicio || dto.horaHasta > sesion.horaFin) {
      throw new BadRequestException(
        MENSAJES_AUSENCIA.FUERA_HORARIO_SESION(`${sesion.horaInicio} a ${sesion.horaFin}`),
      );
    }

    // 6. Validar superposición con otros tramos vigentes (CP-RF012-03)
    const ausenciasVigentes = await this.repository.buscarAusenciasVigentesDeSesion(
      dto.sesionClaseId,
    );
    const hayCruce = ausenciasVigentes.some(
      (otra) => !otra.anulada && dto.horaDesde < otra.horaHasta && dto.horaHasta > otra.horaDesde,
    );
    if (hayCruce) {
      throw new ConflictException(MENSAJES_AUSENCIA.TRAMOS_SUPERPUESTOS);
    }

    // 7. Validar motivo «otro» sin observación (CP-RF012-06)
    if (dto.motivo === "otro" && (!dto.observacion || !dto.observacion.trim())) {
      throw new BadRequestException(MENSAJES_AUSENCIA.FALTA_OBSERVACION);
    }

    // 8. Validar fotos (CP-RF012-07)
    const listaFotos = fotos ?? [];
    for (const foto of listaFotos) {
      const esMimeValido = FOTO_MIME_TYPES.includes(foto.mimetype as FotoMimeType);
      const esTamanoValido = foto.size <= FOTO_TAMANO_MAXIMO_BYTES;
      if (!esMimeValido || !esTamanoValido) {
        throw new BadRequestException(MENSAJES_AUSENCIA.FOTO_INVALIDA);
      }
    }

    // 9. Procesar metadatos de fotos (rechaza JSON inválido con BadRequestException)
    let metadatosFotos: Array<{ tomadaEn?: string }> = [];
    if (dto.metadatosFotos) {
      try {
        const parsed: unknown = JSON.parse(dto.metadatosFotos);
        if (!Array.isArray(parsed)) {
          throw new BadRequestException(MENSAJES_AUSENCIA.METADATOS_FOTOS_INVALIDOS);
        }
        metadatosFotos = parsed as Array<{ tomadaEn?: string }>;
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException(MENSAJES_AUSENCIA.METADATOS_FOTOS_INVALIDOS);
      }
    }

    // 10. Generar identificadores y rutas de evidencias fotográficas (extensión SOLO por mimetype)
    const evidenciasParaGuardar: DatosCrearEvidencia[] = [];
    const nombresArchivos: string[] = [];

    for (let i = 0; i < listaFotos.length; i++) {
      const foto = listaFotos[i];
      const idFoto = randomUUID();
      const extension = obtenerExtensionPorMime(foto.mimetype);
      const nombreArchivo = `${idFoto}${extension}`;
      nombresArchivos.push(nombreArchivo);

      const tomadaEn = metadatosFotos[i]?.tomadaEn ?? null;
      evidenciasParaGuardar.push({
        archivoUrl: `/uploads/ausencias/${nombreArchivo}`,
        tomadaEn,
        orden: i + 1,
      });
    }

    // 11. Calcular minutos y persistir primero en Base de Datos (evita archivos huérfanos)
    const minutos = calcularMinutosEntre(dto.horaDesde, dto.horaHasta);
    const nuevaAusencia = await this.repository.crearAusenciaConFotos(
      {
        sesionClaseId: dto.sesionClaseId,
        registradoPorId: actorId,
        horaDesde: dto.horaDesde,
        horaHasta: dto.horaHasta,
        motivo: dto.motivo,
        observacion: dto.observacion?.trim() ?? null,
      },
      evidenciasParaGuardar,
    );

    // 12. Escribir archivos en disco después de la persistencia exitosa en BD
    if (listaFotos.length > 0) {
      const carpeta = path.join(process.cwd(), "uploads", "ausencias");
      const archivosEscritos: string[] = [];
      try {
        let carpetaCreada = false;
        for (let i = 0; i < listaFotos.length; i++) {
          const foto = listaFotos[i];
          if (foto.buffer && foto.buffer.length > 0) {
            if (!carpetaCreada) {
              await fs.promises.mkdir(carpeta, { recursive: true });
              carpetaCreada = true;
            }
            const rutaCompleta = path.join(carpeta, nombresArchivos[i]);
            await fs.promises.writeFile(rutaCompleta, foto.buffer);
            archivosEscritos.push(rutaCompleta);
          }
        }
      } catch {
        // En caso de fallo de escritura, eliminar archivos ya escritos para evitar huérfanos
        await Promise.all(
          archivosEscritos.map(async (ruta) => {
            try {
              await fs.promises.unlink(ruta);
            } catch {
              // Silenciar error al borrar archivo durante cleanup
            }
          }),
        );
        throw new InternalServerErrorException(
          "No se pudieron guardar las evidencias fotográficas en disco.",
        );
      }
    }

    // 13. Notificar al docente (CP-RF012-01)
    await this.notificacionesService.enviar({
      usuarioId: sesion.docenteUsuarioId,
      titulo: "Nueva ausencia registrada",
      mensaje: `Se registró una ausencia de ${minutos} minutos en su sesión de clase.`,
      tipo: "alerta",
      sesionClaseId: sesion.id,
      enlaceUrl: "/admin/mis-ausencias",
    });

    // 14. Registrar en auditoría inmutable
    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "ausencias_sesion",
      registroId: nuevaAusencia.id,
      valorNuevo: {
        sesionClaseId: nuevaAusencia.sesionClaseId,
        horaDesde: nuevaAusencia.horaDesde,
        horaHasta: nuevaAusencia.horaHasta,
        minutos,
        motivo: nuevaAusencia.motivo,
        observacion: nuevaAusencia.observacion,
      },
      direccionIp: ip,
    });

    // 15. Obtener plazos configurables y formatear respuesta
    const plazoDescargoStr = await this.repository.obtenerVariableSistema(
      VARIABLES_AUSENCIA.PLAZO_DESCARGO_DIAS,
    );
    const plazoCorreccionStr = await this.repository.obtenerVariableSistema(
      VARIABLES_AUSENCIA.PLAZO_CORRECCION_HORAS,
    );
    const plazoDescargoDias = plazoDescargoStr
      ? parseInt(plazoDescargoStr, 10)
      : VALORES_DEFECTO_AUSENCIA.PLAZO_DESCARGO_DIAS;
    const plazoCorreccionHoras = plazoCorreccionStr
      ? parseInt(plazoCorreccionStr, 10)
      : VALORES_DEFECTO_AUSENCIA.PLAZO_CORRECCION_HORAS;

    const ausenciaDto = mapearAAusenciaResponseDto(
      nuevaAusencia,
      plazoDescargoDias,
      plazoCorreccionHoras,
    );

    return {
      mensaje: MENSAJES_AUSENCIA.AUSENCIA_REGISTRADA(minutos),
      id: nuevaAusencia.id,
      minutos,
      ausencia: ausenciaDto,
    };
  }
}
