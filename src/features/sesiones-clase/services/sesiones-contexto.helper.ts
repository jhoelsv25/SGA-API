import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { sinFichaDocente } from "../../../common/utils/ficha-docente.util";
import { AniosAcademicosService } from "../../anio-escolar/anios.service";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import { ConsolidadoDocenteService } from "../../consolidado-docente/services/consolidado-docente.service";
import { VariablesSistemaService } from "../../variables-sistema/variables-sistema.service";
import { MENSAJES_SESION, VARIABLES_SESION } from "../constants";
import type { SesionResponseDto } from "../dto";
import { SesionesClaseRepository } from "../repositories";

export interface ConfiguracionSesion {
  minutosAntes: number;
  toleranciaIngreso: number;
  toleranciaSalida: number;
  salidaAutomatica: boolean;
}

/**
 * Helper compartido para validaciones de sesión, ficha docente,
 * bloqueo por bimestre/consolidado y variables de configuración.
 */
@Injectable()
export class SesionesContextoHelper {
  constructor(
    private readonly repository: SesionesClaseRepository,
    private readonly aniosService: AniosAcademicosService,
    @Optional() private readonly consolidadoService?: ConsolidadoDocenteService,
    @Optional() private readonly variablesService?: VariablesSistemaService,
  ) {}

  async requireSesion(sesionId: string): Promise<SesionResponseDto> {
    const sesion = await this.repository.findById(sesionId);
    if (!sesion) {
      throw new NotFoundException(MENSAJES_SESION.SESION_NO_ENCONTRADA);
    }
    return sesion;
  }

  async sesionDelDocente(sesionId: string, docenteId: string): Promise<SesionResponseDto> {
    const sesion = await this.requireSesion(sesionId);
    if (sesion.docenteId !== docenteId) {
      throw new ForbiddenException(MENSAJES_SESION.SESION_AJENA);
    }
    await this.exigirBimestreAbierto(sesion.fecha, sesion.docenteId);
    return sesion;
  }

  async exigirBimestreAbierto(fecha: string, docenteId?: string): Promise<void> {
    if (await this.aniosService.sesionesBloqueadasEn(fecha)) {
      throw new ForbiddenException(MENSAJES_SESION.BIMESTRE_CERRADO);
    }
    if (docenteId && this.consolidadoService) {
      await this.consolidadoService.validarModificacionPermitida(docenteId, fecha);
    }
  }

  async docenteDelUsuario(usuario: AuthenticatedUser): Promise<string> {
    const docente = await this.repository.docenteDePersona(usuario.personaId);
    if (!docente) {
      throw sinFichaDocente();
    }
    return docente.id;
  }

  /**
   * RF-011 V4: la firma es solo en el Kiosko de Sesiones. La firma web queda apagada salvo que
   * `sesion.permitir_firma_web` se active expresamente.
   */
  async firmaWebHabilitada(): Promise<boolean> {
    if (!this.variablesService) return true;
    return this.variablesService.isActiva(VARIABLES_SESION.PERMITIR_FIRMA_WEB, false);
  }

  /** Lee de las variables de sistema; ningún valor de negocio va escrito en el código. */
  async configuracion(): Promise<ConfiguracionSesion> {
    const codigos = Object.values(VARIABLES_SESION);
    const valores = await this.repository.valoresVariables(codigos);
    const entero = (codigo: string): number => {
      const valor = Number.parseInt(valores.get(codigo) ?? "", 10);
      if (Number.isNaN(valor) || valor < 0) {
        throw new InternalServerErrorException(MENSAJES_SESION.VARIABLE_FALTANTE(codigo));
      }
      return valor;
    };
    const booleano = valores.get(VARIABLES_SESION.SALIDA_AUTOMATICA);
    if (booleano === undefined) {
      throw new InternalServerErrorException(
        MENSAJES_SESION.VARIABLE_FALTANTE(VARIABLES_SESION.SALIDA_AUTOMATICA),
      );
    }
    return {
      minutosAntes: entero(VARIABLES_SESION.MINUTOS_ANTES_FIRMA_INGRESO),
      toleranciaIngreso: entero(VARIABLES_SESION.TOLERANCIA_INGRESO),
      toleranciaSalida: entero(VARIABLES_SESION.TOLERANCIA_SALIDA),
      salidaAutomatica: booleano.trim().toLowerCase() === "true",
    };
  }
}
