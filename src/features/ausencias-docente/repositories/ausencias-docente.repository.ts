import { Inject, Injectable } from "@nestjs/common";
import { Database, DRIZZLE } from "../../../core/database";
import type {
  AusenciaConDetalle,
  AusenciaFila,
  DatosCrearAusencia,
  DatosCrearEvidencia,
  DatosCrearVersion,
  FiltrosListarSupervisor,
  IAusenciasDocenteRepository,
  SesionParaAusencia,
} from "../interfaces";
import type {
  AusenciasDocenteRepositoryDeps,
  AusenciasDocenteRepositoryCalls,
} from "./ausencias/deps";
import * as parte1 from "./ausencias/buscar-sesion";
import * as parte2 from "./ausencias/crear-version";

@Injectable()
export class AusenciasDocenteRepository implements IAusenciasDocenteRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private dependencias(): AusenciasDocenteRepositoryDeps {
    return {
      db: this.db,
    };
  }

  private llamadas(): AusenciasDocenteRepositoryCalls {
    return {
      buscarSesionParaAusencia: (sesionId) => this.buscarSesionParaAusencia(sesionId),
      buscarPorId: (id) => this.buscarPorId(id),
    };
  }

  async buscarSesionParaAusencia(sesionId: string): Promise<SesionParaAusencia | null> {
    return parte1.buscarSesionParaAusencia(this.dependencias(), sesionId);
  }

  async buscarAusenciasVigentesDeSesion(
    sesionId: string,
    exceptoId?: string,
  ): Promise<AusenciaFila[]> {
    return parte1.buscarAusenciasVigentesDeSesion(this.dependencias(), sesionId, exceptoId);
  }

  async buscarPorId(id: string): Promise<AusenciaConDetalle | null> {
    return parte1.buscarPorId(this.dependencias(), this.llamadas(), id);
  }

  async buscarVersionesDeRaiz(raizId: string): Promise<AusenciaConDetalle[]> {
    return parte1.buscarVersionesDeRaiz(this.dependencias(), this.llamadas(), raizId);
  }

  async crearAusenciaConFotos(
    datos: DatosCrearAusencia,
    fotos: DatosCrearEvidencia[],
  ): Promise<AusenciaConDetalle> {
    return parte1.crearAusenciaConFotos(this.dependencias(), this.llamadas(), datos, fotos);
  }

  async crearNuevaVersion(
    versionAnteriorId: string,
    datosVersion: DatosCrearVersion,
    fotosNuevas: DatosCrearEvidencia[],
    fotosRetiradasIds?: string[],
  ): Promise<AusenciaConDetalle> {
    return parte2.crearNuevaVersion(
      this.dependencias(),
      this.llamadas(),
      versionAnteriorId,
      datosVersion,
      fotosNuevas,
      fotosRetiradasIds,
    );
  }

  async anularAusencia(
    id: string,
    anuladaPorId: string,
    motivoAnulacion: string,
  ): Promise<AusenciaConDetalle> {
    return parte2.anularAusencia(
      this.dependencias(),
      this.llamadas(),
      id,
      anuladaPorId,
      motivoAnulacion,
    );
  }

  async guardarDescargo(id: string, descargo: string): Promise<void> {
    return parte2.guardarDescargo(this.dependencias(), id, descargo);
  }

  async listarSupervisor(filtros: FiltrosListarSupervisor): Promise<AusenciaConDetalle[]> {
    return parte2.listarSupervisor(this.dependencias(), this.llamadas(), filtros);
  }

  async listarPorDocente(
    docenteId: string,
    anioAcademicoId?: string,
  ): Promise<AusenciaConDetalle[]> {
    return parte2.listarPorDocente(
      this.dependencias(),
      this.llamadas(),
      docenteId,
      anioAcademicoId,
    );
  }

  async docentePorPersonaId(personaId: string): Promise<{ id: string } | null> {
    return parte2.docentePorPersonaId(this.dependencias(), personaId);
  }

  async usuarioPorPersonaId(personaId: string): Promise<{ id: string } | null> {
    return parte2.usuarioPorPersonaId(this.dependencias(), personaId);
  }

  async bimestreEstaBloqueado(fecha: string, docenteId: string): Promise<boolean> {
    return parte2.bimestreEstaBloqueado(this.dependencias(), fecha, docenteId);
  }

  async obtenerVariableSistema(codigo: string): Promise<string | null> {
    return parte2.obtenerVariableSistema(this.dependencias(), codigo);
  }
}
