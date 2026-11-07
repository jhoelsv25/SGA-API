import { Injectable, Logger } from "@nestjs/common";
import { VARIABLES_BIOMETRICO } from "../biometrico/constants";
import { VariablesSistemaService } from "../variables-sistema/variables-sistema.service";
import { MENSAJES_MARCACION } from "./constants";
import { MarcacionesService } from "./marcaciones.service";
import { MarcacionesRepository } from "./repositories";
import {
  MarcacionesBiometricasRepository,
  type MarcacionCruda,
} from "./repositories/marcaciones-biometricas.repository";

export const MOTIVOS_RECHAZO_BIOMETRICO = {
  SIN_PERSONA: "El código del reloj no corresponde a ninguna persona.",
  NO_VIGENTE: "La persona no está vigente como docente o personal administrativo.",
  SOLO_PERSONAL: "El reloj biométrico solo registra personal (docentes y administrativos).",
  YA_MARCO: MENSAJES_MARCACION.YA_MARCO_ENTRADA_Y_SALIDA,
  REBOTE: "Se ignoró: segunda marca seguida del mismo dedo (rebote).",
  DUPLICADA: "Ya existe una marcación de esta persona a esa misma hora.",
  DUPLICADA_ENTRE_VIAS: MENSAJES_MARCACION.DUPLICADA_ENTRE_VIAS,
} as const;

/** Una marca que no se puede convertir en asistencia: queda rechazada con su motivo, sin detener el lote. */
export class RechazoBiometrico extends Error {}

export interface ResumenProcesamiento {
  procesadas: number;
  rechazadas: number;
}

/**
 * Convierte las marcaciones crudas del reloj (que inserta SGA-NET) en `marcaciones`: identifica a la persona y
 * aplica EXACTAMENTE las mismas reglas que la app puente (`MarcacionesService.registrarDesdeReloj`): entrada o
 * salida por la hora de la marca, rebote, coincidencia con otras vías, turno, resultado y tardanza.
 * El tipo que informa el reloj es solo informativo.
 */
@Injectable()
export class MarcacionesBiometricasService {
  private readonly logger = new Logger(MarcacionesBiometricasService.name);

  constructor(
    private readonly crudas: MarcacionesBiometricasRepository,
    private readonly marcaciones: MarcacionesRepository,
    private readonly marcacionesService: MarcacionesService,
    private readonly variablesService: VariablesSistemaService,
  ) {}

  async procesarPendientes(limite = 200): Promise<ResumenProcesamiento> {
    const resumen: ResumenProcesamiento = { procesadas: 0, rechazadas: 0 };
    for (const cruda of await this.crudas.pendientes(limite)) {
      try {
        const marcacionId = await this.convertir(cruda);
        await this.crudas.marcarProcesada(cruda.id, marcacionId);
        resumen.procesadas++;
      } catch (error) {
        if (!(error instanceof RechazoBiometrico)) throw error; // falla de infraestructura: queda pendiente
        await this.crudas.marcarRechazada(cruda.id, error.message);
        resumen.rechazadas++;
      }
    }
    if (resumen.procesadas + resumen.rechazadas > 0) {
      this.logger.log(
        `Marcaciones del reloj: ${resumen.procesadas} procesadas, ${resumen.rechazadas} rechazadas.`,
      );
    }
    return resumen;
  }

  private async convertir(cruda: MarcacionCruda): Promise<string> {
    const personaId = await this.crudas.buscarPersonaId(cruda.codigoUsuario.trim());
    if (!personaId) throw new RechazoBiometrico(MOTIVOS_RECHAZO_BIOMETRICO.SIN_PERSONA);

    const persona = await this.marcaciones.findPersonaParaMarcar(personaId);
    if (!persona || !persona.tipoPersona || !persona.vigente) {
      throw new RechazoBiometrico(MOTIVOS_RECHAZO_BIOMETRICO.NO_VIGENTE);
    }
    if (persona.tipoPersona === "estudiantes") {
      throw new RechazoBiometrico(MOTIVOS_RECHAZO_BIOMETRICO.SOLO_PERSONAL);
    }

    const resultado = await this.marcacionesService.registrarDesdeReloj(
      { ...persona, tipoPersona: persona.tipoPersona },
      undefined,
      cruda.fechaHora,
      await this.minutosAntirrebote(),
    );
    switch (resultado.estado) {
      case "registrada":
        return resultado.marcacion.id;
      case "duplicada":
        throw new RechazoBiometrico(MOTIVOS_RECHAZO_BIOMETRICO.DUPLICADA);
      case "ignorada":
        throw new RechazoBiometrico(
          resultado.razon === "rebote"
            ? MOTIVOS_RECHAZO_BIOMETRICO.REBOTE
            : resultado.razon === "duplicada_entre_vias"
              ? MOTIVOS_RECHAZO_BIOMETRICO.DUPLICADA_ENTRE_VIAS
              : MOTIVOS_RECHAZO_BIOMETRICO.YA_MARCO,
        );
      case "sin_turno":
        // Falla de configuración, no de la marca: queda pendiente hasta que exista el turno.
        throw new Error(MENSAJES_MARCACION.SIN_TURNO);
    }
  }

  private async minutosAntirrebote(): Promise<number> {
    const { codigo, porDefecto } = VARIABLES_BIOMETRICO.MINUTOS_ANTIRREBOTE;
    const valor = Number(await this.variablesService.getValor(codigo, String(porDefecto)));
    return Number.isFinite(valor) && valor >= 0 ? valor : porDefecto;
  }
}
