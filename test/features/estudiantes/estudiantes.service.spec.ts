import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "@/common/services/audit.service";
import { CargosRepository } from "@/features/cargos/repositories/cargos.repository";
import { ESTUDIANTE_MESSAGES } from "@/features/estudiantes/constants";
import { EstudiantesService } from "@/features/estudiantes/estudiantes.service";
import type { CreateEstudianteDto } from "@/features/estudiantes/dto";
import { DocentesRepository } from "@/features/docentes/repositories/docentes.repository";
import { EstudiantesRepository } from "@/features/estudiantes/repositories/estudiantes.repository";
import { PersonasRepository } from "@/features/personas/repositories/personas.repository";
import { RolesRepository } from "@/features/roles/repositories/roles.repository";
import type { PersonaResponseDto } from "@/features/personas/dto";
import type { RoleResponseDto } from "@/features/roles/dto";
import type { CargoResponseDto } from "@/features/cargos/dto";

describe("EstudiantesService (RF-007 Historia de Usuario 2)", () => {
  let service: EstudiantesService;
  let repository: jest.Mocked<EstudiantesRepository>;
  let personasRepository: jest.Mocked<PersonasRepository>;
  let cargosRepository: jest.Mocked<CargosRepository>;
  let rolesRepository: jest.Mocked<RolesRepository>;
  let auditService: jest.Mocked<AuditService>;
  let docentesRepository: jest.Mocked<DocentesRepository>;

  const mockPersona: PersonaResponseDto = {
    id: "per-1",
    tipoDocumento: "dni",
    numeroDocumento: "71234567",
    nombres: "Mateo",
    apellidoPaterno: "Quispe",
    apellidoMaterno: "Mamani",
    nombreCompleto: "Quispe Mamani, Mateo",
    sexo: "M",
    esProvisional: false,
    fichas: {
      esDocente: false,
      esEstudiante: true,
      esApoderado: false,
      tieneUsuario: true,
    },
    creadoEn: "2026-10-09T00:00:00Z",
    actualizadoEn: "2026-10-09T00:00:00Z",
  };

  const mockEstudiante = {
    id: "est-1",
    codigo: "20261234567890",
    personaId: "per-1",
    fechaIngreso: "2026-03-01",
    lenguaMaterna: "Castellano",
    religion: "Católica",
    tieneDiscapacidad: false,
    detalleDiscapacidad: null,
    grupoSanguineo: "O+",
    alergias: "Ninguna",
    condicionesMedicas: null,
    seguroSalud: "SIS",
    estado: "activo" as const,
    cargoVigente: "Estudiante",
    usuario: { id: "usr-1", nombreUsuario: "20261234567890", estado: "activo" },
    credencial: { id: "cred-1", codigo: "CR-20261234567890", activa: true },
    creadoEn: "2026-10-09T00:00:00Z",
    actualizadoEn: "2026-10-09T00:00:00Z",
    persona: mockPersona,
  };

  beforeEach(async () => {
    repository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByPersonaId: jest.fn(),
      findByCodigo: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      contarMatriculasActivas: jest.fn().mockResolvedValue(0),
      cambiarEstado: jest.fn(),
    } as unknown as jest.Mocked<EstudiantesRepository>;

    personasRepository = {
      findById: jest.fn(),
      findByDocumento: jest.fn(),
    } as unknown as jest.Mocked<PersonasRepository>;

    cargosRepository = {
      findById: jest.fn(),
      findByName: jest.fn(),
    } as unknown as jest.Mocked<CargosRepository>;

    rolesRepository = {
      findByName: jest.fn(),
    } as unknown as jest.Mocked<RolesRepository>;

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditService>;

    docentesRepository = {
      findByPersonaId: jest.fn().mockResolvedValue(null),
      contarCargaVigente: jest.fn().mockResolvedValue(0),
      cesar: jest.fn().mockResolvedValue(null),
      reactivar: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<DocentesRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstudiantesService,
        { provide: EstudiantesRepository, useValue: repository },
        { provide: PersonasRepository, useValue: personasRepository },
        { provide: CargosRepository, useValue: cargosRepository },
        { provide: RolesRepository, useValue: rolesRepository },
        { provide: AuditService, useValue: auditService },
        { provide: DocentesRepository, useValue: docentesRepository },
      ],
    }).compile();

    service = module.get<EstudiantesService>(EstudiantesService);
  });

  describe("create (Escenarios HU2)", () => {
    const createDto: CreateEstudianteDto = {
      codigo: "20261234567890",
      fechaIngreso: "2026-03-01",
      nuevaPersona: {
        tipoDocumento: "dni",
        numeroDocumento: "71234567",
        nombres: "Mateo",
        apellidoPaterno: "Quispe",
        apellidoMaterno: "Mamani",
        sexo: "M",
        fechaNacimiento: "2012-05-15",
      },
      tieneDiscapacidad: false,
    };

    it("Escenario: Registrar un estudiante nuevo con cargo, cuenta y credencial de marcación", async () => {
      repository.findByCodigo.mockResolvedValue(null);
      personasRepository.findByDocumento.mockResolvedValue(null);
      cargosRepository.findByName.mockResolvedValue({
        id: "cargo-est",
        nombre: "Estudiante",
      } as CargoResponseDto);
      rolesRepository.findByName.mockResolvedValue({
        id: "rol-est",
        nombre: "Estudiante",
      } as RoleResponseDto);
      repository.create.mockResolvedValue({
        estudiante: mockEstudiante,
        tempPassword: "TempPassword123*",
        credencial: { codigo: "CR-20261234567890", pin: "1234" },
      });

      const result = await service.create(createDto, "admin-1");

      expect(result.estudiante.codigo).toBe("20261234567890");
      expect(result.tempPassword).toBeDefined();
      expect(result.credencial.pin).toBe("1234");
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "crear", tabla: "estudiantes" }),
      );
    });

    it("Escenario: Código SIAGIE repetido bloquea el registro con ConflictException", async () => {
      repository.findByCodigo.mockResolvedValue(mockEstudiante);

      await expect(service.create(createDto, "admin-1")).rejects.toThrow(
        new ConflictException(ESTUDIANTE_MESSAGES.CODIGO_DUPLICADO),
      );
    });

    it("Escenario: Detalle de discapacidad sin marcarla bloquea con BadRequestException", async () => {
      repository.findByCodigo.mockResolvedValue(null);

      const dtoInvalido: CreateEstudianteDto = {
        ...createDto,
        tieneDiscapacidad: false,
        detalleDiscapacidad: "Usa lentes",
      };

      await expect(service.create(dtoInvalido, "admin-1")).rejects.toThrow(
        new BadRequestException(ESTUDIANTE_MESSAGES.DISCAPACIDAD_DETALLE_INVALIDO),
      );
    });

    it("Escenario: Fecha de nacimiento futura bloquea el guardado", async () => {
      repository.findByCodigo.mockResolvedValue(null);

      const dtoFechaFutura: CreateEstudianteDto = {
        ...createDto,
        nuevaPersona: {
          ...createDto.nuevaPersona!,
          fechaNacimiento: "2099-01-01",
        },
      };

      await expect(service.create(dtoFechaFutura, "admin-1")).rejects.toThrow(
        new BadRequestException(ESTUDIANTE_MESSAGES.FECHA_NACIMIENTO_FUTURA),
      );
    });

    it("Escenario: Reutilizar persona del padrón si ya existe sin ficha de estudiante", async () => {
      repository.findByCodigo.mockResolvedValue(null);
      personasRepository.findByDocumento.mockResolvedValue(mockPersona);
      repository.findByPersonaId.mockResolvedValue(null);
      cargosRepository.findByName.mockResolvedValue({
        id: "cargo-est",
        nombre: "Estudiante",
      } as CargoResponseDto);
      rolesRepository.findByName.mockResolvedValue({
        id: "rol-est",
        nombre: "Estudiante",
      } as RoleResponseDto);
      repository.create.mockResolvedValue({
        estudiante: mockEstudiante,
        tempPassword: "TempPassword123*",
        credencial: { codigo: "CR-20261234567890", pin: "1234" },
      });

      const result = await service.create(createDto, "admin-1");

      expect(result.estudiante.id).toBe("est-1");
      const calls = repository.create.mock.calls;
      expect(calls[0][0].dto.personaId).toBe("per-1");
      expect(calls[0][0].dto.nuevaPersona).toBeUndefined();
    });

    it("Escenario: Bloquear si la persona ya está registrada como estudiante", async () => {
      repository.findByCodigo.mockResolvedValue(null);
      personasRepository.findById.mockResolvedValue(mockPersona);
      repository.findByPersonaId.mockResolvedValue(mockEstudiante);

      const dtoPersonaExistente: CreateEstudianteDto = {
        codigo: "20269999999999",
        fechaIngreso: "2026-03-01",
        personaId: "per-1",
      };

      await expect(service.create(dtoPersonaExistente, "admin-1")).rejects.toThrow(
        new ConflictException(ESTUDIANTE_MESSAGES.PERSONA_YA_ESTUDIANTE),
      );
    });
  });

  describe("create: ficha única (docente o estudiante, nunca ambas)", () => {
    const dtoPersona: CreateEstudianteDto = {
      codigo: "20269999999999",
      fechaIngreso: "2026-03-01",
      personaId: "per-1",
    };

    const docenteActivo = {
      id: "doc-1",
      codigo: "DOC001",
      estado: "activo",
      fechaIngreso: "2020-03-01",
      fechaCese: null,
    } as Awaited<ReturnType<DocentesRepository["findByPersonaId"]>>;

    beforeEach(() => {
      repository.findByCodigo.mockResolvedValue(null);
      personasRepository.findById.mockResolvedValue(mockPersona);
      repository.findByPersonaId.mockResolvedValue(null);
      cargosRepository.findByName.mockResolvedValue({
        id: "cargo-est",
        nombre: "Estudiante",
      } as CargoResponseDto);
      rolesRepository.findByName.mockResolvedValue({
        id: "rol-est",
        nombre: "Estudiante",
      } as RoleResponseDto);
      repository.create.mockResolvedValue({
        estudiante: mockEstudiante,
        tempPassword: "TempPassword123*",
        credencial: { codigo: "CR-20269999999999", pin: "1234" },
      });
    });

    it("rechaza con código FICHA_ACADEMICA_ACTIVA si el docente está vigente y no se pidió la baja", async () => {
      docentesRepository.findByPersonaId.mockResolvedValue(docenteActivo);

      await expect(service.create(dtoPersona, "admin-1")).rejects.toMatchObject({
        response: { code: "FICHA_ACADEMICA_ACTIVA", fichaActiva: { tipo: "docente", id: "doc-1" } },
      });
      expect(repository.create).not.toHaveBeenCalled();
      expect(docentesRepository.cesar).not.toHaveBeenCalled();
    });

    it("cesa al docente y crea el estudiante cuando se pide la baja", async () => {
      docentesRepository.findByPersonaId.mockResolvedValue(docenteActivo);

      await service.create(
        {
          ...dtoPersona,
          darBajaFichaActual: { motivo: "Pasa a ser estudiante", fecha: "2026-11-07" },
        },
        "admin-1",
      );

      expect(docentesRepository.cesar).toHaveBeenCalledWith("doc-1", "2026-11-07");
      expect(repository.create).toHaveBeenCalled();
    });

    it("bloquea la baja si el docente tiene cursos asignados en el año vigente", async () => {
      docentesRepository.findByPersonaId.mockResolvedValue(docenteActivo);
      docentesRepository.contarCargaVigente.mockResolvedValue(2);

      await expect(
        service.create(
          { ...dtoPersona, darBajaFichaActual: { motivo: "Pasa a ser estudiante" } },
          "admin-1",
        ),
      ).rejects.toMatchObject({
        response: { code: "FICHA_CON_DEPENDENCIAS" },
      });
      expect(docentesRepository.cesar).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it("reactiva al docente si la creación del estudiante falla", async () => {
      docentesRepository.findByPersonaId.mockResolvedValue(docenteActivo);
      repository.create.mockRejectedValue(new Error("fallo de base de datos"));

      await expect(
        service.create(
          {
            ...dtoPersona,
            darBajaFichaActual: { motivo: "Pasa a ser estudiante", fecha: "2026-11-07" },
          },
          "admin-1",
        ),
      ).rejects.toThrow("fallo de base de datos");

      expect(docentesRepository.cesar).toHaveBeenCalled();
      expect(docentesRepository.reactivar).toHaveBeenCalledWith("doc-1");
    });

    it("permite crear estudiante sin baja si el docente ya está cesado", async () => {
      docentesRepository.findByPersonaId.mockResolvedValue({
        ...docenteActivo,
        estado: "cesado",
      } as typeof docenteActivo);

      await service.create(dtoPersona, "admin-1");

      expect(repository.create).toHaveBeenCalled();
      expect(docentesRepository.cesar).not.toHaveBeenCalled();
    });
  });

  describe("darDeBaja / reactivar", () => {
    it("da de baja al estudiante sin matrícula activa", async () => {
      repository.findById.mockResolvedValue(mockEstudiante);
      repository.cambiarEstado.mockResolvedValue({ ...mockEstudiante, estado: "retirado" });

      const result = await service.darDeBaja("est-1", { motivo: "Retiro voluntario" }, "admin-1");

      expect(result.estudiante.estado).toBe("retirado");
      expect(repository.cambiarEstado).toHaveBeenCalledWith("est-1", "retirado");
    });

    it("bloquea la baja si tiene matrícula activa", async () => {
      repository.findById.mockResolvedValue(mockEstudiante);
      repository.contarMatriculasActivas.mockResolvedValue(1);

      await expect(
        service.darDeBaja("est-1", { motivo: "Retiro voluntario" }, "admin-1"),
      ).rejects.toMatchObject({
        response: { code: "FICHA_CON_DEPENDENCIAS" },
      });
    });

    it("reactiva a un estudiante retirado", async () => {
      repository.findById.mockResolvedValue({ ...mockEstudiante, estado: "retirado" as never });
      repository.cambiarEstado.mockResolvedValue(mockEstudiante);

      const result = await service.reactivar("est-1", "admin-1");

      expect(result.estudiante.estado).toBe("activo");
    });

    it("rechaza reactivar si la persona tiene ficha de docente vigente", async () => {
      repository.findById.mockResolvedValue({ ...mockEstudiante, estado: "retirado" as never });
      docentesRepository.findByPersonaId.mockResolvedValue({
        id: "doc-1",
        codigo: "DOC001",
        estado: "activo",
      } as Awaited<ReturnType<DocentesRepository["findByPersonaId"]>>);

      await expect(service.reactivar("est-1", "admin-1")).rejects.toMatchObject({
        response: { code: "FICHA_ACADEMICA_ACTIVA" },
      });
      expect(repository.cambiarEstado).not.toHaveBeenCalled();
    });

    it("no permite reactivar a un egresado", async () => {
      repository.findById.mockResolvedValue({ ...mockEstudiante, estado: "egresado" as never });

      await expect(service.reactivar("est-1", "admin-1")).rejects.toThrow(BadRequestException);
    });
  });

  describe("findAll", () => {
    it("debe listar estudiantes con paginación", async () => {
      repository.findAll.mockResolvedValue({
        data: [mockEstudiante],
        nextCursor: null,
        hasMore: false,
        limit: 10,
      });

      const result = await service.findAll({ limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].codigo).toBe("20261234567890");
    });
  });

  describe("findById", () => {
    it("debe retornar el estudiante por ID", async () => {
      repository.findById.mockResolvedValue(mockEstudiante);
      const result = await service.findById("est-1");
      expect(result.id).toBe("est-1");
    });

    it("debe lanzar NotFoundException si no existe", async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById("no-existe")).rejects.toThrow(
        new NotFoundException(ESTUDIANTE_MESSAGES.NOT_FOUND),
      );
    });
  });

  describe("update", () => {
    it("debe actualizar datos médicos y auditar el cambio", async () => {
      repository.findById.mockResolvedValue(mockEstudiante);
      const updatedMock = { ...mockEstudiante, seguroSalud: "EsSalud" };
      repository.update.mockResolvedValue(updatedMock);

      const result = await service.update("est-1", { seguroSalud: "EsSalud" }, "admin-1");

      expect(result.seguroSalud).toBe("EsSalud");
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "actualizar", tabla: "estudiantes" }),
      );
    });
  });

  describe("delete", () => {
    it("debe eliminar el estudiante y registrar auditoría", async () => {
      repository.findById.mockResolvedValue(mockEstudiante);
      repository.delete.mockResolvedValue(true);

      const result = await service.delete("est-1", "admin-1");

      expect(result.message).toBe(ESTUDIANTE_MESSAGES.DELETED_SUCCESS);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "eliminar", tabla: "estudiantes" }),
      );
    });
  });
});
