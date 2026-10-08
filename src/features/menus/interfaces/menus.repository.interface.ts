import {
  MenuItemResponseDto,
  ModuleMenuTreeResponseDto,
  ModuleResponseDto,
} from "../dto/menu-response.dto";

export interface CreateModuleData {
  codigo: string;
  nombre: string;
  icono?: string;
  orden: number;
  vigente?: boolean;
}

export interface UpdateModuleData {
  codigo?: string;
  nombre?: string;
  icono?: string;
  orden?: number;
  vigente?: boolean;
}

export interface CreateMenuData {
  moduloId: string;
  menuPadreId?: string | null;
  nombre: string;
  ruta?: string | null;
  icono?: string | null;
  orden: number;
  esContenedor: boolean;
  vigente?: boolean;
}

export interface UpdateMenuData {
  menuPadreId?: string | null;
  nombre?: string;
  ruta?: string | null;
  icono?: string | null;
  orden?: number;
  vigente?: boolean;
}

export interface IMenusRepository {
  findAllModules(soloVigentes?: boolean): Promise<ModuleResponseDto[]>;
  findModuleById(id: string): Promise<ModuleResponseDto | null>;
  findModuleByCode(code: string): Promise<ModuleResponseDto | null>;
  createModule(data: CreateModuleData): Promise<ModuleResponseDto>;
  updateModule(id: string, data: UpdateModuleData): Promise<ModuleResponseDto>;
  findAllMenuItems(moduloId?: string): Promise<MenuItemResponseDto[]>;
  findMenuItemById(id: string): Promise<MenuItemResponseDto | null>;
  createMenuItem(data: CreateMenuData): Promise<MenuItemResponseDto>;
  updateMenuItem(id: string, data: UpdateMenuData): Promise<MenuItemResponseDto>;
  deleteMenuItem(id: string): Promise<void>;
  getMenuTreeForRole(rolId: string, esAdmin: boolean): Promise<ModuleMenuTreeResponseDto[]>;
}
