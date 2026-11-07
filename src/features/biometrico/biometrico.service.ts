import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import type { EquipoResponseDto } from "../equipos/dto";
import { EquiposService } from "../equipos/equipos.service";
import { esViolacionUnica } from "../marcaciones/utils";
import { MarcacionesService } from "../marcaciones/marcaciones.service";
import { MarcacionesRepository } from "../marcaciones/repositories";
import { TurnosRepository } from "../turnos/repositories/turnos.repository";
import { VariablesSistemaService } from "../variables-sistema/variables-sistema.service";
import { ahoraEnColegio, esDiaLaborable, minutosDelDia } from "../marcaciones/utils";
import {
  LIMITE_ORDENES,
  LIMITE_PENDIENTES,
  MENSAJES_BIOMETRICO,
  MINUTOS_VENCIMIENTO_ORDEN,
  type TipoOrden,
  VARIABLES_BIOMETRICO,
  type EstadoPendiente,
  type EstadoReloj,
  type MotivoPendiente,
} from "./constants";
import type {
  AsignarCodigoBiometricoDto,
  AsignarPendienteDto,
  CodigoBiometricoResponseDto,
  ConfigRelojDto,
  GuardarConfigRelojDto,
  GuardarConfigRelojResponseDto,
  OrdenDto,
  ResultadoOrdenDto,
  DescartarPendienteDto,
  EstadoRelojDto,
  LatidoDto,
  LatidoResponseDto,
  LoteResponseDto,
  PendienteResponseDto,
  RecibirLoteDto,
  ResolverPendienteResponseDto,
} from "./dto";
import { BiometricoRepository } from "./repositories";
import { desfaseEnMinutos, minutosDesde, normalizarFechaHora, ordenarPorHora } from "./utils";

const CONFIG_POR_DEFECTO: ConfigRelojDto = {
  relojIp: null,
  relojPuerto: 4370,
  relojClaveComunicacion: 0,
  intervaloSegundos: 60,
};

@Injectable()
export class BiometricoService {
  constructor(
    private readonly repository: BiometricoRepository,
    private readonly equiposService: EquiposService,
    private readonly marcacionesService: MarcacionesService,
    private readonly marcacionesRepository: MarcacionesRepository,
    private readonly turnosRepository: TurnosRepository,
    private readonly variablesService: VariablesSistemaService,
    private readonly auditService: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // App puente (autenticada con la clave del reloj)
  // ---------------------------------------------------------------------------

  /** Recibe un lote de marcaciones leídas del reloj y aplica las reglas de RF-010. */
  async recibirLote(
    claveApp: string | undefined,
    dto: RecibirLoteDto,
    ip?: string,
  ): Promise<LoteResponseDto> {
    const equipo = await this.validarReloj(claveApp, ip);
    const antirrebote = await this.numeroDeVariable(VARIABLES_BIOMETRICO.MINUTOS_ANTIRREBOTE);

    const validas: { codigo: string; fechaHora: string }[] = [];
    let rechazadas = 0;
    for (const m of dto.marcaciones) {
      const fechaHora = normalizarFechaHora(m.fechaHora);
      const codigo = m.codigo.trim();
      if (!fechaHora || codigo.length === 0) {
        rechazadas += 1;
        continue;
      }
      validas.push({ codigo, fechaHora });
    }

    const resumen = { registradas: 0, duplicadas: 0, ignoradas: 0, pendientes: 0 };
    for (const marca of ordenarPorHora(validas)) {
      const resultado = await this.procesarMarcacion(
        equipo.id,
        marca.codigo,
        marca.fechaHora,
        antirrebote,
      );
      resumen[resultado] += 1;
    }

    const { fechaHora: horaServidor } = ahoraEnColegio();
    await this.repository.registrarLatido(equipo.id, {
      ahora: horaServidor,
      relojResponde: true,
      desfaseMinutos: null,
    });
    return { recibidas: dto.marcaciones.length, ...resumen, rechazadas, horaServidor };
  }

  /** Aviso periódico de la app puente: estado del reloj y comparación de la hora. */
  async registrarLatido(
    claveApp: string | undefined,
    dto: LatidoDto,
    ip?: string,
  ): Promise<LatidoResponseDto> {
    const equipo = await this.validarReloj(claveApp, ip);
    const { fechaHora: horaServidor } = ahoraEnColegio();
    const horaReloj = dto.horaReloj ? normalizarFechaHora(dto.horaReloj) : null;
    const maximo = await this.numeroDeVariable(VARIABLES_BIOMETRICO.DESFASE_MAXIMO_MIN);

    const desfaseMinutos = horaReloj ? desfaseEnMinutos(horaReloj, horaServidor) : null;
    const ponerEnHora = desfaseMinutos !== null && desfaseMinutos > maximo;
    const yaEstabaDesfasado = (equipo.ultimoDesfaseMin ?? 0) > maximo;
    if (ponerEnHora && !yaEstabaDesfasado) {
      await this.auditService.log({
        usuarioId: null,
        accion: "actualizar",
        tabla: "equipos_autorizados",
        registroId: equipo.id,
        valorNuevo: { desfaseMinutos, horaReloj, horaServidor },
        direccionIp: ip,
      });
    }

    await this.repository.registrarLatido(equipo.id, {
      ahora: horaServidor,
      relojResponde: dto.relojResponde,
      desfaseMinutos,
    });
    const config = (await this.repository.findConfig(equipo.id)) ?? CONFIG_POR_DEFECTO;
    await this.repository.vencerOrdenes(
      equipo.id,
      MINUTOS_VENCIMIENTO_ORDEN,
      MENSAJES_BIOMETRICO.ORDEN_VENCIDA,
    );
    const ordenes = await this.repository.listarOrdenesPendientes(equipo.id);
    return { horaServidor, desfaseMinutos: desfaseMinutos ?? 0, ponerEnHora, config, ordenes };
  }

  // ---------------------------------------------------------------------------
  // Soporte TI, Administrador y Secretaria
  // ---------------------------------------------------------------------------

  async obtenerCodigo(personaId: string): Promise<CodigoBiometricoResponseDto> {
    const persona = await this.repository.findPersonaBasica(personaId);
    if (!persona) throw new NotFoundException(MENSAJES_BIOMETRICO.PERSONA_NO_ENCONTRADA);
    return {
      personaId,
      nombreCompleto: persona.nombreCompleto,
      codigoBiometrico: persona.codigoBiometrico,
      mensaje: "",
    };
  }

  async asignarCodigo(
    personaId: string,
    dto: AsignarCodigoBiometricoDto,
    actorId: string,
    ip?: string,
  ): Promise<CodigoBiometricoResponseDto> {
    const persona = await this.repository.findPersonaBasica(personaId);
    if (!persona) throw new NotFoundException(MENSAJES_BIOMETRICO.PERSONA_NO_ENCONTRADA);
    const codigo = dto.codigo.trim();

    const otra = await this.repository.findPersonaPorCodigo(codigo);
    if (otra && otra.id !== personaId) {
      throw new ConflictException(MENSAJES_BIOMETRICO.CODIGO_REPETIDO);
    }
    try {
      await this.repository.asignarCodigo(personaId, codigo);
    } catch (error) {
      if (esViolacionUnica(error)) {
        throw new ConflictException(MENSAJES_BIOMETRICO.CODIGO_REPETIDO);
      }
      throw error;
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "personas",
      registroId: personaId,
      valorAnterior: { codigoBiometrico: persona.codigoBiometrico },
      valorNuevo: { codigoBiometrico: codigo },
      direccionIp: ip,
    });
    return {
      personaId,
      nombreCompleto: persona.nombreCompleto,
      codigoBiometrico: codigo,
      mensaje: MENSAJES_BIOMETRICO.CODIGO_ASIGNADO(persona.nombreCompleto),
    };
  }

  async quitarCodigo(
    personaId: string,
    actorId: string,
    ip?: string,
  ): Promise<CodigoBiometricoResponseDto> {
    const persona = await this.repository.findPersonaBasica(personaId);
    if (!persona) throw new NotFoundException(MENSAJES_BIOMETRICO.PERSONA_NO_ENCONTRADA);
    await this.repository.asignarCodigo(personaId, null);
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "personas",
      registroId: personaId,
      valorAnterior: { codigoBiometrico: persona.codigoBiometrico },
      valorNuevo: { codigoBiometrico: null },
      direccionIp: ip,
    });
    return {
      personaId,
      nombreCompleto: persona.nombreCompleto,
      codigoBiometrico: null,
      mensaje: MENSAJES_BIOMETRICO.CODIGO_QUITADO(persona.nombreCompleto),
    };
  }

  async listarPendientes(estado: EstadoPendiente = "pendiente"): Promise<PendienteResponseDto[]> {
    return this.repository.listarPendientes(estado, LIMITE_PENDIENTES);
  }

  async asignarPendiente(
    id: string,
    dto: AsignarPendienteDto,
    actorId: string,
    ip?: string,
  ): Promise<ResolverPendienteResponseDto> {
    const pendiente = await this.pendienteAbierta(id);
    const persona = await this.marcacionesRepository.findPersonaParaMarcar(dto.personaId);
    if (!persona) throw new NotFoundException(MENSAJES_BIOMETRICO.PERSONA_NO_ENCONTRADA);
    if (persona.tipoPersona !== "docentes" || !persona.vigente) {
      throw new BadRequestException(MENSAJES_BIOMETRICO.PERSONA_NO_DOCENTE);
    }

    if (dto.vincularCodigo) {
      const otra = await this.repository.findPersonaPorCodigo(pendiente.codigoBiometrico);
      if (otra && otra.id !== persona.personaId) {
        throw new ConflictException(MENSAJES_BIOMETRICO.CODIGO_REPETIDO);
      }
    }

    const antirrebote = await this.numeroDeVariable(VARIABLES_BIOMETRICO.MINUTOS_ANTIRREBOTE);
    const resultado = await this.marcacionesService.registrarDesdeReloj(
      { ...persona, tipoPersona: "docentes" },
      pendiente.equipoId,
      pendiente.fechaHora,
      antirrebote,
    );
    if (resultado.estado === "ignorada") {
      throw new BadRequestException(MENSAJES_BIOMETRICO.YA_COMPLETO);
    }
    if (resultado.estado === "sin_turno") {
      throw new BadRequestException(MENSAJES_BIOMETRICO.SIN_TURNO);
    }

    if (dto.vincularCodigo) {
      await this.repository.asignarCodigo(persona.personaId, pendiente.codigoBiometrico);
    }
    const actualizada = await this.repository.resolverPendiente(id, {
      estado: "asignada",
      usuarioId: actorId,
      personaId: persona.personaId,
      marcacionId: resultado.estado === "registrada" ? resultado.marcacion.id : undefined,
    });
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "marcaciones_biometrico_pendientes",
      registroId: id,
      valorAnterior: { estado: "pendiente" },
      valorNuevo: {
        estado: "asignada",
        personaId: persona.personaId,
        vincularCodigo: Boolean(dto.vincularCodigo),
      },
      direccionIp: ip,
    });
    return {
      mensaje: MENSAJES_BIOMETRICO.PENDIENTE_ASIGNADA(persona.nombreCompleto),
      pendiente: actualizada,
    };
  }

  async descartarPendiente(
    id: string,
    dto: DescartarPendienteDto,
    actorId: string,
    ip?: string,
  ): Promise<ResolverPendienteResponseDto> {
    const motivo = dto.motivo?.trim();
    if (!motivo) throw new BadRequestException(MENSAJES_BIOMETRICO.MOTIVO_DESCARTE_REQUERIDO);
    await this.pendienteAbierta(id);
    const actualizada = await this.repository.resolverPendiente(id, {
      estado: "descartada",
      usuarioId: actorId,
      motivoDescarte: motivo,
    });
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "marcaciones_biometrico_pendientes",
      registroId: id,
      valorAnterior: { estado: "pendiente" },
      valorNuevo: { estado: "descartada", motivo },
      direccionIp: ip,
    });
    return { mensaje: MENSAJES_BIOMETRICO.PENDIENTE_DESCARTADA, pendiente: actualizada };
  }

  /** Estado de cada reloj y de su app puente, con las alertas para Soporte TI. */
  async estadoRelojes(): Promise<EstadoRelojDto[]> {
    const { fecha, fechaHora: ahora } = ahoraEnColegio();
    const minutosAhora = minutosDelDia(ahora.slice(11, 19));
    const maxSinComunicacion = await this.numeroDeVariable(
      VARIABLES_BIOMETRICO.MINUTOS_SIN_COMUNICACION,
    );
    const maxDesfase = await this.numeroDeVariable(VARIABLES_BIOMETRICO.DESFASE_MAXIMO_MIN);
    const turno = await this.turnosRepository.findByAplicaA("docentes");
    const enHorario = turno
      ? esDiaLaborable(fecha, turno.diasLaborables) &&
        minutosAhora >= minutosDelDia(turno.ventanaEntradaInicio) &&
        minutosAhora <= minutosDelDia(turno.ventanaSalidaFin)
      : true;

    const relojes = await this.repository.listarRelojes();
    return relojes.map((r): EstadoRelojDto => {
      const alertas: string[] = [];
      let estado: EstadoReloj = "ok";
      const desfaseAlto = (r.ultimoDesfaseMin ?? 0) > maxDesfase;
      if (desfaseAlto && r.ultimoDesfaseMin !== null) {
        alertas.push(MENSAJES_BIOMETRICO.ALERTA_DESFASE(r.nombre, r.ultimoDesfaseMin));
      }

      if (!r.ultimoLatidoEn) {
        estado = "nunca_conectado";
        if (r.activo) alertas.push(MENSAJES_BIOMETRICO.ALERTA_APP_NUNCA(r.nombre));
      } else if (!r.activo || !enHorario) {
        estado = r.activo ? "fuera_de_horario" : "ok";
      } else if (minutosDesde(r.ultimoLatidoEn, ahora) > maxSinComunicacion) {
        estado = "app_sin_conexion";
        alertas.push(MENSAJES_BIOMETRICO.ALERTA_APP(r.nombre, r.ultimoLatidoEn.slice(11, 16)));
      } else if (
        !r.relojRespondioEn ||
        minutosDesde(r.relojRespondioEn, ahora) > maxSinComunicacion
      ) {
        estado = "reloj_no_responde";
        alertas.push(
          MENSAJES_BIOMETRICO.ALERTA_RELOJ(
            r.nombre,
            (r.relojRespondioEn ?? r.ultimoLatidoEn).slice(11, 16),
          ),
        );
      }
      return {
        equipoId: r.id,
        nombre: r.nombre,
        ubicacion: r.ubicacion,
        activo: r.activo,
        ultimoLatidoEn: r.ultimoLatidoEn,
        relojRespondioEn: r.relojRespondioEn,
        desfaseMinutos: r.ultimoDesfaseMin,
        config: r.config,
        estado,
        alertas,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Internos
  // ---------------------------------------------------------------------------

  /** Una marcación del reloj: asistencia, duplicada, ignorada o pendiente. */
  // ---- Configuración remota y órdenes (app puente) -----------------------

  async guardarConfig(
    equipoId: string,
    dto: GuardarConfigRelojDto,
    usuarioId: string,
    ip?: string,
  ): Promise<GuardarConfigRelojResponseDto> {
    const anterior = await this.repository.findConfig(equipoId);
    if (!anterior) throw new NotFoundException(MENSAJES_BIOMETRICO.RELOJ_NO_ENCONTRADO);
    const config: ConfigRelojDto = {
      relojIp: dto.relojIp.trim(),
      relojPuerto: dto.relojPuerto,
      relojClaveComunicacion: dto.relojClaveComunicacion,
      intervaloSegundos: dto.intervaloSegundos,
    };
    await this.repository.guardarConfig(equipoId, config);
    await this.auditService.log({
      usuarioId,
      accion: "actualizar",
      tabla: "equipos_autorizados",
      registroId: equipoId,
      // La clave de comunicación del reloj es un secreto: no se guarda en la auditoría.
      valorAnterior: { ...anterior, relojClaveComunicacion: undefined },
      valorNuevo: { ...config, relojClaveComunicacion: undefined },
      direccionIp: ip,
    });
    return { mensaje: MENSAJES_BIOMETRICO.CONFIG_GUARDADA, config };
  }

  async crearOrden(equipoId: string, tipo: TipoOrden, usuarioId: string): Promise<OrdenDto> {
    const config = await this.repository.findConfig(equipoId);
    if (!config) throw new NotFoundException(MENSAJES_BIOMETRICO.RELOJ_NO_ENCONTRADO);
    if (!config.relojIp) throw new BadRequestException(MENSAJES_BIOMETRICO.ORDEN_SIN_IP);
    await this.repository.vencerOrdenes(
      equipoId,
      MINUTOS_VENCIMIENTO_ORDEN,
      MENSAJES_BIOMETRICO.ORDEN_VENCIDA,
    );
    const existente = await this.repository.findOrdenPendiente(equipoId, tipo);
    if (existente) return existente;
    return this.repository.crearOrden(equipoId, tipo, usuarioId);
  }

  async listarOrdenes(equipoId: string): Promise<OrdenDto[]> {
    if (!(await this.repository.findConfig(equipoId))) {
      throw new NotFoundException(MENSAJES_BIOMETRICO.RELOJ_NO_ENCONTRADO);
    }
    await this.repository.vencerOrdenes(
      equipoId,
      MINUTOS_VENCIMIENTO_ORDEN,
      MENSAJES_BIOMETRICO.ORDEN_VENCIDA,
    );
    return this.repository.listarOrdenes(equipoId, LIMITE_ORDENES);
  }

  async resolverOrden(
    claveApp: string | undefined,
    ordenId: string,
    dto: ResultadoOrdenDto,
    ip?: string,
  ): Promise<{ mensaje: string }> {
    const equipo = await this.validarReloj(claveApp, ip);
    const resuelta = await this.repository.resolverOrden(
      equipo.id,
      ordenId,
      dto.ok ? "completada" : "error",
      dto.mensaje,
      dto.datos ?? null,
    );
    if (!resuelta) throw new NotFoundException(MENSAJES_BIOMETRICO.ORDEN_NO_ENCONTRADA);
    return { mensaje: "Resultado registrado." };
  }

  private async procesarMarcacion(
    equipoId: string,
    codigo: string,
    fechaHora: string,
    antirrebote: number,
  ): Promise<"registradas" | "duplicadas" | "ignoradas" | "pendientes"> {
    const encontrada = await this.repository.findPersonaPorCodigo(codigo);
    if (!encontrada) {
      return this.enviarAPendientes(equipoId, codigo, fechaHora, "codigo_desconocido");
    }
    const persona = await this.marcacionesRepository.findPersonaParaMarcar(encontrada.id);
    if (!persona || persona.tipoPersona !== "docentes" || !persona.vigente) {
      return this.enviarAPendientes(equipoId, codigo, fechaHora, "no_docente");
    }

    const resultado = await this.marcacionesService.registrarDesdeReloj(
      { ...persona, tipoPersona: "docentes" },
      equipoId,
      fechaHora,
      antirrebote,
    );
    switch (resultado.estado) {
      case "registrada":
        return "registradas";
      case "duplicada":
        return "duplicadas";
      case "ignorada":
        return "ignoradas";
      case "sin_turno":
        return this.enviarAPendientes(equipoId, codigo, fechaHora, "sin_turno");
    }
  }

  private async enviarAPendientes(
    equipoId: string,
    codigoBiometrico: string,
    fechaHora: string,
    motivo: MotivoPendiente,
  ): Promise<"duplicadas" | "pendientes"> {
    const nueva = await this.repository.insertarPendiente({
      equipoId,
      codigoBiometrico,
      fechaHora,
      motivo,
    });
    return nueva ? "pendientes" : "duplicadas";
  }

  private async pendienteAbierta(id: string): Promise<PendienteResponseDto> {
    const pendiente = await this.repository.findPendientePorId(id);
    if (!pendiente) throw new NotFoundException(MENSAJES_BIOMETRICO.PENDIENTE_NO_ENCONTRADA);
    if (pendiente.estado !== "pendiente") {
      throw new ConflictException(MENSAJES_BIOMETRICO.PENDIENTE_YA_RESUELTA);
    }
    return pendiente;
  }

  /** La clave de la app puente es la clave del equipo (RF-004). Rechaza y deja constancia. */
  private async validarReloj(
    claveApp: string | undefined,
    ip?: string,
  ): Promise<EquipoResponseDto> {
    try {
      const { equipo } = await this.equiposService.validarKiosko(claveApp);
      if (equipo && equipo.tipo === "biometrico") return equipo;
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) throw error;
    }
    await this.auditService.log({
      usuarioId: null,
      accion: "crear",
      tabla: "marcaciones_biometrico_rechazos",
      valorNuevo: { motivo: MENSAJES_BIOMETRICO.CLAVE_INVALIDA },
      direccionIp: ip,
    });
    throw new UnauthorizedException(MENSAJES_BIOMETRICO.CLAVE_INVALIDA);
  }

  private async numeroDeVariable(variable: {
    codigo: string;
    porDefecto: number;
  }): Promise<number> {
    const valor = Number(
      await this.variablesService.getValor(variable.codigo, String(variable.porDefecto)),
    );
    return Number.isFinite(valor) && valor >= 0 ? valor : variable.porDefecto;
  }
}
