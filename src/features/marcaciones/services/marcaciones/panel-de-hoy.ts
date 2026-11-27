import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { TurnoResponseDto } from "../../../turnos/dto";
import {
  LIMITE_REPORTE_MAXIMO,
  LIMITE_REPORTE_POR_DEFECTO,
  MENSAJES_MARCACION,
  mensajeEntrada,
  mensajeSalida,
  mensajeTardanza,
  mensajeYaMarcoEntrada,
  mensajeYaMarcoReciente,
  VARIABLE_HORARIO_POR_CLASES,
  VARIABLE_MINUTOS_ENTRE_VIAS,
  VARIABLE_SEGUNDOS_DOBLE_LECTURA,
  type TipoMarcacion,
  type TipoPersonaMarcacion,
} from "../../constants";
import type {
  MarcacionKioskoResponseDto,
  MarcacionResponseDto,
  PanelMarcacionesHoyResponseDto,
  ReporteMarcacionesQueryDto,
  ReporteMarcacionesResponseDto,
} from "../../dto";
import type {
  MarcacionDelDia,
  NuevaMarcacion,
  PersonaAutenticada,
  PersonaParaMarcar,
} from "../../interfaces";
import type { MarcacionesRepository } from "../../repositories";
import {
  ahoraEnColegio,
  esDiaLaborable,
  evaluarMarcacion,
  horaDeFechaHora,
  turnoSegunClases,
  type DecisionMarca,
} from "../../utils";
import type { CambioAuditable, MarcacionesServiceCalls, MarcacionesServiceDeps } from "./deps";

export async function panelDeHoy(
  deps: MarcacionesServiceDeps,
  calls: MarcacionesServiceCalls,
): Promise<PanelMarcacionesHoyResponseDto> {
  const { fecha } = ahoraEnColegio();
  const anio = await deps.aniosService.anioVigente();
  const turnoEstudiantes = await deps.turnosRepository.findByAplicaA("estudiantes");
  const diaConClases = turnoEstudiantes
    ? await calls.esDiaConClases(fecha, turnoEstudiantes)
    : false;
  const grupos = await deps.repository.panelDelDia(fecha, anio?.id ?? null);
  return { fecha, diaConClases, ...grupos };
}

export async function reporte(
  deps: MarcacionesServiceDeps,
  query: ReporteMarcacionesQueryDto,
): Promise<ReporteMarcacionesResponseDto> {
  if (query.hasta < query.desde) {
    throw new BadRequestException("La fecha de fin debe ser posterior al inicio.");
  }
  const limite = Math.min(query.limit ?? LIMITE_REPORTE_POR_DEFECTO, LIMITE_REPORTE_MAXIMO);
  return deps.repository.reporte(query, limite);
}

export async function exigirMatriculaSiEstudiante(
  deps: MarcacionesServiceDeps,
  persona: PersonaParaMarcar,
): Promise<void> {
  if (persona.tipoPersona !== "estudiantes" || !persona.estudianteId) return;
  const anio = await deps.aniosService.anioVigente();
  const matriculado = anio
    ? await deps.repository.tieneMatriculaVigente(persona.estudianteId, anio.id)
    : false;
  if (!matriculado) {
    throw new ForbiddenException(MENSAJES_MARCACION.SIN_MATRICULA);
  }
}

export function exigirOrdenDelDia(
  tipo: TipoMarcacion,
  fechaHora: string,
  previas: readonly MarcacionDelDia[],
): void {
  const otra = previas.find((m) => m.tipo !== tipo);
  if (!otra) return;
  if (tipo === "salida" && fechaHora <= otra.fechaHora) {
    throw new BadRequestException(MENSAJES_MARCACION.SALIDA_ANTES_DE_ENTRADA);
  }
  if (tipo === "entrada" && fechaHora >= otra.fechaHora) {
    throw new BadRequestException(MENSAJES_MARCACION.ENTRADA_DESPUES_DE_SALIDA);
  }
}

export async function guardarMarca(
  repositorio: MarcacionesRepository,
  nueva: NuevaMarcacion,
  reemplazada?: MarcacionDelDia,
): Promise<{ marcacion: MarcacionResponseDto; reemplazo?: CambioAuditable }> {
  if (!reemplazada) return { marcacion: await repositorio.insertar(nueva) };
  const anterior = await repositorio.findById(reemplazada.id);
  const marcacion = await repositorio.reemplazar(reemplazada.id, nueva);
  return {
    marcacion,
    reemplazo: {
      marcacionId: reemplazada.id,
      valorAnterior: {
        fechaHora: reemplazada.fechaHora,
        origen: reemplazada.origen,
        resultado: anterior?.resultado,
        minutosTardanza: anterior?.minutosTardanza,
        justificada: anterior?.justificada,
        motivoJustificacion: anterior?.motivoJustificacion,
      },
      valorNuevo: {
        fechaHora: nueva.fechaHora,
        origen: nueva.origen,
        resultado: nueva.resultado,
        minutosTardanza: nueva.minutosTardanza,
        motivo:
          nueva.tipo === "salida"
            ? "Marca más tarde: es la nueva salida."
            : "Marca más temprana: es la nueva entrada.",
      },
    },
  };
}

export async function auditarReemplazo(
  deps: MarcacionesServiceDeps,
  cambio: CambioAuditable,
): Promise<void> {
  await deps.auditService.log({
    usuarioId: null,
    accion: "actualizar",
    tabla: "marcaciones",
    registroId: cambio.marcacionId,
    valorAnterior: cambio.valorAnterior,
    valorNuevo: cambio.valorNuevo,
  });
}

export async function turnoDePersona(
  deps: MarcacionesServiceDeps,
  personaId: string,
  tipoPersona: TipoPersonaMarcacion,
  fecha: string,
): Promise<TurnoResponseDto | null> {
  const general = await deps.turnosRepository.findByAplicaA(tipoPersona);
  if (!general || tipoPersona !== "docentes") return general;
  if (!(await deps.variablesService.isActiva(VARIABLE_HORARIO_POR_CLASES.codigo, false))) {
    return general;
  }
  const clases = await deps.repository.clasesDeDocenteEnFecha(personaId, fecha);
  return turnoSegunClases(general, clases, fecha);
}

export function exigirTurno(turno: TurnoResponseDto | null | undefined): TurnoResponseDto {
  if (!turno || !turno.activo) {
    throw new BadRequestException(MENSAJES_MARCACION.SIN_TURNO);
  }
  return turno;
}

export async function esDiaDeAsistencia(
  deps: MarcacionesServiceDeps,
  calls: MarcacionesServiceCalls,
  fecha: string,
  turno: TurnoResponseDto,
  tipoPersona: string,
): Promise<boolean> {
  if (tipoPersona === "estudiantes") return calls.esDiaConClases(fecha, turno);
  if (!esDiaLaborable(fecha, turno.diasLaborables)) return false;
  return !(await deps.calendarioService.fechasSinTrabajoPersonal([fecha])).has(fecha);
}

export async function esDiaConClases(
  deps: MarcacionesServiceDeps,
  fecha: string,
  turno: TurnoResponseDto,
): Promise<boolean> {
  if (!esDiaLaborable(fecha, turno.diasLaborables)) return false;
  return !(await deps.calendarioService.suspendeClasesEn(fecha));
}

export async function segundosDobleLectura(deps: MarcacionesServiceDeps): Promise<number> {
  const { codigo, porDefecto } = VARIABLE_SEGUNDOS_DOBLE_LECTURA;
  const valor = Number(await deps.variablesService.getValor(codigo, String(porDefecto)));
  return Number.isInteger(valor) && valor >= 0 ? valor : porDefecto;
}

export async function minutosEntreVias(deps: MarcacionesServiceDeps): Promise<number> {
  const valor = Number(
    await deps.variablesService.getValor(
      VARIABLE_MINUTOS_ENTRE_VIAS.codigo,
      String(VARIABLE_MINUTOS_ENTRE_VIAS.porDefecto),
    ),
  );
  return Number.isFinite(valor) && valor >= 0 ? valor : VARIABLE_MINUTOS_ENTRE_VIAS.porDefecto;
}

export async function reetiquetarEntradaComoSalida(
  repositorio: MarcacionesRepository,
  entrada: MarcacionDelDia,
  turno: TurnoResponseDto,
  diaConClases: boolean,
): Promise<CambioAuditable> {
  const anterior = await repositorio.findById(entrada.id);
  const evaluacion = evaluarMarcacion(
    "salida",
    turno,
    entrada.fechaHora.slice(11, 19),
    diaConClases,
  );
  const nuevo = {
    tipo: "salida" as const,
    resultado: evaluacion.resultado,
    minutosTardanza: evaluacion.minutosTardanza,
  };
  await repositorio.reetiquetar(entrada.id, nuevo);
  return {
    marcacionId: entrada.id,
    valorAnterior: {
      tipo: "entrada",
      resultado: anterior?.resultado,
      minutosTardanza: anterior?.minutosTardanza,
      justificada: anterior?.justificada,
      motivoJustificacion: anterior?.motivoJustificacion,
    },
    valorNuevo: { ...nuevo, justificada: false },
  };
}

export async function auditarReetiquetado(
  deps: MarcacionesServiceDeps,
  cambio: CambioAuditable,
): Promise<void> {
  await deps.auditService.log({
    usuarioId: null,
    accion: "actualizar",
    tabla: "marcaciones",
    registroId: cambio.marcacionId,
    valorAnterior: cambio.valorAnterior,
    valorNuevo: {
      ...cambio.valorNuevo,
      motivo: "Llegó una marcación anterior: la entrada pasa a ser la salida.",
    },
  });
}

export async function dejarRastroDeIgnorada(
  deps: MarcacionesServiceDeps,
  personaId: string,
  fechaHora: string,
  origen: "kiosko" | "biometrico",
  decision: Extract<DecisionMarca, { accion: "ignorar" }>,
): Promise<void> {
  // Las marcas que no cuentan también quedan guardadas, para poder revisarlas.
  if (decision.razon === "intermedia") {
    await deps.auditService.log({
      usuarioId: null,
      accion: "crear",
      tabla: "marcaciones_intermedias",
      valorNuevo: { personaId, fechaHora, origen },
    });
  }
  if (decision.razon !== "duplicada_entre_vias") return;
  await deps.auditService.log({
    usuarioId: null,
    accion: "crear",
    tabla: "marcaciones_duplicadas_entre_vias",
    valorNuevo: {
      personaId,
      fechaHora,
      origen,
      coincideCon: {
        marcacionId: decision.con.id,
        origen: decision.con.origen,
        tipo: decision.con.tipo,
        fechaHora: decision.con.fechaHora,
      },
    },
  });
}

export function respuestaIgnorada(
  calls: MarcacionesServiceCalls,
  persona: PersonaParaMarcar,
  previas: MarcacionDelDia[],
  decision: Extract<DecisionMarca, { accion: "ignorar" }>,
): MarcacionKioskoResponseDto {
  if (decision.razon === "duplicada_entre_vias") {
    return {
      registrada: false,
      mensaje: mensajeYaMarcoReciente(horaDeFechaHora(decision.con.fechaHora)),
      nombreCompleto: persona.nombreCompleto,
      fotoUrl: persona.fotoUrl,
    };
  }
  if (decision.razon === "intermedia") {
    return {
      registrada: false,
      mensaje: MENSAJES_MARCACION.MARCA_INTERMEDIA,
      nombreCompleto: persona.nombreCompleto,
      fotoUrl: persona.fotoUrl,
    };
  }
  return calls.respuestaYaMarco(persona, previas);
}

export function respuestaYaMarco(
  persona: PersonaParaMarcar,
  previas: { tipo: TipoMarcacion; fechaHora: string }[],
): MarcacionKioskoResponseDto {
  const entrada = previas.find((m) => m.tipo === "entrada");
  let mensaje: string = MENSAJES_MARCACION.YA_MARCO_ENTRADA_Y_SALIDA;
  if (!entrada) {
    mensaje = MENSAJES_MARCACION.YA_MARCO_SALIDA;
  } else if (persona.tipoPersona === "estudiantes") {
    mensaje = mensajeYaMarcoEntrada(horaDeFechaHora(entrada.fechaHora));
  }
  return {
    registrada: false,
    mensaje,
    nombreCompleto: persona.nombreCompleto,
    fotoUrl: persona.fotoUrl,
  };
}

export function mensajeDeResultado(
  nombre: string,
  tipo: TipoMarcacion,
  hora: string,
  resultado: string,
  minutos: number,
): string {
  if (resultado === "fuera_de_turno") return MENSAJES_MARCACION.FUERA_DE_HORARIO;
  if (tipo === "salida") return mensajeSalida(nombre, hora);
  return resultado === "tardanza"
    ? mensajeTardanza(nombre, hora, minutos)
    : mensajeEntrada(nombre, hora);
}

export async function despacharAlertaTardanza(
  deps: MarcacionesServiceDeps,
  persona: PersonaAutenticada,
  minutosTardanza: number,
  horaMarcada: string,
): Promise<void> {
  if (!deps.notificacionesService) return;
  try {
    const apoderados = await deps.repository.findApoderadosDePersonaEstudiante(persona.personaId);
    for (const apo of apoderados) {
      await deps.notificacionesService.enviar({
        usuarioId: apo.usuarioId,
        titulo: "Aviso de tardanza en ingreso",
        mensaje: `El estudiante ${persona.nombreCompleto} ingresó al colegio con ${minutosTardanza} minutos de tardanza a las ${horaMarcada}.`,
        tipo: "alerta",
        enlaceUrl: "/admin/mi-asistencia",
        canales: ["in_app", "push", "email", "webhook"],
      });
    }
  } catch {
    // Silenciar para no afectar la marcación en el kiosko
  }
}
