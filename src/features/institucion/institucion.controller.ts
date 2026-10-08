import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ClientInfo, type ClientInfoData, CurrentUser, Roles } from "../../common/decorators";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { InstitucionResponseDto, UpdateInstitucionDto } from "./dto";
import { InstitucionService } from "./institucion.service";

@ApiTags("Institución")
@ApiBearerAuth()
@Controller("institucion")
export class InstitucionController {
  constructor(private readonly institucionService: InstitucionService) {}

  @Get()
  @Roles("Administrador", "Soporte TI", "Director")
  @ApiOperation({ summary: "Consultar datos oficiales de la institución educativa" })
  @ApiResponse({
    status: 200,
    description: "Datos de la institución",
    type: InstitucionResponseDto,
  })
  async get(): Promise<InstitucionResponseDto> {
    return this.institucionService.get();
  }

  @Put()
  @Patch()
  @Roles("Administrador")
  @ApiOperation({ summary: "Actualizar datos oficiales de la institución (Solo Administrador)" })
  @ApiResponse({
    status: 200,
    description: "Institución actualizada exitosamente",
    type: InstitucionResponseDto,
  })
  async update(
    @Body() dto: UpdateInstitucionDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<InstitucionResponseDto> {
    return this.institucionService.update(dto, user.id, clientInfo.ip);
  }

  @Post("logo")
  @Roles("Administrador")
  @UseInterceptors(AnyFilesInterceptor())
  @ApiOperation({ summary: "Subir logo institucional (PNG o JPG de hasta 1 MB)" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        logo: {
          type: "string",
          format: "binary",
          description: "Archivo de imagen PNG o JPG (máximo 1 MB)",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Logo subido y actualizado exitosamente",
    type: InstitucionResponseDto,
  })
  async uploadLogo(
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<InstitucionResponseDto> {
    const file = files?.[0];
    return this.institucionService.uploadLogo(file, user.id, clientInfo.ip);
  }
}
