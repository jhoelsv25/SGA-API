import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import { AuditService } from "@/common/services/audit.service";
import { AnioAcademicoResponseDto } from "@/features/anio-escolar/dto";
import { AniosAcademicosService } from "@/features/anio-escolar/anios.service";
import { DocentesRepository } from "@/features/docentes";
import { SeccionesRepository } from "@/features/secciones";
import {
  BloqueDocenteResponseDto,
  BloqueHorarioResponseDto,
  HorariosRepository,
  HorariosService,
} from "@/features/horarios";

describe("RF-008: Horario Semanal — Consultas (HU3)", () => {
  let service: HorariosService;
  let mockHorariosRepo: jest.Mocked<Partial<HorariosRepository>> & {
    obtenerParametrosJornada?: jest.Mock;
    horaEntradaEstudiantes?: jest.Mock;
    cursosSeccionPorSeccion?: jest.Mock;
    docentePorPersonaId?: jest.Mock;
    matriculaEstudiante?: jest.Mock;
    esApoderadoDeEstudiante?: jest.Mock;
  };
  let mockSeccionesRepo: jest.Mocked<Partial<SeccionesRepository>>;
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

  const mockBloqueMatematica: BloqueHorarioResponseDto = {
    id: "bloque-1",
    seccionId: "sec-5a",
    cursoSeccionId: "cs-mat-5a",
    cursoNombre: "Matemática",
    colorHex: "#2563EB",
    docenteNombre: "Luis Quispe Mamani",
    diaSemana: 1,
    horaInicio: "07:45",
    horaFin: "08:30",
    tipoBloque: "clase",
    aula: "Pab. B – 201",
  };

  const mockBloqueDocente: BloqueDocenteResponseDto = {
    id: "bloque-1",
    diaSemana: 1,
    horaInicio: "07:45",
    horaFin: "08:30",
    cursoNombre: "Matemática",
    colorHex: "#2563EB",
    seccionNombre: "A",
    gradoNumero: 5,
    aula: "Pab. B – 201",
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

    mockDocentesRepo = {
      findById: jest.fn().mockResolvedValue(null),
      findByPersonaId: jest.fn().mockImplementation((personaId: string) => {
        if (personaId === "per-quispe") {
          return Promise.resolve({
            id: "doc-quispe",
            personaId: "per-quispe",
            codigo: "DOC-001",
            nombres: "Luis",
            apellidoPaterno: "Quispe",
            apellidoMaterno: "Mamani",
            tipoDocumento: "DNI",
            numeroDocumento: "10203040",
            especialidad: "Matemática",
            telefono: null,
            email: "luis.quispe@colegio.edu.pe",
            estado: "activo",
            jornadaLaboral: 30,
            creadoEn: "2027-01-01T00:00:00.000Z",
            actualizadoEn: "2027-01-01T00:00:00.000Z",
          });
        }
        return Promise.resolve(null);
      }),
    };

    mockSeccionesRepo = {
      findById: jest.fn().mockResolvedValue(null),
    };

    mockHorariosRepo = {
      findBySeccion: jest.fn().mockResolvedValue([mockBloqueMatematica]),
      findById: jest.fn().mockResolvedValue(mockBloqueMatematica),
      findSolapados: jest.fn().mockResolvedValue([]),
      findCruceDocente: jest.fn().mockResolvedValue(null),
      horasPorCurso: jest.fn().mockResolvedValue({}),
      horasPlanPorCurso: jest.fn().mockResolvedValue({}),
      obtenerParametrosJornada: jest.fn().mockResolvedValue({
        minutosHoraPedagogica: 45,
        horasPedagogicasDia: 7,
        recreoDespuesDeHora: 3,
        minutosRecreo: 15,
      }),
      horaEntradaEstudiantes: jest.fn().mockResolvedValue("07:45"),
      cursosSeccionPorSeccion: jest.fn().mockResolvedValue([
        {
          cursoSeccionId: "cs-mat-5a",
          cursoId: "curso-mat",
          cursoNombre: "Matemática",
          docenteId: "doc-quispe",
        },
      ]),
      docentePorPersonaId: jest.fn().mockImplementation((personaId: string) => {
        if (personaId === "per-quispe") {
          return Promise.resolve({ id: "doc-quispe" });
        }
        return Promise.resolve(null);
      }),
      matriculaEstudiante: jest.fn().mockImplementation((_anioId: string, estudianteId: string) => {
        if (estudianteId === "per-est" || estudianteId === "est-1") {
          return Promise.resolve({ seccionId: "sec-5a", estado: "matriculado" });
        }
        return Promise.resolve(null);
      }),
      esApoderadoDeEstudiante: jest
        .fn()
        .mockImplementation((apoderadoPersonaId: string, estudianteId: string) => {
          if (
            apoderadoPersonaId === "per-apo" &&
            (estudianteId === "per-est" || estudianteId === "est-1")
          ) {
            return Promise.resolve(true);
          }
          return Promise.resolve(false);
        }),
      create: jest.fn().mockResolvedValue(mockBloqueMatematica),
      update: jest.fn().mockResolvedValue(mockBloqueMatematica),
      delete: jest.fn().mockResolvedValue(true),
      tieneSesiones: jest.fn().mockResolvedValue(false),
      findByDocente: jest.fn().mockResolvedValue([mockBloqueDocente]),
    };

    service = new HorariosService(
      mockHorariosRepo as unknown as HorariosRepository,
      mockSeccionesRepo as unknown as SeccionesRepository,
      mockDocentesRepo as unknown as DocentesRepository,
      mockAniosService as unknown as AniosAcademicosService,
      mockAnioLectivoCls as unknown as AnioLectivoCls,
      mockAuditService as unknown as AuditService,
    );
  });

  describe("Consultas de horarios", () => {
    it("CP-RF008-19: debe consultar el horario del docente con cada bloque, sección, aula y color", async () => {
      // Dado que soy docente con sesión iniciada
      // Cuando abro "Mi horario"
      const resultado = await service.miHorario("per-quispe");

      // Entonces el sistema obtiene el docente asociado a la persona desde el repositorio
      expect(mockHorariosRepo.docentePorPersonaId).toHaveBeenCalledWith("per-quispe");
      expect(mockHorariosRepo.findByDocente).toHaveBeenCalledWith("anio-2027", "doc-quispe");

      // Y muestra la semana del docente con cada detalle
      expect(resultado.docenteId).toBe("doc-quispe");
      expect(resultado.bloques).toHaveLength(1);
      expect(resultado.bloques[0].cursoNombre).toBe("Matemática");
      expect(resultado.bloques[0].colorHex).toBe("#2563EB");
      expect(resultado.bloques[0].seccionNombre).toBe("A");
      expect(resultado.bloques[0].aula).toBe("Pab. B – 201");
    });

    it("CP-RF008-19: debe reflejar el color del curso devuelto por el repositorio y no inventar valores literales", async () => {
      // Demuestra que colorHex proviene del repositorio (ej. Ciencia y Tecnología con #059669)
      const mockBloqueCiencia: BloqueDocenteResponseDto = {
        ...mockBloqueDocente,
        id: "bloque-cienc-1",
        cursoNombre: "Ciencia y Tecnología",
        colorHex: "#059669",
      };
      mockHorariosRepo.findByDocente = jest.fn().mockResolvedValue([mockBloqueCiencia]);

      const resultado = await service.miHorario("per-quispe");

      expect(resultado.bloques[0].cursoNombre).toBe("Ciencia y Tecnología");
      expect(resultado.bloques[0].colorHex).toBe("#059669");
    });

    it("debe permitir a un estudiante consultar únicamente el horario de su sección según su matrícula", async () => {
      // Estudiante consultando su propio horario
      const usuarioEstudiante = {
        id: "usr-est",
        role: "Estudiante",
        personaId: "per-est",
      };

      const resultado = await service.horarioDeEstudiante("per-est", usuarioEstudiante);

      // Consulta la matrícula y sección vigente en el año lectivo
      expect(mockHorariosRepo.matriculaEstudiante).toHaveBeenCalledWith("anio-2027", "per-est");
      expect(mockHorariosRepo.findBySeccion).toHaveBeenCalledWith("sec-5a");
      expect(resultado.bloques).toHaveLength(1);

      // Estudiante intentando consultar el horario de otro estudiante ajeno
      await expect(
        service.horarioDeEstudiante("per-otro-estudiante", usuarioEstudiante),
      ).rejects.toThrow(ForbiddenException);
    });

    it("debe permitir a un apoderado consultar el horario de su estudiante vinculado y bloquear estudiantes sin vínculo", async () => {
      const usuarioApoderado = {
        id: "usr-apo",
        role: "Apoderado",
        personaId: "per-apo",
      };

      // Apoderado consultando a su hijo con vínculo registrado
      const resultado = await service.horarioDeEstudiante("per-est", usuarioApoderado);

      expect(mockHorariosRepo.esApoderadoDeEstudiante).toHaveBeenCalledWith("per-apo", "per-est");
      expect(mockHorariosRepo.matriculaEstudiante).toHaveBeenCalledWith("anio-2027", "per-est");
      expect(mockHorariosRepo.findBySeccion).toHaveBeenCalledWith("sec-5a");
      expect(resultado.bloques).toHaveLength(1);

      // Apoderado intentando consultar a un estudiante ajeno sin vínculo registrado
      await expect(service.horarioDeEstudiante("per-ajeno", usuarioApoderado)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("debe permitir a un usuario con rol administrativo consultar el horario de cualquier estudiante", async () => {
      const usuarioAdmin = {
        id: "usr-admin",
        role: "Administrador",
        personaId: "per-admin",
      };

      const resultado = await service.horarioDeEstudiante("per-est", usuarioAdmin);

      expect(mockHorariosRepo.matriculaEstudiante).toHaveBeenCalledWith("anio-2027", "per-est");
      expect(mockHorariosRepo.findBySeccion).toHaveBeenCalledWith("sec-5a");
      expect(resultado.bloques).toHaveLength(1);
    });

    it("debe retornar error si el estudiante no cuenta con matrícula activa en el año", async () => {
      mockHorariosRepo.matriculaEstudiante = jest.fn().mockResolvedValue(null);

      const usuarioAdmin = {
        id: "usr-admin",
        role: "Administrador",
        personaId: "per-admin",
      };

      await expect(service.horarioDeEstudiante("per-sin-matricula", usuarioAdmin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("debe consultar listarPorSeccion vía función SQL en un solo viaje, cachear en Redis e invalidar al crear bloque", async () => {
      const consultarHorarioSeccionSql = jest.fn().mockResolvedValue({
        bloques: [mockBloqueMatematica],
        resumenHoras: [
          { cursoId: "cs-mat-5a", cursoNombre: "Matemática", horasHorario: 3, horasPlan: 5 },
        ],
      });
      const cacheMap = new Map<string, unknown>();
      const mockCache = {
        getOrSet: jest.fn(async <T>(key: string, factory: () => Promise<T>): Promise<T> => {
          if (cacheMap.has(key)) return cacheMap.get(key) as T;
          const val = await factory();
          cacheMap.set(key, val);
          return val;
        }),
        del: jest.fn((key: string) => Promise.resolve(cacheMap.delete(key))),
      };

      const servicioOptimizado = new HorariosService(
        {
          ...(mockHorariosRepo as unknown as HorariosRepository),
          consultarHorarioSeccionSql,
        } as unknown as HorariosRepository,
        {
          findById: jest.fn().mockResolvedValue({ id: "sec-5a", estado: "activa" }),
        } as unknown as SeccionesRepository,
        mockDocentesRepo as unknown as DocentesRepository,
        mockAniosService as unknown as AniosAcademicosService,
        mockAnioLectivoCls as unknown as AnioLectivoCls,
        mockAuditService as unknown as AuditService,
        undefined,
        undefined,
        mockCache as unknown as import("@/core/cache/cache.service").CacheService,
      );

      const primera = await servicioOptimizado.listarPorSeccion("sec-5a");
      const segunda = await servicioOptimizado.listarPorSeccion("sec-5a");

      expect(consultarHorarioSeccionSql).toHaveBeenCalledTimes(1);
      expect(primera.bloques).toHaveLength(1);
      expect(primera.advertencias).toHaveLength(1);
      expect(segunda).toEqual(primera);

      await servicioOptimizado.crearBloque(
        "sec-5a",
        {
          diaSemana: 2,
          horaInicio: "08:00",
          horaFin: "09:30",
          tipoBloque: "clase",
          cursoSeccionId: "cs-mat-5a",
        },
        "usr-admin",
      );

      expect(mockCache.del).toHaveBeenCalledWith("horarios:seccion:sec-5a");
    });

    it("debe generar PDF consolidado multipágina con todas las secciones del año o filtradas por grado", async () => {
      const listarSeccionesYBloquesDeAnio = jest.fn().mockResolvedValue([
        {
          seccionId: "sec-1a",
          gradoId: "grado-1",
          gradoNumero: 1,
          gradoNombre: "1.° de secundaria",
          seccionNombre: "A",
          bloques: [{ ...mockBloqueMatematica, seccionId: "sec-1a", docenteId: "doc-quispe" }],
        },
        {
          seccionId: "sec-1b",
          gradoId: "grado-1",
          gradoNumero: 1,
          gradoNombre: "1.° de secundaria",
          seccionNombre: "B",
          bloques: [
            {
              ...mockBloqueMatematica,
              id: "bloque-2",
              seccionId: "sec-1b",
              docenteId: "doc-quispe",
            },
          ],
        },
      ]);

      const servicioPdf = new HorariosService(
        {
          ...(mockHorariosRepo as unknown as HorariosRepository),
          listarSeccionesYBloquesDeAnio,
        } as unknown as HorariosRepository,
        mockSeccionesRepo as unknown as SeccionesRepository,
        mockDocentesRepo as unknown as DocentesRepository,
        mockAniosService as unknown as AniosAcademicosService,
        mockAnioLectivoCls as unknown as AnioLectivoCls,
        mockAuditService as unknown as AuditService,
      );

      const { buffer, nombreArchivo } = await servicioPdf.generarHorariosConsolidadoPdf();

      expect(listarSeccionesYBloquesDeAnio).toHaveBeenCalledWith("anio-2027", {
        gradoId: undefined,
        seccionId: undefined,
      });
      expect(nombreArchivo).toBe("horarios-colegio-2027.pdf");
      expect(buffer.subarray(0, 4).toString("utf8")).toBe("%PDF");
    });
  });
});
