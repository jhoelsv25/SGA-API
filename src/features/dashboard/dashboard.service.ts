import { Injectable, Logger } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { DashboardFiltrosDto, DashboardResponseDto } from "./dto";
import { DashboardRepository } from "./repositories/dashboard.repository";

type CategoriaRol = DashboardResponseDto["rolCategoria"];

/** RF-021: los roles del sistema tienen su panel; un rol adicional no ve datos del colegio. */
const CATEGORIA_POR_ROL: ReadonlyMap<string, CategoriaRol> = new Map([
  ["Administrador", "admin"],
  ["Soporte TI", "admin"],
  ["Secretaria", "secretaria"],
  ["Director", "directivo"],
  ["Subdirector", "directivo"],
  ["Docente", "docente"],
  ["Estudiante", "estudiante"],
  ["Apoderado", "apoderado"],
]);

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly dashboardRepository: DashboardRepository) {}

  private categorizarRol(rolNombre: string): CategoriaRol {
    return CATEGORIA_POR_ROL.get(rolNombre) ?? "adicional";
  }

  async getDashboardData(
    user: AuthenticatedUser,
    filtros: DashboardFiltrosDto,
  ): Promise<DashboardResponseDto> {
    const rolCategoria = this.categorizarRol(user.role);

    const referencia = await this.dashboardRepository.obtenerPeriodoReferencia(
      filtros.anioAcademicoId,
      filtros.periodoId,
    );

    if (!referencia) {
      return {
        rolCategoria,
        rolNombre: user.role,
        periodoActual: {
          anioId: "",
          anio: new Date().getFullYear(),
          periodoId: null,
          periodoNombre: null,
        },
      };
    }

    const periodoActual = {
      anioId: referencia.anioId,
      anio: referencia.anio,
      periodoId: referencia.periodoId,
      periodoNombre: referencia.periodoNombre,
    };

    if (rolCategoria === "adicional") {
      return { rolCategoria, rolNombre: user.role, periodoActual };
    }

    if (rolCategoria === "admin") {
      const dataAdmin = await this.dashboardRepository.obtenerDatosAdmin();
      return {
        rolCategoria,
        rolNombre: user.role,
        periodoActual,
        admin: dataAdmin,
      };
    }

    if (rolCategoria === "secretaria") {
      const dataSecretaria = await this.dashboardRepository.obtenerDatosSecretaria(
        referencia,
        filtros,
      );
      return {
        rolCategoria,
        rolNombre: user.role,
        periodoActual,
        secretaria: dataSecretaria,
      };
    }

    if (rolCategoria === "directivo") {
      const dataDirectivo = await this.dashboardRepository.obtenerDatosDirectivo(
        referencia,
        filtros,
      );
      return {
        rolCategoria,
        rolNombre: user.role,
        periodoActual,
        directivo: dataDirectivo,
      };
    }

    if (rolCategoria === "docente") {
      const dataDocente = await this.dashboardRepository.obtenerDatosDocente(
        user.personaId,
        referencia,
        filtros,
      );
      return {
        rolCategoria,
        rolNombre: user.role,
        periodoActual,
        docente: dataDocente,
      };
    }

    // Estudiante o apoderado
    const dataEstudiante = await this.dashboardRepository.obtenerDatosEstudiante(
      user.personaId,
      rolCategoria === "apoderado",
      referencia,
      filtros,
    );

    return {
      rolCategoria,
      rolNombre: user.role,
      periodoActual,
      estudiante: dataEstudiante,
    };
  }
}
