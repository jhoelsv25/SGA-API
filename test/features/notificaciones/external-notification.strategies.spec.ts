import { ConfigService } from "@nestjs/config";
import { EmailNotificationStrategy } from "../../../src/features/notificaciones/strategies/email-notification.strategy";
import { WebhookNotificationStrategy } from "../../../src/features/notificaciones/strategies/webhook-notification.strategy";
import { NotificacionesRepository } from "../../../src/features/notificaciones/repositories";

describe("Estrategias de Notificación Externa", () => {
  let mockRepo: jest.Mocked<Partial<NotificacionesRepository>>;
  let mockConfigService: jest.Mocked<Partial<ConfigService>>;

  beforeEach(() => {
    mockRepo = {
      findDatosContactoUsuario: jest.fn().mockResolvedValue({
        usuarioId: "u-123",
        nombreCompleto: "Rosa Meléndez Flores",
        correo: "rosa@colegio.edu.pe",
        celular: "987654321",
      }),
    };

    mockConfigService = {
      get: jest.fn(),
    };
  });

  describe("EmailNotificationStrategy", () => {
    it("debe preparar y despachar correo cuando el usuario tiene email registrado", async () => {
      const strategy = new EmailNotificationStrategy(
        mockRepo as NotificacionesRepository,
        mockConfigService as ConfigService,
      );

      await expect(
        strategy.enviar({
          usuarioId: "u-123",
          titulo: "Aviso de inasistencia",
          mensaje: "Su menor hija no asistió hoy",
          tipo: "alerta",
        }),
      ).resolves.not.toThrow();

      expect(mockRepo.findDatosContactoUsuario).toHaveBeenCalledWith("u-123");
    });

    it("debe omitir el envío si el usuario no tiene correo registrado", async () => {
      mockRepo.findDatosContactoUsuario = jest.fn().mockResolvedValue({
        usuarioId: "u-sin-correo",
        nombreCompleto: "Juan Pérez",
        correo: null,
        celular: "999888777",
      });

      const strategy = new EmailNotificationStrategy(
        mockRepo as NotificacionesRepository,
        mockConfigService as ConfigService,
      );

      await expect(
        strategy.enviar({
          usuarioId: "u-sin-correo",
          titulo: "Aviso",
          mensaje: "Mensaje",
        }),
      ).resolves.not.toThrow();
    });
  });

  describe("WebhookNotificationStrategy", () => {
    it("debe despachar alerta a webhook simulado si no hay URL configurada", async () => {
      const strategy = new WebhookNotificationStrategy(
        mockRepo as NotificacionesRepository,
        mockConfigService as ConfigService,
      );

      await expect(
        strategy.enviar({
          usuarioId: "u-123",
          titulo: "Aviso de tardanza",
          mensaje: "Ingreso con tardanza",
          tipo: "alerta",
        }),
      ).resolves.not.toThrow();

      expect(mockRepo.findDatosContactoUsuario).toHaveBeenCalledWith("u-123");
    });

    it("debe realizar POST HTTP con fetch cuando hay webhook configurado", async () => {
      mockConfigService.get = jest
        .fn()
        .mockReturnValue("https://api.whatsapp-gateway.local/webhook");
      const mockFetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
      global.fetch = mockFetch;

      const strategy = new WebhookNotificationStrategy(
        mockRepo as NotificacionesRepository,
        mockConfigService as ConfigService,
      );

      await strategy.enviar({
        usuarioId: "u-123",
        titulo: "Aviso de tardanza",
        mensaje: "Tardanza de 15 minutos",
        tipo: "alerta",
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0] as [
        string,
        { method: string; body: string; headers: Record<string, string> },
      ];
      expect(call[0]).toBe("https://api.whatsapp-gateway.local/webhook");
      expect(call[1].method).toBe("POST");
      expect(call[1].headers["Content-Type"]).toBe("application/json");
      expect(call[1].body).toContain("987654321");
    });
  });
});
