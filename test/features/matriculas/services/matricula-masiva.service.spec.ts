import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "@/common/services/audit.service";
import { MatriculasRepository } from "@/features/matriculas/repositories";
import { MatriculaMasivaService } from "@/features/matriculas/services";

describe("MatriculaMasivaService (RF-009: HU2 Matrícula masiva de continuadores)", () => {
  let service: MatriculaMasivaService;
  let repo: jest.Mocked<MatriculasRepository>;
  let audit: jest.Mocked<AuditService>;

  const mockSeccionDestino = {
    id: "sec-dest",
    anioAcademicoId: "anio-2027",
    anioNumero: 2027,
    gradoId: "grado-5",
    gradoNumero: 5,
    gradoNombre: "5.° de Secundaria",
    nombre: "A",
    vacantes: 2, // Solo 2 vacantes disponibles para probar el corte
    estado: "activa",
    matriculadosCount: 0,
    vacantesDisponibles: 2,
  };

  const mockEstudiantesCulminados = [
    {
      id: "est-1",
      personaId: "per-1",
      codigo: "EST-001",
      estado: "activo",
      nombres: "Ana",
      apellidoPaterno: "Zapata",
      apellidoMaterno: "Diaz",
      tipoDocumento: "dni",
      numeroDocumento: "70111111",
    },
    {
      id: "est-2",
      personaId: "per-2",
      codigo: "EST-002",
      estado: "activo",
      nombres: "Carlos",
      apellidoPaterno: "Alvarez",
      apellidoMaterno: "Ruiz",
      tipoDocumento: "dni",
      numeroDocumento: "70222222",
    },
    {
      id: "est-3",
      personaId: "per-3",
      codigo: "EST-003",
      estado: "activo",
      nombres: "Bernardo",
      apellidoPaterno: "Castro",
      apellidoMaterno: "Mendoza",
      tipoDocumento: "dni",
      numeroDocumento: "70333333",
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRepo = {
      findSeccionById: jest.fn().mockResolvedValue(mockSeccionDestino),
      findAnioById: jest
        .fn()
        .mockResolvedValue({ id: "anio-2027", anio: 2027, estado: "planificado" }),
      obtenerEstudiantesCulminadosSeccion: jest.fn().mockResolvedValue(mockEstudiantesCulminados),
      findMatriculaByEstudianteYAnio: jest.fn().mockResolvedValue(null),
      getNextCorrelativo: jest.fn().mockResolvedValue(1),
      create: jest.fn().mockResolvedValue("mat-new-id"),
      findMatriculaById: jest.fn().mockResolvedValue({
        id: "mat-new-id",
        codigo: "2027-000001",
        fechaMatricula: "2027-03-01",
        tipo: "continuador",
        estado: "matriculado",
        esRepitente: false,
        anioAcademicoId: "anio-2027",
        anioNumero: 2027,
        gradoId: "grado-5",
        gradoNumero: 5,
        gradoNombre: "5.° de Secundaria",
        seccionId: "sec-dest",
        seccionNombre: "A",
        estudiante: {
          id: "est-2",
          codigo: "EST-002",
          nombres: "Carlos",
          apellidos: "Alvarez Ruiz",
          tipoDocumento: "dni",
          numeroDocumento: "70222222",
          estado: "activo",
        },
        creadoEn: "2027-03-01T00:00:00Z",
      }),
    };

    const mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatriculaMasivaService,
        { provide: MatriculasRepository, useValue: mockRepo },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<MatriculaMasivaService>(MatriculaMasivaService);
    repo = module.get(MatriculasRepository);
    audit = module.get(AuditService);
  });

  it("debe rechazar si la sección destino no está activa", async () => {
    repo.findSeccionById.mockResolvedValueOnce(null);

    await expect(
      service.matricularMasivamente(
        { seccionOrigenId: "sec-orig", seccionDestinoId: "sec-dest" },
        "user-1",
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("debe ordenar alfabéticamente y cortar por vacantes disponibles", async () => {
    // Tenemos 3 estudiantes: Alvarez, Castro, Zapata
    // Las vacantes son 2
    // Deben matricularse Alvarez y Castro; Zapata debe quedar fuera por falta de vacantes
    const res = await service.matricularMasivamente(
      { seccionOrigenId: "sec-orig", seccionDestinoId: "sec-dest" },
      "user-1",
    );

    expect(res.totalMatriculados).toBe(2);
    expect(res.totalNoMatriculados).toBe(1);
    expect(res.noMatriculados[0].estudianteNombre).toContain("Zapata");
    expect(res.noMatriculados[0].motivo).toContain("falta de vacantes");
    expect(audit.log).toHaveBeenCalled();
  });

  it("debe excluir estudiantes que ya tienen matrícula en el año", async () => {
    // Si Alvarez ya está matriculado
    repo.findMatriculaByEstudianteYAnio.mockImplementation((estId) => {
      if (estId === "est-2") {
        return Promise.resolve({
          id: "mat-existente",
          codigo: "2027-000099",
          estado: "matriculado",
        });
      }
      return Promise.resolve(null);
    });

    const res = await service.matricularMasivamente(
      { seccionOrigenId: "sec-orig", seccionDestinoId: "sec-dest" },
      "user-1",
    );

    expect(res.noMatriculados.some((n) => n.estudianteId === "est-2")).toBe(true);
  });

  it("debe registrar esRepitente cuando se especifica en matrícula masiva", async () => {
    await service.matricularMasivamente(
      {
        seccionOrigenId: "sec-orig",
        seccionDestinoId: "sec-dest",
        estudianteIds: ["est-2"],
        esRepitente: true,
      },
      "user-1",
    );

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        estudianteId: "est-2",
        esRepitente: true,
      }),
    );
  });
});
