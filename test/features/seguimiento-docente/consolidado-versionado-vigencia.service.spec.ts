import { BadRequestException } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";
import {
  ConsolidadoVersionadoService,
  MENSAJES_CONSOLIDADO,
  type ConsolidadoFila,
  type ISeguimientoDocenteRepository,
  SeguimientoDocenteRepository,
} from "@/features/seguimiento-docente";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

describe("RF-013: Validar versión vigente en reapertura y versionado (HU2 - Extra)", () => {
  let service: ConsolidadoVersionadoService;
  let repo: Mocks<ISeguimientoDocenteRepository>;
  let notificaciones: Mocks<NotificacionesService>;
  let audit: Mocks<AuditService>;

  const consolidadoHistoricoNoVigente: ConsolidadoFila = {
    id: "cons-v1-historico-uuid",
    docenteId: "doc-quispe-uuid",
    periodoId: "periodo-bimestre-2-uuid",
    consolidadoRaizId: "cons-v1-historico-uuid",
    estado: "cerrado",
    version: 1,
    vigente: false,
    motivoCambio: null,
    sesionesProgramadas: 20,
    sesionesCumplidas: 18,
    sesionesParciales: 1,
    sesionesNoCumplidas: 1,
    sesionesJustificadas: 0,
    minutosPerdidosFirma: 40,
    totalAusencias: 3,
    minutosFueraAula: 60,
    decision: "ninguna",
    observacion: null,
    generadoPorId: "user-director-uuid",
    generadoEn: "2027-07-21T10:00:00.000Z",
    enviadoEn: null,
    reabiertoPorId: null,
    reabiertoEn: null,
  };

  const consolidadoHistoricoReabiertoNoVigente: ConsolidadoFila = {
    ...consolidadoHistoricoNoVigente,
    estado: "reabierto",
  };

  beforeEach(() => {
    repo = {
      buscarConsolidadoPorId: jest.fn().mockResolvedValue(consolidadoHistoricoNoVigente),
      reabrirConsolidado: jest.fn(),
      crearNuevaVersion: jest.fn(),
    };

    notificaciones = {
      enviar: jest.fn().mockResolvedValue(undefined),
    };

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new ConsolidadoVersionadoService(
      repo as unknown as SeguimientoDocenteRepository,
      notificaciones as unknown as NotificacionesService,
      audit as unknown as AuditService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("CP-RF013-07 (extra): Rechazar reapertura de versión histórica no vigente", () => {
    it("debe rechazar con BadRequestException si el consolidado no es vigente y no invocar reabrirConsolidado", async () => {
      repo.buscarConsolidadoPorId = jest.fn().mockResolvedValue(consolidadoHistoricoNoVigente);

      await expect(
        service.reabrir("cons-v1-historico-uuid", "user-director-uuid", "director"),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.reabrir("cons-v1-historico-uuid", "user-director-uuid", "director"),
      ).rejects.toThrow(MENSAJES_CONSOLIDADO.CONSOLIDADO_NO_VIGENTE);

      expect(repo.reabrirConsolidado).not.toHaveBeenCalled();
      expect(notificaciones.enviar).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });
  });

  describe("CP-RF013-08 (extra): Rechazar cierre de versión histórica no vigente", () => {
    it("debe rechazar con BadRequestException si el consolidado no es vigente y no invocar crearNuevaVersion", async () => {
      repo.buscarConsolidadoPorId = jest
        .fn()
        .mockResolvedValue(consolidadoHistoricoReabiertoNoVigente);

      const dto = {
        motivoCambio: "Intento de cierre sobre versión no vigente",
      };

      await expect(
        service.cerrar("cons-v1-historico-uuid", dto, "user-director-uuid", "director"),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.cerrar("cons-v1-historico-uuid", dto, "user-director-uuid", "director"),
      ).rejects.toThrow(MENSAJES_CONSOLIDADO.CONSOLIDADO_NO_VIGENTE);

      expect(repo.crearNuevaVersion).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });
  });
});
