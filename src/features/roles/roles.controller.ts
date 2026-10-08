import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ClientInfo, type ClientInfoData, CurrentUser, Roles } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { AssignPermissionsDto } from "./dto/assign-permissions.dto";
import { CreateRoleDto } from "./dto/create-role.dto";
import {
  PermissionCatalogItemDto,
  RoleDetailResponseDto,
  RoleResponseDto,
} from "./dto/role-response.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { RolesService } from "./roles.service";

@ApiTags("Seguridad - Roles y Permisos")
@ApiBearerAuth()
@Roles("Administrador")
@Controller("roles")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: "Listar todos los roles del sistema con conteo de usuarios" })
  @ApiResponse({ status: 200, type: [RoleResponseDto] })
  async findAll(
    @Query("soloActivos", new ParseBoolPipe({ optional: true })) soloActivos?: boolean,
  ): Promise<RoleResponseDto[]> {
    return this.rolesService.findAll(soloActivos);
  }

  @Get("permissions")
  @Header("Cache-Control", "public, max-age=86400, stale-while-revalidate=43200")
  @ApiOperation({ summary: "Obtener catálogo completo de permisos agrupados por módulo" })
  @ApiResponse({ status: 200, type: [PermissionCatalogItemDto] })
  async getPermissionsCatalog(): Promise<PermissionCatalogItemDto[]> {
    return this.rolesService.getPermissionsCatalog();
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener detalle de un rol y sus permisos asignados" })
  @ApiResponse({ status: 200, type: RoleDetailResponseDto })
  async findById(@Param("id", ParseUUIDPipe) id: string): Promise<RoleDetailResponseDto> {
    return this.rolesService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: "Crear un nuevo rol adicional (no del sistema)" })
  @ApiResponse({ status: 201, type: RoleResponseDto })
  async create(
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<RoleResponseDto> {
    return this.rolesService.create(dto, user.id, client.ip);
  }

  @Put(":id")
  @ApiOperation({ summary: "Actualizar nombre, descripción o estado de un rol" })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<RoleResponseDto> {
    return this.rolesService.update(id, dto, user.id, client.ip);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Desactivar un rol que no tenga cuentas asignadas" })
  @ApiResponse({ status: 200 })
  async delete(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<{ message: string }> {
    return this.rolesService.delete(id, user.id, client.ip);
  }

  @Put(":id/permissions")
  @ApiOperation({ summary: "Asignar permisos a un rol" })
  @ApiResponse({ status: 200 })
  async assignPermissions(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignPermissionsDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<{ message: string; count: number }> {
    return this.rolesService.assignPermissions(id, dto, user.id, client.ip);
  }
}
