import { ConflictException } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { MENSAJES_AUSENCIA } from "@/features/ausencias-docente/constants";
import {
  AusenciasCorreccionService,
  AusenciasDocenteRepository,
  type AusenciaConDetalle,
  type CorregirAusenciaDto,
  type AnularAusenciaDto,
  type IAusenciasDocenteRepository,
  type SesionParaAusencia,
} from "@/features/ausencias-docente";
import { ConsolidadoBloqueoService } from "@/features/seguimiento-docente";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

describe("RF-012: AusenciasCorreccionService - Pruebas defensivas (HU2 - Extra)", () => {
  let service: AusenciasCorreccionService;
  let repo: Mocks<IAusenciasDocenteRepository>;
  let audit: Mocks<AuditService>;
  let bloqueo: Mocks<ConsolidadoBloqueoService>;

  const sesionEjemplo: SesionParaAusencia = {
    id: "ses-mate-5a",
    fecha: "2027-05-13",
    horaInicio: "08:30",
    horaFin: "10:00",
    horaInicioReal: "08:28",
    horaFinReal: null,
    estado: "iniciada",
    docenteId: "doc-quispe-uuid",
    docenteNombre: "Quispe, Juan",
    docentePersonaId: "per-quispe-uuid",
    docenteUsuarioId: "user-quispe-uuid",
    cursoNombre: "Matemática",
    seccionNombre: "5.° A",
    anioAcademicoId: "anio-2027-uuid",
  };

  const ausenciaBase: AusenciaConDetalle = {
    id: "aus-v1-uuid",
    ausenciaRaizId: "aus-v1-uuid",
    sesionClaseId: "ses-mate-5a",
    registradoPorId: "user-subdirector-uuid",
    horaDesde: "08:50",
    horaHasta: "09:10",
    minutos: 20,
    motivo: "desayunando",
    observacion: "En la cafetería",
    descargo: null,
    descargoEn: null,
    version: 1,
    vigente: true,
    motivoCambio: null,
    anulada: false,
    anuladaPorId: null,
    anuladaEn: null,
    motivoAnulacion: null,
    registradoEn: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    sesion: sesionEjemplo,
    fotos: [],
    registradoPorNombre: "Subdirector Académico",
  };

  beforeEach(() => {
    repo = {
      buscarPorId: jest.fn().mockResolvedValue(ausenciaBase),
      buscarSesionParaAusencia: jest.fn().mockResolvedValue(sesionEjemplo),
      buscarAusenciasVigentesDeSesion: jest.fn().mockResolvedValue([]),
      bimestreEstaBloqueado: jest.fn().mockResolvedValue(false),
      obtenerVariableSistema: jest.fn().mockResolvedValue("24"),
      crearNuevaVersion: jest.fn().mockResolvedValue({ ...ausenciaBase, version: 2 }),
      anularAusencia: jest.fn().mockResolvedValue({ ...ausenciaBase, anulada: true }),
      buscarPeriodoIdPorFecha: jest.fn().mockResolvedValue("periodo-2027-uuid"),
    };

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    bloqueo = {
      asegurarNoCerrado: jest.fn().mockResolvedValue(undefined),
      asegurarNoCerradoPorFecha: jest.fn().mockResolvedValue(undefined),
    };

    service = new AusenciasCorreccionService(
      repo as unknown as AusenciasDocenteRepository,
      audit as unknown as AuditService,
      bloqueo as unknown as ConsolidadoBloqueoService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Rechazo de corrección en estado inválido (vigente=false o anulada=true)", () => {
    it("debe rechazar con ConflictException al intentar corregir una versión obsoleta (vigente=false)", async () => {
      // Dado una ausencia que ya no es vigente (versión anterior obsoleta)
      const ausenciaObsoleta: AusenciaConDetalle = {
        ...ausenciaBase,
        vigente: false,
      };
      repo.buscarPorId = jest.fn().mockResolvedValue(ausenciaObsoleta);

      const dto: CorregirAusenciaDto = {
        horaHasta: "09:05",
        motivoCambio: "Intento de corrección sobre versión vieja",
      };

      // Cuando se intenta corregir la versión no vigente
      // Entonces debe rechazar con ConflictException y mensaje claro
      await expect(
        service.corregir("aus-v1-uuid", dto, undefined, "user-subdirector-uuid"),
      ).rejects.toThrow(new ConflictException(MENSAJES_AUSENCIA.AUSENCIA_NO_VIGENTE));
    });

    it("debe rechazar con ConflictException al intentar corregir una ausencia que ya fue anulada", async () => {
      // Dado una ausencia que ya está anulada
      const ausenciaAnulada: AusenciaConDetalle = {
        ...ausenciaBase,
        anulada: true,
        motivoAnulacion: "Anulación previa",
      };
      repo.buscarPorId = jest.fn().mockResolvedValue(ausenciaAnulada);

      const dto: CorregirAusenciaDto = {
        horaHasta: "09:05",
        motivoCambio: "Intento de corregir ausencia anulada",
      };

      // Cuando se intenta corregir
      // Entonces debe rechazar con ConflictException y mensaje de ya anulada
      await expect(
        service.corregir("aus-v1-uuid", dto, undefined, "user-subdirector-uuid"),
      ).rejects.toThrow(new ConflictException(MENSAJES_AUSENCIA.AUSENCIA_YA_ANULADA));
    });
  });

  describe("Rechazo de anulación en estado inválido (vigente=false o anulada=true - Idempotencia)", () => {
    it("debe rechazar con ConflictException al intentar anular una versión obsoleta (vigente=false)", async () => {
      // Dado una versión no vigente
      const ausenciaObsoleta: AusenciaConDetalle = {
        ...ausenciaBase,
        vigente: false,
      };
      repo.buscarPorId = jest.fn().mockResolvedValue(ausenciaObsoleta);

      const dto: AnularAusenciaDto = {
        motivoAnulacion: "Intento anular versión obsoleta",
      };

      // Cuando se intenta anular
      // Entonces debe rechazar con ConflictException
      await expect(service.anular("aus-v1-uuid", dto, "user-subdirector-uuid")).rejects.toThrow(
        new ConflictException(MENSAJES_AUSENCIA.AUSENCIA_NO_VIGENTE),
      );
    });

    it("debe rechazar con ConflictException al intentar anular una ausencia ya anulada (idempotencia)", async () => {
      // Dado una ausencia que ya está anulada
      const ausenciaYaAnulada: AusenciaConDetalle = {
        ...ausenciaBase,
        anulada: true,
        motivoAnulacion: "Ya anulada previamente",
      };
      repo.buscarPorId = jest.fn().mockResolvedValue(ausenciaYaAnulada);

      const dto: AnularAusenciaDto = {
        motivoAnulacion: "Segundo intento de anulación",
      };

      // Cuando se intenta re-anular
      // Entonces debe rechazar con ConflictException indicando que ya está anulada
      await expect(service.anular("aus-v1-uuid", dto, "user-subdirector-uuid")).rejects.toThrow(
        new ConflictException(MENSAJES_AUSENCIA.AUSENCIA_YA_ANULADA),
      );
    });
  });
});
