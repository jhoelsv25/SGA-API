import { BadRequestException } from "@nestjs/common";
import type { AuditService } from "../../../src/common/services/audit.service";
import type { ImportacionAcademicaRepository } from "../../../src/features/importacion/repositories";
import { CargaAcademicaImportService } from "../../../src/features/importacion/services/carga-academica-import.service";
import { HorariosImportService } from "../../../src/features/importacion/services/horarios-import.service";

describe("CargaAcademicaImportService y HorariosImportService", () => {
  let repo: {
    findAnioParaImportacion: jest.Mock;
    listarSeccionesActivasConTutor: jest.Mock;
    listarCursosActivos: jest.Mock;
    listarDocentesConPersona: jest.Mock;
    listarPlanEstudios: jest.Mock;
    listarCursosSeccionDeAnio: jest.Mock;
    listarHorariosDeAnio: jest.Mock;
    asegurarPlanEstudios: jest.Mock;
    asegurarYAsignarCursoSeccion: jest.Mock;
    asignarTutorSeccionSiLibre: jest.Mock;
    insertarBloqueHorario: jest.Mock;
  };
  let auditService: { log: jest.Mock };
  let cargaService: CargaAcademicaImportService;
  let horariosService: HorariosImportService;

  beforeEach(() => {
    repo = {
      findAnioParaImportacion: jest.fn(),
      listarSeccionesActivasConTutor: jest.fn(),
      listarCursosActivos: jest.fn(),
      listarDocentesConPersona: jest.fn(),
      listarPlanEstudios: jest.fn(),
      listarCursosSeccionDeAnio: jest.fn(),
      listarHorariosDeAnio: jest.fn(),
      asegurarPlanEstudios: jest.fn(),
      asegurarYAsignarCursoSeccion: jest.fn(),
      asignarTutorSeccionSiLibre: jest.fn(),
      insertarBloqueHorario: jest.fn(),
    };
    auditService = { log: jest.fn() };

    cargaService = new CargaAcademicaImportService(
      repo as unknown as ImportacionAcademicaRepository,
      auditService as unknown as AuditService,
    );
    horariosService = new HorariosImportService(
      repo as unknown as ImportacionAcademicaRepository,
      auditService as unknown as AuditService,
    );
  });

  describe("CargaAcademicaImportService", () => {
    it("debe previsualizar filas válidas resolviendo alias de curso, sección SIAGIE y docente", async () => {
      repo.findAnioParaImportacion.mockResolvedValue({
        id: "anio-2026",
        anio: 2026,
        estado: "en_curso",
      });
      repo.listarSeccionesActivasConTutor.mockResolvedValue([
        {
          id: "sec-2ap",
          anioAcademicoId: "anio-2026",
          gradoId: "grado-2",
          gradoNumero: 2,
          gradoNombre: "2.° Secundaria",
          nombre: "AP",
          tutorId: null,
          estado: "activa",
        },
      ]);
      repo.listarCursosActivos.mockResolvedValue([
        { id: "cur-cyt", codigo: "CYT", nombre: "Ciencia y Tecnología", activo: true },
        { id: "cur-tut", codigo: "TUT", nombre: "Tutoría", activo: true },
      ]);
      repo.listarDocentesConPersona.mockResolvedValue([
        {
          id: "doc-1",
          codigo: "20261124000001",
          estado: "activo",
          numeroDocumento: "40123451",
          apellidoPaterno: "CHOQUE",
          apellidoMaterno: "",
          nombres: "NIDIA",
        },
      ]);
      repo.listarPlanEstudios.mockResolvedValue([]);
      repo.listarCursosSeccionDeAnio.mockResolvedValue([]);

      const res = await cargaService.previsualizarFilas([
        {
          grado: "SEGUNDO",
          seccion: "2 AP",
          curso: "C Y T",
          docente: "NIDIA CHOQUE",
          horasSemanales: "5",
          esTutor: "NO",
        },
        {
          grado: "2",
          seccion: "AP",
          curso: "TUT.",
          docente: "40123451",
          horasSemanales: "2",
          esTutor: "SI",
        },
      ]);

      expect(res.validasCount).toBe(2);
      expect(res.erroresCount).toBe(0);
      expect(res.filasAnalizadas[0].datos._cursoId).toBe("cur-cyt");
      expect(res.filasAnalizadas[1].datos._esTutor).toBe(true);
    });

    it("debe rechazar año cerrado", async () => {
      repo.findAnioParaImportacion.mockResolvedValue({
        id: "anio-2025",
        anio: 2025,
        estado: "cerrado",
      });

      await expect(cargaService.previsualizarFilas([])).rejects.toThrow(BadRequestException);
    });

    it("debe procesar fila asegurando plan, curso_seccion y tutoría", async () => {
      repo.asegurarYAsignarCursoSeccion.mockResolvedValue({
        id: "cs-1",
        anteriorDocenteId: null,
      });
      repo.asignarTutorSeccionSiLibre.mockResolvedValue(true);

      const ok = await cargaService.procesarFila(
        {
          _anioAcademicoId: "anio-2026",
          _gradoId: "grado-1",
          _seccionId: "sec-1a",
          _cursoId: "cur-tut",
          _docenteId: "doc-1",
          _horasSemanales: 2,
          _esTutor: true,
        },
        "anio-2026",
        "actor-1",
        "127.0.0.1",
      );

      expect(ok).toBe(true);
      expect(repo.asegurarPlanEstudios).toHaveBeenCalledWith("grado-1", "cur-tut", 2);
      expect(repo.asegurarYAsignarCursoSeccion).toHaveBeenCalledWith("sec-1a", "cur-tut", "doc-1");
      expect(repo.asignarTutorSeccionSiLibre).toHaveBeenCalledWith("anio-2026", "sec-1a", "doc-1");
      expect(auditService.log).toHaveBeenCalledTimes(1);
    });
  });

  describe("HorariosImportService", () => {
    beforeEach(() => {
      repo.findAnioParaImportacion.mockResolvedValue({
        id: "anio-2026",
        anio: 2026,
        estado: "en_curso",
      });
      repo.listarSeccionesActivasConTutor.mockResolvedValue([
        {
          id: "sec-1a",
          anioAcademicoId: "anio-2026",
          gradoId: "grado-1",
          gradoNumero: 1,
          gradoNombre: "1.° Secundaria",
          nombre: "A",
          tutorId: null,
          estado: "activa",
        },
        {
          id: "sec-1b",
          anioAcademicoId: "anio-2026",
          gradoId: "grado-1",
          gradoNumero: 1,
          gradoNombre: "1.° Secundaria",
          nombre: "B",
          tutorId: null,
          estado: "activa",
        },
      ]);
      repo.listarCursosActivos.mockResolvedValue([
        { id: "cur-mat", codigo: "MAT", nombre: "Matemática", activo: true },
      ]);
      repo.listarCursosSeccionDeAnio.mockResolvedValue([
        { id: "cs-1a-mat", seccionId: "sec-1a", cursoId: "cur-mat", docenteId: "doc-1" },
        { id: "cs-1b-mat", seccionId: "sec-1b", cursoId: "cur-mat", docenteId: "doc-1" },
      ]);
      repo.listarHorariosDeAnio.mockResolvedValue([]);
    });

    it("debe validar bloques de clase y receso, y detectar cruce docente en el mismo archivo", async () => {
      const res = await horariosService.previsualizarFilas([
        {
          grado: "1",
          seccion: "A",
          diaSemana: "Lunes",
          horaInicio: "08:00",
          horaFin: "09:30",
          tipoBloque: "clase",
          curso: "MAT.",
        },
        {
          grado: "1",
          seccion: "A",
          diaSemana: "Lunes",
          horaInicio: "09:30",
          horaFin: "09:40",
          tipoBloque: "receso",
        },
        {
          grado: "1",
          seccion: "B",
          diaSemana: "Lunes",
          horaInicio: "08:00",
          horaFin: "08:45",
          tipoBloque: "clase",
          curso: "Matemática",
        },
      ]);

      expect(res.validasCount).toBe(2);
      expect(res.erroresCount).toBe(1);
      expect(res.filasAnalizadas[2].mensaje).toContain("Cruce docente");
    });

    it("debe marcar como omitido un bloque idéntico ya existente en BD", async () => {
      repo.listarHorariosDeAnio.mockResolvedValue([
        {
          id: "h-1",
          seccionId: "sec-1a",
          cursoSeccionId: "cs-1a-mat",
          diaSemana: 1,
          horaInicio: "08:00:00",
          horaFin: "09:30:00",
          tipoBloque: "clase",
          aula: null,
          gradoNumero: 1,
          seccionNombre: "A",
          docenteId: "doc-1",
        },
      ]);

      const res = await horariosService.previsualizarFilas([
        {
          grado: "1",
          seccion: "A",
          diaSemana: "Lunes",
          horaInicio: "08:00",
          horaFin: "09:30",
          tipoBloque: "clase",
          curso: "MAT.",
        },
      ]);

      expect(res.omitidasCount).toBe(1);
      expect(res.filasAnalizadas[0].estado).toBe("ya_registrada");
    });
  });
});
