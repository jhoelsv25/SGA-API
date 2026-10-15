import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { MENU_ACCESS_KEY } from "../decorators/menu-access.decorator";
import { RolMenusService } from "../services/rol-menus.service";

interface RequestUser {
  role?: string;
  roleId?: string;
}

@Injectable()
export class MenuAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolMenus: RolMenusService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<string | string[]>(MENU_ACCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!metadata) {
      return true;
    }

    const user = context.switchToHttp().getRequest<{ user?: RequestUser }>().user;
    if (!user?.roleId) {
      return false;
    }

    if (user.role === "Administrador") {
      return true;
    }

    const rutas = Array.isArray(metadata) ? metadata : [metadata];
    if (rutas.length === 0) {
      return true;
    }

    const verificaciones = await Promise.all(
      rutas.map((ruta) => this.rolMenus.tieneMenu(user.roleId as string, ruta)),
    );

    const tieneAcceso = verificaciones.some((acceso) => acceso === true);
    if (!tieneAcceso) {
      throw new ForbiddenException("Su rol no tiene acceso a esta opción.");
    }
    return true;
  }
}
