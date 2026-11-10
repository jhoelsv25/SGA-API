import { MENU_ALTERNATIVO_KEY } from "../decorators/menu-alternativo.decorator";
import { RolMenusService } from "../services/rol-menus.service";
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";

interface RequestUser {
  roleId?: string;
  role?: string;
  roles?: string[];
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolMenus: RolMenusService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;

    if (!user) {
      return false;
    }

    if (user.role && requiredRoles.includes(user.role)) {
      return true;
    }

    if (user.roles && user.roles.some((r) => requiredRoles.includes(r))) {
      return true;
    }

    const rutaMenu = this.reflector.getAllAndOverride<string | undefined>(MENU_ALTERNATIVO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return rutaMenu && user.roleId ? this.rolMenus.tieneMenu(user.roleId, rutaMenu) : false;
  }
}
