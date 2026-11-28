import { Database } from "@/core/database";
import type { AlcanceLibreta, LibretaSeccionRow } from "../../interfaces";

export type LibretasRepositoryDeps = {
  db: Database;
};

export type LibretasRepositoryCalls = {
  obtenerAlcance: (rolId: string) => Promise<AlcanceLibreta | null>;
  adjuntarUsuariosFamilia: (
    rows: Array<{
      matriculaId: string;
      codigo: string;
      numeroDocumento?: string | null;
      nombres: string;
      paterno: string;
      materno: string | null;
      seccionId: string;
      libretaId: string | null;
      estado: string | null;
      fechaLimite: string | null;
      estudianteId: string;
      estudiantePersonaId: string;
    }>,
  ) => Promise<LibretaSeccionRow[]>;
};
