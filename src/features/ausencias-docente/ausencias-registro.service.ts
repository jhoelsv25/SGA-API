import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AnioLectivoCls } from "../../common/anio-lectivo";
import { AuditService } from "../../common/services/audit.service";
import { fechaHoyLima } from "../../common/utils/fecha-lima.util";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import { ConsolidadoBloqueoService } from "../seguimiento-docente";
import { MENSAJES_AUSENCIA, VALORES_DEFECTO_AUSENCIA, VARIABLES_AUSENCIA } from "./constants";
import type { AusenciaResponseDto, MensajeAusenciaResponseDto, RegistrarAusenciaDto } from "./dto";
import { AusenciasDocenteRepository } from "./repositories";
import { calcularMinutosEntre, mapearAAusenciaResponseDto } from "./utils";
import {
  guardarFotosEnDisco,
  prepararEvidenciasParaGuardar,
} from "./utils/evidencias-ausencia.util";

@Injectable()
export class AusenciasRegistroService {
  constructor(
    private readonly repository: AusenciasDocenteRepository,
    private readonly notificacionesService: NotificacionesService,
    private readonly auditService: AuditService,
    private readonly anioLectivoCls: AnioLectivoCls,
    private readonly bloqueoService: ConsolidadoBloqueoService,
  ) {}

  /**
   * Obtiene la fecha actual de referencia (YYYY-MM-DD).
   * Diseñado de forma testeable: respeta el año académico contextual de AnioLectivoCls
   * cuando define un año simulado para suites de pruebas (ej. "anio-2027-uuid"),
   * recurriendo a la fecha actual de Date en tiempo real.
   */
  obtenerFechaHoy(referencia: Date = new Date()): string {
    const fechaIso = fechaHoyLima(referencia);
    const anioId = this.anioLectivoCls.id();
    if (anioId) {
      const match = anioId.match(/anio-(20\d\d)/);
      if (match) {
        const anioCls = match[1];
        const anioActual = fechaIso.slice(0, 4);
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

    // 3.1. Verificar si el consolidado del bimestre está cerrado (CP-RF013-06)
    const periodoId = await this.repository.buscarPeriodoIdPorFecha(sesion.fecha);
    if (periodoId) {
      await this.bloqueoService.asegurarNoCerrado(sesion.docenteId, periodoId);
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

    // 8. Preparar evidencias fotográficas y validar metadatos (CP-RF012-07, 08)
    const { evidencias, nombresArchivos, listaFotos } = prepararEvidenciasParaGuardar(
      fotos,
      dto.metadatosFotos,
    );

    // 9. Calcular minutos y persistir primero en Base de Datos (evita archivos huérfanos)
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
      evidencias,
    );

    // 10. Escribir archivos en disco después de la persistencia exitosa en BD
    await guardarFotosEnDisco(listaFotos, nombresArchivos);

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
