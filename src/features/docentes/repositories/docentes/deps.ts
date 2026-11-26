import { Database } from "../../../../core/database";
import type { DocenteResponseDto } from "../../dto";

export type DocentesRepositoryDeps = {
  db: Database;
};

export type DocentesRepositoryCalls = {
  findById: (
    id: string,
    ejecutor?: Pick<Database, "execute">,
  ) => Promise<DocenteResponseDto | null>;
  generarSiguienteCodigo: (fecha?: Date) => Promise<string>;
};
