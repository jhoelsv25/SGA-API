import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import { RolePermissionsService } from "../services/role-permissions.service";

interface RequestUser {
  role?: string;
  roleId?: string;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolePermissions: RolePermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requeridos = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requeridos || requeridos.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;
    if (!user?.roleId) {
      return false;
    }

    if (user.role === "Administrador") {
      return true;
    }

    const permitido = await this.rolePermissions.hasAll(user.roleId, requeridos);
    if (!permitido) {
      throw new ForbiddenException("No tiene permiso para realizar esta acción.");
    }

    return true;
  }
}
