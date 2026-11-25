import { BadRequestException, ConflictException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "@/common/services/audit.service";
import { CargosRepository } from "@/features/cargos/repositories/cargos.repository";
import { DOCENTE_MESSAGES } from "@/features/docentes/constants";
import { DocentesService } from "@/features/docentes/docentes.service";
import type { CreateDocenteDto } from "@/features/docentes/dto";
import { EstudiantesRepository } from "@/features/estudiantes/repositories/estudiantes.repository";
import { DocentesRepository } from "@/features/docentes/repositories/docentes.repository";
import { PersonasRepository } from "@/features/personas/repositories/personas.repository";
import { RolesRepository } from "@/features/roles/repositories/roles.repository";
import type { PersonaResponseDto } from "@/features/personas/dto";
import type { RoleResponseDto } from "@/features/roles/dto";

describe("DocentesService (RF-007 Historia de Usuario 1)", () => {
  let service: DocentesService;
  let repository: jest.Mocked<DocentesRepository>;
  let personasRepository: jest.Mocked<PersonasRepository>;
  let cargosRepository: jest.Mocked<CargosRepository>;
  let rolesRepository: jest.Mocked<RolesRepository>;
  let estudiantesRepository: jest.Mocked<EstudiantesRepository>;
  let auditService: jest.Mocked<AuditService>;

  const mockDocente = {
    id: "doc-1",
    codigo: "DOC015",
    personaId: "per-1",
    especialidad: "Matemáticas",
    tituloProfesional: "Licenciado en Educación",
    tipoContrato: "nombrado" as const,
    jornadaHoras: 30,
    fechaIngreso: "2026-03-01",
    fechaCese: null,
    estado: "activo" as const,
    firmaUrl: null,
    cargoVigente: "Docente de aula",
    usuario: { id: "usr-1", nombreUsuario: "45678912", estado: "activo" },
    credencial: { id: "cred-1", codigo: "CR-45678912", activa: true },
    creadoEn: "2026-10-09T00:00:00Z",
    actualizadoEn: "2026-10-09T00:00:00Z",
    persona: {
      id: "per-1",
      tipoDocumento: "dni" as const,
      numeroDocumento: "45678912",
      nombres: "Diego",
      apellidoPaterno: "Ramos",
      apellidoMaterno: "Flores",
      nombreCompleto: "Ramos Flores, Diego",
      sexo: "M",
      esProvisional: false,
      fichas: {
        esDocente: true,
        esEstudiante: false,
        esApoderado: false,
        tieneUsuario: true,
      },
      creadoEn: "2026-10-09T00:00:00Z",
      actualizadoEn: "2026-10-09T00:00:00Z",
    },
  };

  const mockPersona: PersonaResponseDto = mockDocente.persona;
  const mockRolDocente: RoleResponseDto = {
    id: "rol-doc",
    nombre: "Docente",
    descripcion: "Rol docente",
    esSistema: true,
    activo: true,
    creadoEn: "2026-10-09T00:00:00Z",
    actualizadoEn: "2026-10-09T00:00:00Z",
  };

  beforeEach(async () => {
    repository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByPersonaId: jest.fn(),
      findByCodigo: jest.fn(),
      generarSiguienteCodigo: jest.fn().mockResolvedValue("20261124000001"),
      create: jest.fn(),
      update: jest.fn(),
      cesar: jest.fn(),
      contarCargaVigente: jest.fn().mockResolvedValue(0),
      reactivar: jest.fn(),
    } as unknown as jest.Mocked<DocentesRepository>;

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

    estudiantesRepository = {
      findByPersonaId: jest.fn().mockResolvedValue(null),
      contarMatriculasActivas: jest.fn().mockResolvedValue(0),
      cambiarEstado: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<EstudiantesRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocentesService,
        { provide: DocentesRepository, useValue: repository },
        { provide: PersonasRepository, useValue: personasRepository },
        { provide: CargosRepository, useValue: cargosRepository },
        { provide: RolesRepository, useValue: rolesRepository },
        { provide: AuditService, useValue: auditService },
        { provide: EstudiantesRepository, useValue: estudiantesRepository },
      ],
    }).compile();

    service = module.get<DocentesService>(DocentesService);
  });

  describe("create", () => {
    const createDto: CreateDocenteDto = {
      codigo: "DOC015",
      tipoContrato: "nombrado",
      jornadaHoras: 30,
      fechaIngreso: "2026-03-01",
      nuevaPersona: {
        tipoDocumento: "dni",
        numeroDocumento: "45678912",
        nombres: "Diego",
        apellidoPaterno: "Ramos",
        apellidoMaterno: "Flores",
        sexo: "M",
      },
    };

    it("debe crear un docente exitosamente con persona nueva, cargo, cuenta y credencial", async () => {
      repository.findByCodigo.mockResolvedValue(null);
      personasRepository.findByDocumento.mockResolvedValue(null);
      cargosRepository.findByName.mockResolvedValue({ id: "cargo-doc-aula" });
      rolesRepository.findByName.mockResolvedValue(mockRolDocente);
      repository.create.mockResolvedValue({
        docente: mockDocente,
        tempPassword: "TempPassword123*",
        credencial: { codigo: "CR-45678912", pin: "1234" },
      });

      const result = await service.create(createDto, "admin-1");

      expect(result.docente.codigo).toBe("DOC015");
      expect(result.tempPassword).toBeDefined();
      expect(result.credencial.pin).toBe("1234");
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "crear", tabla: "docentes" }),
      );
    });

    it("debe autogenerar un código de 14 dígitos (YYYYMMDD + orden) cuando se omite el código", async () => {
      repository.generarSiguienteCodigo.mockResolvedValue("20261124000001");
      personasRepository.findByDocumento.mockResolvedValue(null);
      cargosRepository.findByName.mockResolvedValue({ id: "cargo-doc-aula" });
      rolesRepository.findByName.mockResolvedValue(mockRolDocente);
      repository.create.mockResolvedValue({
        docente: { ...mockDocente, codigo: "20261124000001" },
        tempPassword: "TempPassword123*",
        credencial: { codigo: "CR-45678912", pin: "1234" },
      });

      const sinCodigo: CreateDocenteDto = { ...createDto, codigo: undefined };
      const result = await service.create(sinCodigo, "admin-1");

      expect(repository.generarSiguienteCodigo).toHaveBeenCalledTimes(1);
      expect(result.docente.codigo).toBe("20261124000001");
    });

    it("debe reutilizar persona existente en padrón si ya existía sin ficha docente", async () => {
      repository.findByCodigo.mockResolvedValue(null);
      personasRepository.findByDocumento.mockResolvedValue(mockPersona);
      repository.findByPersonaId.mockResolvedValue(null);
      cargosRepository.findByName.mockResolvedValue({ id: "cargo-doc-aula" });
      rolesRepository.findByName.mockResolvedValue(mockRolDocente);
      repository.create.mockResolvedValue({
        docente: mockDocente,
        tempPassword: null,
        credencial: { codigo: "CR-45678912", pin: "1234" },
      });

      const result = await service.create(createDto, "admin-1");

      expect(result.docente).toBeDefined();
      expect(repository.create).toHaveBeenCalled();
    });

    it("debe rechazar si el código de docente ya existe", async () => {
      repository.findByCodigo.mockResolvedValue(mockDocente);

      await expect(service.create(createDto, "admin-1")).rejects.toThrow(ConflictException);
      await expect(service.create(createDto, "admin-1")).rejects.toThrow(
        DOCENTE_MESSAGES.CODIGO_DUPLICADO,
      );
    });

    it("debe rechazar si la persona ya cuenta con ficha de docente", async () => {
      repository.findByCodigo.mockResolvedValue(null);
      personasRepository.findById.mockResolvedValue(mockPersona);
      repository.findByPersonaId.mockResolvedValue(mockDocente);

      await expect(
        service.create({ ...createDto, personaId: "per-1", nuevaPersona: undefined }, "admin-1"),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.create({ ...createDto, personaId: "per-1", nuevaPersona: undefined }, "admin-1"),
      ).rejects.toThrow(DOCENTE_MESSAGES.PERSONA_YA_DOCENTE);
    });

    describe("ficha única: persona con ficha de estudiante", () => {
      const estudianteActivo = {
        id: "est-1",
        codigo: "E-1",
        estado: "activo",
      } as Awaited<ReturnType<EstudiantesRepository["findByPersonaId"]>>;

      beforeEach(() => {
        repository.findByCodigo.mockResolvedValue(null);
        personasRepository.findById.mockResolvedValue(mockPersona);
        repository.findByPersonaId.mockResolvedValue(null);
        cargosRepository.findByName.mockResolvedValue({ id: "cargo-doc-aula" });
        rolesRepository.findByName.mockResolvedValue(mockRolDocente);
        repository.create.mockResolvedValue({
          docente: mockDocente,
          tempPassword: "TempPassword123*",
          credencial: { codigo: "CR-45678912", pin: "1234" },
        });
      });

      const dtoPersona = { ...createDto, personaId: "per-1", nuevaPersona: undefined };

      it("rechaza con código FICHA_ACADEMICA_ACTIVA si el estudiante está vigente y no se pidió la baja", async () => {
        estudiantesRepository.findByPersonaId.mockResolvedValue(estudianteActivo);

        await expect(service.create(dtoPersona, "admin-1")).rejects.toMatchObject({
          response: {
            code: "FICHA_ACADEMICA_ACTIVA",
            fichaActiva: { tipo: "estudiante", id: "est-1" },
          },
        });
        expect(repository.create).not.toHaveBeenCalled();
        expect(estudiantesRepository.cambiarEstado).not.toHaveBeenCalled();
      });

      it("da de baja al estudiante y crea el docente cuando se pide la baja", async () => {
        estudiantesRepository.findByPersonaId.mockResolvedValue(estudianteActivo);

        await service.create(
          { ...dtoPersona, darBajaFichaActual: { motivo: "Pasa a ser docente" } },
          "admin-1",
        );

        expect(estudiantesRepository.cambiarEstado).toHaveBeenCalledWith("est-1", "retirado");
        expect(repository.create).toHaveBeenCalled();
      });

      it("bloquea la baja si el estudiante tiene matrícula activa", async () => {
        estudiantesRepository.findByPersonaId.mockResolvedValue(estudianteActivo);
        estudiantesRepository.contarMatriculasActivas.mockResolvedValue(1);

        await expect(
          service.create(
            { ...dtoPersona, darBajaFichaActual: { motivo: "Pasa a ser docente" } },
            "admin-1",
          ),
        ).rejects.toMatchObject({
          response: { code: "FICHA_CON_DEPENDENCIAS" },
        });
        expect(estudiantesRepository.cambiarEstado).not.toHaveBeenCalled();
        expect(repository.create).not.toHaveBeenCalled();
      });

      it("revierte la baja si la creación del docente falla", async () => {
        estudiantesRepository.findByPersonaId.mockResolvedValue(estudianteActivo);
        repository.create.mockRejectedValue(new Error("fallo de base de datos"));

        await expect(
          service.create(
            { ...dtoPersona, darBajaFichaActual: { motivo: "Pasa a ser docente" } },
            "admin-1",
          ),
        ).rejects.toThrow("fallo de base de datos");

        expect(estudiantesRepository.cambiarEstado).toHaveBeenNthCalledWith(1, "est-1", "retirado");
        expect(estudiantesRepository.cambiarEstado).toHaveBeenNthCalledWith(2, "est-1", "activo");
      });

      it("permite crear docente sin baja si el estudiante ya está de baja", async () => {
        estudiantesRepository.findByPersonaId.mockResolvedValue({
          ...estudianteActivo,
          estado: "retirado",
        } as typeof estudianteActivo);

        await service.create(dtoPersona, "admin-1");

        expect(repository.create).toHaveBeenCalled();
        expect(estudiantesRepository.cambiarEstado).not.toHaveBeenCalled();
      });

      it("indica reactivar si la persona tiene una ficha de docente cesada", async () => {
        repository.findByPersonaId.mockResolvedValue({ ...mockDocente, estado: "cesado" });

        await expect(service.create(dtoPersona, "admin-1")).rejects.toThrow(
          DOCENTE_MESSAGES.PERSONA_DOCENTE_CESADO,
        );
      });
    });
  });

  describe("reactivar", () => {
    it("reactiva un docente cesado cuando la persona no tiene estudiante vigente", async () => {
      repository.findById.mockResolvedValue({ ...mockDocente, estado: "cesado" });
      repository.reactivar.mockResolvedValue(mockDocente);

      const result = await service.reactivar("doc-1", "admin-1");

      expect(result.docente.estado).toBe("activo");
      expect(repository.reactivar).toHaveBeenCalledWith("doc-1", "admin-1");
    });

    it("rechaza reactivar si la persona tiene ficha de estudiante vigente", async () => {
      repository.findById.mockResolvedValue({ ...mockDocente, estado: "cesado" });
      estudiantesRepository.findByPersonaId.mockResolvedValue({
        id: "est-1",
        codigo: "E-1",
        estado: "activo",
      } as Awaited<ReturnType<EstudiantesRepository["findByPersonaId"]>>);

      await expect(service.reactivar("doc-1", "admin-1")).rejects.toMatchObject({
        response: { code: "FICHA_ACADEMICA_ACTIVA" },
      });
      expect(repository.reactivar).not.toHaveBeenCalled();
    });

    it("rechaza reactivar un docente que no está cesado", async () => {
      repository.findById.mockResolvedValue(mockDocente);

      await expect(service.reactivar("doc-1", "admin-1")).rejects.toThrow(BadRequestException);
    });
  });

  describe("cesar: dependencias", () => {
    it("bloquea el cese si el docente tiene cursos en el año vigente", async () => {
      repository.findById.mockResolvedValue(mockDocente);
      repository.contarCargaVigente.mockResolvedValue(3);

      await expect(
        service.cesar("doc-1", { fechaCese: "2026-12-31" }, "admin-1"),
      ).rejects.toMatchObject({
        response: { code: "FICHA_CON_DEPENDENCIAS" },
      });
      expect(repository.cesar).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("debe actualizar datos de la ficha docente", async () => {
      repository.findById.mockResolvedValue(mockDocente);
      repository.update.mockResolvedValue({
        ...mockDocente,
        especialidad: "Física y Química",
      });

      const result = await service.update("doc-1", { especialidad: "Física y Química" }, "admin-1");

      expect(result.especialidad).toBe("Física y Química");
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "actualizar", tabla: "docentes" }),
      );
    });

    it("debe rechazar si la fecha de cese es anterior o igual a la de ingreso", async () => {
      repository.findById.mockResolvedValue(mockDocente);

      await expect(service.update("doc-1", { fechaCese: "2026-02-15" }, "admin-1")).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update("doc-1", { fechaCese: "2026-02-15" }, "admin-1")).rejects.toThrow(
        DOCENTE_MESSAGES.FECHA_CESE_INVALIDA,
      );
    });
  });

  describe("cesar", () => {
    it("debe cesar al docente y registrar auditoría", async () => {
      repository.findById.mockResolvedValue(mockDocente);
      repository.cesar.mockResolvedValue({
        docente: { ...mockDocente, estado: "cesado", fechaCese: "2026-12-31" },
        mantuvoCuentaActiva: false,
      });

      const result = await service.cesar(
        "doc-1",
        { fechaCese: "2026-12-31", motivo: "Término de contrato" },
        "admin-1",
      );

      expect(result.docente.estado).toBe("cesado");
      expect(result.message).toBe(DOCENTE_MESSAGES.CESADO_SUCCESS);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "actualizar", tabla: "docentes" }),
      );
    });

    it("debe indicar mensaje especial si mantuvo su cuenta activa por tener otras fichas", async () => {
      repository.findById.mockResolvedValue(mockDocente);
      repository.cesar.mockResolvedValue({
        docente: { ...mockDocente, estado: "cesado", fechaCese: "2026-12-31" },
        mantuvoCuentaActiva: true,
      });

      const result = await service.cesar("doc-1", { fechaCese: "2026-12-31" }, "admin-1");

      expect(result.message).toContain("cuenta sigue activa");
    });

    it("debe rechazar cesar a un docente que ya se encuentra cesado", async () => {
      repository.findById.mockResolvedValue({ ...mockDocente, estado: "cesado" });

      await expect(service.cesar("doc-1", { fechaCese: "2026-12-31" }, "admin-1")).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.cesar("doc-1", { fechaCese: "2026-12-31" }, "admin-1")).rejects.toThrow(
        DOCENTE_MESSAGES.ALREADY_CESADO,
      );
    });
  });
});
