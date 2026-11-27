import { BadRequestException, HttpException } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { EquiposRepository } from "@/features/equipos/repositories/equipos.repository";
import { SolicitudesKioskoRepository } from "@/features/equipos/repositories/solicitudes-kiosko.repository";
import {
  codigoDeEquipo,
  SolicitudesKioskoService,
} from "@/features/equipos/solicitudes-kiosko.service";

describe("SolicitudesKioskoService", () => {
  const secreto = "a".repeat(64);
  const solicitud = {
    id: "solicitud-id",
    codigo: "KSK-0000-0000",
    secretoHash: "hash-del-navegador",
    estado: 1,
    equipoId: null as string | null,
  };
  let solicitudes: Record<string, jest.Mock>;
  let equipos: Record<string, jest.Mock>;
  let service: SolicitudesKioskoService;

  beforeEach(() => {
    solicitudes = {
      findAll: jest.fn(),
      findById: jest.fn().mockResolvedValue(solicitud),
      findBySecretoHash: jest.fn().mockResolvedValue(null),
      contarPendientesActivas: jest.fn().mockResolvedValue(0),
      crear: jest.fn(),
      registrarConsulta: jest.fn(),
      reabrir: jest.fn(),
      resolver: jest.fn(),
    };
    equipos = {
      findById: jest.fn().mockResolvedValue({ id: "equipo-id", activo: true }),
      findByTokenHash: jest.fn().mockResolvedValue(null),
      authorize: jest.fn(),
    };
    service = new SolicitudesKioskoService(
      solicitudes as unknown as SolicitudesKioskoRepository,
      equipos as unknown as EquiposRepository,
      { log: jest.fn() } as unknown as AuditService,
    );
  });

  it("entrega un código estable y no guarda el secreto en claro", async () => {
    const primera = await service.registrar(secreto);
    const segunda = await service.registrar(secreto);

    expect(primera.codigo).toMatch(/^KSK-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(segunda.codigo).toBe(primera.codigo);
    const [codigo, hash] = solicitudes.crear.mock.calls[0] as [string, string];
    expect(hash).not.toBe(secreto);
    expect(codigo).toBe(codigoDeEquipo(hash));
  });

  it("frena nuevas solicitudes al llegar al tope de pendientes", async () => {
    solicitudes.contarPendientesActivas.mockResolvedValue(20);

    await expect(service.registrar(secreto)).rejects.toThrow(HttpException);
    expect(solicitudes.crear).not.toHaveBeenCalled();
  });

  it("al aprobar, vincula el hash del navegador como clave del kiosko", async () => {
    await service.aprobar("solicitud-id", "equipo-id", "admin-id");

    expect(equipos.authorize).toHaveBeenCalledWith("equipo-id", "hash-del-navegador", "admin-id");
    expect(solicitudes.resolver).toHaveBeenCalledWith("solicitud-id", 2, "admin-id", "equipo-id");
  });

  it("no aprueba sobre un equipo desactivado", async () => {
    equipos.findById.mockResolvedValue({ id: "equipo-id", activo: false });

    await expect(service.aprobar("solicitud-id", "equipo-id", "admin-id")).rejects.toThrow(
      BadRequestException,
    );
    expect(equipos.authorize).not.toHaveBeenCalled();
  });

  it("solo rechaza solicitudes pendientes", async () => {
    solicitudes.findById.mockResolvedValue({ ...solicitud, estado: 2 });

    await expect(service.rechazar("solicitud-id", "admin-id")).rejects.toThrow(BadRequestException);
  });

  it("reabre la solicitud si el kiosko se reasignó a otro navegador", async () => {
    solicitudes.findBySecretoHash.mockResolvedValue({
      ...solicitud,
      estado: 2,
      equipoId: "equipo-id",
    });

    await expect(service.registrar(secreto)).resolves.toMatchObject({ estado: 1 });
    expect(solicitudes.reabrir).toHaveBeenCalledWith("solicitud-id");
  });
});
