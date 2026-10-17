export type TipoNotificacion = "informacion" | "alerta" | "recordatorio";
export type CanalNotificacion = "in_app" | "email" | "sms" | "push";

export interface EnviarNotificacionParams {
  usuarioId: string;
  titulo: string;
  mensaje: string;
  tipo?: TipoNotificacion;
  enlaceUrl?: string | null;
  comunicadoId?: string | null;
  sesionClaseId?: string | null;
  /** Canales de envío. Si no se especifica, por defecto es ['in_app'] */
  canales?: CanalNotificacion[];
}

export interface NotificacionItem {
  id: string;
  usuarioId: string;
  titulo: string;
  mensaje: string;
  tipo: TipoNotificacion;
  enlaceUrl?: string | null;
  comunicadoId?: string | null;
  sesionClaseId?: string | null;
  leida: boolean;
  leidaEn?: string | null;
  creadoEn: string;
}

export interface NotificacionCursorPayload {
  creadoEn: string;
  id: string;
}

export interface DbNotificacionesProcedureExecutionResult {
  rows?: Array<{
    resultado?: {
      data?: NotificacionItem[];
      unreadCount?: number;
      hasMore?: boolean;
      nextCursorCreadoEn?: string | null;
      nextCursorId?: string | null;
    };
  }>;
}

export interface INotificationDeliveryStrategy {
  readonly canal: CanalNotificacion;
  enviar(params: EnviarNotificacionParams): Promise<void>;
}
