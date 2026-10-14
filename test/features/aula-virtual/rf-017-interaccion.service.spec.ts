import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import { AuditService } from "@/common/services/audit.service";
import { AniosAcademicosService } from "@/features/anio-escolar/anios.service";
import { AulaVirtualRepository, AulaVirtualService } from "@/features/aula-virtual";
import { MENSAJES_INTERACCION } from "@/features/aula-virtual/constants";
import type {
  ActividadEstudianteMaterial,
  ComentarioMuroFila,
  CursoAula,
  HistorialModeracionFila,
  MensajeChatFila,
  PublicacionMuroFila,
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

const estudiante: AuthenticatedUser = {
  id: "u-est",
  username: "est",
  roleId: "r-est",
  role: "Estudiante",
  personaId: "per-est",
};

const estudiante2: AuthenticatedUser = {
  id: "u-est-2",
  username: "est2",
  roleId: "r-est",
  role: "Estudiante",
  personaId: "per-est-2",
};

const usuarioAjeno: AuthenticatedUser = {
  id: "u-ajeno",
  username: "ajeno",
  roleId: "r-est",
  role: "Estudiante",
  personaId: "per-ajeno",
};

const director: AuthenticatedUser = {
  id: "u-dir",
  username: "dir",
  roleId: "r-dir",
  role: "Director",
  personaId: "per-dir",
};

const curso: CursoAula = {
  id: "cs-mate",
  docenteId: "doc-1",
  seccionId: "sec-5a",
  anioAcademicoId: "anio-1",
  cursoNombre: "Matemática",
  seccionNombre: "5.° A",
};

describe("RF-017: Interacción y Actividad del Curso (CP-RF017-01 a 19)", () => {
  let service: AulaVirtualService;
  let repo: Mocks<AulaVirtualRepository>;
  let notificaciones: Mocks<NotificacionesService>;
  let audit: Mocks<AuditService>;

  beforeEach(() => {
    repo = {
      findCurso: jest.fn((id: string) => Promise.resolve(id === "cs-mate" ? curso : null)),
      findDocenteIdPorPersona: jest.fn((personaId: string) =>
        Promise.resolve(personaId === "per-doc" ? "doc-1" : null),
      ),
      obtenerDocenteUsuarioId: jest.fn((cursoId: string) =>
        Promise.resolve(cursoId === "cs-mate" ? "u-doc" : null),
      ),
      obtenerMatriculaActivaEstudiante: jest.fn((personaId: string, seccionId: string) => {
        if (seccionId === "sec-5a") {
          if (personaId === "per-est")
            return Promise.resolve({ id: "mat-est", estudianteId: "est-1" });
          if (personaId === "per-est-2")
            return Promise.resolve({ id: "mat-est-2", estudianteId: "est-2" });
        }
        return Promise.resolve(null);
      }),
      obtenerAnioPorCursoSeccion: jest.fn((cursoId: string) =>
        Promise.resolve(
          cursoId === "cs-mate" ? { id: "anio-1", anio: 2027, estado: "en_curso" } : null,
        ),
      ),
      usuariosEstudiantesDeSeccion: jest.fn(() => Promise.resolve(["u-est", "u-est-2"])),
      listarPublicacionesMuro: jest.fn(() => Promise.resolve([])),
      obtenerPublicacion: jest.fn(),
      crearPublicacion: jest.fn(),
      actualizarPublicacion: jest.fn(),
      fijarPublicacion: jest.fn(),
      listarComentarios: jest.fn(() => Promise.resolve([])),
      obtenerComentario: jest.fn(),
      crearComentario: jest.fn(),
      actualizarComentario: jest.fn(),
      listarMensajesChat: jest.fn(() => Promise.resolve([])),
      obtenerMensajeChat: jest.fn(),
      enviarMensajeChat: jest.fn(),
      actualizarUltimaLecturaChat: jest.fn(() => Promise.resolve()),
      contarMensajesNoLeidosChat: jest.fn(() => Promise.resolve(0)),
      ocultarContenido: jest.fn(() => Promise.resolve()),
      restaurarContenido: jest.fn(() => Promise.resolve()),
      listarHistorialModeracion: jest.fn(() => Promise.resolve([])),
      registrarActividad: jest.fn(() => Promise.resolve()),
      findMaterial: jest.fn(),
      findTarea: jest.fn(),
      obtenerActividadMaterial: jest.fn(() => Promise.resolve([])),
      obtenerActividadTarea: jest.fn(() => Promise.resolve([])),
    };

    notificaciones = {
      enviar: jest.fn(() => Promise.resolve()),
    };

    audit = {
      log: jest.fn(() => Promise.resolve()),
    };

    service = new AulaVirtualService(
      repo as unknown as AulaVirtualRepository,
      {} as unknown as AniosAcademicosService,
      {} as unknown as AnioLectivoCls,
      notificaciones as unknown as NotificacionesService,
      audit as unknown as AuditService,
    );
  });

  // ── HU1: Muro del curso ──

  describe("HU1: Muro del curso", () => {
    it("CP-RF017-01: Publicar en el muro notifica a los participantes", async () => {
      const pubMock: PublicacionMuroFila = {
        id: "pub-1",
        cursoSeccionId: "cs-mate",
        autorId: "u-est",
        autorNombre: "Pérez, Juan",
        contenido: "¿Alguien entendió el ejercicio 7?",
        adjuntoUrl: null,
        fijada: false,
        vigente: true,
        creadoEn: "2027-05-15T10:00:00Z",
        actualizadoEn: "2027-05-15T10:00:00Z",
        ocultadoPorId: null,
        ocultadoEn: null,
        motivoOcultamiento: null,
      };
      repo.crearPublicacion!.mockResolvedValue(pubMock);

      const resultado = await service.crearPublicacion(
        "cs-mate",
        { contenido: "¿Alguien entendió el ejercicio 7?" },
        estudiante,
      );

      expect(resultado.contenido).toBe("¿Alguien entendió el ejercicio 7?");
      expect(repo.crearPublicacion).toHaveBeenCalledWith({
        cursoSeccionId: "cs-mate",
        autorId: "u-est",
        contenido: "¿Alguien entendió el ejercicio 7?",
        adjuntoUrl: null,
        fijada: false,
      });

      // Notificaciones enviadas a participantes (docente y el otro estudiante, sin incluir al autor)
      expect(notificaciones.enviar).toHaveBeenCalledTimes(2);
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({ usuarioId: "u-doc" }),
      );
      expect(notificaciones.enviar).toHaveBeenCalledWith(
        expect.objectContaining({ usuarioId: "u-est-2" }),
      );
    });

    it("CP-RF017-02: Comentar una publicación aparece con autor y hora", async () => {
      repo.obtenerPublicacion!.mockResolvedValue({
        id: "pub-1",
        cursoSeccionId: "cs-mate",
        vigente: true,
      });

      const comMock: ComentarioMuroFila = {
        id: "com-1",
        publicacionId: "pub-1",
        autorId: "u-est-2",
        autorNombre: "Gómez, María",
        contenido: "Yo lo resolví factorizando.",
        vigente: true,
        creadoEn: "2027-05-15T10:05:00Z",
        actualizadoEn: "2027-05-15T10:05:00Z",
        ocultadoPorId: null,
        ocultadoEn: null,
        motivoOcultamiento: null,
      };
      repo.crearComentario!.mockResolvedValue(comMock);

      const comentario = await service.crearComentario(
        "pub-1",
        { contenido: "Yo lo resolví factorizando." },
        estudiante2,
      );

      expect(comentario.id).toBe("com-1");
      expect(comentario.autorNombre).toBe("Gómez, María");
      expect(repo.crearComentario).toHaveBeenCalledWith({
        publicacionId: "pub-1",
        autorId: "u-est-2",
        contenido: "Yo lo resolví factorizando.",
      });
    });

    it("CP-RF017-03: Publicación vacía sin texto ni adjunto es rechazada", async () => {
      await expect(
        service.crearPublicacion("cs-mate", { contenido: "   " }, estudiante),
      ).rejects.toThrow(new BadRequestException(MENSAJES_INTERACCION.PUBLICACION_VACIA));
    });

    it("CP-RF017-04: Adjunto muy pesado (> 10 MB) es rechazado", async () => {
      const archivoGrande = {
        size: 25 * 1024 * 1024,
        originalname: "grande.pdf",
        buffer: Buffer.from("x"),
      } as Express.Multer.File;

      await expect(
        service.crearPublicacion("cs-mate", { contenido: "Texto" }, estudiante, archivoGrande),
      ).rejects.toThrow(new BadRequestException(MENSAJES_INTERACCION.ADJUNTO_MUY_PESADO));
    });

    it("CP-RF017-05: Solo el docente puede fijar una publicación arriba", async () => {
      repo.obtenerPublicacion!.mockResolvedValue({
        id: "pub-1",
        cursoSeccionId: "cs-mate",
        fijada: false,
      });
      repo.fijarPublicacion!.mockResolvedValue({
        id: "pub-1",
        fijada: true,
      });

      // Docente fija con éxito
      const resDocente = await service.fijarPublicacion("pub-1", { fijada: true }, docente);
      expect(resDocente.fijada).toBe(true);
      expect(repo.fijarPublicacion).toHaveBeenCalledWith("pub-1", true);

      // Estudiante intenta fijar -> 403
      await expect(service.fijarPublicacion("pub-1", { fijada: true }, estudiante)).rejects.toThrow(
        new ForbiddenException(MENSAJES_INTERACCION.SOLO_DOCENTE_FIJA),
      );
    });

    it("CP-RF017-06: Editar fuera de plazo (> 15 min) es impedido", async () => {
      const hace30Minutos = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      repo.obtenerPublicacion!.mockResolvedValue({
        id: "pub-1",
        cursoSeccionId: "cs-mate",
        autorId: "u-est",
        contenido: "Texto viejo",
        creadoEn: hace30Minutos,
      });

      await expect(
        service.editarPublicacion("pub-1", { contenido: "Texto editado" }, estudiante),
      ).rejects.toThrow(new BadRequestException(MENSAJES_INTERACCION.EDICION_FUERA_DE_PLAZO));
    });

    it("CP-RF017-07: Usuario ajeno al curso recibe 403", async () => {
      await expect(service.listarPublicacionesMuro("cs-mate", usuarioAjeno)).rejects.toThrow(
        new ForbiddenException(MENSAJES_INTERACCION.SIN_ACCESO),
      );
    });
  });

  // ── HU2: Chat grupal del curso ──

  describe("HU2: Chat grupal del curso", () => {
    it("CP-RF017-08: Enviar mensaje al chat aparece para el grupo", async () => {
      const msgMock: MensajeChatFila = {
        id: "msg-1",
        cursoSeccionId: "cs-mate",
        emisorId: "u-est",
        emisorNombre: "Pérez, Juan",
        contenido: "¿La tarea es para el lunes?",
        adjuntoUrl: null,
        vigente: true,
        enviadoEn: "2027-05-15T11:00:00Z",
        actualizadoEn: null,
        ocultadoPorId: null,
        ocultadoEn: null,
        motivoOcultamiento: null,
      };
      repo.enviarMensajeChat!.mockResolvedValue(msgMock);

      const msg = await service.enviarMensajeChat(
        "cs-mate",
        { mensaje: "¿La tarea es para el lunes?" },
        estudiante,
      );

      expect(msg.contenido).toBe("¿La tarea es para el lunes?");
      expect(repo.enviarMensajeChat).toHaveBeenCalledWith({
        cursoSeccionId: "cs-mate",
        emisorId: "u-est",
        contenido: "¿La tarea es para el lunes?",
        adjuntoUrl: null,
      });
      // El chat no emite notificaciones individuales
      expect(notificaciones.enviar).not.toHaveBeenCalled();
    });

    it("CP-RF017-09: Contador de mensajes sin leer devuelve el número de mensajes nuevos", async () => {
      repo.contarMensajesNoLeidosChat!.mockResolvedValue(5);

      const res = await service.obtenerMensajesNoLeidosChat("cs-mate", estudiante);
      expect(res.noLeidos).toBe(5);
      expect(repo.contarMensajesNoLeidosChat).toHaveBeenCalledWith("cs-mate", "u-est");
      expect(notificaciones.enviar).not.toHaveBeenCalled();
    });

    it("CP-RF017-10: Sin mensajes privados (el repositorio y servicio no tienen receptorId)", async () => {
      repo.enviarMensajeChat!.mockResolvedValue({
        id: "msg-priv",
        cursoSeccionId: "cs-mate",
        emisorId: "u-est",
        contenido: "Mensaje",
      });

      await service.enviarMensajeChat("cs-mate", { mensaje: "Mensaje" }, estudiante);
      expect(repo.enviarMensajeChat).toHaveBeenCalledWith({
        cursoSeccionId: "cs-mate",
        emisorId: "u-est",
        contenido: "Mensaje",
        adjuntoUrl: null,
      });
    });

    it("CP-RF017-11: Estudiante retirado ve rechazado el acceso al chat", async () => {
      const estudianteRetirado: AuthenticatedUser = {
        id: "u-retirado",
        username: "retirado",
        roleId: "r-est",
        role: "Estudiante",
        personaId: "per-retirado",
      };
      repo.obtenerMatriculaActivaEstudiante!.mockResolvedValue(null);

      await expect(service.listarMensajesChat("cs-mate", estudianteRetirado)).rejects.toThrow(
        new ForbiddenException(MENSAJES_INTERACCION.SIN_ACCESO),
      );
    });
  });

  // ── HU3: Moderación ──

  describe("HU3: Moderación", () => {
    it("CP-RF017-12: Docente oculta un mensaje con motivo", async () => {
      repo.obtenerMensajeChat!.mockResolvedValue({
        id: "msg-ofensivo",
        cursoSeccionId: "cs-mate",
        contenido: "Mensaje ofensivo",
      });

      const res = await service.ocultarContenido(
        "chat",
        "msg-ofensivo",
        { motivo: "Lenguaje inapropiado" },
        docente,
      );

      expect(res.mensaje).toBe(MENSAJES_INTERACCION.CONTENIDO_OCULTADO);
      expect(repo.ocultarContenido).toHaveBeenCalledWith(
        "chat",
        "msg-ofensivo",
        "u-doc",
        "Lenguaje inapropiado",
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: "eliminar",
          tabla: "mensajes_chat",
          registroId: "msg-ofensivo",
        }),
      );
    });

    it("CP-RF017-13: Ocultar sin motivo es rechazado", async () => {
      await expect(
        service.ocultarContenido("chat", "msg-1", { motivo: "   " }, docente),
      ).rejects.toThrow(new BadRequestException(MENSAJES_INTERACCION.MOTIVO_REQUERIDO));
    });

    it("CP-RF017-14: Restaurar un contenido vuelve a ser visible", async () => {
      repo.obtenerComentario!.mockResolvedValue({
        id: "com-1",
        publicacionId: "pub-1",
      });
      repo.obtenerPublicacion!.mockResolvedValue({
        id: "pub-1",
        cursoSeccionId: "cs-mate",
      });

      const res = await service.restaurarContenido("comentario", "com-1", docente);
      expect(res.mensaje).toBe(MENSAJES_INTERACCION.CONTENIDO_RESTAURADO);
      expect(repo.restaurarContenido).toHaveBeenCalledWith("comentario", "com-1");
    });

    it("CP-RF017-15: Director puede consultar el historial de moderación", async () => {
      const historialMock: HistorialModeracionFila[] = [
        {
          id: "msg-1",
          tipo: "chat",
          cursoSeccionId: "cs-mate",
          contenido: "Mensaje indebido",
          adjuntoUrl: null,
          autorNombre: "Pérez, Juan",
          ocultadoPorNombre: "García, Profe",
          ocultadoEn: "2027-05-15T12:00:00Z",
          motivoOcultamiento: "Lenguaje inapropiado",
        },
      ];
      repo.listarHistorialModeracion!.mockResolvedValue(historialMock);

      const historial = await service.listarHistorialModeracion("cs-mate", director);
      expect(historial).toHaveLength(1);
      expect(historial[0].motivoOcultamiento).toBe("Lenguaje inapropiado");
    });

    it("CP-RF017-16: Un estudiante no puede moderar", async () => {
      repo.obtenerPublicacion!.mockResolvedValue({
        id: "pub-1",
        cursoSeccionId: "cs-mate",
      });

      await expect(
        service.ocultarContenido("publicacion", "pub-1", { motivo: "No me gusta" }, estudiante),
      ).rejects.toThrow(new ForbiddenException(MENSAJES_INTERACCION.SOLO_DOCENTE_MODERA));
    });
  });

  // ── HU4: Actividad de los estudiantes ──

  describe("HU4: Actividad de los estudiantes", () => {
    it("CP-RF017-17: Registro automático cuando el estudiante ve y descarga material", async () => {
      repo.findMaterial!.mockResolvedValue({
        id: "mat-1",
        cursoSeccionId: "cs-mate",
      });

      await service.registrarActividad({ materialId: "mat-1", accion: "visualizo" }, estudiante);
      expect(repo.registrarActividad).toHaveBeenCalledWith({
        matriculaId: "mat-est",
        materialId: "mat-1",
        tareaId: null,
        accion: "visualizo",
      });

      await service.registrarActividad({ materialId: "mat-1", accion: "descargo" }, estudiante);
      expect(repo.registrarActividad).toHaveBeenCalledWith({
        matriculaId: "mat-est",
        materialId: "mat-1",
        tareaId: null,
        accion: "descargo",
      });
    });

    it("CP-RF017-18: Ver quién revisó un material muestra la lista de estudiantes", async () => {
      repo.findMaterial!.mockResolvedValue({
        id: "mat-1",
        cursoSeccionId: "cs-mate",
      });

      const actividadMock: ActividadEstudianteMaterial[] = [
        {
          matriculaId: "mat-est",
          estudianteId: "est-1",
          codigo: "EST001",
          nombreCompleto: "Pérez, Juan",
          visualizo: true,
          visualizoEn: "2027-05-15T09:00:00Z",
          descargo: true,
          descargoEn: "2027-05-15T09:05:00Z",
        },
        {
          matriculaId: "mat-est-2",
          estudianteId: "est-2",
          codigo: "EST002",
          nombreCompleto: "Gómez, María",
          visualizo: false,
          visualizoEn: null,
          descargo: false,
          descargoEn: null,
        },
      ];
      repo.obtenerActividadMaterial!.mockResolvedValue(actividadMock);

      const actividad = await service.obtenerActividadMaterial("mat-1", docente);
      expect(actividad).toHaveLength(2);
      expect(actividad[0].visualizo).toBe(true);
      expect(actividad[1].visualizo).toBe(false);
    });

    it("CP-RF017-19: Con año cerrado, muro y chat quedan en solo lectura", async () => {
      repo.obtenerAnioPorCursoSeccion!.mockResolvedValue({
        id: "anio-1",
        anio: 2027,
        estado: "cerrado",
      });

      await expect(
        service.crearPublicacion("cs-mate", { contenido: "Hola" }, docente),
      ).rejects.toThrow(new BadRequestException(MENSAJES_INTERACCION.ANIO_CERRADO));

      await expect(
        service.enviarMensajeChat("cs-mate", { mensaje: "Hola" }, docente),
      ).rejects.toThrow(new BadRequestException(MENSAJES_INTERACCION.ANIO_CERRADO));
    });
  });
});
