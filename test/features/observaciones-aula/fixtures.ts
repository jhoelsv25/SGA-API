import { ObservacionesComunService } from "@/features/observaciones-aula";
import type {
  ActorObservacion,
  CalificacionFila,
  CompromisoObsFila,
  ObservacionFila,
} from "@/features/observaciones-aula";
import type { AuditService } from "@/common/services/audit.service";
import type { NotificacionesService } from "@/features/notificaciones/notificaciones.service";
import type { ObservacionesAulaRepository } from "@/features/observaciones-aula";

export type Mocks<T> = { [K in keyof T]?: jest.Mock };

export const director: ActorObservacion = {
  id: "u-dir",
  roleId: "r-dir",
  role: "Director",
  personaId: "p-dir",
};
export const subdirectora: ActorObservacion = {
  id: "u-sub",
  roleId: "r-sub",
  role: "Subdirector",
  personaId: "p-sub",
};
export const docente: ActorObservacion = {
  id: "u-doc",
  roleId: "r-doc",
  role: "Docente",
  personaId: "p-doc",
};
export const admin: ActorObservacion = {
  id: "u-adm",
  roleId: "r-adm",
  role: "Administrador",
  personaId: "p-adm",
};

export const observacion = (p: Partial<ObservacionFila> = {}): ObservacionFila => ({
  id: "obs-1",
  docenteId: "doc-1",
  docentePersonaId: "p-doc",
  docenteNombre: "Carlos Quispe Mamani",
  docenteApellido: "Quispe",
  docenteDocumento: "45000001",
  cursoSeccionId: "cs-1",
  cursoNombre: "Matemática",
  seccionNombre: "A",
  gradoNombre: "3.° grado",
  horarioId: "hor-1",
  sesionClaseId: null,
  periodoId: "per-2",
  periodoNombre: "II Bimestre",
  periodoEstado: "en_curso",
  observadorUsuarioId: "u-sub",
  observadorPersonaId: "p-sub",
  observadorNombre: "Sara Rojas",
  instrumentoId: "ins-1",
  observacionAnteriorId: null,
  fecha: "2027-05-20",
  horaInicioProgramada: "08:30:00",
  horaFinProgramada: "10:00:00",
  estado: "programada",
  avisadoEn: "2027-05-10 09:00:00",
  horaInicioReal: null,
  horaFinReal: null,
  minutosTotales: null,
  estudiantesPresentes: null,
  retroFecha: null,
  retroHoraInicio: null,
  retroHoraFin: null,
  retroResumen: null,
  retroalimentadaEn: null,
  enteradoEn: null,
  motivoCancelacion: null,
  creadoEn: "2027-05-10 09:00:00",
  ...p,
});

export const calificacion = (
  desempeno: number,
  nivel: 1 | 2 | 3 | 4,
  p: Partial<CalificacionFila> = {},
): CalificacionFila => ({
  id: `cal-${desempeno}`,
  observacionId: "obs-1",
  desempeno,
  nivel,
  fundamento: "Según las notas",
  version: 1,
  vigente: true,
  motivoCambio: null,
  creadoPorId: "u-sub",
  creadoEn: "2027-05-20 11:00:00",
  ...p,
});

export const compromiso = (p: Partial<CompromisoObsFila> = {}): CompromisoObsFila => ({
  id: "fila-comp-1",
  compromisoId: "comp-1",
  observacionId: "obs-1",
  desempeno: 3,
  descripcion: "Usar preguntas que lleven a explicar el razonamiento",
  fechaRevision: "2027-06-30",
  estado: "pendiente",
  observacionCierre: null,
  cerradoEn: null,
  version: 1,
  vigente: true,
  motivoCambio: null,
  creadoPorId: "u-sub",
  creadoEn: "2027-05-21 10:00:00",
  ...p,
});

export const instrumentoCompleto = () => ({
  desempenos: [1, 2, 3, 4, 5].map((numero) => ({
    numero,
    nombre: `Desempeño ${numero}`,
    aspectos: ["Aspecto"],
    niveles: [1, 2, 3, 4].map((nivel) => ({
      nivel,
      nombre: "n",
      grupo: nivel <= 2 ? "insatisfactorio" : "satisfactorio",
      descripcion: `Descripción nivel ${nivel}`,
    })),
  })),
});

/** Repositorio simulado con valores por defecto de un caso feliz; cada prueba cambia lo que necesite. */
export function repositorioSimulado(): Mocks<ObservacionesAulaRepository> {
  return {
    obtener: jest.fn().mockResolvedValue(observacion()),
    listar: jest.fn().mockResolvedValue([]),
    listarDelDocente: jest.fn().mockResolvedValue([]),
    crear: jest.fn().mockResolvedValue("obs-1"),
    actualizar: jest.fn().mockResolvedValue(undefined),
    cerrarNotas: jest.fn().mockResolvedValue(undefined),
    obtenerDocente: jest.fn().mockResolvedValue({ id: "doc-1", personaId: "p-doc" }),
    obtenerDocenteDePersona: jest.fn().mockResolvedValue({ id: "doc-1" }),
    obtenerCursoSeccion: jest.fn().mockResolvedValue({ id: "cs-1", docenteId: "doc-1" }),
    bloquesDelCurso: jest
      .fn()
      .mockResolvedValue([{ id: "hor-1", horaInicio: "08:30:00", horaFin: "10:00:00" }]),
    periodoDeFecha: jest.fn().mockResolvedValue({
      id: "per-2",
      estado: "en_curso",
      anioAcademicoId: "anio-1",
      nombre: "II Bimestre",
    }),
    sesionDeHorario: jest.fn().mockResolvedValue(null),
    anioEnCurso: jest.fn().mockResolvedValue("anio-1"),
    valoresVariables: jest.fn().mockResolvedValue(new Map()),
    usuarioDeDocente: jest.fn().mockResolvedValue("u-doc"),
    obtenerUsuario: jest
      .fn()
      .mockResolvedValue({ id: "u-sub", personaId: "p-sub", estado: "activo" }),
    usuarioTieneOpcion: jest.fn().mockResolvedValue(true),
    usuariosConOpcion: jest.fn().mockResolvedValue(["u-dir", "u-sub"]),
    usuarioActivo: jest.fn().mockResolvedValue(true),
    registrarAlertaEnviada: jest.fn().mockResolvedValue(true),
    observacionesDelObservador: jest.fn().mockResolvedValue([]),
    registrarCambio: jest.fn().mockResolvedValue(undefined),
    cambios: jest.fn().mockResolvedValue([]),
    agregarNota: jest
      .fn()
      .mockImplementation((d: { texto: string }) =>
        Promise.resolve({ id: "nota-1", observacionId: "obs-1", desempeno: 1, texto: d.texto }),
      ),
    obtenerNota: jest.fn().mockResolvedValue({ id: "nota-1", observacionId: "obs-1", texto: "x" }),
    editarNota: jest.fn().mockResolvedValue(undefined),
    notas: jest.fn().mockResolvedValue([]),
    calificacionesVigentes: jest.fn().mockResolvedValue([]),
    historialCalificaciones: jest.fn().mockResolvedValue([]),
    guardarBorrador: jest.fn().mockResolvedValue(undefined),
    nuevaVersionCalificacion: jest.fn().mockResolvedValue(2),
    crearCompromiso: jest.fn().mockResolvedValue(compromiso()),
    compromisoVigente: jest.fn().mockResolvedValue(compromiso()),
    compromisosVigentes: jest.fn().mockResolvedValue([]),
    historialCompromisos: jest.fn().mockResolvedValue([]),
    editarCompromisoEnSitio: jest.fn().mockResolvedValue(undefined),
    nuevaVersionCompromiso: jest.fn().mockResolvedValue(2),
    cerrarCompromiso: jest.fn().mockResolvedValue(undefined),
    compromisosPorRevisar: jest.fn().mockResolvedValue([]),
    comentarioDe: jest.fn().mockResolvedValue(null),
    crearComentario: jest.fn().mockResolvedValue(true),
    crearArchivo: jest.fn().mockResolvedValue(undefined),
    archivos: jest.fn().mockResolvedValue([]),
    instrumentoVigente: jest.fn().mockResolvedValue({ id: "ins-1", codigo: "instructivo-2025" }),
    instrumento: jest.fn().mockResolvedValue({
      id: "ins-1",
      codigo: "instructivo-2025",
      nombre: "Instructivo 2025",
      contenido: instrumentoCompleto(),
    }),
    instrumentos: jest.fn().mockResolvedValue([]),
    existeCodigoInstrumento: jest.fn().mockResolvedValue(false),
    crearInstrumento: jest.fn().mockResolvedValue("ins-2"),
    marcarInstrumentoVigente: jest.fn().mockResolvedValue(undefined),
    docentesActivos: jest.fn().mockResolvedValue([]),
    conteosPorDocente: jest.fn().mockResolvedValue([]),
    calificacionesDelAnio: jest.fn().mockResolvedValue([]),
    ultimaRetroalimentadaDelPeriodo: jest.fn().mockResolvedValue(null),
  };
}

export function comunSimulado(repo: Mocks<ObservacionesAulaRepository>) {
  const audit: Mocks<AuditService> = { log: jest.fn().mockResolvedValue(undefined) };
  const notificaciones: Mocks<NotificacionesService> = {
    enviar: jest.fn().mockResolvedValue(undefined),
  };
  const comun = new ObservacionesComunService(
    repo as unknown as ObservacionesAulaRepository,
    audit as unknown as AuditService,
    notificaciones as unknown as NotificacionesService,
  );
  return { comun, audit, notificaciones };
}
