import { Reflector } from "@nestjs/core";
import { MENU_HORARIOS } from "@/common/constants";
import { MENU_ACCESS_KEY } from "@/common/decorators";
import { AuthenticatedUser } from "@/features/auth/interfaces/jwt-payload.interface";
import { ClientInfoData } from "@/common/decorators";
import {
  CreateBloqueHorarioDto,
  HorariosController,
  HorariosService,
  UpdateBloqueHorarioDto,
} from "@/features/horarios";

describe("HorariosController (RF-008: Seguridad y Endpoints de Bloques)", () => {
  let controller: HorariosController;
  let service: jest.Mocked<Partial<HorariosService>>;
  let reflector: Reflector;

  const mockUsuarioAdmin: AuthenticatedUser = {
    id: "user-admin",
    username: "admin",
    role: "Administrador",
    roleId: "rol-admin-uuid",
    personaId: "per-admin-uuid",
  };

  const mockClientInfo: ClientInfoData = {
    ip: "192.168.1.10",
    userAgent: "Mozilla/5.0",
  };

  beforeEach(() => {
    reflector = new Reflector();

    service = {
      crearBloque: jest.fn().mockResolvedValue({
        bloque: { id: "b-1", diaSemana: 1, horaInicio: "07:45", horaFin: "08:30" },
        advertencias: [],
        mensaje: "El horario se guardó. Los cambios rigen desde mañana.",
      }),
      actualizarBloque: jest.fn().mockResolvedValue({
        bloque: { id: "b-1", diaSemana: 1, horaInicio: "08:30", horaFin: "09:15" },
        advertencias: [],
        mensaje: "El horario se guardó. Los cambios rigen desde mañana.",
      }),
      eliminarBloque: jest.fn().mockResolvedValue(undefined),
      listarPorSeccion: jest
        .fn()
        .mockResolvedValue({ bloques: [], resumenHoras: [], advertencias: [] }),
    };

    controller = new HorariosController(service as unknown as HorariosService);
  });

  describe("CP-RF008-20: Control de acceso a la gestión de bloques (@MenuAccess)", () => {
    it("debe exigir el permiso de organización escolar (@MenuAccess('/admin/horarios')) al crear un bloque", () => {
      // Dado el endpoint crearBloque del controlador
      const rutaPermitida = reflector.get<string>(MENU_ACCESS_KEY, controller.crearBloque);

      // Entonces debe requerir estrictamente la ruta de MENU_HORARIOS
      expect(rutaPermitida).toBe(MENU_HORARIOS);
      expect(rutaPermitida).toBe("/admin/horarios");
    });

    it("debe exigir el permiso de organización escolar (@MenuAccess('/admin/horarios')) al actualizar un bloque", () => {
      // Dado el endpoint actualizarBloque del controlador
      const rutaPermitida = reflector.get<string>(MENU_ACCESS_KEY, controller.actualizarBloque);

      // Entonces debe requerir la ruta de MENU_HORARIOS
      expect(rutaPermitida).toBe(MENU_HORARIOS);
    });

    it("debe exigir el permiso de organización escolar (@MenuAccess('/admin/horarios')) al eliminar un bloque", () => {
      // Dado el endpoint eliminarBloque del controlador
      const rutaPermitida = reflector.get<string>(MENU_ACCESS_KEY, controller.eliminarBloque);

      // Entonces debe requerir la ruta de MENU_HORARIOS
      expect(rutaPermitida).toBe(MENU_HORARIOS);
    });

    it("no debe exigir restricción de @MenuAccess en endpoints de consulta de bloques (listarPorSeccion)", () => {
      // Dado el endpoint de lectura
      const rutaListar = reflector.get<string>(MENU_ACCESS_KEY, controller.listarPorSeccion);

      // Entonces no debe estar bloqueado por @MenuAccess
      expect(rutaListar).toBeUndefined();
    });
  });

  describe("Delegación de endpoints de bloques al servicio", () => {
    it("crearBloque() debe delegar al servicio con seccionId, dto, usuario e IP", async () => {
      const dto: CreateBloqueHorarioDto = {
        diaSemana: 1,
        horaInicio: "07:45",
        horaFin: "08:30",
        tipoBloque: "clase",
      };

      const resultado = await controller.crearBloque(
        "sec-5a",
        dto,
        mockUsuarioAdmin,
        mockClientInfo,
      );

      expect(resultado.bloque.id).toBe("b-1");
      expect(service.crearBloque).toHaveBeenCalledWith(
        "sec-5a",
        dto,
        mockUsuarioAdmin.id,
        mockClientInfo.ip,
      );
    });

    it("actualizarBloque() debe delegar al servicio con id, dto, usuario e IP", async () => {
      const dto: UpdateBloqueHorarioDto = {
        horaInicio: "08:30",
        horaFin: "09:15",
      };

      const resultado = await controller.actualizarBloque(
        "b-1",
        dto,
        mockUsuarioAdmin,
        mockClientInfo,
      );

      expect(resultado.bloque.id).toBe("b-1");
      expect(service.actualizarBloque).toHaveBeenCalledWith(
        "b-1",
        dto,
        mockUsuarioAdmin.id,
        mockClientInfo.ip,
      );
    });

    it("eliminarBloque() debe delegar al servicio con id, usuario e IP", async () => {
      await controller.eliminarBloque("b-1", mockUsuarioAdmin, mockClientInfo);

      expect(service.eliminarBloque).toHaveBeenCalledWith(
        "b-1",
        mockUsuarioAdmin.id,
        mockClientInfo.ip,
      );
    });

    it("listarPorSeccion() debe delegar al servicio", async () => {
      const resultado = await controller.listarPorSeccion("sec-5a");

      expect(resultado.bloques).toEqual([]);
      expect(service.listarPorSeccion).toHaveBeenCalledWith("sec-5a");
    });
  });
});
