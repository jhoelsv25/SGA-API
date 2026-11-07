import { Injectable, Logger } from "@nestjs/common";
import { CalendarioService } from "../calendario/calendario.service";
import { TurnosRepository } from "../turnos/repositories/turnos.repository";
import type { TurnoResponseDto } from "../turnos/dto";
import { MENSAJES_MARCACION, type TipoPersonaMarcacion } from "./constants";
import { MarcacionesRepository } from "./repositories";
import {
  MarcacionesBiometricasRepository,
  type MarcacionCruda,
} from "./repositories/marcaciones-biometricas.repository";
import { esDiaLaborable, evaluarMarcacion, siguienteTipo } from "./utils";

export const MOTIVOS_RECHAZO_BIOMETRICO = {
  SIN_PERSONA: "El código del reloj no corresponde a ninguna persona.",
  NO_VIGENTE: "La persona no está vigente como docente o personal administrativo.",
  SOLO_PERSONAL: "El reloj biométrico solo registra personal (docentes y administrativos).",
  YA_MARCO: MENSAJES_MARCACION.YA_MARCO_ENTRADA_Y_SALIDA,
} as const;

/** Una marca que no se puede convertir en asistencia: queda rechazada con su motivo, sin detener el lote. */
export class RechazoBiometrico extends Error {}

export interface ResumenProcesamiento {
  procesadas: number;
  rechazadas: number;
}

/**
 * Convierte las marcaciones crudas del reloj (que inserta SGA-NET) en `marcaciones`: identifica a la persona,
 * decide si es entrada o salida según lo ya marcado ese día, y calcula turno, resultado y tardanza con las mismas
 * reglas del kiosko. El tipo que informa el reloj es solo informativo.
 */
@Injectable()
export class MarcacionesBiometricasService {
  private readonly logger = new Logger(MarcacionesBiometricasService.name);

  constructor(
    private readonly crudas: MarcacionesBiometricasRepository,
    private readonly marcaciones: MarcacionesRepository,
    private readonly turnosRepository: TurnosRepository,
    private readonly calendarioService: CalendarioService,
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

    const fecha = cruda.fechaHora.slice(0, 10);
    const hora = cruda.fechaHora.slice(11, 19);
    const previas = await this.marcaciones.marcacionesDePersonaEnFecha(personaId, fecha);
    const tipo = siguienteTipo(
      false,
      previas.map((m) => m.tipo),
    );
    if (!tipo) throw new RechazoBiometrico(MOTIVOS_RECHAZO_BIOMETRICO.YA_MARCO);

    const turno = await this.turnoDe(persona.tipoPersona);
    const diaConClases = await this.esDiaConClases(fecha, turno);
    const evaluacion = evaluarMarcacion(tipo, turno, hora, diaConClases);

    const creada = await this.marcaciones.insertar({
      personaId,
      credencialId: null,
      turnoId: turno.id,
      tipo,
      fechaHora: cruda.fechaHora,
      origen: "biometrico",
      resultado: evaluacion.resultado,
      minutosTardanza: evaluacion.minutosTardanza,
    });
    return creada.id;
  }

  private async turnoDe(tipoPersona: TipoPersonaMarcacion): Promise<TurnoResponseDto> {
    const turno = await this.turnosRepository.findByAplicaA(tipoPersona);
    if (!turno || !turno.activo) throw new Error(MENSAJES_MARCACION.SIN_TURNO);
    return turno;
  }

  private async esDiaConClases(fecha: string, turno: TurnoResponseDto): Promise<boolean> {
    if (!esDiaLaborable(fecha, turno.diasLaborables)) return false;
    return !(await this.calendarioService.suspendeClasesEn(fecha));
  }
}
