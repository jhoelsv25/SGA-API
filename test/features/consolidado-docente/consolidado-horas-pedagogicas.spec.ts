import { InternalServerErrorException } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";
import {
  ConsolidadoDocenteRepository,
  ConsolidadoDocenteService,
  calcularHorasPedagogicas,
  type ActorConsolidado,
} from "@/features/consolidado-docente";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

const director: ActorConsolidado = {
  id: "u-dir",
  roleId: "r",
  role: "Director",
  personaId: "p-dir",
};

describe("RF-013 V2: horas pedagógicas", () => {
  it("CP-RF013-21: 20 sesiones de 45 min con 2 parciales de 15 min perdidos dan 20,0 / 17,3 / 2,7", () => {
    // 16 cumplidas (45) + 2 parciales (30) = 780 dictados de 900 programados
    const horas = calcularHorasPedagogicas(900, 780, 45);
    expect(horas).toEqual({
      horasProgramadas: 20,
      horasDictadas: 17.3,
      horasPerdidas: 2.7,
      minutosNoDictados: 120,
    });
  });

  it("con 60 minutos por hora pedagógica las mismas sesiones dan otras horas", () => {
    expect(calcularHorasPedagogicas(900, 780, 60)).toMatchObject({
      horasProgramadas: 15,
      horasDictadas: 13,
      horasPerdidas: 2,
    });
  });

  it("un consolidado anterior a la V2 no trae horas", () => {
    expect(calcularHorasPedagogicas(null, null, null)).toEqual({
      horasProgramadas: null,
      horasDictadas: null,
      horasPerdidas: null,
      minutosNoDictados: null,
    });
  });

  describe("al generar", () => {
    let repo: Mocks<ConsolidadoDocenteRepository>;
    let service: ConsolidadoDocenteService;

    const metricas = {
      sesionesProgramadas: 20,
      sesionesCumplidas: 16,
      sesionesParciales: 2,
      sesionesNoCumplidas: 1,
      sesionesJustificadas: 1,
      minutosPerdidosFirma: 30,
      totalAusencias: 0,
      minutosFueraAula: 0,
      minutosTotalFuera: 30,
      minutosProgramados: 900,
      minutosDictados: 780,
    };

    beforeEach(() => {
      repo = {
        obtenerPeriodo: jest.fn().mockResolvedValue({
          id: "per-1",
          nombre: "Bimestre I",
          fechaInicio: "2026-03-01",
          fechaFin: "2026-05-15",
          estado: "cerrado",
          anioAcademicoId: "a",
        }),
        obtenerConsolidadoVigenteDocente: jest.fn().mockResolvedValue(null),
        calcularMetricasDocente: jest.fn().mockResolvedValue(metricas),
        crearConsolidado: jest.fn().mockResolvedValue({ id: "c-1" }),
        valorVariable: jest.fn().mockResolvedValue("45"),
      };
      service = new ConsolidadoDocenteService(
        repo as unknown as ConsolidadoDocenteRepository,
        { log: jest.fn() } as unknown as AuditService,
        { enviar: jest.fn() } as unknown as NotificacionesService,
        { get: jest.fn() } as never,
      );
    });

    it("CP-RF013-22: guarda la duración de la hora pedagógica vigente (60 tras el cambio)", async () => {
      repo.valorVariable!.mockResolvedValue("60");
      await service.generarConsolidados({ periodoId: "per-1", docenteId: "d-1" }, director);
      expect(repo.crearConsolidado).toHaveBeenCalledWith(
        expect.objectContaining({
          minutosHoraPedagogica: 60,
          minutosProgramados: 900,
          minutosDictados: 780,
        }),
      );
    });

    it("sin la variable en la base no genera el consolidado", async () => {
      repo.valorVariable!.mockResolvedValue(null);
      await expect(
        service.generarConsolidados({ periodoId: "per-1", docenteId: "d-1" }, director),
      ).rejects.toThrow(InternalServerErrorException);
      expect(repo.crearConsolidado).not.toHaveBeenCalled();
    });
  });
});
