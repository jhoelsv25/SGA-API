import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import {
  CreateCursoDto,
  CursoResponseDto,
  CursosRepository,
  CursosService,
  GradoResponseDto,
  GradosRepository,
  GradosService,
  PlanEstudioItemDto,
  PlanEstudiosRepository,
  PlanEstudiosService,
  UpdateCursoDto,
} from "@/features/plan-estudios";

describe("RF-006: Grados, Cursos y Plan de Estudios", () => {
  let mockAuditService: jest.Mocked<Partial<AuditService>>;

  beforeEach(() => {
    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };
  });

  describe("HU1: Grados", () => {
    let service: GradosService;
    let mockGradosRepo: jest.Mocked<Partial<GradosRepository>>;

    const mockGrados: GradoResponseDto[] = [
      {
        id: "g1",
        numero: 1,
        nombre: "1.° de secundaria",
        creadoEn: "2026-01-01",
        actualizadoEn: "2026-01-01",
      },
      {
        id: "g2",
        numero: 2,
        nombre: "2.° de secundaria",
        creadoEn: "2026-01-01",
        actualizadoEn: "2026-01-01",
      },
      {
        id: "g3",
        numero: 3,
        nombre: "3.° de secundaria",
        creadoEn: "2026-01-01",
        actualizadoEn: "2026-01-01",
      },
      {
        id: "g4",
        numero: 4,
        nombre: "4.° de secundaria",
        creadoEn: "2026-01-01",
        actualizadoEn: "2026-01-01",
      },
      {
        id: "g5",
        numero: 5,
        nombre: "5.° de secundaria",
        creadoEn: "2026-01-01",
        actualizadoEn: "2026-01-01",
      },
    ];

    beforeEach(() => {
      mockGradosRepo = {
        findAll: jest.fn().mockResolvedValue(mockGrados),
        findById: jest
          .fn()
          .mockImplementation((id: string) =>
            Promise.resolve(mockGrados.find((g) => g.id === id) || null),
          ),
        updateNombre: jest.fn().mockImplementation((id: string, nombre: string) => {
          const found = mockGrados.find((g) => g.id === id);
          if (!found) return Promise.resolve(null);
          return Promise.resolve({ ...found, nombre });
        }),
      };

      service = new GradosService(
        mockGradosRepo as unknown as GradosRepository,
        mockAuditService as unknown as AuditService,
      );
    });

    it("CP-RF006-01: debe listar los grados 1.° a 5.° en orden", async () => {
      const result = await service.findAll();
      expect(result).toHaveLength(5);
      expect(result[0].numero).toBe(1);
      expect(result[4].numero).toBe(5);
      expect(mockGradosRepo.findAll).toHaveBeenCalled();
    });

    it("CP-RF006-02: debe editar el nombre visible de un grado y registrar auditoría", async () => {
      const result = await service.update(
        "g5",
        { nombre: "5.° de secundaria (Promoción)" },
        "user-admin",
        "127.0.0.1",
      );
      expect(result.nombre).toBe("5.° de secundaria (Promoción)");
      expect(mockGradosRepo.updateNombre).toHaveBeenCalledWith(
        "g5",
        "5.° de secundaria (Promoción)",
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-admin",
          accion: "actualizar",
          tabla: "grados",
          registroId: "g5",
        }),
      );
    });

    it("CP-RF006-03: debe lanzar NotFoundException si el grado a editar no existe", async () => {
      await expect(
        service.update("inexistente", { nombre: "Nombre" }, "user-admin"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("HU2: Cursos", () => {
    let service: CursosService;
    let mockCursosRepo: jest.Mocked<Partial<CursosRepository>>;

    const mockCursoMat: CursoResponseDto = {
      id: "c-mat",
      codigo: "MAT",
      nombre: "Matemática",
      areaCurricular: "matematica",
      areaCurricularNombre: "Matemática",
      descripcion: "Área de Matemática",
      colorHex: "#2563EB",
      activo: true,
      eliminadoEn: null,
      creadoEn: "2026-01-01",
      actualizadoEn: "2026-01-01",
    };

    const mockCursoInactivo: CursoResponseDto = {
      id: "c-antiguo",
      codigo: "ANTIGUO",
      nombre: "Curso Antiguo",
      areaCurricular: "taller",
      areaCurricularNombre: "Taller",
      descripcion: null,
      colorHex: "#64748B",
      activo: false,
      eliminadoEn: "2026-02-01",
      creadoEn: "2026-01-01",
      actualizadoEn: "2026-02-01",
    };

    beforeEach(() => {
      mockCursosRepo = {
        findAll: jest.fn().mockResolvedValue([mockCursoMat, mockCursoInactivo]),
        findById: jest.fn().mockImplementation((id: string) => {
          if (id === "c-mat") return Promise.resolve(mockCursoMat);
          if (id === "c-antiguo") return Promise.resolve(mockCursoInactivo);
          return Promise.resolve(null);
        }),
        findByCodigo: jest.fn().mockImplementation((codigo: string) => {
          if (codigo.toUpperCase() === "MAT") return Promise.resolve(mockCursoMat);
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation((dto: CreateCursoDto) =>
          Promise.resolve({
            id: "c-new",
            codigo: dto.codigo,
            nombre: dto.nombre,
            areaCurricular: dto.areaCurricular,
            areaCurricularNombre: "Taller",
            descripcion: dto.descripcion ?? null,
            colorHex: dto.colorHex ?? null,
            activo: true,
            eliminadoEn: null,
            creadoEn: "2026-10-08",
            actualizadoEn: "2026-10-08",
          }),
        ),
        update: jest.fn().mockImplementation((_id: string, dto: UpdateCursoDto) =>
          Promise.resolve({
            ...mockCursoMat,
            ...(dto.nombre ? { nombre: dto.nombre } : {}),
            ...(dto.codigo ? { codigo: dto.codigo } : {}),
          }),
        ),
        softDelete: jest.fn().mockResolvedValue({
          ...mockCursoMat,
          activo: false,
          eliminadoEn: "2026-10-08T15:00:00Z",
        }),
        reactivate: jest.fn().mockResolvedValue({
          ...mockCursoInactivo,
          activo: true,
          eliminadoEn: null,
        }),
        hasCargaAcademicaAnioEnCurso: jest.fn().mockResolvedValue(false),
      };

      service = new CursosService(
        mockCursosRepo as unknown as CursosRepository,
        mockAuditService as unknown as AuditService,
      );
    });

    it("CP-RF006-04: debe crear un nuevo curso activo y registrar auditoría", async () => {
      const result = await service.create(
        {
          codigo: "TCOMP",
          nombre: "Taller de Computación",
          areaCurricular: "taller",
          colorHex: "#0284C7",
          descripcion: "Taller de ofimática y programación",
        },
        "user-admin",
        "127.0.0.1",
      );

      expect(result.id).toBe("c-new");
      expect(result.codigo).toBe("TCOMP");
      expect(result.activo).toBe(true);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-admin",
          accion: "crear",
          tabla: "cursos",
        }),
      );
    });

    it("CP-RF006-05: debe bloquear la creación si el código ya existe y mostrar 'Ya existe un curso con ese código.'", async () => {
      await expect(
        service.create(
          {
            codigo: "MAT",
            nombre: "Matemática Avanzada",
            areaCurricular: "matematica",
          },
          "user-admin",
        ),
      ).rejects.toThrow(new ConflictException("Ya existe un curso con ese código."));
    });

    it("CP-RF006-08: debe desactivar un curso sin carga académica en el año en curso", async () => {
      mockCursosRepo.hasCargaAcademicaAnioEnCurso = jest.fn().mockResolvedValue(false);

      const result = await service.desactivar("c-mat", "user-admin", "127.0.0.1");
      expect(result.activo).toBe(false);
      expect(mockCursosRepo.softDelete).toHaveBeenCalledWith("c-mat");
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-admin",
          accion: "actualizar",
          tabla: "cursos",
          registroId: "c-mat",
        }),
      );
    });

    it("CP-RF006-09: debe bloquear la desactivación si el curso tiene carga académica en el año en curso", async () => {
      mockCursosRepo.hasCargaAcademicaAnioEnCurso = jest.fn().mockResolvedValue(true);

      await expect(service.desactivar("c-mat", "user-admin")).rejects.toThrow(
        new ConflictException(
          "No se puede desactivar: el curso tiene carga académica en el año en curso.",
        ),
      );
      expect(mockCursosRepo.softDelete).not.toHaveBeenCalled();
    });

    it("CP-RF006-10: debe listar los cursos aplicando filtros de estado y búsqueda", async () => {
      const result = await service.findAll({ estado: "activo", areaCurricular: "matematica" });
      expect(result).toHaveLength(2);
      expect(mockCursosRepo.findAll).toHaveBeenCalledWith({
        estado: "activo",
        areaCurricular: "matematica",
      });
    });

    it("debe permitir reactivar un curso inactivo", async () => {
      const result = await service.reactivar("c-antiguo", "user-admin");
      expect(result.activo).toBe(true);
      expect(mockCursosRepo.reactivate).toHaveBeenCalledWith("c-antiguo");
    });
  });

  describe("HU3: Plan de Estudios", () => {
    let service: PlanEstudiosService;
    let mockPlanRepo: jest.Mocked<Partial<PlanEstudiosRepository>>;
    let mockGradosRepo: jest.Mocked<Partial<GradosRepository>>;
    let mockCursosRepo: jest.Mocked<Partial<CursosRepository>>;

    const mockGrado5: GradoResponseDto = {
      id: "g5",
      numero: 5,
      nombre: "5.° de secundaria",
      creadoEn: "2026-01-01",
      actualizadoEn: "2026-01-01",
    };

    const mockGrado4: GradoResponseDto = {
      id: "g4",
      numero: 4,
      nombre: "4.° de secundaria",
      creadoEn: "2026-01-01",
      actualizadoEn: "2026-01-01",
    };

    const mockCursoMat: CursoResponseDto = {
      id: "c-mat",
      codigo: "MAT",
      nombre: "Matemática",
      areaCurricular: "matematica",
      areaCurricularNombre: "Matemática",
      descripcion: null,
      colorHex: "#2563EB",
      activo: true,
      eliminadoEn: null,
      creadoEn: "2026-01-01",
      actualizadoEn: "2026-01-01",
    };

    const mockCursoIng: CursoResponseDto = {
      id: "c-ing",
      codigo: "ING",
      nombre: "Inglés",
      areaCurricular: "ingles",
      areaCurricularNombre: "Inglés",
      descripcion: null,
      colorHex: "#7C3AED",
      activo: true,
      eliminadoEn: null,
      creadoEn: "2026-01-01",
      actualizadoEn: "2026-01-01",
    };

    const mockCursoInactivo: CursoResponseDto = {
      id: "c-inactivo",
      codigo: "INACT",
      nombre: "Curso Inactivo",
      areaCurricular: "taller",
      areaCurricularNombre: "Taller",
      descripcion: null,
      colorHex: "#64748B",
      activo: false,
      eliminadoEn: "2026-01-01",
      creadoEn: "2026-01-01",
      actualizadoEn: "2026-01-01",
    };

    const mockPlanItemMat: PlanEstudioItemDto = {
      id: "plan-1",
      gradoId: "g5",
      cursoId: "c-mat",
      horasSemanales: 6,
      activo: true,
      curso: mockCursoMat,
    };

    beforeEach(() => {
      mockGradosRepo = {
        findById: jest.fn().mockImplementation((id: string) => {
          if (id === "g5") return Promise.resolve(mockGrado5);
          if (id === "g4") return Promise.resolve(mockGrado4);
          return Promise.resolve(null);
        }),
      };

      mockCursosRepo = {
        findById: jest.fn().mockImplementation((id: string) => {
          if (id === "c-mat") return Promise.resolve(mockCursoMat);
          if (id === "c-ing") return Promise.resolve(mockCursoIng);
          if (id === "c-inactivo") return Promise.resolve(mockCursoInactivo);
          return Promise.resolve(null);
        }),
      };

      mockPlanRepo = {
        findByGradoId: jest.fn().mockImplementation((gradoId: string) => {
          if (gradoId === "g5") return Promise.resolve([mockPlanItemMat]);
          if (gradoId === "g4") {
            return Promise.resolve([
              mockPlanItemMat,
              {
                id: "plan-2",
                gradoId: "g4",
                cursoId: "c-ing",
                horasSemanales: 4,
                activo: true,
                curso: mockCursoIng,
              },
            ]);
          }
          return Promise.resolve([]);
        }),
        findById: jest.fn().mockImplementation((id: string) => {
          if (id === "plan-1") return Promise.resolve(mockPlanItemMat);
          return Promise.resolve(null);
        }),
        findByGradoAndCurso: jest.fn().mockImplementation((gradoId: string, cursoId: string) => {
          if (gradoId === "g5" && cursoId === "c-mat") return Promise.resolve(mockPlanItemMat);
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation((gradoId: string, cursoId: string, horas: number) =>
          Promise.resolve({
            id: "plan-new",
            gradoId,
            cursoId,
            horasSemanales: horas,
            activo: true,
            curso: mockCursoIng,
          }),
        ),
        updateHoras: jest.fn().mockImplementation((_id: string, horas: number) =>
          Promise.resolve({
            ...mockPlanItemMat,
            horasSemanales: horas,
          }),
        ),
        delete: jest.fn().mockResolvedValue(true),
        hasCargaAcademicaEnGrado: jest.fn().mockResolvedValue(false),
        copyPlan: jest.fn().mockResolvedValue([
          mockPlanItemMat,
          {
            id: "plan-copiado-2",
            gradoId: "g5",
            cursoId: "c-ing",
            horasSemanales: 4,
            activo: true,
            curso: mockCursoIng,
          },
        ]),
      };

      service = new PlanEstudiosService(
        mockPlanRepo as unknown as PlanEstudiosRepository,
        mockGradosRepo as unknown as GradosRepository,
        mockCursosRepo as unknown as CursosRepository,
        mockAuditService as unknown as AuditService,
      );
    });

    it("CP-RF006-11: debe agregar un curso con 6 horas al plan de estudios y actualizar el total", async () => {
      const result = await service.addCurso(
        "g5",
        { cursoId: "c-ing", horasSemanales: 6 },
        "user-admin",
        "127.0.0.1",
      );

      expect(result.id).toBe("plan-new");
      expect(result.horasSemanales).toBe(6);
      expect(mockPlanRepo.create).toHaveBeenCalledWith("g5", "c-ing", 6);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-admin",
          accion: "crear",
          tabla: "plan_estudios",
        }),
      );
    });

    it("CP-RF006-12: debe bloquear si el curso ya está en el plan del grado y mostrar 'El curso ya está en el plan de estudios de este grado.'", async () => {
      await expect(
        service.addCurso("g5", { cursoId: "c-mat", horasSemanales: 4 }, "user-admin"),
      ).rejects.toThrow(
        new ConflictException("El curso ya está en el plan de estudios de este grado."),
      );
      expect(mockPlanRepo.create).not.toHaveBeenCalled();
    });

    it("CP-RF006-13: debe impedir guardar si horas semanales <= 0 y mostrar 'Las horas semanales deben ser mayores que 0.'", async () => {
      await expect(
        service.addCurso("g5", { cursoId: "c-ing", horasSemanales: 0 }, "user-admin"),
      ).rejects.toThrow(new BadRequestException("Las horas semanales deben ser mayores que 0."));

      await expect(
        service.updateHoras("plan-1", { horasSemanales: -2 }, "user-admin"),
      ).rejects.toThrow(new BadRequestException("Las horas semanales deben ser mayores que 0."));
    });

    it("CP-RF006-14: debe copiar el plan de estudios desde otro grado con mensaje oficial", async () => {
      // Mock grado destino vacío
      mockPlanRepo.findByGradoId = jest.fn().mockImplementation((gradoId: string) => {
        if (gradoId === "g4") {
          return Promise.resolve([
            mockPlanItemMat,
            {
              id: "plan-2",
              gradoId: "g4",
              cursoId: "c-ing",
              horasSemanales: 4,
              activo: true,
              curso: mockCursoIng,
            },
          ]);
        }
        return Promise.resolve([]); // destino inicialmente vacío
      });

      const result = await service.copyPlan("g4", "g5", "user-admin", "127.0.0.1");

      expect(result.mensaje).toBe(
        "Se copió el plan de estudios. Revise las horas antes de guardar.",
      );
      expect(result.totalHoras).toBe(10);
      expect(result.cursos).toHaveLength(2);
      expect(mockPlanRepo.copyPlan).toHaveBeenCalledWith("g4", "g5");
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: "crear",
          tabla: "plan_estudios",
        }),
      );
    });

    it("CP-RF006-15: debe quitar un curso sin uso del plan de estudios", async () => {
      mockPlanRepo.hasCargaAcademicaEnGrado = jest.fn().mockResolvedValue(false);

      const result = await service.removeCurso("plan-1", "user-admin", "127.0.0.1");
      expect(result.success).toBe(true);
      expect(mockPlanRepo.delete).toHaveBeenCalledWith("plan-1");
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: "eliminar",
          tabla: "plan_estudios",
          registroId: "plan-1",
        }),
      );
    });

    it("CP-RF006-16: debe bloquear quitar curso si tiene carga académica en secciones de ese grado", async () => {
      mockPlanRepo.hasCargaAcademicaEnGrado = jest.fn().mockResolvedValue(true);

      await expect(service.removeCurso("plan-1", "user-admin")).rejects.toThrow(
        new ConflictException(
          "No se puede quitar: el curso tiene carga académica en secciones de este grado.",
        ),
      );
      expect(mockPlanRepo.delete).not.toHaveBeenCalled();
    });

    it("CP-RF006-17: debe impedir agregar un curso inactivo al plan de estudios", async () => {
      await expect(
        service.addCurso("g5", { cursoId: "c-inactivo", horasSemanales: 2 }, "user-admin"),
      ).rejects.toThrow(new BadRequestException("El curso no existe o se encuentra inactivo."));
      expect(mockPlanRepo.create).not.toHaveBeenCalled();
    });

    it("debe calcular correctamente el total acumulado de horas del plan del grado", async () => {
      const plan = await service.getPlanByGrado("g4");
      expect(plan.totalHoras).toBe(10);
      expect(plan.cursos).toHaveLength(2);
    });
  });
});
