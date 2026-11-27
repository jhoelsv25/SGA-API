import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import {
  CRON_AVISO_FIN_BIMESTRE,
  JOB_AVISO_FIN_BIMESTRE,
  MENSAJES,
  ZONA_HORARIA_COLEGIO,
} from "../../constants";
import {
  AnioAcademicoResponseDto,
  BimestreFechaDto,
  BimestreResponseDto,
  CreateAnioAcademicoDto,
  ReabrirAnioDto,
  UpdateAnioAcademicoDto,
} from "../../dto";
import { esFechaIso, nombreBimestre } from "../../utils";
import type { AniosAcademicosServiceDeps, AniosAcademicosServiceCalls } from "./deps";

const JOB_CERRAR_REAPERTURAS = "cerrar-reaperturas";

export async function onModuleInit(deps: AniosAcademicosServiceDeps): Promise<void> {
  if (!deps.cola) return;
  try {
    await deps.cola.upsertJobScheduler(
      "cerrar-reaperturas-anio",
      { pattern: "5 0 * * *", tz: ZONA_HORARIA_COLEGIO },
      { name: JOB_CERRAR_REAPERTURAS, data: {} },
    );
    await deps.cola.upsertJobScheduler(
      JOB_AVISO_FIN_BIMESTRE,
      { pattern: CRON_AVISO_FIN_BIMESTRE, tz: ZONA_HORARIA_COLEGIO },
      { name: JOB_AVISO_FIN_BIMESTRE, data: {} },
    );
  } catch (error) {
    deps.logger.warn(
      `No se pudo programar las tareas del año escolar: ${(error as Error).message}`,
    );
  }
}

export async function findAll(
  deps: AniosAcademicosServiceDeps,
  calls: AniosAcademicosServiceCalls,
): Promise<AnioAcademicoResponseDto[]> {
  await calls.cerrarReaperturasVencidas();
  return deps.aniosRepository.findAll();
}

export async function findEnCurso(
  calls: AniosAcademicosServiceCalls,
): Promise<AnioAcademicoResponseDto> {
  await calls.cerrarReaperturasVencidas();
  const vigente = await calls.anioVigente();
  if (!vigente) {
    throw new NotFoundException("No hay un año escolar en curso.");
  }
  return vigente;
}

export async function findById(
  deps: AniosAcademicosServiceDeps,
  id: string,
): Promise<AnioAcademicoResponseDto> {
  const anio = await deps.aniosRepository.findById(id);
  if (!anio) throw new NotFoundException("Año escolar no encontrado.");
  return anio;
}

export async function create(
  deps: AniosAcademicosServiceDeps,
  calls: AniosAcademicosServiceCalls,
  dto: CreateAnioAcademicoDto,
  actorId: string,
  ip?: string,
): Promise<AnioAcademicoResponseDto> {
  calls.assertRangoAnio(dto.fechaInicio, dto.fechaFin);

  const existente = await deps.aniosRepository.findByAnio(dto.anio);
  if (existente) {
    throw new ConflictException(MENSAJES.anioRepetido(dto.anio));
  }

  const bimestres = dto.bimestres ?? [];
  if (bimestres.length > 0) {
    calls.assertBimestres({ fechaInicio: dto.fechaInicio, fechaFin: dto.fechaFin }, bimestres);
  }

  const creado = await deps.aniosRepository.create({
    anio: dto.anio,
    nombre: dto.nombre?.trim() || null,
    fechaInicio: dto.fechaInicio,
    fechaFin: dto.fechaFin,
    bimestres: bimestres.map((bimestre) => ({
      numero: bimestre.numero,
      nombre: nombreBimestre(bimestre.numero),
      fechaInicio: bimestre.fechaInicio,
      fechaFin: bimestre.fechaFin,
    })),
  });

  await deps.auditService.log({
    usuarioId: actorId,
    accion: "crear",
    tabla: "anios_academicos",
    registroId: creado.id,
    valorNuevo: calls.resumen(creado),
    direccionIp: ip,
  });

  return creado;
}

export async function update(
  deps: AniosAcademicosServiceDeps,
  calls: AniosAcademicosServiceCalls,
  id: string,
  dto: UpdateAnioAcademicoDto,
  actorId: string,
  ip?: string,
): Promise<AnioAcademicoResponseDto> {
  const actual = await calls.requireAnio(id);
  calls.assertPlanificado(actual);

  const fechaInicio = dto.fechaInicio ?? actual.fechaInicio;
  const fechaFin = dto.fechaFin ?? actual.fechaFin;
  calls.assertRangoAnio(fechaInicio, fechaFin);

  if (actual.bimestres.length > 0) {
    calls.assertBimestres({ fechaInicio, fechaFin }, actual.bimestres);
  }

  const actualizado = await deps.aniosRepository.update(id, {
    ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() || null } : {}),
    fechaInicio,
    fechaFin,
  });

  await deps.auditService.log({
    usuarioId: actorId,
    accion: "actualizar",
    tabla: "anios_academicos",
    registroId: id,
    valorAnterior: calls.resumen(actual),
    valorNuevo: calls.resumen(actualizado),
    direccionIp: ip,
  });

  return actualizado;
}

export async function guardarBimestres(
  deps: AniosAcademicosServiceDeps,
  calls: AniosAcademicosServiceCalls,
  id: string,
  bimestres: BimestreFechaDto[],
  actorId: string,
  ip?: string,
): Promise<AnioAcademicoResponseDto> {
  const actual = await calls.requireAnio(id);
  calls.assertPlanificado(actual);
  calls.assertBimestres(actual, bimestres);

  const guardado = await deps.aniosRepository.guardarBimestres(
    id,
    bimestres.map((bimestre) => ({
      numero: bimestre.numero,
      nombre: nombreBimestre(bimestre.numero),
      fechaInicio: bimestre.fechaInicio,
      fechaFin: bimestre.fechaFin,
    })),
  );

  await deps.auditService.log({
    usuarioId: actorId,
    accion: "actualizar",
    tabla: "periodos_academicos",
    registroId: id,
    valorAnterior: { bimestres: actual.bimestres },
    valorNuevo: { bimestres: guardado.bimestres },
    direccionIp: ip,
  });

  return guardado;
}

export async function iniciar(
  deps: AniosAcademicosServiceDeps,
  calls: AniosAcademicosServiceCalls,
  id: string,
  actorId: string,
  ip?: string,
): Promise<AnioAcademicoResponseDto> {
  const actual = await calls.requireAnio(id);
  if (actual.estado !== "planificado") {
    throw new BadRequestException("Solo se puede iniciar un año escolar planificado.");
  }

  if (actual.bimestres.length !== 4) {
    throw new BadRequestException(MENSAJES.bimestresIncompletos);
  }
  calls.assertBimestres(actual, actual.bimestres);

  const enCurso = await deps.aniosRepository.findEnCurso();
  if (enCurso && enCurso.id !== id) {
    throw new ConflictException(MENSAJES.otroAnioEnCurso);
  }

  const iniciado = await deps.aniosRepository.cambiarEstadoAnio(id, "en_curso");
  await calls.auditarEstado("anios_academicos", id, actual.estado, iniciado.estado, actorId, ip);
  return iniciado;
}

export async function cerrar(
  deps: AniosAcademicosServiceDeps,
  calls: AniosAcademicosServiceCalls,
  id: string,
  actorId: string,
  ip?: string,
): Promise<AnioAcademicoResponseDto> {
  const actual = await calls.requireAnio(id);
  if (actual.estado !== "en_curso" && actual.estado !== "reabierto") {
    throw new BadRequestException("No se puede cerrar un año que no está en curso.");
  }

  const abiertos = actual.bimestres.filter((bimestre) => bimestre.estado !== "cerrado");
  if (actual.bimestres.length !== 4 || abiertos.length > 0) {
    throw new BadRequestException(MENSAJES.anioConBimestresAbiertos);
  }

  const cerrado = await deps.aniosRepository.cambiarEstadoAnio(id, "cerrado", {
    motivo: actual.motivoReapertura,
    hasta: null,
  });
  const matriculasCulminadas = await deps.aniosRepository.culminarMatriculasDelAnio(id);
  await deps.auditService.log({
    usuarioId: actorId,
    accion: "actualizar",
    tabla: "anios_academicos",
    registroId: id,
    valorAnterior: { estado: actual.estado },
    valorNuevo: { estado: cerrado.estado, matriculasCulminadas },
    direccionIp: ip,
  });
  return cerrado;
}

export async function reabrir(
  deps: AniosAcademicosServiceDeps,
  calls: AniosAcademicosServiceCalls,
  id: string,
  dto: ReabrirAnioDto,
  actorId: string,
  ip?: string,
): Promise<AnioAcademicoResponseDto> {
  const motivo = dto.motivo?.trim() ?? "";
  if (!motivo || !dto.fechaLimite || !esFechaIso(dto.fechaLimite)) {
    throw new BadRequestException(MENSAJES.reaperturaIncompleta);
  }

  const actual = await calls.requireAnio(id);
  if (actual.estado !== "cerrado") {
    throw new BadRequestException("Solo se puede reabrir un año escolar cerrado.");
  }

  const reabierto = await deps.aniosRepository.cambiarEstadoAnio(id, "reabierto", {
    motivo,
    hasta: `${dto.fechaLimite} 23:59:59`,
  });

  await deps.auditService.log({
    usuarioId: actorId,
    accion: "actualizar",
    tabla: "anios_academicos",
    registroId: id,
    valorAnterior: { estado: actual.estado },
    valorNuevo: {
      estado: reabierto.estado,
      motivoReapertura: motivo,
      reabiertoHasta: reabierto.reabiertoHasta,
    },
    direccionIp: ip,
  });

  return reabierto;
}

export async function iniciarBimestre(
  deps: AniosAcademicosServiceDeps,
  calls: AniosAcademicosServiceCalls,
  anioId: string,
  bimestreId: string,
  actorId: string,
  ip?: string,
): Promise<BimestreResponseDto> {
  const anio = await calls.requireAnio(anioId);
  if (anio.estado !== "en_curso" && anio.estado !== "reabierto") {
    throw new BadRequestException("Inicie el año escolar antes de iniciar un bimestre.");
  }

  const bimestre = anio.bimestres.find((item) => item.id === bimestreId);
  if (!bimestre) throw new NotFoundException("Bimestre no encontrado.");
  if (bimestre.estado !== "planificado") {
    throw new BadRequestException("Solo se puede iniciar un bimestre planificado.");
  }

  const anterior = anio.bimestres.find((item) => item.numero === bimestre.numero - 1);
  if (anterior && anterior.estado !== "cerrado") {
    throw new BadRequestException(MENSAJES.bimestreFueraDeOrden);
  }

  const otroEnCurso = await deps.aniosRepository.hayOtroBimestreEnCurso(anioId, bimestreId);
  if (otroEnCurso) {
    throw new BadRequestException(MENSAJES.bimestreFueraDeOrden);
  }

  const iniciado = await deps.aniosRepository.cambiarEstadoBimestre(bimestreId, "en_curso");
  await calls.auditarEstado(
    "periodos_academicos",
    bimestreId,
    bimestre.estado,
    iniciado.estado,
    actorId,
    ip,
  );
  return iniciado;
}

export async function cerrarBimestre(
  deps: AniosAcademicosServiceDeps,
  calls: AniosAcademicosServiceCalls,
  anioId: string,
  bimestreId: string,
  actorId: string,
  ip?: string,
): Promise<BimestreResponseDto> {
  const anio = await calls.requireAnio(anioId);
  const bimestre = anio.bimestres.find((item) => item.id === bimestreId);
  if (!bimestre) throw new NotFoundException("Bimestre no encontrado.");
  if (bimestre.estado !== "en_curso") {
    throw new BadRequestException("Solo se puede cerrar un bimestre en curso.");
  }

  const cerrado = await deps.aniosRepository.cambiarEstadoBimestre(bimestreId, "cerrado");
  await calls.auditarEstado(
    "periodos_academicos",
    bimestreId,
    bimestre.estado,
    cerrado.estado,
    actorId,
    ip,
  );
  return cerrado;
}

export async function sesionesBloqueadasEn(
  deps: AniosAcademicosServiceDeps,
  fecha: string,
): Promise<boolean> {
  return deps.aniosRepository.bimestreCerradoEn(fecha);
}

export async function cerrarReaperturasVencidas(
  deps: AniosAcademicosServiceDeps,
  hoy: string,
): Promise<number> {
  const vencidos = await deps.aniosRepository.cerrarReaperturasVencidas(hoy);
  for (const anio of vencidos) {
    await deps.auditService.log({
      usuarioId: null,
      accion: "actualizar",
      tabla: "anios_academicos",
      registroId: anio.id,
      valorAnterior: { estado: "reabierto" },
      valorNuevo: { estado: "cerrado", vencidoEl: hoy },
    });
  }
  return vencidos.length;
}
