export interface PersonaBasica {
  id: string;
  nombreCompleto: string;
  codigoBiometrico: string | null;
}

export interface IBiometricoRepository {
  findPersonaPorCodigo(codigo: string): Promise<{ id: string } | null>;
  findPersonaBasica(personaId: string): Promise<PersonaBasica | null>;
  asignarCodigo(personaId: string, codigo: string | null): Promise<void>;
}
