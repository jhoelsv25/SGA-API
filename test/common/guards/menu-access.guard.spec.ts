import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { MENU_ACCESS_KEY, MenuAccess } from "@/common/decorators/menu-access.decorator";
import { MenuAccessGuard } from "@/common/guards/menu-access.guard";
import { RolMenusService } from "@/common/services/rol-menus.service";

describe("MenuAccessGuard y @MenuAccess (Control de acceso por menú compatible con múltiples rutas)", () => {
  let guard: MenuAccessGuard;
  let reflector: Reflector;
  let rolMenusService: jest.Mocked<Partial<RolMenusService>>;

  const mockContext = (user?: { role?: string; roleId?: string }, handler?: () => void) => {
    const fn = handler ?? (() => undefined);
    return {
      getHandler: () => fn,
      getClass: () => class TestController {},
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    rolMenusService = {
      tieneMenu: jest.fn(),
    };
    guard = new MenuAccessGuard(reflector, rolMenusService as unknown as RolMenusService);
  });

  describe("Decorador @MenuAccess", () => {
    it("debe almacenar una sola ruta como string para compatibilidad hacia atrás", () => {
      class ControladorPrueba {
        @MenuAccess("/admin/usuarios")
        metodoSimple() {}
      }

      const instancia = new ControladorPrueba();
      const metadata = reflector.get<string | string[]>(MENU_ACCESS_KEY, instancia.metodoSimple);
      expect(metadata).toBe("/admin/usuarios");
    });

    it("debe almacenar múltiples rutas como un arreglo cuando se proporcionan varias opciones", () => {
      class ControladorPrueba {
        @MenuAccess("/admin/consolidado-bimestre", "/admin/mi-seguimiento")
        metodoMultiple() {}
      }

      const instancia = new ControladorPrueba();
      const metadata = reflector.get<string | string[]>(MENU_ACCESS_KEY, instancia.metodoMultiple);
      expect(Array.isArray(metadata)).toBe(true);
      expect(metadata).toEqual(["/admin/consolidado-bimestre", "/admin/mi-seguimiento"]);
    });
  });

  describe("MenuAccessGuard - Comportamiento de autorización", () => {
    it("debe permitir el acceso si la ruta no tiene el decorador @MenuAccess", async () => {
      const contexto = mockContext({ role: "Docente", roleId: "rol-docente-uuid" });
      const resultado = await guard.canActivate(contexto);
      expect(resultado).toBe(true);
    });

    it("debe retornar false si no existe un usuario autenticado o roleId", async () => {
      class ControladorConMenu {
        @MenuAccess("/admin/reportes")
        metodo() {}
      }
      const instancia = new ControladorConMenu();
      const contexto = mockContext(undefined, instancia.metodo);

      const resultado = await guard.canActivate(contexto);
      expect(resultado).toBe(false);
    });

    it("el Administrador debe tener acceso irrestricto sin consultar rolMenus", async () => {
      class ControladorConMenu {
        @MenuAccess("/admin/reportes")
        metodo() {}
      }
      const instancia = new ControladorConMenu();
      const contexto = mockContext(
        { role: "Administrador", roleId: "rol-admin-uuid" },
        instancia.metodo,
      );

      const resultado = await guard.canActivate(contexto);
      expect(resultado).toBe(true);
      expect(rolMenusService.tieneMenu).not.toHaveBeenCalled();
    });

    it("con una sola ruta: debe permitir el acceso si el rol tiene asignado el menú", async () => {
      class ControladorConMenu {
        @MenuAccess("/admin/secciones")
        metodo() {}
      }
      const instancia = new ControladorConMenu();
      const contexto = mockContext({ role: "Director", roleId: "rol-dir-uuid" }, instancia.metodo);
      rolMenusService.tieneMenu = jest.fn().mockResolvedValue(true);

      const resultado = await guard.canActivate(contexto);
      expect(resultado).toBe(true);
      expect(rolMenusService.tieneMenu).toHaveBeenCalledWith("rol-dir-uuid", "/admin/secciones");
    });

    it("con una sola ruta: debe lanzar ForbiddenException si el rol no tiene el menú", async () => {
      class ControladorConMenu {
        @MenuAccess("/admin/secciones")
        metodo() {}
      }
      const instancia = new ControladorConMenu();
      const contexto = mockContext({ role: "Docente", roleId: "rol-doc-uuid" }, instancia.metodo);
      rolMenusService.tieneMenu = jest.fn().mockResolvedValue(false);

      await expect(guard.canActivate(contexto)).rejects.toThrow(
        new ForbiddenException("Su rol no tiene acceso a esta opción."),
      );
    });

    it("con múltiples rutas: debe permitir acceso si el rol posee AL MENOS UNA de las opciones", async () => {
      class ControladorConMenuMultiple {
        @MenuAccess("/admin/consolidado-bimestre", "/admin/mi-seguimiento")
        descargarFicha() {}
      }
      const instancia = new ControladorConMenuMultiple();
      // Docente solo tiene /admin/mi-seguimiento
      const contextoDocente = mockContext(
        { role: "Docente", roleId: "rol-docente-uuid" },
        instancia.descargarFicha,
      );
      rolMenusService.tieneMenu = jest
        .fn()
        .mockImplementation((_roleId: string, ruta: string) =>
          Promise.resolve(ruta === "/admin/mi-seguimiento"),
        );

      const resultadoDocente = await guard.canActivate(contextoDocente);
      expect(resultadoDocente).toBe(true);
    });

    it("con múltiples rutas: debe permitir acceso al Director que posee la ruta de supervisión", async () => {
      class ControladorConMenuMultiple {
        @MenuAccess("/admin/consolidado-bimestre", "/admin/mi-seguimiento")
        descargarFicha() {}
      }
      const instancia = new ControladorConMenuMultiple();
      // Director solo tiene /admin/consolidado-bimestre
      const contextoDirector = mockContext(
        { role: "Director", roleId: "rol-dir-uuid" },
        instancia.descargarFicha,
      );
      rolMenusService.tieneMenu = jest
        .fn()
        .mockImplementation((_roleId: string, ruta: string) =>
          Promise.resolve(ruta === "/admin/consolidado-bimestre"),
        );

      const resultadoDirector = await guard.canActivate(contextoDirector);
      expect(resultadoDirector).toBe(true);
    });

    it("con múltiples rutas: debe lanzar ForbiddenException si el rol no posee ninguna de las rutas", async () => {
      class ControladorConMenuMultiple {
        @MenuAccess("/admin/consolidado-bimestre", "/admin/mi-seguimiento")
        descargarFicha() {}
      }
      const instancia = new ControladorConMenuMultiple();
      // Apoderado no tiene ninguna de las dos rutas
      const contextoApoderado = mockContext(
        { role: "Apoderado", roleId: "rol-apoderado-uuid" },
        instancia.descargarFicha,
      );
      rolMenusService.tieneMenu = jest.fn().mockResolvedValue(false);

      await expect(guard.canActivate(contextoApoderado)).rejects.toThrow(
        new ForbiddenException("Su rol no tiene acceso a esta opción."),
      );
    });
  });
});
