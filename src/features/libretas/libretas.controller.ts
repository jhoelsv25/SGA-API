import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { createReadStream } from "node:fs";
import { ApiBearerAuth, ApiConsumes, ApiHeader, ApiTags } from "@nestjs/swagger";
import { HEADER_ANIO_ACADEMICO } from "@/common/anio-lectivo";
import { MENU_LIBRETAS, MENU_MIS_LIBRETAS } from "@/common/constants";
import { ClientInfo, type ClientInfoData, CurrentUser, MenuAccess } from "@/common/decorators";
import type { AuthenticatedUser } from "@/features/auth/interfaces/jwt-payload.interface";
import { MENSAJES_LIBRETAS } from "./constants";
import {
  CambiarAlcanceLibretasDto,
  CambiarFechaLibretasDto,
  ProgramarLibretasDto,
  PublicarLibretasDto,
  VistaPreviaLibretasDto,
} from "./dto";
import type { ActorLibreta, ArchivoCarga, AsignacionManual } from "./interfaces";
import { LibretasService } from "./libretas.service";

interface ArchivoMulter {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

function aCarga(archivos: ArchivoMulter[] | undefined): ArchivoCarga[] {
  return (archivos ?? []).map((archivo) => ({
    nombre: archivo.originalname,
    mime: archivo.mimetype,
    tamanoBytes: archivo.size,
    buffer: archivo.buffer,
  }));
}

function actorDe(usuario: AuthenticatedUser): ActorLibreta {
  return {
    id: usuario.id,
    roleId: usuario.roleId,
    role: usuario.role,
    personaId: usuario.personaId,
  };
}

function leerAsignaciones(raw?: string): AsignacionManual[] {
  if (!raw?.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new BadRequestException(MENSAJES_LIBRETAS.ASIGNACION_INVALIDA);
  }
  if (!Array.isArray(parsed)) {
    throw new BadRequestException(MENSAJES_LIBRETAS.ASIGNACION_INVALIDA);
  }
  return parsed.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const fila = item as Record<string, unknown>;
    if (typeof fila.nombreArchivo !== "string" || typeof fila.matriculaId !== "string") return [];
    return [
      {
        nombreArchivo: fila.nombreArchivo,
        matriculaId: fila.matriculaId,
        motivo: typeof fila.motivo === "string" ? fila.motivo : undefined,
      },
    ];
  });
}

@ApiTags("Libretas")
@ApiBearerAuth()
@ApiHeader({ name: HEADER_ANIO_ACADEMICO, required: false })
@Controller("libretas")
export class LibretasController {
  constructor(private readonly service: LibretasService) {}

  @Get("contexto")
  @MenuAccess(MENU_LIBRETAS)
  contexto(@CurrentUser() usuario: AuthenticatedUser) {
    return this.service.contexto(actorDe(usuario));
  }

  @Post("programar")
  @MenuAccess(MENU_LIBRETAS)
  programar(
    @Body() dto: ProgramarLibretasDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ) {
    return this.service.programar(dto.periodoId, dto.fechaLimite, actorDe(usuario), clientInfo.ip);
  }

  @Patch("programaciones/:periodoId")
  @MenuAccess(MENU_LIBRETAS)
  cambiarFecha(
    @Param("periodoId", ParseUUIDPipe) periodoId: string,
    @Body() dto: CambiarFechaLibretasDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ) {
    return this.service.cambiarFecha(periodoId, dto.fechaLimite, actorDe(usuario), clientInfo.ip);
  }

  @Post("vista-previa")
  @MenuAccess(MENU_LIBRETAS)
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FilesInterceptor("archivos", 60, { limits: { fileSize: 10 * 1024 * 1024 } }))
  vistaPrevia(
    @UploadedFiles() archivos: ArchivoMulter[],
    @Body() dto: VistaPreviaLibretasDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.service.vistaPrevia(
      dto.seccionId,
      dto.periodoId,
      aCarga(archivos),
      actorDe(usuario),
    );
  }

  @Post("publicar")
  @MenuAccess(MENU_LIBRETAS)
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FilesInterceptor("archivos", 60, { limits: { fileSize: 10 * 1024 * 1024 } }))
  publicar(
    @UploadedFiles() archivos: ArchivoMulter[],
    @Body() dto: PublicarLibretasDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ) {
    return this.service.publicar(
      dto.seccionId,
      dto.periodoId,
      aCarga(archivos),
      leerAsignaciones(dto.asignaciones),
      actorDe(usuario),
      clientInfo.ip,
    );
  }

  @Get("alcances")
  @MenuAccess(MENU_LIBRETAS)
  alcances(@CurrentUser() usuario: AuthenticatedUser) {
    return this.service.listarAlcances(actorDe(usuario));
  }

  @Patch("alcances")
  @MenuAccess(MENU_LIBRETAS)
  cambiarAlcance(
    @Body() dto: CambiarAlcanceLibretasDto,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ) {
    return this.service.cambiarAlcance(dto.rolId, dto.alcance, actorDe(usuario), clientInfo.ip);
  }

  @Get("seguimiento")
  @MenuAccess(MENU_LIBRETAS)
  seguimiento(
    @Query("periodoId", ParseUUIDPipe) periodoId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.service.seguimiento(periodoId, actorDe(usuario));
  }

  @Get("seguimiento/:seccionId")
  @MenuAccess(MENU_LIBRETAS)
  detalle(
    @Param("seccionId", ParseUUIDPipe) seccionId: string,
    @Query("periodoId", ParseUUIDPipe) periodoId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.service.detalle(seccionId, periodoId, actorDe(usuario));
  }

  @Get("mias")
  @MenuAccess(MENU_MIS_LIBRETAS)
  mias(@CurrentUser() usuario: AuthenticatedUser) {
    return this.service.misLibretas(actorDe(usuario));
  }

  @Get(":id/historial")
  @MenuAccess(MENU_LIBRETAS)
  historial(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.service.historial(id, actorDe(usuario));
  }

  @Get(":id/archivo")
  async archivo(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<StreamableFile> {
    const archivo = await this.service.abrir(id, actorDe(usuario), clientInfo.ip);
    return new StreamableFile(createReadStream(archivo.ruta), {
      type: "application/pdf",
      disposition: `inline; filename="${archivo.nombre.replace(/"/g, "")}"`,
    });
  }
}
