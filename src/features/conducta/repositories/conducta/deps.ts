import { Database } from "@/core/database";
import { InfoMatriculaEstudiante } from "../../interfaces";

export type ConductaRepositoryDeps = {
  db: Database;
};

export type ConductaRepositoryCalls = {
  obtenerInfoMatricula: (matriculaId: string) => Promise<InfoMatriculaEstudiante | null>;
};
