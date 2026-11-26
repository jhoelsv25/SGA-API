import { Database } from "../../../../core/database";
import type { AusenciaConDetalle, SesionParaAusencia } from "../../interfaces";

export type AusenciasDocenteRepositoryDeps = {
  db: Database;
};

export type AusenciasDocenteRepositoryCalls = {
  buscarSesionParaAusencia: (sesionId: string) => Promise<SesionParaAusencia | null>;
  buscarPorId: (id: string) => Promise<AusenciaConDetalle | null>;
};
