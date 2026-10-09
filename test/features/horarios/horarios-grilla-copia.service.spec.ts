import { BadRequestException, ConflictException } from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import { AuditService } from "@/common/services/audit.service";
import { AnioAcademicoResponseDto } from "@/features/anio-escolar/dto";
import { AniosAcademicosService } from "@/features/anio-escolar/anios.service";
import { DocentesRepository } from "@/features/docentes";
import { SeccionResponseDto, SeccionesRepository } from "@/features/secciones";
import { BloqueHorarioResponseDto, HorariosRepository, HorariosService } from "@/features/horarios";

describe("RF-008: Horario Semanal — Grilla y Copia (HU3)", () => {
  let service: HorariosService;
  let mockHorariosRepo: jest.Mocked<Partial<HorariosRepository>> & {
    obtenerParametrosJornada?: jest.Mock;
    horaEntradaEstudiantes?: jest.Mock;
    cursosSeccionPorSeccion?: jest.Mock;
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
    tutor: null,
    matriculados: 0,
    totalCursos: 12,
    cursosSinDocente: 0,
  };

  const mockSeccion5B: SeccionResponseDto = {
    id: "sec-5b",
    anioAcademicoId: "anio-2027",
    gradoId: "grado-5",
    gradoNumero: 5,
    gradoNombre: "5.° de secundaria",
    nombre: "B",
    aula: "Pab. B – 202",
    vacantes: 35,
    estado: "activa",
    tutor: null,
    matriculados: 0,
    totalCursos: 12,
    cursosSinDocente: 0,
  };

  const mockSeccion4A: SeccionResponseDto = {
    id: "sec-4a",
    anioAcademicoId: "anio-2027",
    gradoId: "grado-4",
    gradoNumero: 4,
    gradoNombre: "4.° de secundaria",
    nombre: "A",
    aula: "Pab. A – 101",
    vacantes: 30,
    estado: "activa",
    tutor: null,
    matriculados: 0,
    totalCursos: 12,
    cursosSinDocente: 0,
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
    };

    mockSeccionesRepo = {
      findById: jest.fn().mockImplementation((id: string) => {
        if (id === "sec-5a") return Promise.resolve(mockSeccion5A);
        if (id === "sec-5b") return Promise.resolve(mockSeccion5B);
        if (id === "sec-4a") return Promise.resolve(mockSeccion4A);
        return Promise.resolve(null);
      }),
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
      cursosSeccionPorSeccion: jest.fn().mockImplementation((secId: string) => {
        if (secId === "sec-5a") {
          return Promise.resolve([
            {
              cursoSeccionId: "cs-mat-5a",
              cursoId: "curso-mat",
              cursoNombre: "Matemática",
              docenteId: "doc-quispe",
            },
          ]);
        }
        if (secId === "sec-5b") {
          return Promise.resolve([
            {
              cursoSeccionId: "cs-mat-5b",
              cursoId: "curso-mat",
              cursoNombre: "Matemática",
              docenteId: "doc-docente-b",
            },
          ]);
        }
        return Promise.resolve([]);
      }),
      create: jest.fn().mockResolvedValue(mockBloqueMatematica),
      update: jest.fn().mockResolvedValue(mockBloqueMatematica),
      delete: jest.fn().mockResolvedValue(true),
      tieneSesiones: jest.fn().mockResolvedValue(false),
      findByDocente: jest.fn().mockResolvedValue([]),
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

  describe("Grilla propuesta", () => {
    it("CP-RF008-11: debe proponer la grilla semanal con 7 bloques pedagógicos al día y el receso tras la 3.ª hora", async () => {
      mockHorariosRepo.obtenerParametrosJornada = jest.fn().mockResolvedValue({
        minutosHoraPedagogica: 45,
        horasPedagogicasDia: 7,
        recreoDespuesDeHora: 3,
        minutosRecreo: 15,
      });

      // Dado que la hora de entrada de estudiantes es 07:45 y la jornada es de 7 horas de 45 minutos
      // Cuando abro el horario de 5.° A
      const grilla = await service.proponerGrilla("sec-5a", "07:45");

      // Entonces el sistema consulta los parámetros de jornada al repositorio
      expect(mockHorariosRepo.obtenerParametrosJornada).toHaveBeenCalled();

      // Y propone los bloques de lunes a viernes con el recreo
      expect(grilla.horaEntrada).toBe("07:45");
      expect(grilla.bloques).toHaveLength(40);

      // Verificamos los bloques del lunes (diaSemana = 1)
      const bloquesLunes = grilla.bloques.filter((b) => b.diaSemana === 1);
      expect(bloquesLunes).toHaveLength(8);

      expect(bloquesLunes[0]).toEqual({
        diaSemana: 1,
        horaInicio: "07:45",
        horaFin: "08:30",
        tipoBloque: "clase",
      });
      expect(bloquesLunes[1]).toEqual({
        diaSemana: 1,
        horaInicio: "08:30",
        horaFin: "09:15",
        tipoBloque: "clase",
      });
      expect(bloquesLunes[2]).toEqual({
        diaSemana: 1,
        horaInicio: "09:15",
        horaFin: "10:00",
        tipoBloque: "clase",
      });
      // El recreo tras la 3.ª hora pedagógica
      expect(bloquesLunes[3]).toEqual({
        diaSemana: 1,
        horaInicio: "10:00",
        horaFin: "10:15",
        tipoBloque: "receso",
      });
      expect(bloquesLunes[4]).toEqual({
        diaSemana: 1,
        horaInicio: "10:15",
        horaFin: "11:00",
        tipoBloque: "clase",
      });
      expect(bloquesLunes[7]).toEqual({
        diaSemana: 1,
        horaInicio: "12:30",
        horaFin: "13:15",
        tipoBloque: "clase",
      });
    });

    it("CP-RF008-11: debe proponer la grilla utilizando parámetros de jornada distintos obtenidos del repositorio (40 min, 6 horas, recreo tras la 2.ª hora)", async () => {
      // Demuestra que los bloques salen de los parámetros obtenidos y no de literales
      mockHorariosRepo.obtenerParametrosJornada = jest.fn().mockResolvedValue({
        minutosHoraPedagogica: 40,
        horasPedagogicasDia: 6,
        recreoDespuesDeHora: 2,
        minutosRecreo: 20,
      });

      const grilla = await service.proponerGrilla("sec-5a", "08:00");

      expect(mockHorariosRepo.obtenerParametrosJornada).toHaveBeenCalled();
      expect(grilla.horaEntrada).toBe("08:00");
      // 5 días * (6 clases + 1 receso = 7 bloques) = 35 bloques en total
      expect(grilla.bloques).toHaveLength(35);

      const bloquesLunes = grilla.bloques.filter((b) => b.diaSemana === 1);
      expect(bloquesLunes).toHaveLength(7);

      expect(bloquesLunes[0]).toEqual({
        diaSemana: 1,
        horaInicio: "08:00",
        horaFin: "08:40",
        tipoBloque: "clase",
      });
      expect(bloquesLunes[1]).toEqual({
        diaSemana: 1,
        horaInicio: "08:40",
        horaFin: "09:20",
        tipoBloque: "clase",
      });
      // Recreo de 20 minutos tras la 2.ª hora pedagógica
      expect(bloquesLunes[2]).toEqual({
        diaSemana: 1,
        horaInicio: "09:20",
        horaFin: "09:40",
        tipoBloque: "receso",
      });
      expect(bloquesLunes[3]).toEqual({
        diaSemana: 1,
        horaInicio: "09:40",
        horaFin: "10:20",
        tipoBloque: "clase",
      });
      expect(bloquesLunes[6]).toEqual({
        diaSemana: 1,
        horaInicio: "11:40",
        horaFin: "12:20",
        tipoBloque: "clase",
      });
    });

    it("CP-RF008-11: debe utilizar por defecto la hora de entrada de estudiantes del repositorio si no se especifica horaEntrada", async () => {
      mockHorariosRepo.obtenerParametrosJornada = jest.fn().mockResolvedValue({
        minutosHoraPedagogica: 45,
        horasPedagogicasDia: 7,
        recreoDespuesDeHora: 3,
        minutosRecreo: 15,
      });
      mockHorariosRepo.horaEntradaEstudiantes = jest.fn().mockResolvedValue("07:30");

      // Cuando llamo a proponerGrilla sin segundo argumento
      const grilla = await service.proponerGrilla("sec-5a");

      // Entonces consulta la hora de entrada de estudiantes al repositorio
      expect(mockHorariosRepo.horaEntradaEstudiantes).toHaveBeenCalled();
      expect(grilla.horaEntrada).toBe("07:30");
      expect(grilla.bloques[0].horaInicio).toBe("07:30");
      expect(grilla.bloques[0].horaFin).toBe("08:15");
    });
  });

  describe("Copia de horarios entre secciones", () => {
    it("CP-RF008-17: debe copiar el horario a otra sección del mismo grado y marcar cruces de docentes", async () => {
      // Dado que el horario de 5.° A está completo y 5.° B no tiene bloques
      mockHorariosRepo.findBySeccion = jest.fn().mockImplementation((secId: string) => {
        if (secId === "sec-5a") return Promise.resolve([mockBloqueMatematica]);
        if (secId === "sec-5b") return Promise.resolve([]); // sin bloques en destino
        return Promise.resolve([]);
      });

      // cursosSeccionPorSeccion('sec-5a') y ('sec-5b') devuelven cursoSeccionId distintos para el mismo cursoId
      mockHorariosRepo.cursosSeccionPorSeccion = jest.fn().mockImplementation((secId: string) => {
        if (secId === "sec-5a") {
          return Promise.resolve([
            {
              cursoSeccionId: "cs-mat-5a",
              cursoId: "curso-mat",
              cursoNombre: "Matemática",
              docenteId: "doc-quispe",
            },
          ]);
        }
        if (secId === "sec-5b") {
          return Promise.resolve([
            {
              cursoSeccionId: "cs-mat-5b",
              cursoId: "curso-mat",
              cursoNombre: "Matemática",
              docenteId: "doc-docente-b",
            },
          ]);
        }
        return Promise.resolve([]);
      });

      // El docente de 5.° B tiene cruce en el horario propuesto
      mockHorariosRepo.findCruceDocente = jest.fn().mockResolvedValue({
        docenteNombre: "Docente B",
        gradoNumero: 5,
        seccionNombre: "C",
        diaSemana: 1,
        horaInicio: "07:45",
        horaFin: "08:30",
      });

      // Cuando lo copio a 5.° B
      const resultado = await service.copiar("sec-5a", "sec-5b", "user-admin");

      // Entonces consulta los cursos de origen y destino para emparejar por cursoId
      expect(mockHorariosRepo.cursosSeccionPorSeccion).toHaveBeenCalledWith("sec-5a");
      expect(mockHorariosRepo.cursosSeccionPorSeccion).toHaveBeenCalledWith("sec-5b");

      // Y verifica el cruce con el docente del destino (doc-docente-b)
      expect(mockHorariosRepo.findCruceDocente).toHaveBeenCalledWith(
        "anio-2027",
        "doc-docente-b",
        1,
        "07:45",
        "08:30",
        "sec-5b",
      );

      // Y crea el bloque en destino con seccionId 'sec-5b' y cursoSeccionId 'cs-mat-5b'
      expect(mockHorariosRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          seccionId: "sec-5b",
          cursoSeccionId: "cs-mat-5b",
        }),
      );

      // Entonces el sistema crea los mismos bloques con los cursos de 5.° B
      expect(resultado.bloquesCreados).toBe(1);
      // Y marca los bloques donde el docente tiene cruce
      expect(resultado.conflictos).toHaveLength(1);
      expect(resultado.conflictos[0].cursoNombre).toBe("Matemática");
      expect(resultado.conflictos[0].mensaje).toContain("Docente B");

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: "crear",
          tabla: "horarios",
        }),
      );
    });

    it("debe bloquear la copia si las secciones no pertenecen al mismo grado", async () => {
      // Origen 5.° A, destino 4.° A (distintos grados)
      await expect(service.copiar("sec-5a", "sec-4a", "user-admin")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("debe bloquear la copia si la sección destino ya tiene bloques registrados", async () => {
      mockHorariosRepo.findBySeccion = jest.fn().mockImplementation((secId: string) => {
        if (secId === "sec-5b") return Promise.resolve([mockBloqueMatematica]); // ya tiene bloques
        return Promise.resolve([mockBloqueMatematica]);
      });

      await expect(service.copiar("sec-5a", "sec-5b", "user-admin")).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
