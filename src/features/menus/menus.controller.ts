import {
  Body,
  Controller,
  Delete,
  Get,
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
import { CreateMenuContainerDto } from "./dto/create-menu-container.dto";
import { CreateMenuOptionDto } from "./dto/create-menu-option.dto";
import { CreateModuleDto } from "./dto/create-module.dto";
import {
  MenuItemResponseDto,
  ModuleMenuTreeResponseDto,
  ModuleResponseDto,
} from "./dto/menu-response.dto";
import { UpdateMenuDto } from "./dto/update-menu.dto";
import { UpdateModuleDto } from "./dto/update-module.dto";
import { MenusService } from "./menus.service";

@ApiTags("Seguridad - Módulos y Menú")
@ApiBearerAuth()
@Controller("menus")
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Get("my-menu")
  @ApiOperation({
    summary:
      "Obtener la estructura de menú y pantallas autorizadas para el rol del usuario autenticado",
  })
  @ApiResponse({ status: 200, type: [ModuleMenuTreeResponseDto] })
  async getMyMenu(@CurrentUser() user: AuthenticatedUser): Promise<ModuleMenuTreeResponseDto[]> {
    return this.menusService.getUserMenu(user.roleId, user.role);
  }

  @Get("modules")
  @Roles("Administrador")
  @ApiOperation({ summary: "Listar todos los módulos configurados en el sistema" })
  @ApiResponse({ status: 200, type: [ModuleResponseDto] })
  async findAllModules(
    @Query("soloVigentes", new ParseBoolPipe({ optional: true })) soloVigentes?: boolean,
  ): Promise<ModuleResponseDto[]> {
    return this.menusService.findAllModules(soloVigentes);
  }

  @Get("modules/:id")
  @Roles("Administrador")
  @ApiOperation({ summary: "Obtener detalle de un módulo" })
  @ApiResponse({ status: 200, type: ModuleResponseDto })
  async findModuleById(@Param("id", ParseUUIDPipe) id: string): Promise<ModuleResponseDto> {
    return this.menusService.findModuleById(id);
  }

  @Post("modules")
  @Roles("Administrador")
  @ApiOperation({ summary: "Crear un nuevo módulo en el sistema" })
  @ApiResponse({ status: 201, type: ModuleResponseDto })
  async createModule(
    @Body() dto: CreateModuleDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<ModuleResponseDto> {
    return this.menusService.createModule(dto, user.id, client.ip);
  }

  @Put("modules/:id")
  @Roles("Administrador")
  @ApiOperation({ summary: "Actualizar datos, orden o vigencia de un módulo" })
  @ApiResponse({ status: 200, type: ModuleResponseDto })
  async updateModule(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateModuleDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<ModuleResponseDto> {
    return this.menusService.updateModule(id, dto, user.id, client.ip);
  }

  @Get("items")
  @Roles("Administrador")
  @ApiOperation({ summary: "Listar elementos de menú planos (contenedores y opciones)" })
  @ApiResponse({ status: 200, type: [MenuItemResponseDto] })
  async findAllMenuItems(@Query("moduloId") moduloId?: string): Promise<MenuItemResponseDto[]> {
    return this.menusService.findAllMenuItems(moduloId);
  }

  @Post("containers")
  @Roles("Administrador")
  @ApiOperation({ summary: "Crear un contenedor dentro de un módulo (sin ruta ni padre)" })
  @ApiResponse({ status: 201, type: MenuItemResponseDto })
  async createContainer(
    @Body() dto: CreateMenuContainerDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<MenuItemResponseDto> {
    return this.menusService.createContainer(dto, user.id, client.ip);
  }

  @Post("options")
  @Roles("Administrador")
  @ApiOperation({
    summary: "Crear una opción de menú (pantalla con ruta dentro de un contenedor)",
  })
  @ApiResponse({ status: 201, type: MenuItemResponseDto })
  async createOption(
    @Body() dto: CreateMenuOptionDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<MenuItemResponseDto> {
    return this.menusService.createOption(dto, user.id, client.ip);
  }

  @Put("items/:id")
  @Roles("Administrador")
  @ApiOperation({ summary: "Actualizar un elemento de menú (contenedor u opción)" })
  @ApiResponse({ status: 200, type: MenuItemResponseDto })
  async updateMenuItem(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateMenuDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<MenuItemResponseDto> {
    return this.menusService.updateMenuItem(id, dto, user.id, client.ip);
  }

  @Delete("items/:id")
  @Roles("Administrador")
  @ApiOperation({ summary: "Eliminar o desactivar un elemento de menú" })
  @ApiResponse({ status: 200 })
  async deleteMenuItem(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoData,
  ): Promise<{ message: string }> {
    return this.menusService.deleteMenuItem(id, user.id, client.ip);
  }
}
