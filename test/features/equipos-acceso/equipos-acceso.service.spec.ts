import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { ESTADO_EQUIPO_ACCESO, EstadoEquipoAcceso } from "@/features/equipos-acceso/constants";
import { EquipoAccesoResponseDto } from "@/features/equipos-acceso/dto";
import { EquiposAccesoService } from "@/features/equipos-acceso/equipos-acceso.service";
import { EquiposAccesoRepository } from "@/features/equipos-acceso/repositories/equipos-acceso.repository";

describe("EquiposAccesoService (equipos desde los que se inicia sesión)", () => {
  let service: EquiposAccesoService;
  let repositorio: jest.Mocked<Partial<EquiposAccesoRepository>>;
  let auditoria: jest.Mocked<Partial<AuditService>>;

  const equipo = (estado: EstadoEquipoAcceso): EquipoAccesoResponseDto => ({
    id: "equipo-1",
    usuarioId: "usuario-1",
    nombreUsuario: "admin",
    nombre: "PC de secretaría",
    plataforma: 1,
    estado,
    solicitadoEn: "2026-11-07T10:00:00Z",
  });

  const darEstadoActual = (estado: EstadoEquipoAcceso) => {
    repositorio.findById = jest.fn().mockResolvedValue(equipo(estado));
    repositorio.resolver = jest
      .fn()
      .mockImplementation((_id: string, r: { estado: EstadoEquipoAcceso }) =>
        Promise.resolve(equipo(r.estado)),
      );
  };

  beforeEach(() => {
    repositorio = {};
    auditoria = { log: jest.fn().mockResolvedValue(undefined) };
    service = new EquiposAccesoService(
      repositorio as unknown as EquiposAccesoRepository,
      auditoria as unknown as AuditService,
    );
  });

  it("autoriza un equipo pendiente, guarda quién lo resolvió y deja auditoría", async () => {
    darEstadoActual(ESTADO_EQUIPO_ACCESO.PENDIENTE);

    const resultado = await service.autorizar("equipo-1", "admin-id", undefined, "10.0.0.5");

    expect(resultado.estado).toBe(ESTADO_EQUIPO_ACCESO.AUTORIZADO);
    expect(repositorio.resolver).toHaveBeenCalledWith("equipo-1", {
      estado: ESTADO_EQUIPO_ACCESO.AUTORIZADO,
      resueltoPor: "admin-id",
      motivo: null,
      vigenteHasta: null,
    });
    expect(auditoria.log).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: "admin-id",
        accion: "actualizar",
        tabla: "equipos_acceso",
        registroId: "equipo-1",
        direccionIp: "10.0.0.5",
      }),
    );
  });

  it("rechaza una fecha límite que ya pasó", async () => {
    darEstadoActual(ESTADO_EQUIPO_ACCESO.PENDIENTE);

    await expect(
      service.autorizar("equipo-1", "admin-id", "2020-01-01T00:00:00Z"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repositorio.resolver).not.toHaveBeenCalled();
  });

  it("rechaza un equipo pendiente con motivo", async () => {
    darEstadoActual(ESTADO_EQUIPO_ACCESO.PENDIENTE);

    await service.rechazar("equipo-1", "admin-id", "  No es un equipo del colegio ");

    expect(repositorio.resolver).toHaveBeenCalledWith(
      "equipo-1",
      expect.objectContaining({
        estado: ESTADO_EQUIPO_ACCESO.RECHAZADO,
        motivo: "No es un equipo del colegio",
      }),
    );
  });

  it("revoca un equipo autorizado", async () => {
    darEstadoActual(ESTADO_EQUIPO_ACCESO.AUTORIZADO);

    const resultado = await service.revocar("equipo-1", "admin-id", "Equipo robado");

    expect(resultado.estado).toBe(ESTADO_EQUIPO_ACCESO.REVOCADO);
  });

  it("permite volver a autorizar un equipo revocado o rechazado", async () => {
    darEstadoActual(ESTADO_EQUIPO_ACCESO.REVOCADO);
    await expect(service.autorizar("equipo-1", "admin-id", undefined)).resolves.toBeDefined();

    darEstadoActual(ESTADO_EQUIPO_ACCESO.RECHAZADO);
    await expect(service.autorizar("equipo-1", "admin-id", undefined)).resolves.toBeDefined();
  });

  it.each([
    ["autorizar", ESTADO_EQUIPO_ACCESO.AUTORIZADO],
    ["rechazar", ESTADO_EQUIPO_ACCESO.AUTORIZADO],
    ["rechazar", ESTADO_EQUIPO_ACCESO.REVOCADO],
    ["revocar", ESTADO_EQUIPO_ACCESO.PENDIENTE],
    ["revocar", ESTADO_EQUIPO_ACCESO.RECHAZADO],
  ] as const)("no permite %s cuando el equipo está en estado %s", async (accion, estado) => {
    darEstadoActual(estado);

    const llamada =
      accion === "autorizar"
        ? service.autorizar("equipo-1", "admin-id", undefined)
        : service[accion]("equipo-1", "admin-id");

    await expect(llamada).rejects.toBeInstanceOf(BadRequestException);
    expect(repositorio.resolver).not.toHaveBeenCalled();
    expect(auditoria.log).not.toHaveBeenCalled();
  });

  it("falla con 404 si el equipo no existe", async () => {
    repositorio.findById = jest.fn().mockResolvedValue(null);

    await expect(service.autorizar("no-existe", "admin-id", undefined)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
