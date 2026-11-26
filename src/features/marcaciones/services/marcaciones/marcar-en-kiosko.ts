import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { hashSha256 } from "../../../../common/utils";
import {
  MENSAJES_MARCACION,
  PROPOSITO_EQUIPO_MARCACION,
  mensajeYaMarcoEntrada,
} from "../../constants";
import type {
  JustificarMarcacionDto,
  MarcacionKioskoResponseDto,
  MarcacionResponseDto,
  MarcarKioskoDto,
  RegistrarMarcacionManualDto,
} from "../../dto";
import type {
  CredencialParaMarcar,
  PersonaAutenticada,
  ResultadoRegistroReloj,
} from "../../interfaces";
import {
  ahoraEnColegio,
  decidirMarca,
  equipoPermite,
  esViolacionUnica,
  esHoraValida,
  evaluarMarcacion,
  horaCorta,
  horaDeFechaHora,
  minutosEntre,
} from "../../utils";
import type { MarcacionesServiceDeps, MarcacionesServiceCalls } from "./deps";

export async function marcarEnKiosko(
  deps: MarcacionesServiceDeps,
  calls: MarcacionesServiceCalls,
  tokenEquipo: string | undefined,
  dto: MarcarKioskoDto,
): Promise<MarcacionKioskoResponseDto> {
  const { equipo } = await deps.equiposService.validarKiosko(tokenEquipo);
  if (!equipo) {
    throw new ForbiddenException(MENSAJES_MARCACION.EQUIPO_NO_AUTORIZADO);
  }
  if (equipo.proposito !== PROPOSITO_EQUIPO_MARCACION) {
    throw new ForbiddenException(MENSAJES_MARCACION.EQUIPO_SIN_PROPOSITO);
  }

  const { credencial, persona } = await calls.autenticarCredencial(dto.codigo, dto.pin);
  const { fecha, hora, fechaHora } = ahoraEnColegio();
  if (!equipoPermite(equipo.usuariosPermitidos, persona.tipoPersona)) {
    throw new ForbiddenException(MENSAJES_MARCACION.EQUIPO_EQUIVOCADO);
  }
  await calls.exigirMatriculaSiEstudiante(persona);

  const previas = await deps.repository.marcacionesDePersonaEnFecha(persona.personaId, fecha);
  const decision = decidirMarca({
    esEstudiante: persona.tipoPersona === "estudiantes",
    previas,
    fechaHora,
    origen: "kiosko",
    minutosEntreVias: await calls.minutosEntreVias(),
  });
  if (decision.accion === "ignorar") {
    await calls.dejarRastroDeIgnorada(persona.personaId, fechaHora, "kiosko", decision);
    return calls.respuestaIgnorada(persona, previas, decision);
  }
  const tipo = decision.tipo;

  const turno = await calls.turnoDe(persona.tipoPersona);
  const diaConClases = await calls.esDiaConClases(fecha, turno);
  const evaluacion = evaluarMarcacion(tipo, turno, hora, diaConClases);
  if (decision.reetiquetar) {
    await calls.reetiquetarEntradaComoSalida(decision.reetiquetar, turno, diaConClases);
  }

  const creada = await deps.repository.insertar({
    personaId: persona.personaId,
    credencialId: credencial.id,
    turnoId: turno.id,
    tipo,
    fechaHora,
    origen: "kiosko",
    resultado: evaluacion.resultado,
    minutosTardanza: evaluacion.minutosTardanza,
  });

  const horaMarcada = horaCorta(hora);

  if (
    persona.tipoPersona === "estudiantes" &&
    creada.resultado === "tardanza" &&
    deps.notificacionesService
  ) {
    calls.despacharAlertaTardanza(persona, creada.minutosTardanza, horaMarcada).catch(() => {});
  }

  return {
    registrada: true,
    mensaje: calls.mensajeDeResultado(
      persona.nombres,
      tipo,
      horaMarcada,
      evaluacion.resultado,
      evaluacion.minutosTardanza,
    ),
    nombreCompleto: persona.nombreCompleto,
    fotoUrl: persona.fotoUrl,
    tipo,
    resultado: creada.resultado,
    minutosTardanza: creada.minutosTardanza,
    hora: horaMarcada,
  };
}

export async function registrarDesdeReloj(
  deps: MarcacionesServiceDeps,
  calls: MarcacionesServiceCalls,
  persona: PersonaAutenticada,
  equipoId: string | undefined,
  fechaHora: string,
  minutosAntirrebote: number,
): Promise<ResultadoRegistroReloj> {
  const fecha = fechaHora.slice(0, 10);
  const hora = fechaHora.slice(11, 19);

  const previas = await deps.repository.marcacionesDePersonaEnFecha(persona.personaId, fecha);
  if (previas.some((m) => m.fechaHora === fechaHora)) {
    return { estado: "duplicada" };
  }
  const ultima = previas[previas.length - 1];
  if (ultima) {
    const minutos = minutosEntre(ultima.fechaHora, fechaHora);
    if (minutos >= 0 && minutos < minutosAntirrebote) {
      return { estado: "ignorada", razon: "rebote" };
    }
  }
  const decision = decidirMarca({
    esEstudiante: false,
    previas,
    fechaHora,
    origen: "biometrico",
    minutosEntreVias: await calls.minutosEntreVias(),
  });
  if (decision.accion === "ignorar") {
    await calls.dejarRastroDeIgnorada(persona.personaId, fechaHora, "biometrico", decision);
    return { estado: "ignorada", razon: decision.razon };
  }
  const tipo = decision.tipo;

  const turno = await deps.turnosRepository.findByAplicaA(persona.tipoPersona);
  if (!turno || !turno.activo) {
    return { estado: "sin_turno" };
  }
  const diaConClases = await calls.esDiaConClases(fecha, turno);
  const evaluacion = evaluarMarcacion(tipo, turno, hora, diaConClases);
  if (decision.reetiquetar) {
    await calls.reetiquetarEntradaComoSalida(decision.reetiquetar, turno, diaConClases);
  }

  try {
    const marcacion = await deps.repository.insertar({
      personaId: persona.personaId,
      credencialId: null,
      turnoId: turno.id,
      tipo,
      fechaHora,
      origen: "biometrico",
      resultado: evaluacion.resultado,
      minutosTardanza: evaluacion.minutosTardanza,
      equipoId,
    });
    return { estado: "registrada", marcacion };
  } catch (error) {
    if (esViolacionUnica(error)) return { estado: "duplicada" };
    throw error;
  }
}

export async function autenticarCredencial(
  deps: MarcacionesServiceDeps,
  codigo: string,
  pin: string,
): Promise<{ credencial: CredencialParaMarcar; persona: PersonaAutenticada }> {
  const credencial = await deps.repository.findCredencialPorCodigo(codigo.trim());
  if (!credencial || !credencial.pinHash || credencial.pinHash !== hashSha256(pin)) {
    throw new BadRequestException(MENSAJES_MARCACION.CODIGO_O_PIN_INCORRECTO);
  }
  const vencida = credencial.venceEn !== null && credencial.venceEn < ahoraEnColegio().fecha;
  if (!credencial.activa || vencida) {
    throw new ForbiddenException(MENSAJES_MARCACION.CREDENCIAL_INACTIVA);
  }
  const persona = await deps.repository.findPersonaParaMarcar(credencial.personaId);
  if (!persona || !persona.tipoPersona || !persona.vigente) {
    throw new ForbiddenException(MENSAJES_MARCACION.CREDENCIAL_INACTIVA);
  }
  return { credencial, persona: { ...persona, tipoPersona: persona.tipoPersona } };
}

export async function registrarManual(
  deps: MarcacionesServiceDeps,
  calls: MarcacionesServiceCalls,
  dto: RegistrarMarcacionManualDto,
  actorId: string,
  ip?: string,
): Promise<MarcacionResponseDto> {
  const observacion = dto.observacion?.trim();
  if (!observacion) {
    throw new BadRequestException(MENSAJES_MARCACION.OBSERVACION_REQUERIDA);
  }
  if (!esHoraValida(dto.hora)) {
    throw new BadRequestException(MENSAJES_MARCACION.HORA_INVALIDA);
  }

  const ahora = ahoraEnColegio();
  const fecha = dto.fecha ?? ahora.fecha;
  if (fecha > ahora.fecha || (fecha === ahora.fecha && dto.hora > horaCorta(ahora.hora))) {
    throw new BadRequestException(MENSAJES_MARCACION.FECHA_FUTURA);
  }

  const persona = await deps.repository.findPersonaParaMarcar(dto.personaId);
  if (!persona || !persona.tipoPersona || !persona.vigente) {
    throw new NotFoundException(MENSAJES_MARCACION.PERSONA_NO_ENCONTRADA);
  }
  const esEstudiante = persona.tipoPersona === "estudiantes";
  if (esEstudiante && dto.tipo === "salida") {
    throw new BadRequestException(MENSAJES_MARCACION.SOLO_ENTRADA_ESTUDIANTES);
  }
  await calls.exigirMatriculaSiEstudiante(persona);

  const previas = await deps.repository.marcacionesDePersonaEnFecha(persona.personaId, fecha);
  if (previas.some((m) => m.tipo === dto.tipo)) {
    throw new ConflictException(
      dto.tipo === "entrada"
        ? mensajeYaMarcoEntrada(
            horaDeFechaHora(previas.find((m) => m.tipo === "entrada")!.fechaHora),
          )
        : MENSAJES_MARCACION.YA_MARCO_SALIDA,
    );
  }

  const turno = await calls.turnoDe(persona.tipoPersona);
  const diaConClases = await calls.esDiaConClases(fecha, turno);
  const evaluacion = evaluarMarcacion(dto.tipo, turno, dto.hora, diaConClases);

  const creada = await deps.repository.insertar({
    personaId: persona.personaId,
    credencialId: null,
    turnoId: turno.id,
    tipo: dto.tipo,
    fechaHora: `${fecha} ${dto.hora}:00`,
    origen: "manual",
    resultado: evaluacion.resultado,
    minutosTardanza: evaluacion.minutosTardanza,
    observacion,
    registradaPorId: actorId,
  });

  await deps.auditService.log({
    usuarioId: actorId,
    accion: "crear",
    tabla: "marcaciones",
    registroId: creada.id,
    valorNuevo: {
      personaId: persona.personaId,
      tipo: dto.tipo,
      fechaHora: creada.fechaHora,
      resultado: creada.resultado,
      origen: "manual",
      observacion,
    },
    direccionIp: ip,
  });
  return creada;
}

export async function justificar(
  deps: MarcacionesServiceDeps,
  id: string,
  dto: JustificarMarcacionDto,
  actorId: string,
  ip?: string,
): Promise<MarcacionResponseDto> {
  const motivo = dto.motivo?.trim();
  if (!motivo) {
    throw new BadRequestException(MENSAJES_MARCACION.MOTIVO_JUSTIFICACION_REQUERIDO);
  }
  const marcacion = await deps.repository.findById(id);
  if (!marcacion) {
    throw new NotFoundException(MENSAJES_MARCACION.MARCACION_NO_ENCONTRADA);
  }
  if (marcacion.resultado !== "tardanza" && marcacion.resultado !== "salida_anticipada") {
    throw new BadRequestException(MENSAJES_MARCACION.NO_JUSTIFICABLE);
  }
  if (marcacion.justificada) {
    throw new ConflictException(MENSAJES_MARCACION.YA_JUSTIFICADA);
  }

  const actualizada = await deps.repository.justificar(id, motivo, actorId);
  await deps.auditService.log({
    usuarioId: actorId,
    accion: "actualizar",
    tabla: "marcaciones",
    registroId: id,
    valorAnterior: { justificada: false },
    valorNuevo: { justificada: true, motivo, resultado: actualizada.resultado },
    direccionIp: ip,
  });
  return actualizada;
}
