import { sinFichaDocente } from "../../common/utils/ficha-docente.util";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AnioLectivoCls } from "../../common/anio-lectivo";
import { AuditService } from "../../common/services/audit.service";
import { MENSAJES_AUSENCIA, VALORES_DEFECTO_AUSENCIA, VARIABLES_AUSENCIA } from "./constants";
import type {
  AusenciaResponseDto,
  FiltroAusenciasQueryDto,
  MensajeAusenciaResponseDto,
  RegistrarDescargoDto,
  ResumenAusenciasSupervisorResponseDto,
} from "./dto";
import { AusenciasDocenteRepository } from "./repositories";
import { formatearFechaDdMmYyyy, mapearAAusenciaResponseDto } from "./utils";

/**
 * Mensajes locales específicos para rechazo de descargo en estados no permitidos (reparación T05).
 * Se mantienen como constantes locales para no modificar el archivo global de constantes en paralelo.
 */
export const MENSAJE_DESCARGO_AUSENCIA_ANULADA =
  "No se puede presentar descargo para una ausencia anulada.";
export const MENSAJE_DESCARGO_AUSENCIA_NO_VIGENTE =
  "No se puede presentar descargo para una versión no vigente de la ausencia.";

@Injectable()
export class AusenciasConsultaService {
  constructor(
    private readonly repository: AusenciasDocenteRepository,
    private readonly auditService: AuditService,
    private readonly anioLectivoCls: AnioLectivoCls,
  ) {}

  /**
   * Obtiene los plazos configurables de descargo y corrección desde variables de sistema.
   */
  private async obtenerPlazosConfigurables(): Promise<{
    plazoDescargoDias: number;
    plazoCorreccionHoras: number;
  }> {
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

    return { plazoDescargoDias, plazoCorreccionHoras };
  }

  /**
   * HU4: Listar ausencias para supervisores con filtros y cálculo de total de minutos.
   * Traza: CP-RF012-24.
   */
  async listarSupervisor(
    query: FiltroAusenciasQueryDto,
  ): Promise<ResumenAusenciasSupervisorResponseDto> {
    const anioAcademicoId = this.anioLectivoCls.id();
    const ausencias = await this.repository.listarSupervisor({
      anioAcademicoId,
      periodoId: query.periodoId,
      docenteId: query.docenteId,
      fechaDesde: query.fechaDesde,
      fechaHasta: query.fechaHasta,
    });

    const { plazoDescargoDias, plazoCorreccionHoras } = await this.obtenerPlazosConfigurables();

    const data = ausencias.map((ausencia) =>
      mapearAAusenciaResponseDto(ausencia, plazoDescargoDias, plazoCorreccionHoras),
    );

    const totalMinutos = ausencias
      .filter((a) => !a.anulada && a.vigente)
      .reduce((sum, a) => sum + a.minutos, 0);

    const totalAusencias = ausencias.length;
    const totalAnuladas = ausencias.filter((a) => a.anulada).length;

    return {
      data,
      totalMinutos,
      totalAusencias,
      totalAnuladas,
    };
  }

  /**
   * HU3: Listar ausencias del docente autenticado (solo vigentes y de sus sesiones).
   * Traza: CP-RF012-13, 19, 23.
   */
  async misAusencias(personaId: string): Promise<AusenciaResponseDto[]> {
    const docente = await this.repository.docentePorPersonaId(personaId);
    if (!docente) {
      throw sinFichaDocente();
    }

    const anioAcademicoId = this.anioLectivoCls.id();
    const ausencias = await this.repository.listarPorDocente(docente.id, anioAcademicoId);

    // CP-RF012-13: Retornar únicamente versiones vigentes
    const ausenciasVigentes = ausencias.filter((a) => a.vigente);

    const { plazoDescargoDias, plazoCorreccionHoras } = await this.obtenerPlazosConfigurables();

    return ausenciasVigentes.map((ausencia) =>
      mapearAAusenciaResponseDto(ausencia, plazoDescargoDias, plazoCorreccionHoras),
    );
  }

  /**
   * HU3: Obtener el detalle de una ausencia para el docente autenticado.
   * Traza: CP-RF012-13, 19, 23.
   */
  async obtenerDetalleDocente(id: string, personaId: string): Promise<AusenciaResponseDto> {
    const docente = await this.repository.docentePorPersonaId(personaId);
    if (!docente) {
      throw sinFichaDocente();
    }

    const ausencia = await this.repository.buscarPorId(id);
    if (!ausencia) {
      throw new NotFoundException("Ausencia no encontrada.");
    }

    // CP-RF012-23: Solo puede consultar sus propias ausencias
    if (ausencia.sesion.docenteId !== docente.id) {
      throw new ForbiddenException("No tiene acceso a las ausencias de otro docente.");
    }

    // CP-RF012-13: Solo versión vigente
    if (!ausencia.vigente) {
      throw new NotFoundException("Ausencia no encontrada.");
    }

    const { plazoDescargoDias, plazoCorreccionHoras } = await this.obtenerPlazosConfigurables();

    return mapearAAusenciaResponseDto(ausencia, plazoDescargoDias, plazoCorreccionHoras);
  }

  /**
   * HU3: Registrar el descargo único del docente dentro del plazo de 7 días.
   * Traza: CP-RF012-20, 21, 22, 23, 18.
   */
  async presentarDescargo(
    id: string,
    dto: RegistrarDescargoDto,
    personaId: string,
    actorId: string,
    ip?: string,
  ): Promise<MensajeAusenciaResponseDto> {
    // 1. Verificar existencia del docente autenticado
    const docente = await this.repository.docentePorPersonaId(personaId);
    if (!docente) {
      throw sinFichaDocente();
    }

    // 2. Existencia y pertenencia (CP-RF012-23)
    const ausencia = await this.repository.buscarPorId(id);
    if (!ausencia || ausencia.sesion.docenteId !== docente.id) {
      throw new ForbiddenException("No tiene acceso a las ausencias de otro docente.");
    }

    // 3. Validación de vigencia y anulación (Reparación T05: VAL-3)
    if (ausencia.anulada) {
      throw new BadRequestException(MENSAJE_DESCARGO_AUSENCIA_ANULADA);
    }

    if (!ausencia.vigente) {
      throw new BadRequestException(MENSAJE_DESCARGO_AUSENCIA_NO_VIGENTE);
    }

    // 4. Bimestre cerrado o consolidado (CP-RF012-18)
    const estaBloqueado = await this.repository.bimestreEstaBloqueado(
      ausencia.sesion.fecha,
      ausencia.sesion.docenteId,
    );
    if (estaBloqueado) {
      throw new ForbiddenException(MENSAJES_AUSENCIA.BIMESTRE_CERRADO);
    }

    // 5. Descargo repetido (CP-RF012-22)
    if (ausencia.descargo !== null) {
      throw new BadRequestException(MENSAJES_AUSENCIA.DESCARGO_REPETIDO);
    }

    // 6. Descargo fuera de plazo (CP-RF012-21)
    const { plazoDescargoDias } = await this.obtenerPlazosConfigurables();
    const fechaRegistro = new Date(ausencia.registradoEn);
    const fechaVencimiento = new Date(
      fechaRegistro.getTime() + plazoDescargoDias * 24 * 60 * 60 * 1000,
    );

    if (Date.now() > fechaVencimiento.getTime()) {
      const fechaFormateada = formatearFechaDdMmYyyy(fechaVencimiento);
      throw new BadRequestException(MENSAJES_AUSENCIA.DESCARGO_FUERA_DE_PLAZO(fechaFormateada));
    }

    // 7. Validar que el texto del descargo no esté vacío
    if (!dto.descargo || !dto.descargo.trim()) {
      throw new BadRequestException("El texto del descargo es obligatorio.");
    }

    const textoDescargo = dto.descargo.trim();

    // 8. Persistir descargo en BD (CP-RF012-20)
    await this.repository.guardarDescargo(id, textoDescargo);

    // 9. Registrar en bitácora de auditoría (RF-003)
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "ausencias_sesion",
      registroId: id,
      valorAnterior: {
        descargo: ausencia.descargo,
      },
      valorNuevo: {
        descargo: textoDescargo,
      },
      direccionIp: ip,
    });

    // 10. Respuesta exitosa
    return {
      mensaje: MENSAJES_AUSENCIA.DESCARGO_ENVIADO,
    };
  }
}
