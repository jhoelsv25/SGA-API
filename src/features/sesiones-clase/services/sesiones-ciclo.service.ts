import { Injectable, Optional } from "@nestjs/common";
import { AuditService } from "../../../common/services/audit.service";
import { CacheService } from "../../../core/cache/cache.service";
import { AniosAcademicosService } from "../../anio-escolar/anios.service";
import { CalendarioService } from "../../calendario/calendario.service";
import { ahoraEnColegio, diaIsoDeFecha } from "../../marcaciones/utils";
import { NotificacionesService } from "../../notificaciones/notificaciones.service";
import { VariablesSistemaService } from "../../variables-sistema/variables-sistema.service";
import { OBSERVACION_SIN_SALIDA } from "../constants";
import { SesionesClaseRepository } from "../repositories";
import { planificarSesiones } from "../utils";
import { SesionesContextoHelper } from "./sesiones-contexto.helper";

/**
 * Servicio especializado en la generación diaria y cierre automático
 * de sesiones de clase (RF-011 HU1).
 */
@Injectable()
export class SesionesCicloService {
  constructor(
    private readonly repository: SesionesClaseRepository,
    private readonly aniosService: AniosAcademicosService,
    private readonly calendarioService: CalendarioService,
    private readonly auditService: AuditService,
    private readonly ctx: SesionesContextoHelper,
    @Optional() private readonly notificacionesService?: NotificacionesService,
    @Optional() private readonly variablesService?: VariablesSistemaService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  /** Crea las sesiones `pendiente` del día. Idempotente: no duplica las existentes. */
  async generarDelDia(fecha = ahoraEnColegio().fecha): Promise<number> {
    const anio = await this.aniosService.anioVigente();
    if (!anio || anio.estado !== "en_curso") return 0;
    const enBimestre = anio.bimestres.some(
      (b) => b.fechaInicio.slice(0, 10) <= fecha && fecha <= b.fechaFin.slice(0, 10),
    );
    if (!enBimestre) return 0;
    if (await this.calendarioService.suspendeClasesEn(fecha)) return 0;

    const bloques = await this.repository.bloquesDelDia(anio.id, diaIsoDeFecha(fecha));
    const creadas = await this.repository.insertarSesiones(fecha, planificarSesiones(bloques));
    if (creadas > 0) {
      await this.auditService.log({
        accion: "crear",
        tabla: "sesiones_clase",
        valorNuevo: { proceso: "generacion_diaria", fecha, sesiones: creadas },
      });
    }
    return creadas;
  }

  /** Cierre del día: pendiente → no_cumplida; en_curso → parcial "Sin firma de salida". */
  async cerrarDelDia(fecha = ahoraEnColegio().fecha): Promise<void> {
    const { salidaAutomatica } = await this.ctx.configuracion();
    const resultado = await this.repository.cerrarDia(
      fecha,
      salidaAutomatica,
      OBSERVACION_SIN_SALIDA,
    );
    if (resultado.noCumplidas + resultado.parciales > 0) {
      await this.auditService.log({
        accion: "actualizar",
        tabla: "sesiones_clase",
        valorNuevo: { proceso: "cierre_diario", fecha, salidaAutomatica, ...resultado },
      });

      if (resultado.docentesAfectados && resultado.docentesAfectados.length > 0) {
        await this.notificarDocentesSesionesCerradas(resultado.docentesAfectados, fecha);
      }
    }
  }

  async asegurarGeneracion(fecha: string): Promise<void> {
    const clave = `sesiones:generadas:${fecha}`;
    if (await this.cacheService?.get<boolean>(clave)) {
      return;
    }
    await this.generarDelDia(fecha);
    await this.cacheService?.set(clave, true, 600);
  }

  /**
   * Notifica a los docentes si el switch 'notificacion.recordatorio_sesiones_docente'
   * está habilitado en la base de datos (RF-011 / RF-004).
   */
  private async notificarDocentesSesionesCerradas(
    docenteIds: string[],
    fecha: string,
  ): Promise<void> {
    if (!this.notificacionesService || !this.variablesService || docenteIds.length === 0) return;

    try {
      const activo = await this.variablesService.isActiva(
        "notificacion.recordatorio_sesiones_docente",
        true,
      );
      if (!activo) return;

      const userIds = await this.repository.findUsuariosDeDocentes(docenteIds);
      for (const usuarioId of userIds) {
        await this.notificacionesService.enviar({
          usuarioId,
          titulo: "Cierre de jornada escolar",
          mensaje: `Se ha registrado el cierre de tus sesiones de clase correspondientes al ${fecha}. Recuerda registrar y firmar tus sesiones a tiempo.`,
          tipo: "recordatorio",
          enlaceUrl: "/admin/mis-sesiones",
        });
      }
    } catch {
      // Silenciar para no frenar el cierre automático
    }
  }
}
