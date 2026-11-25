import { Injectable } from "@nestjs/common";
import { NotificacionesService } from "../../notificaciones/notificaciones.service";
import { AulaVirtualRepository } from "../repositories";

/**
 * Servicio especializado en el cron periódico de recordatorios previos al vencimiento
 * y alertas post-vencimiento de tareas/exámenes sin entrega (RF-016).
 */
@Injectable()
export class AulaRecordatoriosService {
  constructor(
    private readonly repository: AulaVirtualRepository,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /**
   * Cron periódico cada 5 minutos:
   * 1. Detecta exámenes y tareas que vencen en menos de 35 minutos y avisa a estudiantes sin entrega.
   * 2. Detecta tareas vencidas recientemente y notifica a quienes no entregaron.
   */
  async procesarRecordatoriosYVencimientos(): Promise<{
    recordatoriosEnviados: number;
    vencimientosEnviados: number;
  }> {
    const ahora = new Date();
    let recordatoriosEnviados = 0;
    let vencimientosEnviados = 0;

    const en35Min = new Date(ahora.getTime() + 35 * 60 * 1000);
    const tareasPorVencer = await this.repository.findTareasParaVentana(
      ahora.toISOString(),
      en35Min.toISOString(),
    );

    for (const tarea of tareasPorVencer) {
      const sinEntrega = await this.repository.findEstudiantesSinEntrega(
        tarea.id,
        tarea.seccionId,
        tarea.anioAcademicoId,
      );
      const esExamen = tarea.tipo === "examen" || tarea.tipo === "cuestionario";
      const tipoNombre = esExamen ? "examen" : "trabajo";
      const enlaceUrl = `/admin/aula-virtual/${tarea.cursoSeccionId}?tareaId=${tarea.id}&alerta=recordatorio_30m`;
      const msRestantes = new Date(tarea.fechaLimite).getTime() - ahora.getTime();
      const minRestantes = Math.max(1, Math.round(msRestantes / (60 * 1000)));

      for (const estudiante of sinEntrega) {
        if (await this.repository.yaSeNotifico(estudiante.usuarioId, enlaceUrl)) continue;
        await this.notificaciones.enviar({
          usuarioId: estudiante.usuarioId,
          titulo: `⏳ ${esExamen ? "Examen" : "Trabajo"} por vencer en ${tarea.cursoNombre}`,
          mensaje: esExamen
            ? `Tu ${tipoNombre} «${tarea.titulo}» vence en aproximadamente ${minRestantes} minutos. Recuerda ingresar a resolverlo.`
            : `Tu ${tipoNombre} «${tarea.titulo}» vence en aproximadamente ${minRestantes} minutos. No olvides adjuntar tu entrega.`,
          tipo: "recordatorio",
          enlaceUrl,
        });
        recordatoriosEnviados++;
      }
    }

    const hace2Horas = new Date(ahora.getTime() - 2 * 60 * 60 * 1000);
    const tareasVencidas = await this.repository.findTareasParaVentana(
      hace2Horas.toISOString(),
      ahora.toISOString(),
    );

    for (const tarea of tareasVencidas) {
      const sinEntrega = await this.repository.findEstudiantesSinEntrega(
        tarea.id,
        tarea.seccionId,
        tarea.anioAcademicoId,
      );
      const enlaceUrl = `/admin/aula-virtual/${tarea.cursoSeccionId}?tareaId=${tarea.id}&alerta=vencida`;

      for (const estudiante of sinEntrega) {
        if (await this.repository.yaSeNotifico(estudiante.usuarioId, enlaceUrl)) continue;
        const extraTardia = tarea.permiteEntregaTardia
          ? " La tarea permite entregas tardías con penalización."
          : " La tarea no acepta entregas fuera de plazo.";
        await this.notificaciones.enviar({
          usuarioId: estudiante.usuarioId,
          titulo: `⚠️ Plazo vencido en ${tarea.cursoNombre}`,
          mensaje: `El plazo para «${tarea.titulo}» ha finalizado y no registraste ninguna entrega.${extraTardia}`,
          tipo: "alerta",
          enlaceUrl,
        });
        vencimientosEnviados++;
      }
    }

    return { recordatoriosEnviados, vencimientosEnviados };
  }
}
