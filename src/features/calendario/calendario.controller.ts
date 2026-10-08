import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { HEADER_ANIO_ACADEMICO } from "../../common/anio-lectivo";
import { ClientInfo, type ClientInfoData, CurrentUser, Permissions } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { CalendarioService } from "./calendario.service";
import { PERMISO_CALENDARIO_REGISTRAR } from "./constants";
import {
  CalendarioConsultaResponseDto,
  CreateEventoCalendarioDto,
  EventoCalendarioResponseDto,
  UpdateEventoCalendarioDto,
} from "./dto";

@ApiTags("Calendario")
@ApiBearerAuth()
@ApiHeader({
  name: HEADER_ANIO_ACADEMICO,
  required: false,
  description: "Año lectivo de trabajo. Si se omite, se usa el año en curso.",
})
@Controller("calendario")
export class CalendarioController {
  constructor(private readonly calendarioService: CalendarioService) {}

  @Get()
  @ApiOperation({
    summary: "Eventos del año lectivo de trabajo en un mes, con los días sin clases",
  })
  @ApiQuery({ name: "anio", required: false, example: 2027 })
  @ApiQuery({ name: "mes", required: false, example: 7 })
  @ApiResponse({ status: 200, type: CalendarioConsultaResponseDto })
  consultar(
    @Query("anio") anio?: number,
    @Query("mes") mes?: number,
  ): Promise<CalendarioConsultaResponseDto> {
    return this.calendarioService.consultar(
      mes !== undefined ? Number(mes) : undefined,
      anio !== undefined ? Number(anio) : undefined,
    );
  }

  @Post()
  @Permissions(PERMISO_CALENDARIO_REGISTRAR)
  @ApiOperation({ summary: "Registrar feriado, suspensión o actividad" })
  @ApiResponse({ status: 201, type: EventoCalendarioResponseDto })
  create(
    @Body() dto: CreateEventoCalendarioDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<EventoCalendarioResponseDto> {
    return this.calendarioService.create(dto, user.id, clientInfo.ip);
  }

  @Patch(":id")
  @Permissions(PERMISO_CALENDARIO_REGISTRAR)
  @ApiOperation({ summary: "Editar un evento del calendario" })
  @ApiResponse({ status: 200, type: EventoCalendarioResponseDto })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventoCalendarioDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<EventoCalendarioResponseDto> {
    return this.calendarioService.update(id, dto, user.id, clientInfo.ip);
  }

  @Delete(":id")
  @Permissions(PERMISO_CALENDARIO_REGISTRAR)
  @ApiOperation({ summary: "Eliminar un evento del calendario" })
  @ApiResponse({ status: 200 })
  remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<void> {
    return this.calendarioService.remove(id, user.id, clientInfo.ip);
  }
}
