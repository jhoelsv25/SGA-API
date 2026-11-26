import { AnioLectivoCls } from "@/common/anio-lectivo";
import { AuditService } from "@/common/services/audit.service";
import { AusenciasRegistroService } from "@/features/ausencias-docente/services/ausencias-registro.service";
import type { AusenciasDocenteRepository } from "@/features/ausencias-docente/repositories";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";

describe("AusenciasRegistroService.obtenerFechaHoy en hora de Lima", () => {
  let servicio: AusenciasRegistroService;

  beforeEach(() => {
    const anioSinContexto = {
      id: jest.fn().mockReturnValue(undefined),
    } as unknown as AnioLectivoCls;
    servicio = new AusenciasRegistroService(
      {} as unknown as AusenciasDocenteRepository,
      {} as unknown as NotificacionesService,
      {} as unknown as AuditService,
      anioSinContexto,
    );
  });

  it("a las 02:00 UTC del 15 todavía es el 14 en Lima", () => {
    expect(servicio.obtenerFechaHoy(new Date("2026-10-15T02:00:00Z"))).toBe("2026-10-14");
  });

  it("a las 05:00 UTC del 15 ya es el 15 en Lima", () => {
    expect(servicio.obtenerFechaHoy(new Date("2026-10-15T05:00:00Z"))).toBe("2026-10-15");
  });
});
