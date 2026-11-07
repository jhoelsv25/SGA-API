import { BadRequestException, NotFoundException } from "@nestjs/common";
import { getQueueToken } from "@nestjs/bullmq";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "@/common/services/audit.service";
import { QUEUES } from "@/core/queues/queues.constants";
import { ApoderadosService } from "@/features/apoderados/apoderados.service";
import { DocentesService } from "@/features/docentes/docentes.service";
import type { CreateDocenteResponseDto, DocenteResponseDto } from "@/features/docentes/dto";
import { DocentesRepository } from "@/features/docentes/repositories/docentes.repository";
import { EstudiantesService } from "@/features/estudiantes/estudiantes.service";
import type {
  CreateEstudianteResponseDto,
  EstudianteResponseDto,
} from "@/features/estudiantes/dto";
import { EstudiantesRepository } from "@/features/estudiantes/repositories/estudiantes.repository";
import type { PersonaResponseDto } from "@/features/personas/dto";
import { PersonasService } from "@/features/personas/personas.service";
import { PersonasRepository } from "@/features/personas/repositories/personas.repository";
import { TIPO_IMPORTACION } from "@/features/importacion/constants";
import { ImportacionService } from "@/features/importacion/importacion.service";
import {
  ApoderadosImportService,
  DocentesImportService,
  EstudiantesImportService,
  PersonasImportService,
} from "@/features/importacion/services";

describe("ImportacionService", () => {
  let service: ImportacionService;
  let personasRepo: jest.Mocked<PersonasRepository>;
  let personasService: jest.Mocked<PersonasService>;
  let estudiantesRepo: jest.Mocked<EstudiantesRepository>;
  let estudiantesService: jest.Mocked<EstudiantesService>;
  let docentesRepo: jest.Mocked<DocentesRepository>;
  let docentesService: jest.Mocked<DocentesService>;
  let _apoderadosService: jest.Mocked<ApoderadosService>;
  let auditService: jest.Mocked<AuditService>;
  let mockQueue: { add: jest.Mock; getJob: jest.Mock };

  beforeEach(async () => {
    const mockPersonasRepo = {
      findByDocumento: jest.fn(),
      findByCorreo: jest.fn(),
    };

    const mockPersonasService = {
      create: jest.fn(),
    };

    const mockEstudiantesRepo = {
      findByCodigo: jest.fn(),
      findByPersonaId: jest.fn(),
    };

    const mockEstudiantesService = {
      create: jest.fn(),
    };

    const mockDocentesRepo = {
      findByCodigo: jest.fn(),
      findByPersonaId: jest.fn(),
    };

    const mockDocentesService = {
      create: jest.fn(),
    };

    const mockApoderadosService = {
      create: jest.fn(),
      findAll: jest.fn(),
    };

    const mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: "job-101" }),
      getJob: jest.fn().mockResolvedValue({
        id: "job-101",
        getState: jest.fn().mockResolvedValue("completed"),
        progress: 100,
        returnvalue: {
          importadosCount: 1,
          omitidosCount: 0,
          mensaje: "Importación masiva completada con éxito.",
          credenciales: [],
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportacionService,
        PersonasImportService,
        EstudiantesImportService,
        DocentesImportService,
        ApoderadosImportService,
        { provide: PersonasRepository, useValue: mockPersonasRepo },
        { provide: PersonasService, useValue: mockPersonasService },
        { provide: EstudiantesRepository, useValue: mockEstudiantesRepo },
        { provide: EstudiantesService, useValue: mockEstudiantesService },
        { provide: DocentesRepository, useValue: mockDocentesRepo },
        { provide: DocentesService, useValue: mockDocentesService },
        { provide: ApoderadosService, useValue: mockApoderadosService },
        { provide: AuditService, useValue: mockAudit },
        { provide: getQueueToken(QUEUES.IMPORTACION), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<ImportacionService>(ImportacionService);
    personasRepo = module.get(PersonasRepository);
    personasService = module.get(PersonasService);
    estudiantesRepo = module.get(EstudiantesRepository);
    estudiantesService = module.get(EstudiantesService);
    docentesRepo = module.get(DocentesRepository);
    docentesService = module.get(DocentesService);
    _apoderadosService = module.get(ApoderadosService);
    auditService = module.get(AuditService);
  });

  describe("previsualizar", () => {
    it("debe rechazar lote vacío", async () => {
      await expect(
        service.previsualizar({ tipo: TIPO_IMPORTACION.ESTUDIANTES, filas: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it("debe rechazar lote con más de 500 filas", async () => {
      const filas = Array.from({ length: 501 }, (_, i) => ({
        tipoDocumento: "dni",
        numeroDocumento: `1234567${i}`,
      }));
      await expect(
        service.previsualizar({ tipo: TIPO_IMPORTACION.ESTUDIANTES, filas }),
      ).rejects.toThrow(BadRequestException);
    });

    it("debe clasificar filas válidas, con error de documento y duplicados en estudiantes", async () => {
      estudiantesRepo.findByCodigo.mockResolvedValue(null);
      personasRepo.findByDocumento.mockResolvedValue(null);

      const filas = [
        {
          tipoDocumento: "dni",
          numeroDocumento: "12345678",
          apellidoPaterno: "Pérez",
          apellidoMaterno: "Gómez",
          nombres: "Juan",
          sexo: "M",
          fechaNacimiento: "2010-05-10",
          codigoSiagie: "SIAGIE001",
          fechaIngreso: "2026-03-01",
        },
        {
          tipoDocumento: "dni",
          numeroDocumento: "123",
          apellidoPaterno: "Soto",
          nombres: "Ana",
          sexo: "F",
          codigoSiagie: "SIAGIE002",
        },
        {
          tipoDocumento: "dni",
          numeroDocumento: "87654321",
          apellidoPaterno: "Torres",
          nombres: "Carlos",
          sexo: "M",
          codigoSiagie: "SIAGIE001",
        },
      ];

      const resultado = await service.previsualizar({
        tipo: TIPO_IMPORTACION.ESTUDIANTES,
        filas,
      });

      expect(resultado.totalFilas).toBe(3);
      expect(resultado.validasCount).toBe(1);
      expect(resultado.erroresCount).toBe(2);
      expect(resultado.filas[0].estado).toBe("valida");
      expect(resultado.filas[1].estado).toBe("error");
      expect(resultado.filas[2].estado).toBe("error");
      expect(resultado.filas[2].mensaje).toContain("Código SIAGIE duplicado");
    });

    it("debe detectar si el estudiante ya está registrado y marcarlo como omitido", async () => {
      estudiantesRepo.findByCodigo.mockResolvedValue({
        id: "est-1",
        codigoSiagie: "SIAGIE999",
      } as unknown as EstudianteResponseDto);

      const filas = [
        {
          tipoDocumento: "dni",
          numeroDocumento: "70123456",
          apellidoPaterno: "Luna",
          nombres: "Raúl",
          sexo: "M",
          codigoSiagie: "SIAGIE999",
        },
      ];

      const resultado = await service.previsualizar({
        tipo: TIPO_IMPORTACION.ESTUDIANTES,
        filas,
      });

      expect(resultado.omitidasCount).toBe(1);
      expect(resultado.filas[0].estado).toBe("ya_registrada");
    });

    it("debe detectar si el docente ya está registrado y marcarlo como omitido", async () => {
      docentesRepo.findByCodigo.mockResolvedValue({
        id: "doc-1",
        codigoDocente: "DOC-99",
      } as unknown as DocenteResponseDto);

      const filas = [
        {
          tipoDocumento: "dni",
          numeroDocumento: "40123456",
          apellidoPaterno: "Ramos",
          nombres: "Luis",
          sexo: "M",
          codigoDocente: "DOC-99",
        },
      ];

      const resultado = await service.previsualizar({
        tipo: TIPO_IMPORTACION.DOCENTES,
        filas,
      });

      expect(resultado.omitidasCount).toBe(1);
      expect(resultado.filas[0].estado).toBe("ya_registrada");
    });

    it("debe validar apoderados y alertar si el estudiante no existe", async () => {
      estudiantesRepo.findByCodigo.mockResolvedValue(null);

      const filas = [
        {
          codigoSiagieEstudiante: "SIAGIE_NO_EXISTE",
          parentesco: "madre",
          esPrincipal: "SI",
          tipoDocumento: "dni",
          numeroDocumento: "45678912",
          apellidoPaterno: "Mamani",
          nombres: "Rosa",
          sexo: "F",
        },
      ];

      const resultado = await service.previsualizar({
        tipo: TIPO_IMPORTACION.APODERADOS,
        filas,
      });

      expect(resultado.erroresCount).toBe(1);
      expect(resultado.filas[0].mensaje).toContain("No existe un estudiante con ese código SIAGIE");
    });
  });

  describe("ejecutar", () => {
    it("debe encolar el trabajo en BullMQ y retornar jobId con estado en_cola", async () => {
      const filas = [
        {
          numeroFila: 2,
          tipoDocumento: "dni",
          numeroDocumento: "76543210",
          apellidoPaterno: "Vargas",
          apellidoMaterno: "Salas",
          nombres: "Pedro",
          sexo: "M",
          fechaNacimiento: "2012-08-15",
          codigoSiagie: "SIAGIE777",
        },
      ];

      const res = await service.ejecutar(
        { tipo: TIPO_IMPORTACION.ESTUDIANTES, filas },
        "user-admin-1",
        "127.0.0.1",
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        "procesar-lote",
        {
          dto: { tipo: TIPO_IMPORTACION.ESTUDIANTES, filas },
          actorId: "user-admin-1",
          ip: "127.0.0.1",
        },
        expect.objectContaining({
          attempts: 1,
          removeOnComplete: false,
        }),
      );
      expect(res.jobId).toBe("job-101");
      expect(res.estado).toBe("en_cola");
    });

    it("debe propagar el error directamente si la cola BullMQ falla al encolar", async () => {
      mockQueue.add.mockRejectedValueOnce(new Error("Redis connection refused"));

      await expect(
        service.ejecutar(
          {
            tipo: TIPO_IMPORTACION.ESTUDIANTES,
            filas: [{ tipoDocumento: "dni", numeroDocumento: "12345678" }],
          },
          "admin-1",
        ),
      ).rejects.toThrow("Redis connection refused");
    });

    it("debe consultar estado del trabajo en BullMQ correctamente", async () => {
      const estado = await service.consultarEstadoJob("job-101");
      expect(estado.jobId).toBe("job-101");
      expect(estado.estado).toBe("completado");
      expect(estado.progreso).toBe(100);
      expect(mockQueue.getJob).toHaveBeenCalledWith("job-101");
    });

    it("debe lanzar NotFoundException si el trabajo no existe en BullMQ", async () => {
      mockQueue.getJob.mockResolvedValueOnce(null);
      await expect(service.consultarEstadoJob("job-invalido")).rejects.toThrow(NotFoundException);
    });
  });

  describe("ejecutarProcesoLote (worker)", () => {
    it("debe procesar lote de estudiantes generando credencial y auditando", async () => {
      personasRepo.findByDocumento.mockResolvedValue(null);
      personasService.create.mockResolvedValue({
        id: "per-1",
        tipoDocumento: "dni",
        numeroDocumento: "76543210",
        nombres: "Pedro",
        apellidoPaterno: "Vargas",
        apellidoMaterno: "Salas",
      } as unknown as PersonaResponseDto);

      estudiantesService.create.mockResolvedValue({
        estudiante: {
          id: "est-1",
          personaId: "per-1",
          codigoSiagie: "SIAGIE777",
          persona: {
            nombreCompleto: "Pedro Vargas Salas",
          },
          usuario: {
            nombreUsuario: "76543210",
          },
        },
        credencial: {
          codigo: "CR-76543210-001",
          pin: "4321",
        },
      } as unknown as CreateEstudianteResponseDto);

      const filas = [
        {
          numeroFila: 2,
          tipoDocumento: "dni",
          numeroDocumento: "76543210",
          apellidoPaterno: "Vargas",
          apellidoMaterno: "Salas",
          nombres: "Pedro",
          sexo: "M",
          fechaNacimiento: "2012-08-15",
          codigoSiagie: "SIAGIE777",
        },
      ];

      const res = await service.ejecutarProcesoLote(
        { tipo: TIPO_IMPORTACION.ESTUDIANTES, filas },
        "user-admin-1",
        "127.0.0.1",
      );

      expect(res.importadosCount).toBe(1);
      expect(res.credenciales).toHaveLength(1);
      expect(res.credenciales[0].codigoCredencial).toBe("CR-76543210-001");
      expect(auditService.log).toHaveBeenCalled();
    });

    it("debe ejecutar importación de docentes generando credencial", async () => {
      personasRepo.findByDocumento.mockResolvedValue(null);
      docentesService.create.mockResolvedValue({
        docente: {
          id: "doc-1",
          personaId: "per-2",
          codigo: "DOC-2027",
          persona: {
            nombreCompleto: "Julia Méndez Díaz",
          },
          usuario: {
            nombreUsuario: "DOC-2027",
          },
        },
        credencial: {
          codigo: "CR-DOC-001",
          pin: "9876",
        },
      } as unknown as CreateDocenteResponseDto);

      const filas = [
        {
          tipoDocumento: "dni",
          numeroDocumento: "40556677",
          apellidoPaterno: "Méndez",
          nombres: "Julia",
          codigoDocente: "DOC-2027",
        },
      ];

      const res = await service.ejecutarProcesoLote(
        { tipo: TIPO_IMPORTACION.DOCENTES, filas },
        "user-admin-1",
        "127.0.0.1",
      );

      expect(res.importadosCount).toBe(1);
      expect(res.credenciales[0].tipoRol).toBe("Docente");
    });
  });

  describe("generarPlantillaExcel", () => {
    it("debe generar un Buffer Excel para cada tipo", async () => {
      for (const tipo of Object.values(TIPO_IMPORTACION)) {
        const buffer = await service.generarPlantillaExcel(tipo);
        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(buffer.length).toBeGreaterThan(100);
      }
    });
  });

  describe("generarReporteCredencialesExcel", () => {
    const ctx = { institucion: "Colegio", generadoPor: "admin" };
    it("debe lanzar NotFoundException si el trabajo no existe", async () => {
      mockQueue.getJob.mockResolvedValueOnce(null);

      await expect(service.generarReporteCredencialesExcel("job-inexistente", ctx)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("debe lanzar BadRequestException si el trabajo aún no ha finalizado", async () => {
      mockQueue.getJob.mockResolvedValueOnce({
        id: "job-101",
        getState: jest.fn().mockResolvedValue("active"),
      });

      await expect(service.generarReporteCredencialesExcel("job-101", ctx)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("debe generar un Buffer Excel válido cuando el trabajo está completed", async () => {
      mockQueue.getJob.mockResolvedValueOnce({
        id: "job-101",
        getState: jest.fn().mockResolvedValue("completed"),
        returnvalue: {
          importadosCount: 1,
          omitidosCount: 0,
          mensaje: "Éxito",
          credenciales: [
            {
              nombreCompleto: "Ana Soto",
              numeroDocumento: "76543210",
              tipoRol: "Estudiante",
              nombreUsuario: "SIAGIE001",
              tempPassword: "TempPassword123!",
              codigoCredencial: "CR-76543210",
              pin: "1234",
            },
          ],
        },
      });

      const buffer = await service.generarReporteCredencialesExcel("job-101", ctx);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(100);
    });
  });
});
