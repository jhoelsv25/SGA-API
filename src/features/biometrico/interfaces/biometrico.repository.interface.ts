import type { EstadoPendiente, MotivoPendiente } from "../constants";
import type { ConfigRelojDto, OrdenDto, PendienteResponseDto } from "../dto";
import type { EstadoOrden, TipoOrden } from "../constants";

export interface PersonaBasica {
  id: string;
  nombreCompleto: string;
  codigoBiometrico: string | null;
}

export interface NuevaPendiente {
  equipoId: string;
  codigoBiometrico: string;
  fechaHora: string;
  motivo: MotivoPendiente;
}

export interface ResolucionPendiente {
  estado: Exclude<EstadoPendiente, "pendiente">;
  usuarioId: string;
  personaId?: string;
  marcacionId?: string;
  motivoDescarte?: string;
}

export interface LatidoRegistrado {
  /** Hora actual de Lima "YYYY-MM-DD HH:mm:ss" (no la del motor de base de datos). */
  ahora: string;
  relojResponde: boolean;
  desfaseMinutos: number | null;
}

export interface RelojRegistrado {
  id: string;
  nombre: string;
  ubicacion: string;
  activo: boolean;
  ultimoLatidoEn: string | null;
  relojRespondioEn: string | null;
  ultimoDesfaseMin: number | null;
  config: ConfigRelojDto;
}

export interface IBiometricoRepository {
  findPersonaPorCodigo(codigo: string): Promise<{ id: string } | null>;
  findPersonaBasica(personaId: string): Promise<PersonaBasica | null>;
  asignarCodigo(personaId: string, codigo: string | null): Promise<void>;
  /** Devuelve false si ya existía (mismo reloj, código y hora). */
  insertarPendiente(data: NuevaPendiente): Promise<boolean>;
  listarPendientes(estado: EstadoPendiente, limite: number): Promise<PendienteResponseDto[]>;
  findPendientePorId(id: string): Promise<PendienteResponseDto | null>;
  resolverPendiente(id: string, resolucion: ResolucionPendiente): Promise<PendienteResponseDto>;
  registrarLatido(equipoId: string, latido: LatidoRegistrado): Promise<void>;
  listarRelojes(): Promise<RelojRegistrado[]>;
  findConfig(equipoId: string): Promise<ConfigRelojDto | null>;
  guardarConfig(equipoId: string, config: ConfigRelojDto): Promise<void>;
  vencerOrdenes(equipoId: string, minutos: number, mensaje: string): Promise<void>;
  findOrdenPendiente(equipoId: string, tipo: TipoOrden): Promise<OrdenDto | null>;
  crearOrden(equipoId: string, tipo: TipoOrden, usuarioId: string): Promise<OrdenDto>;
  listarOrdenes(equipoId: string, limite: number): Promise<OrdenDto[]>;
  listarOrdenesPendientes(equipoId: string): Promise<{ id: string; tipo: TipoOrden }[]>;
  resolverOrden(
    equipoId: string,
    ordenId: string,
    estado: Exclude<EstadoOrden, "pendiente">,
    mensaje: string,
    datos: Record<string, unknown> | null,
  ): Promise<boolean>;
}
