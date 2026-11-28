import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import { AuditService } from "@/common/services/audit.service";
import { AniosAcademicosService } from "@/features/anio-escolar/anios.service";
import { AulaVirtualRepository, AulaVirtualService } from "@/features/aula-virtual";
import type {
  EntregaFila,
  PeriodoAula,
  TareaConPreguntas,
} from "@/features/aula-virtual/interfaces";
import type { AuthenticatedUser } from "@/features/auth/interfaces/jwt-payload.interface";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";

type Mocks<T> = { [K in keyof T]?: jest.Mock };

const docente: AuthenticatedUser = {
  id: "u-doc",
  username: "doc",
  roleId: "r-doc",
  role: "Docente",
  personaId: "per-doc",
};
const otroDocente: AuthenticatedUser = { ...docente, id: "u-otro", personaId: "per-otro" };

const estudiante: AuthenticatedUser = {
  id: "u-est",
  username: "est",
  roleId: "r-est",
  role: "Estudiante",
  personaId: "per-est",
};

const curso = {
  id: "cs-mate",
  docenteId: "doc-1",
  seccionId: "sec-5a",
  anioAcademicoId: "anio-1",
  cursoNombre: "Matemática",
  seccionNombre: "5.° A",
};

const bimestre: PeriodoAula = {
  id: "per-2",
  anioAcademicoId: "anio-1",
  nombre: "II Bimestre",
  fechaInicio: "2027-05-03",
  fechaFin: "2027-07-25",
  estado: "en_curso",
};

const unidad = {
  id: "uni-1",
  cursoSeccionId: "cs-mate",
  periodoId: "per-2",
  titulo: "Álgebra",
  descripcion: null,
  orden: 1,
  fechaInicio: "2027-05-12",
  fechaFin: "2027-06-06",
  publicada: true,
};

function tareaEjemplo(parcial: Partial<TareaConPreguntas> = {}): TareaConPreguntas {
  return {
    id: "tar-1",
    cursoSeccionId: "cs-mate",
    periodoId: "per-2",
    unidadId: "uni-1",
    sesionClaseId: null,
    titulo: "Guía de Ecuaciones",
    instrucciones: "Resolver ejercicios del 1 al 10",
    tipo: "trabajo",
    puntajeMaximo: 20,
    fechaLimite: "2027-05-20T23:59:00Z",
    permiteEntregaTardia: false,
    intentosMaximos: 1,
    limiteTiempoMinutos: null,
    calculoNotaIntentos: "mas_alta",
    revelarRespuestas: "al_terminar_intentos",
    tiposArchivo: "pdf, docx",
    estado: "borrador",
    publicadaEn: null,
    creadoEn: "2027-05-05T10:00:00Z",
    actualizadoEn: "2027-05-05T10:00:00Z",
    preguntas: [],
    ...parcial,
  };
}

describe("RF-016: Aula Virtual - Tareas, Entregas y Calificación", () => {
  let service: AulaVirtualService;
  let repo: Mocks<AulaVirtualRepository>;
  let notificaciones: Mocks<NotificacionesService>;
  let audit: Mocks<AuditService>;

  beforeEach(() => {
    repo = {
      findDocenteIdPorPersona: jest.fn((personaId: string) =>
        Promise.resolve(personaId === "per-doc" ? "doc-1" : "doc-otro"),
      ),
      findCurso: jest.fn().mockResolvedValue(curso),
      findPeriodo: jest.fn().mockResolvedValue(bimestre),
      findPeriodoEnCurso: jest.fn().mockResolvedValue(bimestre),
      findUnidad: jest.fn().mockResolvedValue(unidad),
      findTarea: jest.fn().mockResolvedValue(tareaEjemplo()),
      crearTarea: jest.fn((datos: Record<string, unknown>) =>
        Promise.resolve({ ...tareaEjemplo(), ...datos, id: "tar-creada" }),
      ),
      actualizarTarea: jest.fn((id: string, datos: Record<string, unknown>) =>
        Promise.resolve({ ...tareaEjemplo(), ...datos, id }),
      ),
      publicarTarea: jest.fn((id: string, publicadaEn: string) =>
        Promise.resolve({ ...tareaEjemplo(), id, estado: "publicada", publicadaEn }),
      ),
      cerrarTarea: jest.fn((id: string, _cerradaEn: string) =>
        Promise.resolve({ ...tareaEjemplo(), id, estado: "cerrada" }),
      ),
      eliminarTarea: jest.fn().mockResolvedValue(undefined),
      guardarPreguntasTarea: jest.fn().mockResolvedValue(undefined),
      listarTareas: jest.fn().mockResolvedValue([tareaEjemplo({ estado: "publicada" })]),
      findMatriculaDeEstudiante: jest
        .fn()
        .mockResolvedValue({ id: "mat-1", estudianteId: "est-1" }),
      findEntregasDeEstudiante: jest.fn().mockResolvedValue([]),
      findEntregaActiva: jest.fn().mockResolvedValue(null),
      guardarEntrega: jest.fn((datos: Record<string, unknown>) =>
        Promise.resolve({ id: "ent-1", ...datos } as unknown as EntregaFila),
      ),
      findEntrega: jest.fn().mockResolvedValue({
        id: "ent-1",
        tareaId: "tar-1",
        matriculaId: "mat-1",
        intento: 1,
        estado: "entregada",
        entregadaEn: "2027-05-18T10:00:00Z",
        estudianteId: "est-1",
        estudianteNombre: "Juan Perez",
        codigo: "EST001",
      }),
      calificarEntrega: jest.fn((id: string, datos: Record<string, unknown>) =>
        Promise.resolve({ id, ...datos } as unknown as EntregaFila),
      ),
      devolverEntrega: jest.fn((id: string, motivo: string) =>
        Promise.resolve({
          id,
          estado: "devuelta",
          retroalimentacion: motivo,
        } as unknown as EntregaFila),
      ),
      listarEstudiantesDeSeccion: jest.fn().mockResolvedValue([
        {
          matriculaId: "mat-1",
          estudianteId: "est-1",
          codigo: "EST001",
          nombreCompleto: "Perez Juan",
        },
      ]),
      obtenerPesosVariables: jest.fn().mockResolvedValue({
        examen: 35,
        cuestionario: 25,
        trabajo: 25,
        proyecto: 15,
      }),
      usuariosEstudiantesDeSeccion: jest.fn().mockResolvedValue(["u-est1", "u-est2"]),
      findEntregasDeTarea: jest.fn().mockResolvedValue([]),
    };

    notificaciones = { enviar: jest.fn().mockResolvedValue(undefined) };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    service = new AulaVirtualService(
      repo as unknown as AulaVirtualRepository,
      {
        findById: jest.fn().mockResolvedValue({ id: "anio-1" }),
        findEnCurso: jest.fn().mockResolvedValue({ id: "anio-1" }),
      } as unknown as AniosAcademicosService,
      { id: () => "anio-1" } as unknown as AnioLectivoCls,
      notificaciones as unknown as NotificacionesService,
      audit as unknown as AuditService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Creación y publicación de tareas", () => {
    it("crea una tarea en borrador para el docente asignado (CP-RF016-01)", async () => {
      const res = await service.crearTarea(docente, "cs-mate", {
        titulo: "Trabajo 1",
        tipo: "trabajo",
        fechaLimite: "2027-06-15T23:59:00Z",
      });

      expect(res.mensaje).toBe("Tarea guardada como borrador.");
      expect(repo.crearTarea).toHaveBeenCalledWith(
        expect.objectContaining({
          titulo: "Trabajo 1",
          tipo: "trabajo",
          estado: "borrador",
        }),
      );
    });

    it("rechaza si otro docente intenta crear la tarea (CP-RF016-04)", async () => {
      await expect(
        service.crearTarea(otroDocente, "cs-mate", {
          titulo: "Trabajo 1",
          tipo: "trabajo",
          fechaLimite: "2027-06-15T23:59:00Z",
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("rechaza publicar tarea con fecha límite pasada (CP-RF016-01)", async () => {
      const fechaPasada = "2020-01-01T10:00:00Z";
      await expect(
        service.crearTarea(docente, "cs-mate", {
          titulo: "Trabajo 1",
          tipo: "trabajo",
          fechaLimite: fechaPasada,
          publicar: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rechaza publicar cuestionario sin preguntas (CP-RF016-05)", async () => {
      repo.findTarea!.mockResolvedValue(
        tareaEjemplo({
          tipo: "cuestionario",
          fechaLimite: "2027-07-01T23:59:00Z",
          preguntas: [],
        }),
      );

      await expect(service.publicarTarea(docente, "tar-1")).rejects.toThrow(
        "Agregue al menos una pregunta antes de publicar.",
      );
    });

    it("rechaza publicar si pregunta cerrada no tiene correcta marcada (CP-RF016-06)", async () => {
      repo.findTarea!.mockResolvedValue(
        tareaEjemplo({
          tipo: "cuestionario",
          fechaLimite: "2027-07-01T23:59:00Z",
          preguntas: [
            {
              id: "p1",
              tareaId: "tar-1",
              enunciado: "¿Cuánto es 2+2?",
              tipo: "opcion_unica",
              puntaje: 20,
              orden: 1,
              opciones: [
                { id: "o1", texto: "3", esCorrecta: false, orden: 1 },
                { id: "o2", texto: "5", esCorrecta: false, orden: 2 },
              ],
            },
          ],
        }),
      );

      await expect(service.publicarTarea(docente, "tar-1")).rejects.toThrow(
        "Marque al menos una opción correcta en cada pregunta cerrada.",
      );
    });

    it("publica exitosamente y notifica a los estudiantes (CP-RF016-01, CP-RF016-08)", async () => {
      repo.findTarea!.mockResolvedValue(
        tareaEjemplo({
          tipo: "trabajo",
          fechaLimite: "2027-07-01T23:59:00Z",
        }),
      );

      const res = await service.publicarTarea(docente, "tar-1");
      expect(res.mensaje).toBe("Tarea publicada. Se notificó a los estudiantes.");
      expect(notificaciones.enviar).toHaveBeenCalled();
    });

    it("permite editar borrador con tipo y publicar: true desde actualizarTarea", async () => {
      repo.findTarea!.mockResolvedValue(
        tareaEjemplo({
          estado: "borrador",
          tipo: "trabajo",
          fechaLimite: "2027-07-01T23:59:00Z",
        }),
      );

      const res = await service.actualizarTarea(docente, "tar-1", {
        titulo: "Trabajo editado",
        tipo: "proyecto",
        publicar: true,
      });

      expect(res.mensaje).toBe("Tarea publicada. Se notificó a los estudiantes.");
      expect(repo.actualizarTarea).toHaveBeenCalledWith(
        "tar-1",
        expect.objectContaining({
          titulo: "Trabajo editado",
          tipo: "proyecto",
        }),
      );
      expect(repo.publicarTarea).toHaveBeenCalledWith("tar-1", expect.any(String));
      expect(notificaciones.enviar).toHaveBeenCalled();
    });

    it("ignora cambio de tipo al editar una tarea ya publicada", async () => {
      repo.findTarea!.mockResolvedValue(
        tareaEjemplo({
          estado: "publicada",
          tipo: "trabajo",
          fechaLimite: "2027-07-01T23:59:00Z",
        }),
      );

      const res = await service.actualizarTarea(docente, "tar-1", {
        titulo: "Trabajo publicado editado",
        tipo: "proyecto",
        publicar: true,
      });

      expect(res.mensaje).toBe("Tarea actualizada.");
      expect(repo.actualizarTarea).toHaveBeenCalledWith(
        "tar-1",
        expect.objectContaining({
          titulo: "Trabajo publicado editado",
          tipo: undefined,
        }),
      );
      expect(repo.publicarTarea).not.toHaveBeenCalled();
    });
  });

  describe("Entregas de Estudiante", () => {
    it("permite iniciar intento de examen y registra hora de inicio (CP-RF016-16)", async () => {
      repo.findTarea!.mockResolvedValue(
        tareaEjemplo({
          tipo: "examen",
          estado: "publicada",
          limiteTiempoMinutos: 60,
          intentosMaximos: 1,
          fechaLimite: "2027-07-01T23:59:00Z",
        }),
      );

      const res = await service.iniciarIntentoExamen(estudiante, "tar-1");
      expect(res.mensaje).toBe("Intento iniciado.");
      expect(repo.guardarEntrega).toHaveBeenCalledWith(
        expect.objectContaining({
          tareaId: "tar-1",
          estado: "en_progreso",
          intento: 1,
        }),
      );
    });

    it("rechaza entrega fuera de plazo si no permite entrega tardía (CP-RF016-12)", async () => {
      repo.findTarea!.mockResolvedValue(
        tareaEjemplo({
          estado: "publicada",
          fechaLimite: "2020-01-01T10:00:00Z",
          permiteEntregaTardia: false,
        }),
      );

      await expect(
        service.entregarTarea(estudiante, "tar-1", { texto: "Mi entrega" }),
      ).rejects.toThrow("La fecha límite ya pasó. Esta tarea no acepta entregas tardías.");
    });

    it("acepta entrega tardía con marca esTardia si la tarea lo permite (CP-RF016-13)", async () => {
      repo.findTarea!.mockResolvedValue(
        tareaEjemplo({
          estado: "publicada",
          fechaLimite: "2020-01-01T10:00:00Z",
          permiteEntregaTardia: true,
        }),
      );

      const res = await service.entregarTarea(estudiante, "tar-1", { texto: "Entrega tardía" });
      expect(res.mensaje).toBe("Tu entrega fue enviada fuera de plazo.");
      expect(repo.guardarEntrega).toHaveBeenCalledWith(
        expect.objectContaining({
          esTardia: true,
        }),
      );
    });

    it("rechaza archivo con extensión no permitida (CP-RF016-14)", async () => {
      repo.findTarea!.mockResolvedValue(
        tareaEjemplo({
          estado: "publicada",
          fechaLimite: "2027-08-01T10:00:00Z",
          tiposArchivo: "pdf, docx",
        }),
      );

      const archivoInvalido = {
        originalname: "virus.exe",
        size: 1024,
        buffer: Buffer.alloc(10),
      } as Express.Multer.File;

      await expect(service.entregarTarea(estudiante, "tar-1", {}, archivoInvalido)).rejects.toThrow(
        "Formato de archivo no permitido para esta tarea.",
      );
    });

    it("autocalifica cuestionario cerrado al 100% de preguntas cerradas (CP-RF016-15)", async () => {
      repo.findTarea!.mockResolvedValue(
        tareaEjemplo({
          tipo: "cuestionario",
          estado: "publicada",
          fechaLimite: "2027-08-01T10:00:00Z",
          intentosMaximos: 3,
          preguntas: [
            {
              id: "p1",
              tareaId: "tar-1",
              enunciado: "Pregunta 1",
              tipo: "opcion_multiple",
              puntaje: 20,
              orden: 1,
              opciones: [
                { id: "o1", texto: "Correcta", esCorrecta: true, orden: 1 },
                { id: "o2", texto: "Incorrecta", esCorrecta: false, orden: 2 },
              ],
            },
          ],
        }),
      );

      const res = await service.entregarTarea(estudiante, "tar-1", {
        respuestas: { p1: "o1" },
      });

      expect(res.nota).toBe(20);
      expect(repo.guardarEntrega).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: "calificada",
          nota: 20,
        }),
      );
    });
  });

  describe("Calificación del Docente y Libro de Notas", () => {
    it("docente califica entrega abierta con nota y retroalimentación (CP-RF016-22)", async () => {
      const res = await service.calificarEntrega(docente, "ent-1", {
        nota: 15.5,
        retroalimentacion: "Revisa el ejercicio 7",
      });

      expect(res.mensaje).toBe("Entrega calificada exitosamente.");
      expect(repo.calificarEntrega).toHaveBeenCalledWith(
        "ent-1",
        expect.objectContaining({
          nota: 15.5,
          retroalimentacion: "Revisa el ejercicio 7",
        }),
      );
    });

    it("rechaza calificación fuera de rango 0-20 (CP-RF016-23)", async () => {
      await expect(service.calificarEntrega(docente, "ent-1", { nota: 21 })).rejects.toThrow(
        "La nota debe estar entre 0 y 20.",
      );
    });

    it("permite devolver la entrega con motivo obligatorio (CP-RF016-24)", async () => {
      const res = await service.calificarEntrega(docente, "ent-1", {
        devolver: true,
        retroalimentacion: "Corrige el ejercicio 7",
      });

      expect(res.mensaje).toBe("Entrega devuelta para corrección.");
      expect(repo.devolverEntrega).toHaveBeenCalledWith("ent-1", "Corrige el ejercicio 7", "u-doc");
    });

    it("obtiene el libro de notas con cálculo ponderado y nota literal (CP-RF016-26, CP-RF016-27, CP-RF016-30)", async () => {
      repo.findEntregasDeEstudiante!.mockResolvedValue([
        {
          id: "ent-1",
          tareaId: "tar-1",
          matriculaId: "mat-1",
          intento: 1,
          nota: 16,
          estado: "calificada",
          esTardia: false,
        },
      ]);

      const libro = await service.obtenerLibroNotas(docente, "cs-mate", "per-2");
      expect(libro.estudiantes).toHaveLength(1);
      expect(libro.estudiantes[0].notaFinal).toBe(16);
      expect(libro.estudiantes[0].notaLiteral).toBe("A");
    });

    it("exporta el libro de notas en buffer Excel .xlsx (CP-RF016-27)", async () => {
      const buffer = await service.exportarExcelLibroNotas(docente, "cs-mate", "per-2", {
        institucion: "Colegio",
        generadoPor: "docente",
      });
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(100);
    });
  });
});
