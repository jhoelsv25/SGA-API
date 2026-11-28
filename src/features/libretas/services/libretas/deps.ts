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
  PeriodoLibretaRow,
} from "../../interfaces";
import { LibretasRepository } from "../../repositories";
import { LibretaArchivoStore, clasificarArchivo } from "../../utils";
import type { PublicacionLista } from "./shared";

export type LibretasServiceDeps = {
  repository: LibretasRepository;
  archivos: LibretaArchivoStore;
  auditService: AuditService;
  anioLectivo: AnioLectivoCls;
  notificacionesService: NotificacionesService;
  ocrService?: OcrService;
};

export type LibretasServiceCalls = {
  armarPublicacion: (
    archivos: ArchivoCarga[],
    candidatos: CandidatoLibreta[],
    porMatricula: Map<string, LibretaSeccionRow>,
    otras: Array<{ matriculaId: string; nombreCompleto: string }>,
    manualPorNombre: Map<string, AsignacionManual>,
  ) => Promise<PublicacionLista[]>;
  resolverElegido: (
    clasificado: ReturnType<typeof clasificarArchivo>,
    manualPorNombre: Map<string, AsignacionManual>,
    porMatricula: Map<string, LibretaSeccionRow>,
    otras: Array<{ matriculaId: string; nombreCompleto: string }>,
    nombreArchivo: string,
  ) => ArchivoAsignado | null;
  candidatos: (deSeccion: LibretaSeccionRow[], otras: CodigoOtraSeccionRow[]) => CandidatoLibreta[];
  validarArchivos: (archivos: ArchivoCarga[]) => void;
  periodoDelAnio: (periodoId: string) => Promise<PeriodoLibretaRow>;
  exigirProgramacion: (periodoId: string) => Promise<void>;
  exigirAlcance: (actor: ActorLibreta, seccionId: string) => Promise<void>;
  alcanceEfectivo: (actor: ActorLibreta) => Promise<AlcanceLibreta | null>;
  puedeProgramar: (actor: ActorLibreta) => boolean;
  exigirPrograma: (actor: ActorLibreta) => void;
  notificarPublicacion: (
    items: Array<{ usuarioEstudianteId: string | null; usuarioApoderadoId: string | null }>,
    bimestre: string,
  ) => Promise<void>;
};
