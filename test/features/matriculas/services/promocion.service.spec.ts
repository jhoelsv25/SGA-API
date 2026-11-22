import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "@/common/services/audit.service";
import { MatriculasRepository } from "@/features/matriculas/repositories";
import { PromocionService } from "@/features/matriculas/services";

describe("PromocionService (Cierre de año, vista previa y egreso de 5.° grado)", () => {
  let service: PromocionService;
  let repo: jest.Mocked<MatriculasRepository>;
  let audit: jest.Mocked<AuditService>;

  const seccion1A = {
    id: "sec-1a-2025",
    anioAcademicoId: "anio-2025",
    anioNumero: 2025,
    gradoId: "grado-1",
    gradoNumero: 1,
    gradoNombre: "1.° de Secundaria",
    nombre: "A",
    vacantes: 30,
    estado: "activa",
    matriculadosCount: 0,
    vacantesDisponibles: 30,
  };

  const seccion2A = {
    id: "sec-2a-2026",
    anioAcademicoId: "anio-2026",
    anioNumero: 2026,
    gradoId: "grado-2",
    gradoNumero: 2,
    gradoNombre: "2.° de Secundaria",
    nombre: "A",
    vacantes: 2,
    estado: "activa",
    matriculadosCount: 0,
    vacantesDisponibles: 2,
  };

  const seccion5A = {
    id: "sec-5a-2025",
    anioAcademicoId: "anio-2025",
    anioNumero: 2025,
    gradoId: "grado-5",
    gradoNumero: 5,
    gradoNombre: "5.° de Secundaria",
    nombre: "A",
    vacantes: 30,
    estado: "activa",
    matriculadosCount: 0,
    vacantesDisponibles: 30,
  };

  const estudiantesBase = [
    {
      id: "est-1",
      personaId: "per-1",
      codigo: "EST-001",
      estado: "activo",
      nombres: "Ana",
      apellidoPaterno: "Zapata",
      apellidoMaterno: "Díaz",
      tipoDocumento: "dni",
      numeroDocumento: "70111111",
    },
    {
      id: "est-2",
      personaId: "per-2",
      codigo: "EST-002",
      estado: "activo",
      nombres: "Carlos",
      apellidoPaterno: "Álvarez",
      apellidoMaterno: "Ruiz",
      tipoDocumento: "dni",
      numeroDocumento: "70222222",
    },
    {
      id: "est-3",
      personaId: "per-3",
      codigo: "EST-003",
      estado: "retirado",
      nombres: "Luis",
      apellidoPaterno: "Castro",
      apellidoMaterno: "Mendoza",
      tipoDocumento: "dni",
      numeroDocumento: "70333333",
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRepo = {
      findSeccionById: jest.fn(),
      findAnioById: jest
        .fn()
        .mockResolvedValue({ id: "anio-2026", anio: 2026, estado: "planificado" }),
      obtenerEstudiantesCulminadosSeccion: jest.fn().mockResolvedValue(estudiantesBase),
      findMatriculaByEstudianteYAnio: jest.fn().mockResolvedValue(null),
      actualizarEstadoEstudiante: jest.fn().mockResolvedValue(undefined),
      egresarEstudianteYDesactivarCredenciales: jest.fn().mockResolvedValue(undefined),
      obtenerResumenPromocionPorAnio: jest.fn().mockResolvedValue([]),
    };

    const mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromocionService,
        { provide: MatriculasRepository, useValue: mockRepo },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get(PromocionService);
    repo = module.get(MatriculasRepository);
    audit = module.get(AuditService);
  });

  describe("previewPromocion", () => {
    it("lista estudiantes elegibles ordenados alfabéticamente y separa no elegibles", async () => {
      repo.findSeccionById.mockResolvedValueOnce(seccion1A).mockResolvedValueOnce(seccion2A);
      repo.findMatriculaByEstudianteYAnio.mockImplementation((id) =>
        id === "est-1"
          ? Promise.resolve({ id: "mat-1", codigo: "2026-000001", estado: "matriculado" })
          : Promise.resolve(null),
      );

      const res = await service.previewPromocion({
        seccionOrigenId: seccion1A.id,
        seccionDestinoId: seccion2A.id,
      });

      expect(res.totalAPromover).toBe(1);
      expect(res.aPromover[0].estudianteId).toBe("est-2");
      expect(res.totalNoPromovidos).toBe(2);
      expect(res.sinVacantes).toBe(0);
    });

    it("calcula sinVacantes cuando los elegibles superan el aforo disponible", async () => {
      repo.findSeccionById
        .mockResolvedValueOnce(seccion1A)
        .mockResolvedValueOnce({ ...seccion2A, vacantesDisponibles: 1 });
      repo.obtenerEstudiantesCulminadosSeccion.mockResolvedValue([
        estudiantesBase[0],
        estudiantesBase[1],
      ]);

      const res = await service.previewPromocion({
        seccionOrigenId: seccion1A.id,
        seccionDestinoId: seccion2A.id,
      });

      expect(res.totalAPromover).toBe(2);
      expect(res.sinVacantes).toBe(1);
    });
  });

  describe("previewEgreso y egresarSeccion (5.° grado)", () => {
    it("rechaza egresar una sección que no es de 5.° grado", async () => {
      repo.findSeccionById.mockResolvedValue(seccion1A);

      await expect(service.previewEgreso({ seccionId: seccion1A.id })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.egresarSeccion({ seccionId: seccion1A.id }, "admin-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("devuelve la vista previa de egreso separando activos y ya egresados/no activos", async () => {
      repo.findSeccionById.mockResolvedValue(seccion5A);
      repo.obtenerEstudiantesCulminadosSeccion.mockResolvedValue([
        estudiantesBase[0],
        { ...estudiantesBase[1], estado: "egresado" },
        estudiantesBase[2],
      ]);

      const res = await service.previewEgreso({ seccionId: seccion5A.id });

      expect(res.totalAEgresar).toBe(1);
      expect(res.aEgresar[0].estudianteId).toBe("est-1");
      expect(res.totalNoEgresables).toBe(2);
    });

    it("egresa únicamente los estudiantes seleccionados permitiendo excluir repitentes", async () => {
      repo.findSeccionById.mockResolvedValue(seccion5A);
      repo.obtenerEstudiantesCulminadosSeccion.mockResolvedValue([
        estudiantesBase[0],
        estudiantesBase[1],
      ]);

      const res = await service.egresarSeccion(
        { seccionId: seccion5A.id, estudianteIds: ["est-2"] },
        "admin-1",
        "127.0.0.1",
      );

      expect(res.totalEgresados).toBe(1);
      expect(res.egresados[0].estudianteId).toBe("est-2");
      expect(repo.egresarEstudianteYDesactivarCredenciales).toHaveBeenCalledTimes(1);
      expect(repo.egresarEstudianteYDesactivarCredenciales).toHaveBeenCalledWith("est-2");
      const [entrada] = audit.log.mock.calls[0];
      expect(entrada.tabla).toBe("estudiantes");
      expect(entrada.valorNuevo).toMatchObject({ accion: "egreso_masivo", totalEgresados: 1 });
    });
  });

  describe("obtenerResumenPromocion", () => {
    it("agrega totales persistidos por sección del año de origen", async () => {
      repo.obtenerResumenPromocionPorAnio.mockResolvedValue([
        {
          seccionId: "sec-1a-2025",
          gradoNumero: 1,
          gradoNombre: "1.° de Secundaria",
          nombre: "A",
          totalCulminados: 28,
          yaMatriculadosDestino: 26,
          yaEgresados: 0,
          pendientes: 2,
        },
        {
          seccionId: "sec-5a-2025",
          gradoNumero: 5,
          gradoNombre: "5.° de Secundaria",
          nombre: "A",
          totalCulminados: 25,
          yaMatriculadosDestino: 0,
          yaEgresados: 24,
          pendientes: 1,
        },
      ]);

      const res = await service.obtenerResumenPromocion({
        anioOrigenId: "anio-2025",
        anioDestinoId: "anio-2026",
      });

      expect(res.totalCulminados).toBe(53);
      expect(res.totalMatriculadosDestino).toBe(26);
      expect(res.totalEgresados).toBe(24);
      expect(res.totalPendientes).toBe(3);
      expect(res.secciones).toHaveLength(2);
    });
  });
});
