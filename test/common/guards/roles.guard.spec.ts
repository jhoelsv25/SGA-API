import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { MENU_ALTERNATIVO_KEY } from "@/common/decorators/menu-alternativo.decorator";
import { RolesGuard } from "@/common/guards/roles.guard";
import type { RolMenusService } from "@/common/services/rol-menus.service";
import { ROLES_KEY } from "@/common/decorators/roles.decorator";

describe("RolesGuard (RF-002: acceso por menú)", () => {
  const reflector = new Reflector();
  const tieneMenu = jest.fn();
  const guard = new RolesGuard(reflector, { tieneMenu } as unknown as RolMenusService);
  const contexto = (user: unknown) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;
  const configurar = (metadatos: Record<string, unknown>) =>
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockImplementation((clave: unknown) => metadatos[clave as string]);

  beforeEach(() => tieneMenu.mockReset());

  it("deja pasar a un rol listado sin consultar el menú", async () => {
    configurar({ [ROLES_KEY]: ["Secretaria"], [MENU_ALTERNATIVO_KEY]: "/admin/docentes" });

    await expect(guard.canActivate(contexto({ role: "Secretaria", roleId: "r" }))).resolves.toBe(
      true,
    );
    expect(tieneMenu).not.toHaveBeenCalled();
  });

  it("deja pasar a un rol adicional que tiene la opción asignada", async () => {
    configurar({ [ROLES_KEY]: ["Administrador"], [MENU_ALTERNATIVO_KEY]: "/admin/docentes" });
    tieneMenu.mockResolvedValue(true);

    await expect(guard.canActivate(contexto({ role: "Auxiliar", roleId: "r" }))).resolves.toBe(
      true,
    );
    expect(tieneMenu).toHaveBeenCalledWith("r", "/admin/docentes");
  });

  it("rechaza a un rol adicional sin la opción asignada", async () => {
    configurar({ [ROLES_KEY]: ["Administrador"], [MENU_ALTERNATIVO_KEY]: "/admin/docentes" });
    tieneMenu.mockResolvedValue(false);

    await expect(guard.canActivate(contexto({ role: "Auxiliar", roleId: "r" }))).resolves.toBe(
      false,
    );
  });

  it("los controladores sin opción alternativa siguen solo por nombre de rol", async () => {
    configurar({ [ROLES_KEY]: ["Administrador"] });

    await expect(guard.canActivate(contexto({ role: "Auxiliar", roleId: "r" }))).resolves.toBe(
      false,
    );
    expect(tieneMenu).not.toHaveBeenCalled();
  });
});
