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

/**
 * Una marca válida que aún no se puede convertir por un problema de configuración (por ejemplo, falta el turno):
 * queda pendiente para reintentarla, sin detener el lote.
 */
export class EsperaBiometrico extends Error {}

export interface ResumenProcesamiento {
  procesadas: number;
  rechazadas: number;
  /** Quedaron pendientes por configuración, o porque una marca anterior de la misma persona sigue en espera. */
  enEspera: number;
}

/** Páginas que se revisan por corrida; el resto queda para la siguiente. */
const MAX_PAGINAS = 10;

/**
 * Convierte las marcaciones crudas del reloj (que inserta SGA-NET) en `marcaciones`: identifica a la persona y
 * aplica EXACTAMENTE las reglas de `MarcacionesService.registrarDesdeReloj`: entrada o
 * salida por la hora de la marca, rebote, coincidencia con otras vías, turno, resultado y tardanza.
 * El tipo que informa el reloj es solo informativo.
 */
@Injectable()
export class MarcacionesBiometricasService {
  private readonly logger = new Logger(MarcacionesBiometricasService.name);
  private avisados = new Set<string>();

  constructor(
    private readonly crudas: MarcacionesBiometricasRepository,
    private readonly marcaciones: MarcacionesRepository,
    private readonly marcacionesService: MarcacionesService,
    private readonly variablesService: VariablesSistemaService,
  ) {}

  async procesarPendientes(limite = 200): Promise<ResumenProcesamiento> {
    const resumen: ResumenProcesamiento = { procesadas: 0, rechazadas: 0, enEspera: 0 };
    // Códigos con una marca en espera: sus marcas siguientes también esperan, para no invertir entrada y salida.
    const enEspera = new Map<string, string>();
    let despuesDe: MarcacionCruda | undefined;
    for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
      const lote = await this.crudas.pendientes(limite, despuesDe);
      for (const cruda of lote) {
        const codigo = cruda.codigoUsuario.trim();
        if (enEspera.has(codigo)) {
          resumen.enEspera++;
          continue;
        }
        try {
          const marcacionId = await this.convertir(cruda);
          await this.crudas.marcarProcesada(cruda.id, marcacionId);
          resumen.procesadas++;
        } catch (error) {
          if (error instanceof EsperaBiometrico) {
            enEspera.set(codigo, error.message);
            resumen.enEspera++;
          } else if (error instanceof RechazoBiometrico) {
            await this.crudas.marcarRechazada(cruda.id, error.message);
            resumen.rechazadas++;
          } else {
            throw error; // falla de infraestructura: queda pendiente y se corta el lote
          }
        }
      }
      if (lote.length < limite) break;
      despuesDe = lote[lote.length - 1];
    }
    if (resumen.procesadas + resumen.rechazadas > 0) {
      this.logger.log(
        `Marcaciones del reloj: ${resumen.procesadas} procesadas, ${resumen.rechazadas} rechazadas.`,
      );
    }
    // Se avisa una vez por código (una corrida por cada sincronización del reloj) y de nuevo si vuelve a quedar en espera.
    for (const [codigo, motivo] of enEspera) {
      if (!this.avisados.has(codigo)) {
        this.logger.warn(`Marcaciones del reloj del código ${codigo} en espera: ${motivo}`);
      }
    }
    this.avisados = new Set(enEspera.keys());
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
        throw new EsperaBiometrico(MENSAJES_MARCACION.SIN_TURNO);
    }
  }

  private async minutosAntirrebote(): Promise<number> {
    const { codigo, porDefecto } = VARIABLES_BIOMETRICO.MINUTOS_ANTIRREBOTE;
    const valor = Number(await this.variablesService.getValor(codigo, String(porDefecto)));
    return Number.isFinite(valor) && valor >= 0 ? valor : porDefecto;
  }
}
