import { Inject, Injectable } from "@nestjs/common";
import { Database, DRIZZLE } from "../../../core/database";
import type {
  CreateDocenteResponseDto,
  DocenteQueryDto,
  DocenteResponseDto,
  PaginatedDocentesResponseDto,
  UpdateDocenteDto,
} from "../dto";
import type { IDocentesRepository, RegistrarDocenteTransactionData } from "../interfaces";
import type { DocentesRepositoryDeps, DocentesRepositoryCalls } from "./docentes/deps";
import * as parte1 from "./docentes/find-by-id";
import * as parte2 from "./docentes/cesar";

@Injectable()
export class DocentesRepository implements IDocentesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private dependencias(): DocentesRepositoryDeps {
    return {
      db: this.db,
    };
  }

  private llamadas(): DocentesRepositoryCalls {
    return {
      findById: (id, ejecutor) => this.findById(id, ejecutor),
      generarSiguienteCodigo: (fecha) => this.generarSiguienteCodigo(fecha),
    };
  }

  async findById(
    id: string,
    ejecutor: Pick<Database, "execute"> = this.db,
  ): Promise<DocenteResponseDto | null> {
    return parte1.findById(id, ejecutor);
  }

  async findByCodigo(codigo: string): Promise<DocenteResponseDto | null> {
    return parte1.findByCodigo(this.dependencias(), codigo);
  }

  async generarSiguienteCodigo(fecha: Date = new Date()): Promise<string> {
    return parte1.generarSiguienteCodigo(this.dependencias(), fecha);
  }

  async findByPersonaId(personaId: string): Promise<DocenteResponseDto | null> {
    return parte1.findByPersonaId(this.dependencias(), personaId);
  }

  async findAll(query?: DocenteQueryDto): Promise<PaginatedDocentesResponseDto> {
    return parte1.findAll(this.dependencias(), query);
  }

  async create(data: RegistrarDocenteTransactionData): Promise<CreateDocenteResponseDto> {
    return parte1.create(this.dependencias(), this.llamadas(), data);
  }

  async update(id: string, dto: UpdateDocenteDto): Promise<DocenteResponseDto | null> {
    return parte1.update(this.dependencias(), this.llamadas(), id, dto);
  }

  async cesar(
    id: string,
    fechaCese: string,
    actorId: string,
  ): Promise<{
    docente: DocenteResponseDto;
    mantuvoCuentaActiva: boolean;
  } | null> {
    return parte2.cesar(this.dependencias(), this.llamadas(), id, fechaCese, actorId);
  }

  /** Cursos asignados al docente en un año académico en curso o reabierto. */
  async contarCargaVigente(docenteId: string): Promise<number> {
    return parte2.contarCargaVigente(this.dependencias(), docenteId);
  }

  /** Reactiva un docente cesado: vuelve a 'activo', limpia la fecha de cese y reabre su cuenta. */
  async reactivar(id: string, actorId: string): Promise<DocenteResponseDto | null> {
    return parte2.reactivar(this.dependencias(), this.llamadas(), id, actorId);
  }

  async obtenerResumen(query?: DocenteQueryDto): Promise<{
    total: number;
    activos: number;
    licencia: number;
    cesados: number;
    nombrados: number;
    contratados: number;
    practicantes: number;
  }> {
    return parte2.obtenerResumen(this.dependencias(), query);
  }
}
