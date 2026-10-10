import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getQueueToken } from "@nestjs/bullmq";
import { QUEUES } from "../../../src/core/queues/queues.constants";
import { NotificacionesService } from "../../../src/features/notificaciones/notificaciones.service";
import { NotificacionesRepository } from "../../../src/features/notificaciones/repositories";

describe("NotificacionesService", () => {
  let service: NotificacionesService;
  let repository: jest.Mocked<NotificacionesRepository>;
  let mockQueue: { add: jest.Mock };

  beforeEach(async () => {
    const mockRepo = {
      insertDirect: jest.fn(),
      findByUsuario: jest.fn(),
      countUnread: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
    };

    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: "job-123" }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificacionesService,
        {
          provide: NotificacionesRepository,
          useValue: mockRepo,
        },
        {
          provide: getQueueToken(QUEUES.NOTIFICATIONS),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<NotificacionesService>(NotificacionesService);
    repository = module.get(NotificacionesRepository);
  });

  describe("enviar", () => {
    it("debe encolar la notificación en BullMQ si la cola está disponible", async () => {
      await service.enviar({
        usuarioId: "user-1",
        titulo: "Nueva Tarea",
        mensaje: "Tarea de matemáticas asignada",
        tipo: "informacion",
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        "enviar-notificacion",
        expect.objectContaining({ usuarioId: "user-1", titulo: "Nueva Tarea" }),
        expect.any(Object),
      );
      expect(repository.insertDirect).not.toHaveBeenCalled();
    });

    it("debe hacer fallback a inserción directa si BullMQ falla", async () => {
      mockQueue.add.mockRejectedValueOnce(new Error("Redis offline"));

      await service.enviar({
        usuarioId: "user-1",
        titulo: "Aviso Urgente",
        mensaje: "Reunión cancelada",
      });

      expect(repository.insertDirect).toHaveBeenCalledWith(
        expect.objectContaining({ usuarioId: "user-1", titulo: "Aviso Urgente" }),
      );
    });
  });

  describe("marcarComoLeida", () => {
    it("debe retornar confirmación si la notificación se actualiza", async () => {
      repository.markAsRead.mockResolvedValue(true);

      const result = await service.marcarComoLeida("notif-1", "user-1");

      expect(result).toEqual({ message: "Notificación marcada como leída.", id: "notif-1" });
      expect(repository.markAsRead).toHaveBeenCalledWith("notif-1", "user-1");
    });

    it("debe lanzar NotFoundException si no pertenece al usuario", async () => {
      repository.markAsRead.mockResolvedValue(false);

      await expect(service.marcarComoLeida("notif-1", "user-2")).rejects.toThrow(NotFoundException);
    });
  });

  describe("marcarTodasComoLeidas", () => {
    it("debe marcar todas como leídas y retornar conteo", async () => {
      repository.markAllAsRead.mockResolvedValue(4);

      const result = await service.marcarTodasComoLeidas("user-1");

      expect(result).toEqual({
        message: "Todas las notificaciones han sido marcadas como leídas.",
        actualizadas: 4,
      });
      expect(repository.markAllAsRead).toHaveBeenCalledWith("user-1");
    });
  });
});
