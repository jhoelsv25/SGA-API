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
  mensajeYaMarcoReciente,
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
  lecturaRepetidaEnKiosko,
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

  // Lo guardado al llegar el pedido: sirve para reconocer otro envío del kiosko que se procese a la vez.
  const alLlegar = new Set(
    (await deps.repository.marcacionesDePersonaEnFecha(persona.personaId, fecha)).map((m) => m.id),
  );
  const minutosEntreVias = await calls.minutosEntreVias();
  // Los estudiantes solo marcan entrada: para ellos no hay salida falsa posible.
  const segundosDobleLectura =
    persona.tipoPersona === "estudiantes" ? 0 : await calls.segundosDobleLectura();
  const turno = await calls.turnoDePersona(persona.personaId, persona.tipoPersona, fecha);
  const diaConClases = turno
    ? await calls.esDiaDeAsistencia(fecha, turno, persona.tipoPersona)
    : false;

  const resultado = await deps.repository.conBloqueoDelDia(
    persona.personaId,
    fecha,
    async (repositorio) => {
      const previas = await repositorio.marcacionesDePersonaEnFecha(persona.personaId, fecha);
      const simultanea =
        previas.find((m) => m.origen === "kiosko" && !alLlegar.has(m.id)) ??
        lecturaRepetidaEnKiosko(previas, fechaHora, segundosDobleLectura);
      if (simultanea) {
        return { estado: "simultanea" as const, previas, simultanea };
      }
      const decision = decidirMarca({
        esEstudiante: persona.tipoPersona === "estudiantes",
        previas,
        fechaHora,
        origen: "kiosko",
        minutosEntreVias,
      });
      if (decision.accion === "ignorar") {
        return { estado: "ignorada" as const, previas, decision };
      }
      const turnoVigente = calls.exigirTurno(turno);
      const evaluacion = evaluarMarcacion(decision.tipo, turnoVigente, hora, diaConClases);
      const reetiquetada =
        decision.accion === "registrar" && decision.reetiquetar
          ? await calls.reetiquetarEntradaComoSalida(
              repositorio,
              decision.reetiquetar,
              turnoVigente,
              diaConClases,
            )
          : undefined;
      const { marcacion: creada, reemplazo } = await calls.guardarMarca(
        repositorio,
        {
          personaId: persona.personaId,
          credencialId: credencial.id,
          turnoId: turnoVigente.id,
          tipo: decision.tipo,
          fechaHora,
          origen: "kiosko",
          resultado: evaluacion.resultado,
          minutosTardanza: evaluacion.minutosTardanza,
        },
        decision.accion === "reemplazar" ? decision.marca : undefined,
      );
      return {
        estado: "registrada" as const,
        tipo: decision.tipo,
        evaluacion,
        creada,
        reetiquetada,
        reemplazo,
      };
    },
  );

  if (resultado.estado === "simultanea") {
    return {
      registrada: false,
      mensaje: mensajeYaMarcoReciente(horaDeFechaHora(resultado.simultanea.fechaHora)),
      nombreCompleto: persona.nombreCompleto,
      fotoUrl: persona.fotoUrl,
    };
  }
  if (resultado.estado === "ignorada") {
    await calls.dejarRastroDeIgnorada(persona.personaId, fechaHora, "kiosko", resultado.decision);
    return calls.respuestaIgnorada(persona, resultado.previas, resultado.decision);
  }
  const { tipo, evaluacion, creada } = resultado;
  if (resultado.reetiquetada) await calls.auditarReetiquetado(resultado.reetiquetada);
  if (resultado.reemplazo) await calls.auditarReemplazo(resultado.reemplazo);

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

  const minutosEntreVias = await calls.minutosEntreVias();
  const turno = await calls.turnoDePersona(persona.personaId, persona.tipoPersona, fecha);
  const diaConClases = turno
    ? await calls.esDiaDeAsistencia(fecha, turno, persona.tipoPersona)
    : false;

  try {
    const resultado = await deps.repository.conBloqueoDelDia(
      persona.personaId,
      fecha,
      async (repositorio) => {
        const previas = await repositorio.marcacionesDePersonaEnFecha(persona.personaId, fecha);
        if (previas.some((m) => m.fechaHora === fechaHora)) {
          return { estado: "duplicada" as const };
        }
        // El rebote es del dedo en el reloj. Una marca de otra vía la decide la ventana entre vías, que deja
        // rastro; si esa ventana está desactivada, el rebote sigue protegiendo. Con la salida ya registrada no
        // hace falta: la marca posterior solo actualiza la salida.
        const ultima = previas[previas.length - 1];
        if (
          ultima &&
          !previas.some((m) => m.tipo === "salida") &&
          (ultima.origen === "biometrico" || minutosEntreVias === 0)
        ) {
          const minutos = minutosEntre(ultima.fechaHora, fechaHora);
          if (minutos >= 0 && minutos < minutosAntirrebote) {
            return { estado: "ignorada" as const, razon: "rebote" as const };
          }
        }
        const decision = decidirMarca({
          esEstudiante: false,
          previas,
          fechaHora,
          origen: "biometrico",
          minutosEntreVias,
        });
        if (decision.accion === "ignorar") {
          return { estado: "descartada" as const, decision };
        }
        if (!turno || !turno.activo) {
          return { estado: "sin_turno" as const };
        }
        const evaluacion = evaluarMarcacion(decision.tipo, turno, hora, diaConClases);
        const reetiquetada =
          decision.accion === "registrar" && decision.reetiquetar
            ? await calls.reetiquetarEntradaComoSalida(
                repositorio,
                decision.reetiquetar,
                turno,
                diaConClases,
              )
            : undefined;
        const { marcacion, reemplazo } = await calls.guardarMarca(
          repositorio,
          {
            personaId: persona.personaId,
            credencialId: null,
            turnoId: turno.id,
            tipo: decision.tipo,
            fechaHora,
            origen: "biometrico",
            resultado: evaluacion.resultado,
            minutosTardanza: evaluacion.minutosTardanza,
            equipoId,
          },
          decision.accion === "reemplazar" ? decision.marca : undefined,
        );
        return { estado: "registrada" as const, marcacion, reetiquetada, reemplazo };
      },
    );

    if (resultado.estado === "descartada") {
      const { decision } = resultado;
      await calls.dejarRastroDeIgnorada(persona.personaId, fechaHora, "biometrico", decision);
      return { estado: "ignorada", razon: decision.razon };
    }
    if (resultado.estado === "registrada") {
      if (resultado.reetiquetada) await calls.auditarReetiquetado(resultado.reetiquetada);
      if (resultado.reemplazo) await calls.auditarReemplazo(resultado.reemplazo);
      return { estado: "registrada", marcacion: resultado.marcacion };
    }
    return resultado;
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

  const turno = await calls.turnoDePersona(persona.personaId, persona.tipoPersona, fecha);
  const diaConClases = turno
    ? await calls.esDiaDeAsistencia(fecha, turno, persona.tipoPersona)
    : false;

  const { creada, reetiquetada, reemplazo } = await deps.repository.conBloqueoDelDia(
    persona.personaId,
    fecha,
    async (repositorio) => {
      const previas = await repositorio.marcacionesDePersonaEnFecha(persona.personaId, fecha);
      const fechaHora = `${fecha} ${dto.hora}:00`;
      // La entrada es la hora más temprana y la salida la más tarde: solo así se acepta otra del mismo tipo.
      const mismoTipo = previas.find((m) => m.tipo === dto.tipo);
      const mejora =
        mismoTipo !== undefined &&
        !esEstudiante &&
        (dto.tipo === "salida" ? fechaHora > mismoTipo.fechaHora : fechaHora < mismoTipo.fechaHora);
      if (mismoTipo && !mejora) {
        throw new ConflictException(
          dto.tipo === "entrada"
            ? mensajeYaMarcoEntrada(horaDeFechaHora(mismoTipo.fechaHora))
            : MENSAJES_MARCACION.YA_MARCO_SALIDA,
        );
      }
      calls.exigirOrdenDelDia(dto.tipo, fechaHora, previas);
      const turnoVigente = calls.exigirTurno(turno);
      const evaluacion = evaluarMarcacion(dto.tipo, turnoVigente, dto.hora, diaConClases);
      // Entrada más temprana sin salida guardada (p. ej. solo marcó al irse): la anterior pasa a ser la salida.
      const pasaASalida =
        mejora && dto.tipo === "entrada" && !previas.some((m) => m.tipo === "salida")
          ? mismoTipo
          : undefined;
      const reetiquetada = pasaASalida
        ? await calls.reetiquetarEntradaComoSalida(
            repositorio,
            pasaASalida,
            turnoVigente,
            diaConClases,
          )
        : undefined;
      const { marcacion, reemplazo } = await calls.guardarMarca(
        repositorio,
        {
          personaId: persona.personaId,
          credencialId: null,
          turnoId: turnoVigente.id,
          tipo: dto.tipo,
          fechaHora,
          origen: "manual",
          resultado: evaluacion.resultado,
          minutosTardanza: evaluacion.minutosTardanza,
          observacion,
          registradaPorId: actorId,
        },
        mejora && !pasaASalida ? mismoTipo : undefined,
      );
      return { creada: marcacion, reetiquetada, reemplazo };
    },
  );
  if (reetiquetada) await calls.auditarReetiquetado(reetiquetada);
  if (reemplazo) await calls.auditarReemplazo(reemplazo);

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
