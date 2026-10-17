import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  ParseBoolPipe,
  Put,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ClientInfo, type ClientInfoData, CurrentUser, Roles } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { ChangeUserRoleDto } from "./dto/change-user-role.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUsernameDto } from "./dto/update-username.dto";
import { AddUserRoleDto, UserRoleAssignmentDto } from "./dto/user-role.dto";
import { UserQueryDto } from "./dto/user-query.dto";
import {
  PaginatedUsersResponseDto,
  TempPasswordResetResponseDto,
  UserCreatedResponseDto,
  UserPersonaDto,
  UserResponseDto,
} from "./dto/user-response.dto";
import { UsersService } from "./users.service";

@ApiTags("Seguridad - Cuentas de Usuario")
@ApiBearerAuth()
@Roles("Administrador")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary:
      "Listar cuentas de usuario con paginación, filtros por rol y estado, y búsqueda por nombre/usuario",
  })
  @ApiResponse({ status: 200, type: PaginatedUsersResponseDto })
  async findUsers(@Query() query: UserQueryDto): Promise<PaginatedUsersResponseDto> {
    return this.usersService.findUsers(query);
  }

  @Get("eligible-personas")
  @ApiOperation({
    summary: "Listar personas del padrón que aún no tienen cuenta de usuario creada",
  })
  @ApiResponse({ status: 200, type: [UserPersonaDto] })
  async findEligiblePersonas(@Query("search") search?: string): Promise<UserPersonaDto[]> {
    return this.usersService.findEligiblePersonas(search);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener detalle de una cuenta de usuario" })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async findById(@Param("id", ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.usersService.findUserById(id);
  }

  @Post()
  @ApiOperation({
    summary:
      "Crear una nueva cuenta de usuario para una persona del padrón y retornar contraseña temporal única",
  })
  @ApiResponse({ status: 201, type: UserCreatedResponseDto })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<UserCreatedResponseDto> {
    return this.usersService.create(dto, user.id, client.ip);
  }

  @Put(":id/role")
  @ApiOperation({ summary: "Cambiar el rol asignado a una cuenta de usuario" })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async changeRole(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ChangeUserRoleDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<UserResponseDto> {
    return this.usersService.changeRole(id, dto, user, client.ip);
  }

  @Get(":id/roles")
  @ApiOperation({
    summary: "Roles de la cuenta; con historial=true incluye los retirados",
  })
  @ApiResponse({ status: 200, type: [UserRoleAssignmentDto] })
  async listRoles(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("historial", new ParseBoolPipe({ optional: true })) historial?: boolean,
  ): Promise<UserRoleAssignmentDto[]> {
    return this.usersService.listRoles(id, historial ?? false);
  }

  @Post(":id/roles")
  @ApiOperation({ summary: "Asignar un rol adicional a la cuenta" })
  @ApiResponse({ status: 201, type: [UserRoleAssignmentDto] })
  @ApiResponse({ status: 409, description: "La cuenta ya tiene ese rol" })
  async addRole(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AddUserRoleDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<UserRoleAssignmentDto[]> {
    return this.usersService.addRole(id, dto, user, client.ip);
  }

  @Patch(":id/roles/:rolId/principal")
  @ApiOperation({ summary: "Marcar un rol de la cuenta como principal" })
  @ApiResponse({ status: 200, type: [UserRoleAssignmentDto] })
  @ApiResponse({ status: 404, description: "La cuenta no tiene ese rol" })
  async setPrincipalRole(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("rolId", ParseUUIDPipe) rolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<UserRoleAssignmentDto[]> {
    return this.usersService.setPrincipalRole(id, rolId, user, client.ip);
  }

  @Delete(":id/roles/:rolId")
  @ApiOperation({
    summary: "Retirar un rol de la cuenta; queda en el historial",
  })
  @ApiResponse({ status: 200, type: [UserRoleAssignmentDto] })
  @ApiResponse({
    status: 400,
    description: "Último rol, rol principal o autorretiro del rol Administrador",
  })
  async retireRole(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("rolId", ParseUUIDPipe) rolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<UserRoleAssignmentDto[]> {
    return this.usersService.retireRole(id, rolId, user, client.ip);
  }

  @Put(":id/username")
  @ApiOperation({ summary: "Actualizar el nombre de usuario de una cuenta" })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async updateUsername(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateUsernameDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<UserResponseDto> {
    return this.usersService.updateUsername(id, dto, user.id, client.ip);
  }

  @Patch(":id/unlock")
  @ApiOperation({ summary: "Desbloquear una cuenta bloqueada por intentos fallidos" })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async unlock(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<UserResponseDto> {
    return this.usersService.unlock(id, user.id, client.ip);
  }

  @Patch(":id/deactivate")
  @ApiOperation({ summary: "Desactivar una cuenta y cerrar todas sus sesiones abiertas" })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async deactivate(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<UserResponseDto> {
    return this.usersService.deactivate(id, user, client.ip);
  }

  @Patch(":id/reactivate")
  @ApiOperation({ summary: "Reactivar una cuenta previamente desactivada" })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async reactivate(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<UserResponseDto> {
    return this.usersService.reactivate(id, user.id, client.ip);
  }

  @Post(":id/reset-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Restablecer contraseña de una cuenta generando clave temporal de un solo uso y cerrando sesiones abiertas",
  })
  @ApiResponse({ status: 200, type: TempPasswordResetResponseDto })
  async resetPassword(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<TempPasswordResetResponseDto> {
    return this.usersService.resetPassword(id, user.id, client.ip);
  }
}
