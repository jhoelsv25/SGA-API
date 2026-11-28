import { Injectable, Optional } from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import { AuditService } from "@/common/services/audit.service";
import { OcrService } from "@/core/ocr/ocr.service";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";
import type {
  ActorLibreta,
  AlcanceLibreta,
  ArchivoAsignado,
  ArchivoCarga,
  AsignacionManual,
  CandidatoLibreta,
  CodigoOtraSeccionRow,
  LibretaSeccionRow,
} from "./interfaces";
import { LibretasRepository } from "./repositories";
import { LibretaArchivoStore, clasificarArchivo } from "./utils";
import type { LibretasServiceDeps, LibretasServiceCalls } from "./services/libretas/deps";
import { PublicacionLista } from "./services/libretas/shared";
import * as parte1 from "./services/libretas/programar";
import * as parte2 from "./services/libretas/vista-previa";
import * as parte3 from "./services/libretas/armar-publicacion";
import * as parte4 from "./services/libretas/clasificar";
import * as parte5 from "./services/libretas/periodo-del-anio";

@Injectable()
export class LibretasService {
  constructor(
    private readonly repository: LibretasRepository,
    private readonly archivos: LibretaArchivoStore,
    private readonly auditService: AuditService,
    private readonly anioLectivo: AnioLectivoCls,
    private readonly notificacionesService: NotificacionesService,
    @Optional() private readonly ocrService?: OcrService,
  ) {}

  private dependencias(): LibretasServiceDeps {
    return {
      repository: this.repository,
      archivos: this.archivos,
      auditService: this.auditService,
      anioLectivo: this.anioLectivo,
      notificacionesService: this.notificacionesService,
      ocrService: this.ocrService,
    };
  }

  private llamadas(): LibretasServiceCalls {
    return {
      armarPublicacion: (archivos, candidatos, porMatricula, otras, manualPorNombre) =>
        this.armarPublicacion(archivos, candidatos, porMatricula, otras, manualPorNombre),
      resolverElegido: (clasificado, manualPorNombre, porMatricula, otras, nombreArchivo) =>
        this.resolverElegido(clasificado, manualPorNombre, porMatricula, otras, nombreArchivo),
      candidatos: (deSeccion, otras) => this.candidatos(deSeccion, otras),
      validarArchivos: (archivos) => this.validarArchivos(archivos),
      periodoDelAnio: (periodoId) => this.periodoDelAnio(periodoId),
      exigirProgramacion: (periodoId) => this.exigirProgramacion(periodoId),
      exigirAlcance: (actor, seccionId) => this.exigirAlcance(actor, seccionId),
      alcanceEfectivo: (actor) => this.alcanceEfectivo(actor),
      puedeProgramar: (actor) => this.puedeProgramar(actor),
      exigirPrograma: (actor) => this.exigirPrograma(actor),
      notificarPublicacion: (items, bimestre) => this.notificarPublicacion(items, bimestre),
    };
  }

  async programar(periodoId: string, fechaLimite: string, actor: ActorLibreta, ip?: string) {
    return parte1.programar(
      this.dependencias(),
      this.llamadas(),
      periodoId,
      fechaLimite,
      actor,
      ip,
    );
  }

  async cambiarFecha(periodoId: string, fechaLimite: string, actor: ActorLibreta, ip?: string) {
    return parte1.cambiarFecha(
      this.dependencias(),
      this.llamadas(),
      periodoId,
      fechaLimite,
      actor,
      ip,
    );
  }

  async crearPendientesDeMatricula(matriculaId: string): Promise<number> {
    return parte1.crearPendientesDeMatricula(this.dependencias(), matriculaId);
  }

  async eliminarPendientesPorRetiro(matriculaId: string, fechaRetiro: string): Promise<number> {
    return parte1.eliminarPendientesPorRetiro(this.dependencias(), matriculaId, fechaRetiro);
  }

  async vistaPrevia(
    seccionId: string,
    periodoId: string,
    archivos: ArchivoCarga[],
    actor: ActorLibreta,
  ) {
    return parte2.vistaPrevia(
      this.dependencias(),
      this.llamadas(),
      seccionId,
      periodoId,
      archivos,
      actor,
    );
  }

  async publicar(
    seccionId: string,
    periodoId: string,
    archivos: ArchivoCarga[],
    asignaciones: AsignacionManual[],
    actor: ActorLibreta,
    ip?: string,
  ) {
    return parte2.publicar(
      this.dependencias(),
      this.llamadas(),
      seccionId,
      periodoId,
      archivos,
      asignaciones,
      actor,
      ip,
    );
  }

  async cambiarAlcance(rolId: string, alcance: AlcanceLibreta, actor: ActorLibreta, ip?: string) {
    return parte2.cambiarAlcance(this.dependencias(), rolId, alcance, actor, ip);
  }

  async listarAlcances(actor: ActorLibreta) {
    return parte2.listarAlcances(this.dependencias(), actor);
  }

  async seguimiento(periodoId: string, actor: ActorLibreta) {
    return parte2.seguimiento(this.dependencias(), this.llamadas(), periodoId, actor);
  }

  async detalle(seccionId: string, periodoId: string, actor: ActorLibreta) {
    return parte2.detalle(this.dependencias(), this.llamadas(), seccionId, periodoId, actor);
  }

  async misLibretas(actor: ActorLibreta) {
    return parte2.misLibretas(this.dependencias(), actor);
  }

  async abrir(libretaId: string, actor: ActorLibreta, ip?: string) {
    return parte2.abrir(this.dependencias(), this.llamadas(), libretaId, actor, ip);
  }

  async historial(libretaId: string, actor: ActorLibreta) {
    return parte2.historial(this.dependencias(), libretaId, actor);
  }

  async contexto(actor: ActorLibreta) {
    return parte2.contexto(this.dependencias(), this.llamadas(), actor);
  }

  private async armarPublicacion(
    archivos: ArchivoCarga[],
    candidatos: CandidatoLibreta[],
    porMatricula: Map<string, LibretaSeccionRow>,
    otras: Array<{ matriculaId: string; nombreCompleto: string }>,
    manualPorNombre: Map<string, AsignacionManual>,
  ): Promise<PublicacionLista[]> {
    return parte3.armarPublicacion(
      this.dependencias(),
      this.llamadas(),
      archivos,
      candidatos,
      porMatricula,
      otras,
      manualPorNombre,
    );
  }

  private resolverElegido(
    clasificado: ReturnType<typeof clasificarArchivo>,
    manualPorNombre: Map<string, AsignacionManual>,
    porMatricula: Map<string, LibretaSeccionRow>,
    otras: Array<{ matriculaId: string; nombreCompleto: string }>,
    nombreArchivo: string,
  ): ArchivoAsignado | null {
    return parte3.resolverElegido(clasificado, manualPorNombre, porMatricula, otras, nombreArchivo);
  }

  private async clasificar(
    seccionId: string,
    periodoId: string,
    anioId: string,
    archivos: ArchivoCarga[],
  ) {
    return parte4.clasificar(
      this.dependencias(),
      this.llamadas(),
      seccionId,
      periodoId,
      anioId,
      archivos,
    );
  }

  private candidatos(
    deSeccion: LibretaSeccionRow[],
    otras: CodigoOtraSeccionRow[],
  ): CandidatoLibreta[] {
    return parte4.candidatos(deSeccion, otras);
  }

  private validarArchivos(archivos: ArchivoCarga[]): void {
    return parte4.validarArchivos(archivos);
  }

  private async periodoDelAnio(periodoId: string) {
    return parte5.periodoDelAnio(this.dependencias(), periodoId);
  }

  private async exigirProgramacion(periodoId: string): Promise<void> {
    return parte5.exigirProgramacion(this.dependencias(), periodoId);
  }

  private async exigirAlcance(actor: ActorLibreta, seccionId: string): Promise<void> {
    return parte5.exigirAlcance(this.dependencias(), this.llamadas(), actor, seccionId);
  }

  private async alcanceEfectivo(actor: ActorLibreta): Promise<AlcanceLibreta | null> {
    return parte5.alcanceEfectivo(this.dependencias(), actor);
  }

  private puedeProgramar(actor: ActorLibreta): boolean {
    return parte5.puedeProgramar(actor);
  }

  private exigirPrograma(actor: ActorLibreta): void {
    return parte5.exigirPrograma(this.llamadas(), actor);
  }

  private async notificarPublicacion(
    items: Array<{ usuarioEstudianteId: string | null; usuarioApoderadoId: string | null }>,
    bimestre: string,
  ): Promise<void> {
    return parte5.notificarPublicacion(this.dependencias(), items, bimestre);
  }
}
