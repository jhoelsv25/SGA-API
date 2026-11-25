import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { CargosService } from "../cargos/cargos.service";
import { PERSONA_MESSAGES } from "./constants";
import type {
  CargoAsignadoResponseDto,
  CreatePersonaDto,
  HistorialCorreccionCriticaDto,
  PaginatedPersonasResponseDto,
  PersonaQueryDto,
  PersonaResponseDto,
  SearchPersonaResultDto,
  UpdatePersonaDto,
} from "./dto";
import { PersonasRepository } from "./repositories";
import { esFichaVigente } from "./utils/ficha-academica.util";
import {
  handlePersonaDatabaseError,
  validarDatosCriticosModificados,
  validarFechaNacimiento,
} from "./utils";

@Injectable()
export class PersonasService {
  private readonly logger = new Logger(PersonasService.name);

  constructor(
    private readonly repository: PersonasRepository,
    private readonly auditService: AuditService,
    private readonly cargosService: CargosService,
  ) {}

  async findAll(query?: PersonaQueryDto): Promise<PaginatedPersonasResponseDto> {
    try {
      return await this.repository.findAll(query);
    } catch (error) {
      handlePersonaDatabaseError(error, this.logger);
    }
  }

  async obtenerResumen(query?: PersonaQueryDto): Promise<{
    total: number;
    conFicha: number;
    conCuenta: number;
    provisionales: number;
  }> {
    try {
      return await this.repository.obtenerResumen(query);
    } catch (error) {
      handlePersonaDatabaseError(error, this.logger);
    }
  }

  async findById(id: string): Promise<PersonaResponseDto> {
    try {
      const persona = await this.repository.findById(id);
      if (!persona) {
        throw new NotFoundException(PERSONA_MESSAGES.NOT_FOUND);
      }
      return persona;
    } catch (error) {
      handlePersonaDatabaseError(error, this.logger);
    }
  }

  async search(queryDto: PersonaQueryDto): Promise<SearchPersonaResultDto> {
    try {
      const personas = await this.repository.search(queryDto);

      if (personas.length === 0) {
        return {
          encontrada: false,
          persona: null,
        };
      }

      const persona = personas[0];
      let yaTieneFicha = false;
      let mensaje: string = PERSONA_MESSAGES.DOCUMENTO_DUPLICADO;

      let requiereBajaDe: "docente" | "estudiante" | undefined;

      if (queryDto.destinoFicha === "apoderado") {
        if (persona.fichas.esApoderado) {
          yaTieneFicha = true;
          mensaje = "Esta persona ya está registrada como apoderado.";
        }
      } else if (queryDto.destinoFicha) {
        const destino = queryDto.destinoFicha;
        const otra = destino === "docente" ? "estudiante" : "docente";
        // Si el procedure aún no devuelve el estado, se asume 'activo' cuando existe la ficha
        const estadoDocente =
          persona.fichas.estadoDocente ?? (persona.fichas.esDocente ? "activo" : null);
        const estadoEstudiante =
          persona.fichas.estadoEstudiante ?? (persona.fichas.esEstudiante ? "activo" : null);
        const estadoDestino = destino === "docente" ? estadoDocente : estadoEstudiante;
        const estadoOtra = otra === "docente" ? estadoDocente : estadoEstudiante;

        if (estadoDestino) {
          // Ya tiene la ficha de destino: si está de baja se reactiva, no se crea otra
          yaTieneFicha = true;
          mensaje = esFichaVigente(destino, estadoDestino)
            ? `Esta persona ya está registrada como ${destino}.`
            : `Esta persona tiene una ficha de ${destino} dada de baja. Reactívela en lugar de crear una nueva.`;
        } else if (estadoOtra && esFichaVigente(otra, estadoOtra)) {
          // La otra ficha está vigente: se permite continuar dándola de baja
          requiereBajaDe = otra;
          mensaje = `Esta persona tiene una ficha de ${otra} activa. Para registrarla como ${destino} se dará de baja esa ficha.`;
        }
      }

      return {
        encontrada: true,
        persona,
        mensaje,
        yaTieneFicha,
        requiereBajaDe,
      };
    } catch (error) {
      handlePersonaDatabaseError(error, this.logger);
    }
  }

  async create(dto: CreatePersonaDto, actorId: string, ip?: string): Promise<PersonaResponseDto> {
    validarFechaNacimiento(dto.fechaNacimiento);

    try {
      // Validar unicidad previa por documento
      const existingDoc = await this.repository.findByDocumento(
        dto.tipoDocumento,
        dto.numeroDocumento,
      );
      if (existingDoc) {
        throw new ConflictException(PERSONA_MESSAGES.DOCUMENTO_DUPLICADO);
      }

      // Validar unicidad previa por correo
      if (dto.correo) {
        const existingEmail = await this.repository.findByCorreo(dto.correo);
        if (existingEmail) {
          throw new ConflictException(PERSONA_MESSAGES.CORREO_DUPLICADO);
        }
      }

      const created = await this.repository.create(dto);

      await this.auditService.log({
        usuarioId: actorId,
        accion: "crear",
        tabla: "personas",
        registroId: created.id,
        valorNuevo: {
          tipoDocumento: created.tipoDocumento,
          numeroDocumento: created.numeroDocumento,
          nombres: created.nombres,
          apellidoPaterno: created.apellidoPaterno,
          apellidoMaterno: created.apellidoMaterno,
          esProvisional: created.esProvisional,
        },
        direccionIp: ip,
      });

      return created;
    } catch (error) {
      handlePersonaDatabaseError(error, this.logger);
    }
  }

  async update(
    id: string,
    dto: UpdatePersonaDto,
    actor: AuthenticatedUser,
    ip?: string,
  ): Promise<PersonaResponseDto> {
    const existing = await this.findById(id);

    validarFechaNacimiento(dto.fechaNacimiento);

    try {
      // Validar unicidad de documento si cambia
      const nuevoTipo = dto.tipoDocumento ?? existing.tipoDocumento;
      const nuevoNumero = dto.numeroDocumento ?? existing.numeroDocumento;
      if (nuevoTipo !== existing.tipoDocumento || nuevoNumero !== existing.numeroDocumento) {
        const dupDoc = await this.repository.findByDocumento(nuevoTipo, nuevoNumero, id);
        if (dupDoc) {
          throw new ConflictException(PERSONA_MESSAGES.DOCUMENTO_DUPLICADO);
        }
      }

      // Validar unicidad de correo si cambia
      if (dto.correo && dto.correo !== existing.correo) {
        const dupEmail = await this.repository.findByCorreo(dto.correo, id);
        if (dupEmail) {
          throw new ConflictException(PERSONA_MESSAGES.CORREO_DUPLICADO);
        }
      }

      // Validar regla de datos críticos (RF-007 V3)
      validarDatosCriticosModificados({
        dto,
        existing,
        actorRole: actor.role,
      });

      const { motivo, ...fieldsToUpdate } = dto;
      const updated = await this.repository.update(id, fieldsToUpdate);
      if (!updated) {
        throw new NotFoundException(PERSONA_MESSAGES.NOT_FOUND);
      }

      await this.auditService.log({
        usuarioId: actor.id,
        accion: "actualizar",
        tabla: "personas",
        registroId: updated.id,
        valorAnterior: {
          tipoDocumento: existing.tipoDocumento,
          numeroDocumento: existing.numeroDocumento,
          nombres: existing.nombres,
          apellidoPaterno: existing.apellidoPaterno,
          apellidoMaterno: existing.apellidoMaterno,
          sexo: existing.sexo,
          fechaNacimiento: existing.fechaNacimiento,
        },
        valorNuevo: {
          ...fieldsToUpdate,
          ...(motivo ? { motivo } : {}),
        },
        direccionIp: ip,
      });

      return updated;
    } catch (error) {
      handlePersonaDatabaseError(error, this.logger);
    }
  }

  async delete(
    id: string,
    actorId: string,
    ip?: string,
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.findById(id);

    try {
      const { hasRelations } = await this.repository.hasActiveRelations(id);
      if (hasRelations || !existing.esProvisional) {
        throw new ConflictException(PERSONA_MESSAGES.DELETE_WITH_RELATIONS_CONFLICT);
      }

      await this.repository.softDelete(id);

      await this.auditService.log({
        usuarioId: actorId,
        accion: "eliminar",
        tabla: "personas",
        registroId: id,
        valorAnterior: {
          tipoDocumento: existing.tipoDocumento,
          numeroDocumento: existing.numeroDocumento,
          nombreCompleto: existing.nombreCompleto,
        },
        direccionIp: ip,
      });

      return {
        success: true,
        message: PERSONA_MESSAGES.DELETED_SUCCESS,
      };
    } catch (error) {
      handlePersonaDatabaseError(error, this.logger);
    }
  }

  async findHistorialCritico(id: string): Promise<HistorialCorreccionCriticaDto[]> {
    await this.findById(id);
    return this.repository.findHistorialCritico(id);
  }

  /**
   * Cambia el cargo vigente de una persona (RF-002 V3, "Cambiar el cargo de una persona").
   * El cargo anterior termina con vigencia 0 y queda en el historial; el nuevo
   * sugiere roles sin retirar los que la cuenta ya tiene.
   */
  async changeCargo(
    id: string,
    nuevoCargoId: string,
    fechaInicio: string | undefined,
    actorId: string,
    ip?: string,
  ): Promise<CargoAsignadoResponseDto> {
    await this.findById(id);
    const nuevoCargo = await this.cargosService.findById(nuevoCargoId);

    const cargoActual = await this.repository.findCargoVigente(id);
    if (cargoActual?.cargoId === nuevoCargoId) {
      throw new ConflictException(PERSONA_MESSAGES.CARGO_SAME);
    }

    const fecha = fechaInicio ?? new Date().toISOString().slice(0, 10);

    try {
      await this.repository.changeCargo(id, nuevoCargoId, fecha, actorId);

      await this.auditService.log({
        usuarioId: actorId,
        accion: "actualizar",
        tabla: "persona_cargos",
        registroId: id,
        valorAnterior: { cargoId: cargoActual?.cargoId ?? null },
        valorNuevo: { cargoId: nuevoCargoId, fechaInicio: fecha },
        direccionIp: ip,
      });

      return {
        cargoVigente: nuevoCargo.nombre,
        rolesSugeridosIds: nuevoCargo.rolesSugeridos.map((rol) => rol.id),
      };
    } catch (error) {
      handlePersonaDatabaseError(error, this.logger);
    }
  }
}
