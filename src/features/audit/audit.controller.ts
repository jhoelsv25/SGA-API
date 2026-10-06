import {
  Controller,
  Delete,
  Get,
  MethodNotAllowedException,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators";
import { AuditService } from "./audit.service";
import { AuditDetailResponseDto, PaginatedAuditResponseDto } from "./dto/audit-response.dto";
import { QueryAuditDto } from "./dto/query-audit.dto";

@ApiTags("Seguridad - Bitácora de Auditoría")
@ApiBearerAuth()
@Roles("Administrador")
@Controller("audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({
    summary: "Consultar registros de la bitácora de auditoría con filtros y paginación",
  })
  @ApiResponse({ status: 200, type: PaginatedAuditResponseDto })
  async findAll(@Query() query: QueryAuditDto): Promise<PaginatedAuditResponseDto> {
    return this.auditService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Obtener detalle completo de un registro de auditoría con comparativa antes/después",
  })
  @ApiResponse({ status: 200, type: AuditDetailResponseDto })
  @ApiResponse({ status: 404, description: "Registro no encontrado" })
  async findById(@Param("id", ParseIntPipe) id: number): Promise<AuditDetailResponseDto> {
    return this.auditService.findById(id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Rechazar edición de auditoría (Inmutable)" })
  updateForbidden(): never {
    throw new MethodNotAllowedException(
      "Los registros de auditoría son inmutables y no pueden ser modificados ni eliminados.",
    );
  }

  @Patch(":id")
  @ApiOperation({ summary: "Rechazar modificación parcial de auditoría (Inmutable)" })
  patchForbidden(): never {
    throw new MethodNotAllowedException(
      "Los registros de auditoría son inmutables y no pueden ser modificados ni eliminados.",
    );
  }

  @Delete(":id")
  @ApiOperation({ summary: "Rechazar eliminación de auditoría (Inmutable)" })
  deleteForbidden(): never {
    throw new MethodNotAllowedException(
      "Los registros de auditoría son inmutables y no pueden ser modificados ni eliminados.",
    );
  }
}
