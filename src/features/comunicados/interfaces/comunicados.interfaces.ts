export type EstadoComunicado = "borrador" | "publicado" | "archivado";
export type DirigidoA = "todos" | "docentes" | "estudiantes" | "apoderados";
export type PrioridadComunicado = "normal" | "importante" | "urgente";

export interface ComunicadoItem {
  id: string;
  autorId: string;
  autorNombre: string;
  titulo: string;
  contenido: string;
  dirigidoA: DirigidoA;
  gradoId?: string | null;
  gradoNumero?: number | null;
  seccionId?: string | null;
  seccionNombre?: string | null;
  prioridad: PrioridadComunicado;
  estado: EstadoComunicado;
  adjuntoUrl?: string | null;
  publicadoEn?: string | null;
  venceEn?: string | null;
  creadoEn: string;
  totalDestinatarios: number;
  totalLeidos: number;
  porcentajeLectura: number;
  leidoPorMi: boolean;
}

export interface ComunicadoCursorPayload {
  creadoEn: string;
  id: string;
}

export interface DbComunicadosProcedureResult {
  rows?: Array<{
    resultado?: {
      data?: ComunicadoItem[];
      hasMore?: boolean;
      nextCursorCreadoEn?: string | null;
      nextCursorId?: string | null;
    };
  }>;
}

export interface DestinatarioLecturaItem {
  usuarioId: string;
  nombreCompleto: string;
  tipoDestinatario: "docente" | "estudiante" | "apoderado";
  leido: boolean;
  leidoEn?: string | null;
}

export interface AvanceLecturaResponse {
  comunicadoId: string;
  titulo: string;
  totalDestinatarios: number;
  totalLeidos: number;
  porcentajeLectura: number;
  destinatarios: DestinatarioLecturaItem[];
}
