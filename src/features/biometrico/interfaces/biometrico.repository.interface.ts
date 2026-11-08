export interface PersonaBasica {
  id: string;
  nombreCompleto: string;
  codigoBiometrico: string | null;
}

export interface HoraProgramada {
  hora: string; // HH:mm
  dias: string;
  activa: boolean;
}

export interface SincronizacionReloj {
  relojSerie: string;
  ultimaMarca: string;
  ultimaSincronizacion: string;
  equipo: string | null;
}

export interface IBiometricoRepository {
  listarProgramacion(): Promise<{ horarios: HoraProgramada[]; actualizadoEn: string | null }>;
  reemplazarProgramacion(horarios: HoraProgramada[]): Promise<void>;
  listarSincronizaciones(): Promise<SincronizacionReloj[]>;
  findPersonaPorCodigo(codigo: string): Promise<{ id: string } | null>;
  findPersonaBasica(personaId: string): Promise<PersonaBasica | null>;
  asignarCodigo(personaId: string, codigo: string | null): Promise<void>;
}
