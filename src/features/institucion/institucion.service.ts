import * as fs from "fs";
import * as path from "path";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { ALLOWED_LOGO_MIME_TYPES, MAX_LOGO_SIZE_BYTES } from "./constants";
import { InstitucionResponseDto, UpdateInstitucionDto } from "./dto";
import { InstitucionRepository } from "./repositories/institucion.repository";

@Injectable()
export class InstitucionService {
  constructor(
    private readonly institucionRepository: InstitucionRepository,
    private readonly auditService: AuditService,
  ) {}

  async get(): Promise<InstitucionResponseDto> {
    const inst = await this.institucionRepository.get();
    if (!inst) {
      throw new NotFoundException("No se encontraron datos de la institución educativa.");
    }
    return inst;
  }

  async update(
    dto: UpdateInstitucionDto,
    actorId: string,
    ip?: string,
  ): Promise<InstitucionResponseDto> {
    const current = await this.get();

    const mergedDto: UpdateInstitucionDto = {
      nombre: dto.nombre ?? current.nombre,
      codigoModular: dto.codigoModular ?? current.codigoModular,
      codigoLocal: dto.codigoLocal !== undefined ? dto.codigoLocal : current.codigoLocal,
      tipoGestion: dto.tipoGestion ?? current.tipoGestion,
      ugel:
        dto.ugel !== undefined ? dto.ugel : dto.ugelDre !== undefined ? dto.ugelDre : current.ugel,
      dre: dto.dre !== undefined ? dto.dre : current.dre,
      director: dto.director !== undefined ? dto.director : current.director,
      direccion: dto.direccion ?? current.direccion,
      distrito: dto.distrito !== undefined ? dto.distrito : current.distrito,
      provincia: dto.provincia !== undefined ? dto.provincia : current.provincia,
      departamento: dto.departamento !== undefined ? dto.departamento : current.departamento,
      telefono: dto.telefono !== undefined ? dto.telefono : current.telefono,
      correo: dto.correo !== undefined ? dto.correo : current.correo,
      logoUrl: dto.logoUrl !== undefined ? dto.logoUrl : current.logoUrl,
    };

    const updated = await this.institucionRepository.update(mergedDto);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "institucion",
      registroId: updated.id,
      valorAnterior: {
        nombre: current.nombre,
        codigoModular: current.codigoModular,
        tipoGestion: current.tipoGestion,
        direccion: current.direccion,
        correo: current.correo,
      },
      valorNuevo: {
        nombre: updated.nombre,
        codigoModular: updated.codigoModular,
        tipoGestion: updated.tipoGestion,
        direccion: updated.direccion,
        correo: updated.correo,
      },
      direccionIp: ip,
    });

    return updated;
  }

  async uploadLogo(
    file: Express.Multer.File | undefined,
    actorId: string,
    ip?: string,
  ): Promise<InstitucionResponseDto> {
    if (!file) {
      throw new BadRequestException("Debe seleccionar una imagen para el logo.");
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      throw new BadRequestException("El logo debe ser una imagen PNG o JPG de hasta 1 MB.");
    }

    const isAllowedMime = (ALLOWED_LOGO_MIME_TYPES as readonly string[]).includes(file.mimetype);
    if (!isAllowedMime) {
      throw new BadRequestException("El logo debe ser una imagen PNG o JPG de hasta 1 MB.");
    }

    const current = await this.get();

    // Guardar archivo en disco en /uploads/logos/
    const uploadDir = path.join(process.cwd(), "uploads", "logos");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.originalname).toLowerCase() || ".png";
    const fileName = `logo-institucional-${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, file.buffer);

    const logoUrl = `/uploads/logos/${fileName}`;
    const updated = await this.institucionRepository.updateLogoUrl(logoUrl);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "institucion",
      registroId: updated.id,
      valorAnterior: { logoUrl: current.logoUrl },
      valorNuevo: { logoUrl: updated.logoUrl },
      direccionIp: ip,
    });

    return updated;
  }
}
