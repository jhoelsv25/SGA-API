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
    const ruta = this.reflector.getAllAndOverride<string>(MENU_ACCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!ruta) {
      return true;
    }

    const user = context.switchToHttp().getRequest<{ user?: RequestUser }>().user;
    if (!user?.roleId) {
      return false;
    }

    if (user.role === "Administrador") {
      return true;
    }

    if (!(await this.rolMenus.tieneMenu(user.roleId, ruta))) {
      throw new ForbiddenException("Su rol no tiene acceso a esta opción.");
    }
    return true;
  }
}
