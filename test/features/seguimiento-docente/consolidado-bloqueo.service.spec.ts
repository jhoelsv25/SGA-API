import { ForbiddenException } from "@nestjs/common";
import {
  ConsolidadoBloqueoService,
  ISeguimientoDocenteRepository,
  MENSAJES_CONSOLIDADO,
  SeguimientoDocenteRepository,
  type ConsolidadoFila,
  type PeriodoParaConsolidado,
} from "@/features/seguimiento-docente";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

describe("RF-013: Bloqueo transversal de sesiones y ausencias por consolidado (HU1)", () => {
  let service: ConsolidadoBloqueoService;
  let repo: Mocks<ISeguimientoDocenteRepository>;

  const periodoBimestre2: PeriodoParaConsolidado = {
    id: "periodo-bimestre-2-uuid",
    nombre: "II Bimestre",
    numero: 2,
    estado: "cerrado",
    fechaInicio: "2027-05-01",
    fechaFin: "2027-07-15",
  };

  const consolidadoCerrado: ConsolidadoFila = {
    id: "cons-quispe-uuid",
    docenteId: "docente-quispe-uuid",
    periodoId: "periodo-bimestre-2-uuid",
    consolidadoRaizId: null,
    estado: "cerrado",
    version: 1,
    vigente: true,
    motivoCambio: null,
    sesionesProgramadas: 24,
    sesionesCumplidas: 20,
    sesionesParciales: 2,
    sesionesNoCumplidas: 2,
    sesionesJustificadas: 0,
    minutosPerdidosFirma: 40,
    totalAusencias: 3,
    minutosFueraAula: 60,
    decision: "ninguna",
    observacion: null,
    generadoPorId: "user-director-uuid",
    generadoEn: "2027-07-16T10:00:00.000Z",
    enviadoEn: null,
    reabiertoPorId: null,
    reabiertoEn: null,
  };

  const consolidadoReabierto: ConsolidadoFila = {
    ...consolidadoCerrado,
    estado: "reabierto",
    reabiertoPorId: "user-director-uuid",
    reabiertoEn: "2027-07-17T09:00:00.000Z",
  };

  beforeEach(() => {
    repo = {
      buscarConsolidadoVigente: jest.fn().mockResolvedValue(consolidadoCerrado),
      buscarPeriodoPorId: jest.fn().mockResolvedValue(periodoBimestre2),
      buscarPeriodoPorFecha: jest.fn().mockResolvedValue(periodoBimestre2),
    };

    service = new ConsolidadoBloqueoService(repo as unknown as SeguimientoDocenteRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("CP-RF013-06: Sesiones bloqueadas por el consolidado (HU1)", () => {
    it("debe bloquear la acción y lanzar ForbiddenException con mensaje oficial si el consolidado del docente en el bimestre está cerrado", async () => {
      // Dado que el consolidado del docente Quispe en el II Bimestre está cerrado
      repo.buscarConsolidadoVigente = jest.fn().mockResolvedValue(consolidadoCerrado);

      // Cuando alguien intenta corregir una de sus sesiones o ausencias de ese bimestre invocando asegurarNoCerrado
      // Entonces el sistema bloquea la acción y muestra mensaje oficial
      await expect(
        service.asegurarNoCerrado("docente-quispe-uuid", "periodo-bimestre-2-uuid"),
      ).rejects.toThrow(new ForbiddenException(MENSAJES_CONSOLIDADO.CONSOLIDADO_CERRADO));

      expect(repo.buscarConsolidadoVigente).toHaveBeenCalledWith(
        "docente-quispe-uuid",
        "periodo-bimestre-2-uuid",
      );
    });

    it("debe permitir continuar sin excepción si el consolidado vigente del docente se encuentra reabierto", async () => {
      // Dado que el consolidado vigente del docente Quispe fue reabierto
      repo.buscarConsolidadoVigente = jest.fn().mockResolvedValue(consolidadoReabierto);

      // Cuando alguien intenta registrar o corregir una sesión o ausencia
      // Entonces el sistema permite la acción resolviendo la validación sin error
      await expect(
        service.asegurarNoCerrado("docente-quispe-uuid", "periodo-bimestre-2-uuid"),
      ).resolves.toBeUndefined();

      expect(repo.buscarConsolidadoVigente).toHaveBeenCalledWith(
        "docente-quispe-uuid",
        "periodo-bimestre-2-uuid",
      );
    });

    it("debe permitir continuar sin excepción si aún no existe consolidado registrado para el docente en el período", async () => {
      // Dado que aún no se ha generado ningún consolidado para el docente en ese bimestre
      repo.buscarConsolidadoVigente = jest.fn().mockResolvedValue(null);

      // Cuando se invoca asegurarNoCerrado
      // Entonces la validación se supera exitosamente sin lanzar excepciones
      await expect(
        service.asegurarNoCerrado("docente-quispe-uuid", "periodo-bimestre-2-uuid"),
      ).resolves.toBeUndefined();
    });

    it("debe bloquear con ForbiddenException por fecha cuando la sesión corresponde a un período con consolidado cerrado", async () => {
      // Dado una fecha de clase 2027-06-15 que pertenece al II Bimestre con consolidado cerrado
      repo.buscarPeriodoPorFecha = jest.fn().mockResolvedValue(periodoBimestre2);
      repo.buscarConsolidadoVigente = jest.fn().mockResolvedValue(consolidadoCerrado);

      // Cuando se valida con asegurarNoCerradoPorFecha
      // Entonces bloquea con ForbiddenException y mensaje oficial
      await expect(
        service.asegurarNoCerradoPorFecha("docente-quispe-uuid", "2027-06-15"),
      ).rejects.toThrow(new ForbiddenException(MENSAJES_CONSOLIDADO.CONSOLIDADO_CERRADO));
    });

    it("debe permitir la acción por fecha si el consolidado del período está reabierto", async () => {
      // Dado una fecha del II Bimestre pero con consolidado en estado reabierto
      repo.buscarPeriodoPorFecha = jest.fn().mockResolvedValue(periodoBimestre2);
      repo.buscarConsolidadoVigente = jest.fn().mockResolvedValue(consolidadoReabierto);

      // Cuando se valida por fecha
      // Entonces se resuelve sin error permitiendo modificar sesiones y ausencias
      await expect(
        service.asegurarNoCerradoPorFecha("docente-quispe-uuid", "2027-06-15"),
      ).resolves.toBeUndefined();
    });

    it("debe permitir la acción por fecha si no existe período correspondiente o no hay consolidado previo", async () => {
      // Dado una fecha sin consolidado generado
      repo.buscarPeriodoPorFecha = jest.fn().mockResolvedValue(periodoBimestre2);
      repo.buscarConsolidadoVigente = jest.fn().mockResolvedValue(null);

      // Cuando se valida por fecha
      // Entonces permite continuar
      await expect(
        service.asegurarNoCerradoPorFecha("docente-quispe-uuid", "2027-06-15"),
      ).resolves.toBeUndefined();
    });
  });
});
