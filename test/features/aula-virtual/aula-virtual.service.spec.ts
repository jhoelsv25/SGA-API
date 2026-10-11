import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import { AuditService } from "@/common/services/audit.service";
import { AniosAcademicosService } from "@/features/anio-escolar/anios.service";
import { AulaVirtualRepository, AulaVirtualService } from "@/features/aula-virtual";
import type {
  ContenidoMaterial,
  MaterialFila,
  NuevaUnidad,
  NuevoMaterial,
  PeriodoAula,
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
  titulo: "Ecuaciones",
  descripcion: null,
  orden: 1,
  fechaInicio: "2027-05-12",
  fechaFin: "2027-06-06",
  publicada: true,
};

function material(parcial: Partial<MaterialFila> = {}): MaterialFila {
  return {
    id: "mat-1",
    unidadId: "uni-1",
    cursoSeccionId: "cs-mate",
    periodoId: "per-2",
    docenteId: "doc-1",
    titulo: "Separata de práctica",
    descripcion: null,
    tipo: "documento",
    url: null,
    archivoNombre: null,
    archivoTamanoBytes: null,
    horarioId: null,
    esPlanificado: true,
    fechaCongelada: true,
    vigente: true,
    visible: true,
    orden: 1,
    fechaProgramada: "2027-05-30",
    publicadoEn: null,
    sesionClaseId: null,
    ...parcial,
  };
}

function archivo(nombre: string, mb: number): Express.Multer.File {
  return {
    originalname: nombre,
    size: mb * 1024 * 1024,
    buffer: Buffer.alloc(8),
  } as Express.Multer.File;
}

describe("RF-015: Aula virtual - unidades y materiales", () => {
  let service: AulaVirtualService;
  let repo: Mocks<AulaVirtualRepository>;
  let notificaciones: Mocks<NotificacionesService>;
  let audit: Mocks<AuditService>;

  const iniciar = (hoy: string) => jest.useFakeTimers({ now: new Date(`${hoy}T10:00:00-05:00`) });

  beforeEach(() => {
    iniciar("2027-05-05");
    repo = {
      findDocenteIdPorPersona: jest.fn((personaId: string) =>
        Promise.resolve(personaId === "per-doc" ? "doc-1" : "doc-otro"),
      ),
      findCurso: jest.fn().mockResolvedValue(curso),
      findPeriodo: jest.fn().mockResolvedValue(bimestre),
      findUnidad: jest.fn().mockResolvedValue(unidad),
      leerVariableEntera: jest.fn((codigo: string, defecto: number) =>
        Promise.resolve(codigo === "material.tamano_maximo_mb" ? 50 : defecto),
      ),
      siguienteOrdenMaterial: jest.fn().mockResolvedValue(1),
      siguienteOrdenUnidad: jest.fn().mockResolvedValue(1),
      crearUnidad: jest.fn((datos: NuevaUnidad) => Promise.resolve({ id: "uni-n", ...datos })),
      crearMaterial: jest.fn((datos: NuevoMaterial) =>
        Promise.resolve(material({ ...datos, id: "mat-n", cursoSeccionId: "cs-mate" })),
      ),
      findHorario: jest.fn().mockResolvedValue({
        id: "hor-1",
        cursoSeccionId: "cs-mate",
        diaSemana: 4,
        horaInicio: "08:30:00",
        horaFin: "09:15:00",
        tipoBloque: "clase",
      }),
      findSesionDeBloque: jest.fn().mockResolvedValue(null),
      historialCambiosFecha: jest.fn().mockResolvedValue([]),
      findMaterial: jest.fn().mockResolvedValue(material()),
      findSolicitudAbierta: jest.fn().mockResolvedValue(null),
      crearSolicitud: jest.fn().mockResolvedValue({ id: "sol-1" }),
      usuariosConRol: jest.fn().mockResolvedValue(["u-sub"]),
      usuariosEstudiantesDeSeccion: jest.fn().mockResolvedValue(["u-e1", "u-e2"]),
      publicarMaterial: jest.fn((id: string, contenido: ContenidoMaterial, publicadoEn: string) =>
        Promise.resolve(material({ id, ...contenido, publicadoEn, fechaProgramada: "2027-05-15" })),
      ),
      findSolicitud: jest.fn(),
      aprobarSolicitud: jest.fn().mockResolvedValue(undefined),
      rechazarSolicitud: jest.fn().mockResolvedValue(undefined),
      reemplazarContenido: jest.fn(),
      retirarMaterial: jest.fn().mockResolvedValue(undefined),
      actualizarMaterial: jest.fn(),
    };
    notificaciones = { enviar: jest.fn().mockResolvedValue(undefined) };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new AulaVirtualService(
      repo as unknown as AulaVirtualRepository,
      {} as AniosAcademicosService,
      { id: () => undefined } as unknown as AnioLectivoCls,
      notificaciones as unknown as NotificacionesService,
      audit as unknown as AuditService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe("HU1: unidades", () => {
    const dto = {
      titulo: "Ecuaciones",
      periodoId: "per-2",
      fechaInicio: "2027-05-12",
      fechaFin: "2027-06-06",
    };

    it("crea una unidad visible para el docente asignado", async () => {
      const unidadCreada = await service.crearUnidad("cs-mate", dto, docente);

      expect(unidadCreada.titulo).toBe("Ecuaciones");
      expect(repo.crearUnidad).toHaveBeenCalledWith(
        expect.objectContaining({ publicada: true, orden: 1 }),
      );
      expect(audit.log).toHaveBeenCalled();
    });

    it("rechaza fechas invertidas", async () => {
      await expect(
        service.crearUnidad("cs-mate", { ...dto, fechaFin: "2027-05-01" }, docente),
      ).rejects.toThrow("La fecha de fin de la unidad debe ser igual o posterior a la de inicio.");
    });

    it("rechaza a quien no dicta el curso", async () => {
      await expect(service.crearUnidad("cs-mate", dto, otroDocente)).rejects.toThrow(
        new ForbiddenException("Solo el docente asignado puede administrar esta aula virtual."),
      );
    });
  });

  describe("HU2: planificar", () => {
    it("planifica ligado a un bloque con la fecha de la clase", async () => {
      const resultado = await service.planificarMaterial(
        "uni-1",
        { titulo: "Video", tipo: "video", horarioId: "hor-1", fechaClase: "2027-05-13" },
        docente,
      );

      expect(resultado.mensaje).toBe("Material planificado para el 13/05/2027.");
      expect(repo.crearMaterial).toHaveBeenCalledWith(
        expect.objectContaining({
          horarioId: "hor-1",
          fechaProgramada: "2027-05-13",
          fechaCongelada: false,
        }),
      );
    });

    it("rechaza una fecha de clase que no cae en el día del bloque", async () => {
      await expect(
        service.planificarMaterial(
          "uni-1",
          { titulo: "Video", tipo: "video", horarioId: "hor-1", fechaClase: "2027-05-14" },
          docente,
        ),
      ).rejects.toThrow("La fecha elegida no corresponde al día de la semana del bloque.");
    });

    it("planifica sin clase con fecha libre", async () => {
      const resultado = await service.planificarMaterial(
        "uni-1",
        { titulo: "Separata", tipo: "documento", fechaProgramada: "2027-05-30" },
        docente,
      );

      expect(resultado.mensaje).toBe("Material planificado para el 30/05/2027.");
    });

    it("rechaza una fecha fuera del bimestre", async () => {
      await expect(
        service.planificarMaterial(
          "uni-1",
          { titulo: "Separata", tipo: "documento", fechaProgramada: "2027-08-10" },
          docente,
        ),
      ).rejects.toThrow("La fecha programada debe estar dentro del bimestre.");
    });

    it("fuera de la ventana exige al menos 7 días y congela la fecha", async () => {
      iniciar("2027-06-02");

      await expect(
        service.planificarMaterial(
          "uni-1",
          { titulo: "Separata", tipo: "documento", fechaProgramada: "2027-06-05" },
          docente,
        ),
      ).rejects.toThrow(
        "Fuera de la semana de planificación, la fecha programada debe ser al menos 7 días después de hoy.",
      );

      await service.planificarMaterial(
        "uni-1",
        { titulo: "Separata", tipo: "documento", fechaProgramada: "2027-06-10" },
        docente,
      );
      expect(repo.crearMaterial).toHaveBeenCalledWith(
        expect.objectContaining({ fechaCongelada: true }),
      );
    });

    it("bloquea la planificación en un bimestre cerrado", async () => {
      repo.findPeriodo?.mockResolvedValue({ ...bimestre, estado: "cerrado" });

      await expect(
        service.planificarMaterial(
          "uni-1",
          { titulo: "Separata", tipo: "documento", fechaProgramada: "2027-05-30" },
          docente,
        ),
      ).rejects.toThrow(
        "El bimestre está cerrado. Ya no se pueden planificar materiales ni cambiar fechas.",
      );
    });

    it("congela la edición de la fecha al cerrar la ventana", async () => {
      iniciar("2027-06-02");
      repo.findMaterial?.mockResolvedValue(material({ fechaCongelada: false }));

      await expect(
        service.actualizarMaterial("mat-1", { fechaProgramada: "2027-06-20" }, docente),
      ).rejects.toThrow(
        new ForbiddenException(
          "La fecha programada está congelada. Solicite el cambio al Subdirector.",
        ),
      );
    });
  });

  describe("HU3: solicitud de cambio de fecha", () => {
    beforeEach(() => iniciar("2027-06-02"));

    it("envía la solicitud y avisa al Subdirector", async () => {
      const resultado = await service.solicitarCambioFecha(
        "mat-1",
        { fechaSolicitada: "2027-06-06", motivo: "Se suspendieron clases el 28/05" },
        docente,
      );

      expect(resultado.mensaje).toBe("Su solicitud de cambio de fecha fue enviada al Subdirector.");
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({ usuarioId: "u-sub" }),
      );
    });

    it("exige el motivo", async () => {
      await expect(
        service.solicitarCambioFecha("mat-1", { fechaSolicitada: "2027-06-06" }, docente),
      ).rejects.toThrow("Indique el motivo del cambio de fecha.");
    });

    it("no admite una segunda solicitud abierta", async () => {
      repo.findSolicitudAbierta?.mockResolvedValue({ id: "sol-0" });

      await expect(
        service.solicitarCambioFecha(
          "mat-1",
          { fechaSolicitada: "2027-06-06", motivo: "Otro" },
          docente,
        ),
      ).rejects.toThrow("Ya tiene una solicitud pendiente para este material.");
    });

    it("bloquea la solicitud en un bimestre cerrado", async () => {
      repo.findPeriodo?.mockResolvedValue({ ...bimestre, estado: "cerrado" });

      await expect(
        service.solicitarCambioFecha(
          "mat-1",
          { fechaSolicitada: "2027-06-06", motivo: "x" },
          docente,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    const solicitud = {
      id: "sol-1",
      materialId: "mat-1",
      materialTitulo: "Separata de práctica",
      cursoSeccionId: "cs-mate",
      cursoNombre: "Matemática",
      seccionNombre: "5.° A",
      docenteNombre: "Docente",
      fechaAnterior: "2027-05-30",
      fechaSolicitada: "2027-06-06",
      motivo: "x",
      estado: "solicitada" as const,
      solicitadoPorId: "u-doc",
      solicitadoEn: "2027-06-02 09:00:00",
      resueltoEn: null,
      respuesta: null,
    };
    const subdirector: AuthenticatedUser = { ...docente, id: "u-sub", role: "Subdirector" };

    it("al aprobar aplica la nueva fecha y notifica al docente", async () => {
      repo.findSolicitud?.mockResolvedValue(solicitud);

      await service.aprobarSolicitud("sol-1", {}, subdirector);

      expect(repo.aprobarSolicitud).toHaveBeenCalledWith("sol-1", "u-sub", null);
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({ usuarioId: "u-doc" }),
      );
    });

    it("al rechazar exige la respuesta", async () => {
      repo.findSolicitud?.mockResolvedValue(solicitud);

      await expect(service.rechazarSolicitud("sol-1", {}, subdirector)).rejects.toThrow(
        "Indique la respuesta para el docente.",
      );
      await service.rechazarSolicitud(
        "sol-1",
        { respuesta: "La suspensión no afecta tu curso" },
        subdirector,
      );
      expect(repo.rechazarSolicitud).toHaveBeenCalledWith(
        "sol-1",
        "u-sub",
        "La suspensión no afecta tu curso",
      );
    });
  });

  describe("HU4: publicar", () => {
    it("publica a tiempo, guarda el enlace y avisa a los estudiantes", async () => {
      iniciar("2027-05-14");
      repo.findMaterial?.mockResolvedValue(
        material({ tipo: "enlace", fechaProgramada: "2027-05-15" }),
      );

      const resultado = await service.publicarPlanificado(
        "mat-1",
        { enlace: "https://youtu.be/abc" },
        undefined,
        docente,
      );

      expect(resultado.mensaje).toBe("Material publicado a tiempo.");
      expect(notificaciones.enviar).toHaveBeenCalledTimes(2);
    });

    it("publica fuera de plazo con el mensaje de la fecha programada", async () => {
      iniciar("2027-05-17");
      repo.findMaterial?.mockResolvedValue(
        material({ tipo: "enlace", fechaProgramada: "2027-05-15" }),
      );

      const resultado = await service.publicarPlanificado(
        "mat-1",
        { enlace: "https://youtu.be/abc" },
        undefined,
        docente,
      );

      expect(resultado.mensaje).toBe(
        "Material publicado fuera de plazo (fecha programada: 15/05/2027).",
      );
    });

    it("rechaza enlaces sin http", async () => {
      repo.findMaterial?.mockResolvedValue(material({ tipo: "enlace" }));

      await expect(
        service.publicarPlanificado("mat-1", { enlace: "www.youtube.com/abc" }, undefined, docente),
      ).rejects.toThrow("Ingrese un enlace válido que empiece con http:// o https://.");
    });

    it("rechaza archivos de más de 50 MB", async () => {
      repo.findMaterial?.mockResolvedValue(material({ tipo: "video" }));

      await expect(
        service.publicarPlanificado("mat-1", {}, archivo("clase.mp4", 80), docente),
      ).rejects.toThrow("El archivo supera el máximo de 50 MB.");
    });

    it("rechaza un formato que no corresponde al tipo", async () => {
      repo.findMaterial?.mockResolvedValue(material({ tipo: "documento" }));

      await expect(
        service.publicarPlanificado("mat-1", {}, archivo("audio.mp3", 1), docente),
      ).rejects.toThrow("Formato no permitido para el tipo de material elegido.");
    });

    it("un material extra no cuenta en el IGM (sin fecha programada ni plazo)", async () => {
      repo.publicarMaterial?.mockResolvedValue(
        material({
          id: "mat-n",
          esPlanificado: false,
          fechaProgramada: null,
          url: "https://example.com",
          publicadoEn: "2027-05-05 10:00:00",
        }),
      );
      const resultado = await service.publicarExtra(
        "uni-1",
        { titulo: "Lectura", tipo: "enlace", enlace: "https://example.com" },
        undefined,
        docente,
      );

      expect(resultado.material.esExtra).toBe(true);
      expect(resultado.material.plazo).toBeNull();
      expect(repo.crearMaterial).toHaveBeenCalledWith(
        expect.objectContaining({ esPlanificado: false, fechaProgramada: null }),
      );
    });

    it("solo retira materiales ya publicados", async () => {
      await expect(service.retirarMaterial("mat-1", docente)).rejects.toThrow(
        "Solo se puede retirar un material ya publicado.",
      );
    });
  });

  describe("HU5: seguimiento", () => {
    it("calcula el porcentaje a tiempo por fila y en total", async () => {
      repo.seguimiento = jest.fn().mockResolvedValue([
        {
          docenteId: "doc-1",
          docenteNombre: "Docente Uno",
          cursoSeccionId: "cs-mate",
          cursoNombre: "Matemática",
          seccionNombre: "5.° A",
          planificados: 4,
          aTiempo: 3,
          fueraDePlazo: 1,
          noPublicados: 0,
          solicitudesPendientes: 1,
        },
      ]);

      const resumen = await service.seguimiento("per-2");

      expect(resumen.filas[0].porcentajeATiempo).toBe(75);
      expect(resumen.totales).toEqual(
        expect.objectContaining({ planificados: 4, aTiempo: 3, solicitudesPendientes: 1 }),
      );
    });
  });
});
