import { Inject, Injectable } from "@nestjs/common";
import { Database, DRIZZLE } from "@/core/database";
import type {
  AlcanceLibreta,
  AlcanceRolRow,
  CodigoOtraSeccionRow,
  DetalleLibretaRow,
  HistorialArchivoRow,
  LibretaAperturaRow,
  LibretaSeccionRow,
  MiLibretaRow,
  PeriodoLibretaRow,
  PublicacionPersistida,
  SeccionResumenRow,
  SeguimientoSeccionRow,
} from "../interfaces";
import type { LibretasRepositoryDeps, LibretasRepositoryCalls } from "./libretas/deps";
import * as parte1 from "./libretas/anio-de-trabajo";
import * as parte2 from "./libretas/publicar";
import * as parte3 from "./libretas/listar-secciones";

@Injectable()
export class LibretasRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private dependencias(): LibretasRepositoryDeps {
    return {
      db: this.db,
    };
  }

  private llamadas(): LibretasRepositoryCalls {
    return {
      obtenerAlcance: (rolId) => this.obtenerAlcance(rolId),
      adjuntarUsuariosFamilia: (rows) => this.adjuntarUsuariosFamilia(rows),
    };
  }

  async anioDeTrabajo(headerId?: string): Promise<string> {
    return parte1.anioDeTrabajo(this.dependencias(), headerId);
  }

  async obtenerPeriodo(periodoId: string): Promise<PeriodoLibretaRow | null> {
    return parte1.obtenerPeriodo(this.dependencias(), periodoId);
  }

  async existeProgramacion(periodoId: string): Promise<boolean> {
    return parte1.existeProgramacion(this.dependencias(), periodoId);
  }

  async programar(periodoId: string, anioId: string, fechaLimite: string): Promise<number> {
    return parte1.programar(this.dependencias(), periodoId, anioId, fechaLimite);
  }

  async cambiarFechaPendientes(periodoId: string, fechaLimite: string): Promise<number> {
    return parte1.cambiarFechaPendientes(this.dependencias(), periodoId, fechaLimite);
  }

  async crearPendientesDeMatricula(matriculaId: string): Promise<number> {
    return parte1.crearPendientesDeMatricula(this.dependencias(), matriculaId);
  }

  async eliminarPendientesAntesDeLimite(matriculaId: string, fechaRetiro: string): Promise<number> {
    return parte1.eliminarPendientesAntesDeLimite(this.dependencias(), matriculaId, fechaRetiro);
  }

  async listarDeSeccion(seccionId: string, periodoId: string): Promise<LibretaSeccionRow[]> {
    return parte1.listarDeSeccion(this.dependencias(), this.llamadas(), seccionId, periodoId);
  }

  async listarCodigosOtrasSecciones(
    anioId: string,
    seccionId: string,
  ): Promise<CodigoOtraSeccionRow[]> {
    return parte1.listarCodigosOtrasSecciones(this.dependencias(), anioId, seccionId);
  }

  async obtenerAlcance(rolId: string): Promise<AlcanceLibreta | null> {
    return parte1.obtenerAlcance(this.dependencias(), rolId);
  }

  async guardarAlcance(
    rolId: string,
    alcance: AlcanceLibreta,
    actorId: string,
  ): Promise<AlcanceLibreta | null> {
    return parte1.guardarAlcance(this.dependencias(), this.llamadas(), rolId, alcance, actorId);
  }

  async listarAlcances(): Promise<AlcanceRolRow[]> {
    return parte1.listarAlcances(this.dependencias());
  }

  async esTutorDeSeccion(personaId: string, seccionId: string): Promise<boolean> {
    return parte1.esTutorDeSeccion(this.dependencias(), personaId, seccionId);
  }

  async dictaEnSeccion(personaId: string, seccionId: string): Promise<boolean> {
    return parte1.dictaEnSeccion(this.dependencias(), personaId, seccionId);
  }

  async publicar(items: PublicacionPersistida[], actorId: string): Promise<void> {
    return parte2.publicar(this.dependencias(), items, actorId);
  }

  async seguimiento(periodoId: string, seccionIds?: string[]): Promise<SeguimientoSeccionRow[]> {
    return parte2.seguimiento(this.dependencias(), periodoId, seccionIds);
  }

  async detalleSeccion(seccionId: string, periodoId: string): Promise<DetalleLibretaRow[]> {
    return parte2.detalleSeccion(this.dependencias(), seccionId, periodoId);
  }

  async misLibretas(personaId: string, rol: string): Promise<MiLibretaRow[]> {
    return parte2.misLibretas(this.dependencias(), personaId, rol);
  }

  async obtenerParaApertura(libretaId: string): Promise<LibretaAperturaRow | null> {
    return parte2.obtenerParaApertura(this.dependencias(), libretaId);
  }

  async registrarPrimeraVista(libretaId: string, usuarioId: string): Promise<void> {
    return parte2.registrarPrimeraVista(this.dependencias(), libretaId, usuarioId);
  }

  async historial(libretaId: string): Promise<HistorialArchivoRow[]> {
    return parte2.historial(this.dependencias(), libretaId);
  }

  async listarPeriodos(
    anioId: string,
  ): Promise<Array<PeriodoLibretaRow & { fechaLimite: string | null }>> {
    return parte2.listarPeriodos(this.dependencias(), anioId);
  }

  async listarSecciones(anioId: string): Promise<SeccionResumenRow[]> {
    return parte3.listarSecciones(this.dependencias(), anioId);
  }

  async seccionesDePersona(personaId: string, alcance: AlcanceLibreta): Promise<string[]> {
    return parte3.seccionesDePersona(this.dependencias(), personaId, alcance);
  }

  private async adjuntarUsuariosFamilia(
    rows: Array<{
      matriculaId: string;
      codigo: string;
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
  ): Promise<LibretaSeccionRow[]> {
    return parte3.adjuntarUsuariosFamilia(this.dependencias(), rows);
  }
}
