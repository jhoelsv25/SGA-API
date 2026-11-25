import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import { AuditService } from "@/common/services/audit.service";
import { AnioAcademicoResponseDto } from "@/features/anio-escolar/dto";
import { AniosAcademicosService } from "@/features/anio-escolar/anios.service";
import { GradoResponseDto, GradosService } from "@/features/grados";
import { DocenteResponseDto, DocentesRepository } from "@/features/docentes";
import {
  CreateSeccionDto,
  SeccionQueryDto,
  SeccionResponseDto,
  SeccionesRepository,
  SeccionesService,
  UpdateSeccionDto,
} from "@/features/secciones";

describe("RF-008: Secciones (HU1)", () => {
  let service: SeccionesService;
  let mockSeccionesRepo: jest.Mocked<Partial<SeccionesRepository>>;
  let mockGradosService: jest.Mocked<Partial<GradosService>>;
  let mockDocentesRepo: jest.Mocked<Partial<DocentesRepository>>;
  let mockAniosService: jest.Mocked<Partial<AniosAcademicosService>>;
  let mockAnioLectivoCls: jest.Mocked<Partial<AnioLectivoCls>>;
  let mockAuditService: jest.Mocked<Partial<AuditService>>;

  const mockAnio2027: AnioAcademicoResponseDto = {
    id: "anio-2027",
    anio: 2027,
    nombre: "Año Escolar 2027",
    fechaInicio: "2027-03-01",
    fechaFin: "2027-12-20",
    estado: "en_curso",
    reabiertoHasta: null,
    motivoReapertura: null,
    bimestres: [],
  };

  const mockGrado5: GradoResponseDto = {
    id: "grado-5",
    numero: 5,
    nombre: "5.° de secundaria",
    creadoEn: "2026-01-01",
    actualizadoEn: "2026-01-01",
  };

  const mockGrado4: GradoResponseDto = {
    id: "grado-4",
    numero: 4,
    nombre: "4.° de secundaria",
    creadoEn: "2026-01-01",
    actualizadoEn: "2026-01-01",
  };

  const mockDocentePerez: DocenteResponseDto = {
    id: "doc-perez",
    personaId: "per-perez",
    codigo: "DOC001",
    persona: {
      id: "per-perez",
      tipoDocumento: "dni",
      numeroDocumento: "10000001",
      nombres: "Juan",
      apellidoPaterno: "Pérez",
      apellidoMaterno: "Gómez",
      nombreCompleto: "Juan Pérez Gómez",
      sexo: "M",
      correo: "jperez@colegio.edu.pe",
      esProvisional: false,
      fichas: { esDocente: true, esEstudiante: false, esApoderado: false, tieneUsuario: true },
      creadoEn: "2020-03-01",
      actualizadoEn: "2020-03-01",
    },
    tipoContrato: "nombrado",
    jornadaHoras: 30,
    fechaIngreso: "2020-03-01",
    estado: "activo",
    creadoEn: "2020-03-01",
    actualizadoEn: "2020-03-01",
  };

  const mockDocenteInactivo: DocenteResponseDto = {
    id: "doc-inactivo",
    personaId: "per-inactivo",
    codigo: "DOC002",
    persona: {
      id: "per-inactivo",
      tipoDocumento: "dni",
      numeroDocumento: "10000002",
      nombres: "Carlos",
      apellidoPaterno: "Ramos",
      apellidoMaterno: "Ruiz",
      nombreCompleto: "Carlos Ramos Ruiz",
      sexo: "M",
      correo: "cramos@colegio.edu.pe",
      esProvisional: false,
      fichas: { esDocente: true, esEstudiante: false, esApoderado: false, tieneUsuario: false },
      creadoEn: "2021-03-01",
      actualizadoEn: "2025-12-31",
    },
    tipoContrato: "contratado",
    jornadaHoras: 30,
    fechaIngreso: "2021-03-01",
    fechaCese: "2025-12-31",
    estado: "cesado",
    creadoEn: "2021-03-01",
    actualizadoEn: "2025-12-31",
  };

  const mockSeccion5A: SeccionResponseDto = {
    id: "sec-5a",
    anioAcademicoId: "anio-2027",
    gradoId: "grado-5",
    gradoNumero: 5,
    gradoNombre: "5.° de secundaria",
    nombre: "A",
    aula: "Pab. B – 201",
    vacantes: 35,
    estado: "activa",
    tutor: {
      id: "doc-perez",
      codigo: "DOC001",
      nombreCompleto: "Juan Pérez Gómez",
    },
    matriculados: 0,
    totalCursos: 12,
    cursosSinDocente: 12,
  };

  beforeEach(() => {
    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    mockAnioLectivoCls = {
      id: jest.fn().mockReturnValue("anio-2027"),
    };

    mockAniosService = {
      findById: jest.fn().mockResolvedValue(mockAnio2027),
      findEnCurso: jest.fn().mockResolvedValue(mockAnio2027),
    };

    mockGradosService = {
      findById: jest.fn().mockImplementation((id: string) => {
        if (id === "grado-5") return Promise.resolve(mockGrado5);
        if (id === "grado-4") return Promise.resolve(mockGrado4);
        return Promise.reject(new NotFoundException("Grado no encontrado."));
      }),
    };

    mockDocentesRepo = {
      findById: jest.fn().mockImplementation((id: string) => {
        if (id === "doc-perez") return Promise.resolve(mockDocentePerez);
        if (id === "doc-inactivo") return Promise.resolve(mockDocenteInactivo);
        return Promise.resolve(null);
      }),
    };

    mockSeccionesRepo = {
      findById: jest.fn().mockImplementation((id: string) => {
        if (id === "sec-5a") return Promise.resolve(mockSeccion5A);
        return Promise.resolve(null);
      }),
      findAll: jest.fn().mockResolvedValue([mockSeccion5A]),
      findPorNombre: jest.fn().mockResolvedValue(null),
      tutorOcupado: jest.fn().mockResolvedValue(false),
      contarMatriculadosVigentes: jest.fn().mockResolvedValue(0),
      createConCarga: jest.fn().mockResolvedValue(mockSeccion5A),
      update: jest.fn().mockImplementation((_id: string, data: unknown) => {
        const cambios = data as Partial<SeccionResponseDto>;
        return Promise.resolve({
          ...mockSeccion5A,
          ...cambios,
        });
      }),
      cerrar: jest.fn().mockResolvedValue({
        ...mockSeccion5A,
        estado: "cerrada",
      }),
    };

    service = new SeccionesService(
      mockSeccionesRepo as unknown as SeccionesRepository,
      mockGradosService as unknown as GradosService,
      mockDocentesRepo as unknown as DocentesRepository,
      mockAniosService as unknown as AniosAcademicosService,
      mockAnioLectivoCls as unknown as AnioLectivoCls,
      mockAuditService as unknown as AuditService,
    );
  });

  describe("Creación de secciones", () => {
    it("CP-RF008-01: debe crear la sección activa y su carga académica con los cursos del plan sin docente", async () => {
      // Dado que el año 2027 está en curso y el plan de estudios de 5.° tiene 12 cursos
      const dto: CreateSeccionDto = {
        gradoId: "grado-5",
        nombre: "A",
        aula: "Pab. B – 201",
        vacantes: 35,
        tutorId: "doc-perez",
      };

      // Cuando creo la sección A de 5.° con aula "Pab. B – 201", 35 vacantes y tutor el docente Pérez
      const resultado = await service.create(dto, "user-admin", "192.168.1.10");

      // Entonces el sistema crea la sección activa y su carga académica con los 12 cursos sin docente
      expect(resultado.id).toBe("sec-5a");
      expect(resultado.estado).toBe("activa");
      expect(resultado.nombre).toBe("A");
      expect(resultado.vacantes).toBe(35);
      expect(resultado.tutor?.id).toBe("doc-perez");
      expect(resultado.totalCursos).toBe(12);
      expect(resultado.cursosSinDocente).toBe(12);

      expect(mockSeccionesRepo.createConCarga).toHaveBeenCalledWith(
        expect.objectContaining({
          anioAcademicoId: "anio-2027",
          gradoId: "grado-5",
          nombre: "A",
          aula: "Pab. B – 201",
          vacantes: 35,
          tutorId: "doc-perez",
        }),
      );

      // Y registra auditoría inmutable
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-admin",
          accion: "crear",
          tabla: "secciones",
          registroId: "sec-5a",
          direccionIp: "192.168.1.10",
        }),
      );
    });

    it("CP-RF008-02: debe bloquear el guardado si ya existe una sección con el mismo nombre en el grado y año", async () => {
      // Dado que ya existe 5.° A en 2027
      mockSeccionesRepo.findPorNombre = jest.fn().mockResolvedValue(mockSeccion5A);

      const dto: CreateSeccionDto = {
        gradoId: "grado-5",
        nombre: "A",
        vacantes: 30,
      };

      // Cuando intento crear otra 5.° A en 2027
      // Entonces el sistema bloquea el guardado y muestra "Ya existe la sección A de 5.° en este año."
      await expect(service.create(dto, "user-admin")).rejects.toThrow(
        new ConflictException("Ya existe la sección A de 5.° en este año."),
      );
      expect(mockSeccionesRepo.createConCarga).not.toHaveBeenCalled();
    });

    it("CP-RF008-03: debe impedir guardar si las vacantes son menores o iguales a 0", async () => {
      // Dado que estoy creando una sección con 0 vacantes
      const dtoConCero: CreateSeccionDto = {
        gradoId: "grado-5",
        nombre: "B",
        vacantes: 0,
      };

      // Cuando ingreso 0 vacantes
      // Entonces el sistema impide guardar y muestra "Las vacantes deben ser mayores que 0."
      await expect(service.create(dtoConCero, "user-admin")).rejects.toThrow(
        new BadRequestException("Las vacantes deben ser mayores que 0."),
      );

      // Con vacantes negativas también debe bloquearse
      const dtoNegativo: CreateSeccionDto = {
        gradoId: "grado-5",
        nombre: "B",
        vacantes: -5,
      };
      await expect(service.create(dtoNegativo, "user-admin")).rejects.toThrow(
        new BadRequestException("Las vacantes deben ser mayores que 0."),
      );

      expect(mockSeccionesRepo.createConCarga).not.toHaveBeenCalled();
    });

    it("CP-RF008-04: debe permitir asignar como tutor a un docente activo aunque ya tutele otra sección en el año", async () => {
      // Dado que el docente Pérez está activo y ya es tutor de 5.° A en 2027
      mockSeccionesRepo.tutorOcupado = jest.fn().mockResolvedValue(true);
      const creada = {
        ...mockSeccion5A,
        id: "sec-4b",
        gradoId: "grado-4",
        nombre: "B",
        tutor: { id: "doc-perez", codigo: "DOC001", nombreCompleto: "Pérez, Juan" },
      };
      mockSeccionesRepo.createConCarga = jest.fn().mockResolvedValue(creada);

      const dto: CreateSeccionDto = {
        gradoId: "grado-4",
        nombre: "B",
        vacantes: 30,
        tutorId: "doc-perez",
      };

      // Cuando lo asigno como tutor de 4.° B en 2027
      const resultado = await service.create(dto, "user-admin");

      // Entonces el sistema guarda 4.° B con el docente Pérez como tutor asignado
      expect(resultado.tutor?.id).toBe("doc-perez");
      expect(mockSeccionesRepo.createConCarga).toHaveBeenCalledWith(
        expect.objectContaining({ tutorId: "doc-perez" }),
      );
    });

    it("debe rechazar la asignación de un tutor que no se encuentre activo", async () => {
      // Dado un docente cesado o inactivo
      const dto: CreateSeccionDto = {
        gradoId: "grado-5",
        nombre: "B",
        vacantes: 30,
        tutorId: "doc-inactivo",
      };

      // Cuando intento asignarlo como tutor
      // Entonces el servidor lo rechaza con "Solo se pueden asignar docentes activos."
      await expect(service.create(dto, "user-admin")).rejects.toThrow(
        new BadRequestException("Solo se pueden asignar docentes activos."),
      );
      expect(mockSeccionesRepo.createConCarga).not.toHaveBeenCalled();
    });
  });

  describe("Cierre de secciones", () => {
    it("CP-RF008-05: debe bloquear el cierre si la sección tiene estudiantes matriculados vigentes", async () => {
      // Dado que 5.° C tiene estudiantes matriculados
      mockSeccionesRepo.contarMatriculadosVigentes = jest.fn().mockResolvedValue(28);

      // Cuando intento cerrarla
      // Entonces el sistema bloquea la acción y muestra "No se puede cerrar una sección con estudiantes matriculados."
      await expect(service.cerrar("sec-5a", "user-admin")).rejects.toThrow(
        new ConflictException("No se puede cerrar una sección con estudiantes matriculados."),
      );
      expect(mockSeccionesRepo.cerrar).not.toHaveBeenCalled();
    });

    it("debe permitir cerrar la sección si no tiene estudiantes matriculados y registrar auditoría", async () => {
      // Dado que la sección no tiene estudiantes matriculados
      mockSeccionesRepo.contarMatriculadosVigentes = jest.fn().mockResolvedValue(0);

      // Cuando cierro la sección
      const resultado = await service.cerrar("sec-5a", "user-admin", "192.168.1.20");

      // Entonces cambia el estado a cerrada
      expect(resultado.estado).toBe("cerrada");
      expect(mockSeccionesRepo.cerrar).toHaveBeenCalledWith("sec-5a");

      // Y registra auditoría
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-admin",
          accion: "actualizar",
          tabla: "secciones",
          registroId: "sec-5a",
          direccionIp: "192.168.1.20",
        }),
      );
    });
  });

  describe("Modificación y consultas de secciones", () => {
    it("debe actualizar los datos de una sección existente y auditar el cambio", async () => {
      const dtoUpdate: UpdateSeccionDto = {
        aula: "Pab. B – 202",
        vacantes: 38,
      };

      const resultado = await service.update("sec-5a", dtoUpdate, "user-admin", "192.168.1.15");

      expect(resultado.aula).toBe("Pab. B – 202");
      expect(resultado.vacantes).toBe(38);
      expect(mockSeccionesRepo.update).toHaveBeenCalledWith("sec-5a", dtoUpdate);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "user-admin",
          accion: "actualizar",
          tabla: "secciones",
          registroId: "sec-5a",
        }),
      );
    });

    it("debe lanzar NotFoundException si la sección no existe al buscar por id", async () => {
      mockSeccionesRepo.findById = jest.fn().mockResolvedValue(null);

      await expect(service.findById("sec-inexistente")).rejects.toThrow(NotFoundException);
    });

    it("debe listar las secciones aplicando los filtros recibidos", async () => {
      const query: SeccionQueryDto = { gradoId: "grado-5", estado: "activa" };
      const resultado = await service.findAll(query);

      expect(resultado).toHaveLength(1);
      expect(mockSeccionesRepo.findAll).toHaveBeenCalledWith("anio-2027", query);
    });
  });

  describe("Sección cerrada: solo consulta", () => {
    it("debe rechazar la edición de una sección cerrada", async () => {
      mockSeccionesRepo.findById = jest
        .fn()
        .mockResolvedValue({ ...mockSeccion5A, estado: "cerrada" });

      await expect(service.update("sec-5a", { vacantes: 20 }, "user-admin")).rejects.toThrow(
        "La sección está cerrada y solo admite consulta.",
      );
      expect(mockSeccionesRepo.update).not.toHaveBeenCalled();
    });
  });

  describe("Clonación automática de secciones (P-25)", () => {
    it("debe rechazar si el año de origen es el mismo que el año de destino", async () => {
      await expect(service.clonar({ anioOrigenId: "anio-2027" }, "user-admin")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("debe rechazar si el año de origen no existe", async () => {
      mockAniosService.findById = jest.fn().mockImplementation((id: string) => {
        if (id === "anio-2027") return Promise.resolve(mockAnio2027);
        return Promise.resolve(null);
      });

      await expect(
        service.clonar({ anioOrigenId: "anio-inexistente" }, "user-admin"),
      ).rejects.toThrow(NotFoundException);
    });

    it("debe rechazar si el año de origen no tiene secciones activas", async () => {
      mockAniosService.findById = jest.fn().mockResolvedValue(mockAnio2027);
      mockSeccionesRepo.findAll = jest.fn().mockResolvedValue([]);

      await expect(service.clonar({ anioOrigenId: "anio-2026" }, "user-admin")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("debe clonar secciones omitiendo duplicadas y asignando tutores si se solicita", async () => {
      const mockSeccion2026A: SeccionResponseDto = {
        ...mockSeccion5A,
        id: "sec-orig-a",
        anioAcademicoId: "anio-2026",
        nombre: "A",
        aula: "Aula 101",
        tutor: { id: "doc-perez", codigo: "DOC001", nombreCompleto: "Prof. Pérez" },
      };
      const mockSeccion2026B: SeccionResponseDto = {
        ...mockSeccion5A,
        id: "sec-orig-b",
        anioAcademicoId: "anio-2026",
        nombre: "B",
        aula: "Aula 102",
        tutor: null,
      };

      mockAniosService.findById = jest.fn().mockImplementation((id: string) => {
        if (id === "anio-2026")
          return Promise.resolve({ ...mockAnio2027, id: "anio-2026", anio: 2026 });
        return Promise.resolve(mockAnio2027);
      });

      // findAll para el origen retorna 2 secciones
      mockSeccionesRepo.findAll = jest.fn().mockResolvedValue([mockSeccion2026A, mockSeccion2026B]);

      // En el destino, "A" ya existe pero "B" no
      mockSeccionesRepo.findPorNombre = jest.fn().mockImplementation((anioId, gradoId, nombre) => {
        if (nombre === "A") return Promise.resolve(mockSeccion5A);
        return Promise.resolve(null);
      });

      mockSeccionesRepo.createConCarga = jest.fn().mockResolvedValue({
        ...mockSeccion2026B,
        id: "sec-nueva-b",
        anioAcademicoId: "anio-2027",
      });

      const resultado = await service.clonar(
        { anioOrigenId: "anio-2026", copiarAulas: true, copiarTutores: true },
        "user-admin",
      );

      expect(resultado.totalClonadas).toBe(1);
      expect(resultado.totalOmitidas).toBe(1);
      expect(resultado.clonadas[0].nombre).toBe("B");
      expect(resultado.omitidas[0].nombre).toBe("A");
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: "crear",
          tabla: "secciones",
        }),
      );
      const auditCall = (mockAuditService.log as jest.Mock).mock.calls[0] as [
        { valorNuevo: { tipo: string; totalClonadas: number; totalOmitidas: number } },
      ];
      expect(auditCall[0].valorNuevo.tipo).toBe("clonacion_secciones");
      expect(auditCall[0].valorNuevo.totalClonadas).toBe(1);
      expect(auditCall[0].valorNuevo.totalOmitidas).toBe(1);
    });
  });
});
