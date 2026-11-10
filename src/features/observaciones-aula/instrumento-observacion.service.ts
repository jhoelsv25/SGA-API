import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MENSAJES_OBSERVACION } from "./constants";
import type { CrearInstrumentoDto } from "./dto";
import type { ActorObservacion } from "./interfaces";
import { ObservacionesComunService } from "./observaciones-comun.service";
import { contenidoInstrumentoCompleto, normalizarContenido } from "./utils";

/** Catálogo de versiones del instrumento de observación (RF-023, HU8). */
@Injectable()
export class InstrumentoObservacionService {
  constructor(private readonly comun: ObservacionesComunService) {}

  private get repo() {
    return this.comun.repository;
  }

  listar() {
    return this.repo.instrumentos();
  }

  async vigente() {
    const instrumento = await this.repo.instrumentoVigente();
    if (!instrumento) throw new NotFoundException(MENSAJES_OBSERVACION.SIN_INSTRUMENTO);
    return instrumento;
  }

  async obtener(id: string) {
    const instrumento = await this.repo.instrumento(id);
    if (!instrumento) throw new NotFoundException(MENSAJES_OBSERVACION.INSTRUMENTO_NO_ENCONTRADO);
    return instrumento;
  }

  /**
   * Carga una versión. Puede guardarse incompleta, pero solo una completa (5 desempeños, 4
   * niveles con su descripción) puede marcarse como vigente. Marcarla vigente deja a la
   * anterior sin ese carácter; las observaciones ya programadas conservan su versión.
   */
  async crear(dto: CrearInstrumentoDto, actor: ActorObservacion) {
    const codigo = dto.codigo.trim();
    if (await this.repo.existeCodigoInstrumento(codigo)) {
      throw new ConflictException(MENSAJES_OBSERVACION.INSTRUMENTO_CODIGO_REPETIDO);
    }
    const contenido = normalizarContenido({
      desempenos: dto.desempenos.map((d) => ({
        numero: d.numero,
        nombre: d.nombre,
        aspectos: d.aspectos,
        niveles: d.niveles.map((n) => ({
          nivel: n.nivel as 1 | 2 | 3 | 4,
          nombre: "",
          grupo: "insatisfactorio" as const,
          descripcion: n.descripcion,
        })),
      })),
    });
    const vigente = dto.vigente === true;
    if (vigente && !contenidoInstrumentoCompleto(contenido)) {
      throw new BadRequestException(MENSAJES_OBSERVACION.INSTRUMENTO_INCOMPLETO);
    }
    const id = await this.repo.crearInstrumento(
      {
        codigo,
        nombre: dto.nombre.trim(),
        fuente: dto.fuente?.trim(),
        contenido,
        creadoPorId: actor.id,
      },
      vigente,
    );
    await this.comun.auditar(actor, "crear", "instrumentos_observacion", id, { codigo, vigente });
    return await this.obtener(id);
  }

  async marcarVigente(id: string, actor: ActorObservacion) {
    const instrumento = await this.obtener(id);
    if (!contenidoInstrumentoCompleto(instrumento.contenido)) {
      throw new BadRequestException(MENSAJES_OBSERVACION.INSTRUMENTO_INCOMPLETO);
    }
    await this.repo.marcarInstrumentoVigente(id);
    await this.comun.auditar(actor, "actualizar", "instrumentos_observacion", id, {
      codigo: instrumento.codigo,
      vigente: true,
    });
    return await this.obtener(id);
  }
}
