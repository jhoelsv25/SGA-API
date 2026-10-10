import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "@/common/services/audit.service";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";
import { ComunicadosRepository } from "@/features/comunicados/repositories/comunicados.repository";
import { ComunicadosService } from "@/features/comunicados/services/comunicados.service";

describe("ComunicadosService", () => {
  let service: ComunicadosService;
  let repo: jest.Mocked<ComunicadosRepository>;
  let audit: jest.Mocked<AuditService>;
  let notificaciones: jest.Mocked<NotificacionesService>;

  beforeEach(async () => {
    const mockRepo = {
      findByQuery: jest.fn(),
      findById: jest.fn(),
      esTutorDeSeccion: jest.fn(),
      insert: jest.fn(),
      updateEstado: jest.fn(),
      findDestinatarios: jest.fn(),
      registrarNotificacionesComunicado: jest.fn(),
      marcarLectura: jest.fn(),
      obtenerAvanceLectura: jest.fn(),
    };

    const mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const mockNotificaciones = {
      enviar: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComunicadosService,
        { provide: ComunicadosRepository, useValue: mockRepo },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificacionesService, useValue: mockNotificaciones },
      ],
    }).compile();

    service = module.get<ComunicadosService>(ComunicadosService);
    repo = module.get(ComunicadosRepository);
    audit = module.get(AuditService);
    notificaciones = module.get(NotificacionesService);
  });

  describe("crear", () => {
    it("debe guardar un comunicado en borrador sin notificar destinatarios", async () => {
      repo.insert.mockResolvedValue({ id: "com-123" });

      const res = await service.crear(
        {
          titulo: "Reunión de Padres",
          contenido: "Detalle de la reunión",
          dirigidoA: "apoderados",
          publicar: false,
        },
        { id: "director-1", rol: "Director" },
      );

      expect(res.id).toBe("com-123");
      expect(repo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: "borrador",
          publicadoEn: null,
        }),
      );
      expect(repo.findDestinatarios).not.toHaveBeenCalled();
      expect(notificaciones.enviar).not.toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "crear", tabla: "comunicados" }),
      );
    });

    it("debe publicar directamente notificando a los destinatarios calculados", async () => {
      repo.findDestinatarios.mockResolvedValue([
        { usuarioId: "u-1", nombreCompleto: "Juan", tipo: "apoderado" },
        { usuarioId: "u-2", nombreCompleto: "Ana", tipo: "apoderado" },
      ]);
      repo.insert.mockResolvedValue({ id: "com-pub" });

      const res = await service.crear(
        {
          titulo: "Aviso Urgente",
          contenido: "Suspensión de clases",
          dirigidoA: "apoderados",
          prioridad: "urgente",
          publicar: true,
        },
        { id: "director-1", rol: "Director" },
      );

      expect(res.id).toBe("com-pub");
      expect(res.message).toContain("2 destinatarios");
      expect(repo.registrarNotificacionesComunicado).toHaveBeenCalledWith(
        "com-pub",
        "Aviso Urgente",
        expect.any(String),
        "alerta",
        ["u-1", "u-2"],
      );
      expect(notificaciones.enviar).toHaveBeenCalledTimes(2);
    });

    it("debe rechazar si un tutor intenta enviar a todo el colegio", async () => {
      await expect(
        service.crear(
          {
            titulo: "Comunicado del Tutor",
            contenido: "Aviso",
            dirigidoA: "todos",
            publicar: false,
          },
          { id: "tutor-1", rol: "Docente" },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("debe rechazar si la fecha de vencimiento es anterior o igual a hoy", async () => {
      const ayer = new Date(Date.now() - 86400000).toISOString();
      await expect(
        service.crear(
          {
            titulo: "Aviso Vencido",
            contenido: "Prueba",
            dirigidoA: "todos",
            venceEn: ayer,
            publicar: false,
          },
          { id: "dir-1", rol: "Director" },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("debe rechazar la publicación si no hay destinatarios", async () => {
      repo.findDestinatarios.mockResolvedValue([]);

      await expect(
        service.crear(
          {
            titulo: "Sin Destinatarios",
            contenido: "Prueba",
            dirigidoA: "estudiantes",
            publicar: true,
          },
          { id: "dir-1", rol: "Director" },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("publicar", () => {
    it("debe publicar un borrador existente y despachar notificaciones", async () => {
      repo.findById.mockResolvedValue({
        id: "com-1",
        autorId: "dir-1",
        autorNombre: "Director",
        titulo: "Paseo Escolar",
        contenido: "Detalle del paseo",
        dirigidoA: "todos",
        prioridad: "normal",
        estado: "borrador",
        creadoEn: "2026-10-10",
        totalDestinatarios: 0,
        totalLeidos: 0,
        porcentajeLectura: 0,
        leidoPorMi: false,
      });

      repo.findDestinatarios.mockResolvedValue([
        { usuarioId: "u-1", nombreCompleto: "Pedro", tipo: "docente" },
      ]);

      const res = await service.publicar("com-1", { id: "dir-1", rol: "Director" });

      expect(res.message).toContain("1 destinatarios");
      expect(repo.updateEstado).toHaveBeenCalledWith("com-1", "publicado", expect.any(String));
      expect(notificaciones.enviar).toHaveBeenCalledTimes(1);
    });

    it("debe rechazar si el comunicado ya está publicado", async () => {
      repo.findById.mockResolvedValue({
        id: "com-1",
        autorId: "dir-1",
        autorNombre: "Director",
        titulo: "Publicado",
        contenido: "Ya activo",
        dirigidoA: "todos",
        prioridad: "normal",
        estado: "publicado",
        creadoEn: "2026-10-10",
        totalDestinatarios: 10,
        totalLeidos: 5,
        porcentajeLectura: 50,
        leidoPorMi: false,
      });

      await expect(service.publicar("com-1", { id: "dir-1", rol: "Director" })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("archivar", () => {
    it("debe archivar un comunicado si el usuario es el autor", async () => {
      repo.findById.mockResolvedValue({
        id: "com-1",
        autorId: "dir-1",
        autorNombre: "Director",
        titulo: "Viejo",
        contenido: "Pasado",
        dirigidoA: "todos",
        prioridad: "normal",
        estado: "publicado",
        creadoEn: "2026-10-10",
        totalDestinatarios: 10,
        totalLeidos: 8,
        porcentajeLectura: 80,
        leidoPorMi: true,
      });

      const res = await service.archivar("com-1", { id: "dir-1", rol: "Director" });
      expect(res.message).toContain("archivado");
      expect(repo.updateEstado).toHaveBeenCalledWith("com-1", "archivado");
    });
  });

  describe("obtenerPorId", () => {
    it("debe registrar automáticamente la lectura si el lector es un destinatario", async () => {
      repo.findById.mockResolvedValue({
        id: "com-1",
        autorId: "autor-otro",
        autorNombre: "Profesor",
        titulo: "Aviso",
        contenido: "Texto",
        dirigidoA: "todos",
        prioridad: "normal",
        estado: "publicado",
        creadoEn: "2026-10-10",
        totalDestinatarios: 1,
        totalLeidos: 0,
        porcentajeLectura: 0,
        leidoPorMi: false,
      });

      const com = await service.obtenerPorId("com-1", { id: "alumno-1", rol: "Estudiante" });
      expect(com.leidoPorMi).toBe(true);
      expect(repo.marcarLectura).toHaveBeenCalledWith("com-1", "alumno-1");
    });
  });

  describe("obtenerAvanceLectura", () => {
    it("debe retornar el avance si quien consulta es el autor", async () => {
      repo.findById.mockResolvedValue({
        id: "com-1",
        autorId: "dir-1",
        autorNombre: "Director",
        titulo: "Aviso",
        contenido: "Texto",
        dirigidoA: "todos",
        prioridad: "normal",
        estado: "publicado",
        creadoEn: "2026-10-10",
        totalDestinatarios: 2,
        totalLeidos: 1,
        porcentajeLectura: 50,
        leidoPorMi: true,
      });

      repo.obtenerAvanceLectura.mockResolvedValue({
        comunicadoId: "com-1",
        titulo: "Aviso",
        totalDestinatarios: 2,
        totalLeidos: 1,
        porcentajeLectura: 50,
        destinatarios: [
          { usuarioId: "u-1", nombreCompleto: "Ana", tipoDestinatario: "docente", leido: true },
          { usuarioId: "u-2", nombreCompleto: "Luis", tipoDestinatario: "apoderado", leido: false },
        ],
      });

      const res = await service.obtenerAvanceLectura("com-1", { id: "dir-1", rol: "Director" });
      expect(res.porcentajeLectura).toBe(50);
      expect(res.destinatarios).toHaveLength(2);
    });

    it("debe rechazar si quien consulta no es el autor", async () => {
      repo.findById.mockResolvedValue({
        id: "com-1",
        autorId: "otro-autor",
        autorNombre: "Otro",
        titulo: "Aviso",
        contenido: "Texto",
        dirigidoA: "todos",
        prioridad: "normal",
        estado: "publicado",
        creadoEn: "2026-10-10",
        totalDestinatarios: 2,
        totalLeidos: 1,
        porcentajeLectura: 50,
        leidoPorMi: false,
      });

      await expect(
        service.obtenerAvanceLectura("com-1", { id: "alumno-1", rol: "Estudiante" }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
