import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import {
  GRADO_MAXIMO,
  GRADO_MINIMO,
  MENSAJES_PLANIFICACION,
  type TipoOpcionCatalogo,
} from "./constants";
import type { CrearDesempenoDto } from "./dto";
import type { ActorPlanificacion } from "./interfaces";
import { PlanificacionSesionesRepository } from "./repositories";

/** Catálogo curricular (RF-024, HU1): lectura para planificar y ajustes del administrador. */
@Injectable()
export class CatalogoCurricularService {
  constructor(
    private readonly repository: PlanificacionSesionesRepository,
    private readonly auditService: AuditService,
  ) {}

  areas() {
    return this.repository.areas();
  }

  competencias(area?: string) {
    return this.repository.competencias(area);
  }

  async desempenos(competenciaId: string, grado?: number) {
    if (grado !== undefined && (grado < GRADO_MINIMO || grado > GRADO_MAXIMO)) {
      throw new BadRequestException("El grado debe estar entre 1 y 5.");
    }
    if (!(await this.repository.competenciaExiste(competenciaId))) {
      throw new NotFoundException(MENSAJES_PLANIFICACION.COMPETENCIA_NO_ENCONTRADA);
    }
    return await this.repository.desempenos(competenciaId, grado);
  }

  enfoques() {
    return this.repository.enfoques();
  }

  opciones(tipo?: TipoOpcionCatalogo) {
    return this.repository.opciones(tipo);
  }

  async crearDesempeno(dto: CrearDesempenoDto, actor: ActorPlanificacion) {
    if (!(await this.repository.competenciaExiste(dto.competenciaId))) {
      throw new NotFoundException(MENSAJES_PLANIFICACION.COMPETENCIA_NO_ENCONTRADA);
    }
    const id = await this.repository.crearDesempeno(dto.competenciaId, dto.grado, dto.texto.trim());
    await this.auditService.log({
      usuarioId: actor.id,
      accion: "crear",
      tabla: "desempenos_curriculares",
      registroId: id,
      valorNuevo: { competenciaId: dto.competenciaId, grado: dto.grado },
      valorAnterior: null,
    });
    return await this.repository.desempeno(id);
  }

  /** Las planificaciones ya hechas conservan el texto con el que se guardaron. */
  async editarDesempeno(id: string, texto: string, actor: ActorPlanificacion) {
    const actual = await this.repository.desempeno(id);
    if (!actual)
      throw new NotFoundException(MENSAJES_PLANIFICACION.DESEMPENO_CATALOGO_NO_ENCONTRADO);
    await this.repository.actualizarDesempeno(id, texto.trim());
    await this.auditService.log({
      usuarioId: actor.id,
      accion: "actualizar",
      tabla: "desempenos_curriculares",
      registroId: id,
      valorNuevo: { texto: texto.trim() },
      valorAnterior: { texto: actual.texto },
    });
    return await this.repository.desempeno(id);
  }
}
