import { Inject, Injectable, Optional } from "@nestjs/common";
import { Database, DRIZZLE } from "../../../core/database";
import { DashboardAdminRepository } from "./dashboard-admin.repository";
import { DashboardDirectivoRepository } from "./dashboard-directivo.repository";
import { DashboardDocenteRepository } from "./dashboard-docente.repository";
import { DashboardEstudianteRepository } from "./dashboard-estudiante.repository";
import {
  DashboardReferenciaRepository,
  type PeriodoReferencia,
} from "./dashboard-referencia.repository";
import { DashboardSecretariaRepository } from "./dashboard-secretaria.repository";

export type { PeriodoReferencia };

/**
 * Fachada cohesiva de repositorio para el Dashboard que delega por rol
 * en repositorios especializados (referencia, directivo, docente, estudiante, admin y secretaría).
 */
@Injectable()
export class DashboardRepository {
  private readonly referenciaRepo: DashboardReferenciaRepository;
  private readonly directivoRepo: DashboardDirectivoRepository;
  private readonly docenteRepo: DashboardDocenteRepository;
  private readonly estudianteRepo: DashboardEstudianteRepository;
  private readonly adminRepo: DashboardAdminRepository;
  private readonly secretariaRepo: DashboardSecretariaRepository;

  constructor(
    @Inject(DRIZZLE) db: Database,
    @Optional() referenciaRepo?: DashboardReferenciaRepository,
    @Optional() directivoRepo?: DashboardDirectivoRepository,
    @Optional() docenteRepo?: DashboardDocenteRepository,
    @Optional() estudianteRepo?: DashboardEstudianteRepository,
    @Optional() adminRepo?: DashboardAdminRepository,
    @Optional() secretariaRepo?: DashboardSecretariaRepository,
  ) {
    this.referenciaRepo = referenciaRepo ?? new DashboardReferenciaRepository(db);
    this.directivoRepo = directivoRepo ?? new DashboardDirectivoRepository(db);
    this.docenteRepo = docenteRepo ?? new DashboardDocenteRepository(db);
    this.estudianteRepo = estudianteRepo ?? new DashboardEstudianteRepository(db);
    this.adminRepo = adminRepo ?? new DashboardAdminRepository(db, this.referenciaRepo);
    this.secretariaRepo = secretariaRepo ?? new DashboardSecretariaRepository(db);
  }

  obtenerPeriodoReferencia(
    ...args: Parameters<DashboardReferenciaRepository["obtenerPeriodoReferencia"]>
  ) {
    return this.referenciaRepo.obtenerPeriodoReferencia(...args);
  }

  obtenerDatosDirectivo(
    ...args: Parameters<DashboardDirectivoRepository["obtenerDatosDirectivo"]>
  ) {
    return this.directivoRepo.obtenerDatosDirectivo(...args);
  }

  obtenerDatosDocente(...args: Parameters<DashboardDocenteRepository["obtenerDatosDocente"]>) {
    return this.docenteRepo.obtenerDatosDocente(...args);
  }

  obtenerDatosEstudiante(
    ...args: Parameters<DashboardEstudianteRepository["obtenerDatosEstudiante"]>
  ) {
    return this.estudianteRepo.obtenerDatosEstudiante(...args);
  }

  obtenerDatosAdmin() {
    return this.adminRepo.obtenerDatosAdmin();
  }

  obtenerDatosSecretaria(
    ...args: Parameters<DashboardSecretariaRepository["obtenerDatosSecretaria"]>
  ) {
    return this.secretariaRepo.obtenerDatosSecretaria(...args);
  }
}
