import { BadRequestException, ConflictException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "@/common/services/audit.service";
import { CargosService } from "@/features/cargos/cargos.service";
import { CargosRepository } from "@/features/cargos/repositories";

describe("CargosService (RF-002 V2: HU4 Cargos y roles sugeridos)", () => {
  let service: CargosService;
  let repository: jest.Mocked<CargosRepository>;
  let auditService: { log: jest.Mock };

  const cargo = {
    id: "cargo-1",
    nombre: "Coordinador(a) académico",
    descripcion: null,
    vigente: true,
    rolesSugeridos: [{ id: "rol-subdirector", nombre: "Subdirector" }],
    personasCount: 0,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CargosService,
        {
          provide: CargosRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            findByName: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            setVigente: jest.fn(),
            countPersonasVigentes: jest.fn(),
            countRolesActivos: jest.fn(),
          },
        },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get(CargosService);
    repository = module.get(CargosRepository);
    auditService = module.get(AuditService);
  });

  it("Crear un cargo: lo guarda con sus roles sugeridos y lo audita", async () => {
    // Arrange
    repository.findByName.mockResolvedValue(null);
    repository.countRolesActivos.mockResolvedValue(1);
    repository.create.mockResolvedValue("cargo-1");
    repository.findById.mockResolvedValue(cargo);

    // Act
    const result = await service.create(
      { nombre: "Coordinador(a) académico", rolesSugeridosIds: ["rol-subdirector"] },
      "admin-uuid",
    );

    // Assert
    expect(repository.create).toHaveBeenCalledWith(
      { nombre: "Coordinador(a) académico", descripcion: null },
      ["rol-subdirector"],
    );
    expect(result.rolesSugeridos).toEqual([{ id: "rol-subdirector", nombre: "Subdirector" }]);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ accion: "crear", tabla: "cargos" }),
    );
  });

  it("Cargo repetido: rechaza con ConflictException", async () => {
    repository.findByName.mockResolvedValue({ id: "otro" });

    await expect(service.create({ nombre: "Docente de aula" }, "admin-uuid")).rejects.toThrow(
      new ConflictException("Ya existe un cargo con ese nombre."),
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("Rol sugerido inexistente o inactivo: rechaza el cargo", async () => {
    repository.findByName.mockResolvedValue(null);
    repository.countRolesActivos.mockResolvedValue(0);

    await expect(
      service.create({ nombre: "Nuevo cargo", rolesSugeridosIds: ["rol-x"] }, "admin-uuid"),
    ).rejects.toThrow(BadRequestException);
  });

  it("Desactivar un cargo en uso: rechaza si hay personal vigente con él", async () => {
    repository.findById.mockResolvedValue(cargo);
    repository.countPersonasVigentes.mockResolvedValue(2);

    await expect(service.deactivate("cargo-1", "admin-uuid")).rejects.toThrow(
      new BadRequestException("No se puede desactivar un cargo asignado a personal vigente."),
    );
    expect(repository.setVigente).not.toHaveBeenCalled();
  });

  it("Desactivar un cargo sin personal: queda no vigente", async () => {
    repository.findById.mockResolvedValue(cargo);
    repository.countPersonasVigentes.mockResolvedValue(0);

    await service.deactivate("cargo-1", "admin-uuid");

    expect(repository.setVigente).toHaveBeenCalledWith("cargo-1", false);
  });
});
