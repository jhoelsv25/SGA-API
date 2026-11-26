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
  VARIABLE_MINUTOS_ENTRE_VIAS,
  type TipoMarcacion,
  type TipoPersonaMarcacion,
} from "../../constants";
import type {
  MarcacionKioskoResponseDto,
  PanelMarcacionesHoyResponseDto,
  ReporteMarcacionesQueryDto,
  ReporteMarcacionesResponseDto,
} from "../../dto";
import type { MarcacionDelDia, PersonaAutenticada, PersonaParaMarcar } from "../../interfaces";
import {
  ahoraEnColegio,
  esDiaLaborable,
  evaluarMarcacion,
  horaDeFechaHora,
  type DecisionMarca,
} from "../../utils";
import type { MarcacionesServiceDeps, MarcacionesServiceCalls } from "./deps";

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

export async function turnoDe(
  deps: MarcacionesServiceDeps,
  tipoPersona: TipoPersonaMarcacion,
): Promise<TurnoResponseDto> {
  const turno = await deps.turnosRepository.findByAplicaA(tipoPersona);
  if (!turno || !turno.activo) {
    throw new BadRequestException(MENSAJES_MARCACION.SIN_TURNO);
  }
  return turno;
}

export async function esDiaConClases(
  deps: MarcacionesServiceDeps,
  fecha: string,
  turno: TurnoResponseDto,
): Promise<boolean> {
  if (!esDiaLaborable(fecha, turno.diasLaborables)) return false;
  return !(await deps.calendarioService.suspendeClasesEn(fecha));
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
  deps: MarcacionesServiceDeps,
  entrada: MarcacionDelDia,
  turno: TurnoResponseDto,
  diaConClases: boolean,
): Promise<void> {
  const evaluacion = evaluarMarcacion(
    "salida",
    turno,
    entrada.fechaHora.slice(11, 19),
    diaConClases,
  );
  await deps.repository.reetiquetar(entrada.id, {
    tipo: "salida",
    resultado: evaluacion.resultado,
    minutosTardanza: evaluacion.minutosTardanza,
  });
  await deps.auditService.log({
    usuarioId: null,
    accion: "actualizar",
    tabla: "marcaciones",
    registroId: entrada.id,
    valorAnterior: { tipo: "entrada" },
    valorNuevo: {
      tipo: "salida",
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
  return calls.respuestaYaMarco(persona, previas);
}

export function respuestaYaMarco(
  persona: PersonaParaMarcar,
  previas: { tipo: TipoMarcacion; fechaHora: string }[],
): MarcacionKioskoResponseDto {
  const entrada = previas.find((m) => m.tipo === "entrada");
  const mensaje =
    persona.tipoPersona === "estudiantes" && entrada
      ? mensajeYaMarcoEntrada(horaDeFechaHora(entrada.fechaHora))
      : MENSAJES_MARCACION.YA_MARCO_ENTRADA_Y_SALIDA;
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
