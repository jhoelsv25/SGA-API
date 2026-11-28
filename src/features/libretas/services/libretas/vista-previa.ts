import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { fechaHoyLima } from "../../../../common/utils/fecha-lima.util";
import {
  MENSAJES_LIBRETAS,
  ROLES_HISTORIAL,
  mensajeNoDisponible,
  mensajePublicadas,
  mensajeVistaPrevia,
} from "../../constants";
import type {
  ActorLibreta,
  AlcanceLibreta,
  ArchivoCarga,
  AsignacionManual,
  PublicacionPersistida,
} from "../../interfaces";
import { resumirClasificacion } from "../../utils";
import type { LibretasServiceDeps, LibretasServiceCalls } from "./deps";
import { periodoDelAnio } from "./periodo-del-anio";
import { clasificar } from "./clasificar";

interface PublicacionNotificable extends PublicacionPersistida {
  usuarioEstudianteId: string | null;
  usuarioApoderadoId: string | null;
}

export async function vistaPrevia(
  deps: LibretasServiceDeps,
  calls: LibretasServiceCalls,
  seccionId: string,
  periodoId: string,
  archivos: ArchivoCarga[],
  actor: ActorLibreta,
) {
  calls.validarArchivos(archivos);
  const periodo = await periodoDelAnio(deps, periodoId);
  await calls.exigirProgramacion(periodoId);
  await calls.exigirAlcance(actor, seccionId);
  const clasificados = await clasificar(
    deps,
    calls,
    seccionId,
    periodoId,
    periodo.anioAcademicoId,
    archivos,
  );
  const resumen = resumirClasificacion(clasificados);
  return {
    mensaje: mensajeVistaPrevia(
      resumen.asignadas.length,
      resumen.sinReconocer.length,
      resumen.otraSeccion.length,
    ),
    asignadas: resumen.asignadas.map((item) => ({
      nombreArchivo: item.nombreArchivo,
      matriculaId: item.matriculaId,
      nombreCompleto: item.nombreCompleto,
      asignacion: item.asignacion,
      estado: item.estado,
    })),
    sinReconocer: resumen.sinReconocer,
    otraSeccion: resumen.otraSeccion,
    estudiantes: (await deps.repository.listarDeSeccion(seccionId, periodoId)).map((item) => ({
      matriculaId: item.matriculaId,
      nombreCompleto: item.nombreCompleto,
      estado: item.estado,
    })),
  };
}

export async function publicar(
  deps: LibretasServiceDeps,
  calls: LibretasServiceCalls,
  seccionId: string,
  periodoId: string,
  archivos: ArchivoCarga[],
  asignaciones: AsignacionManual[],
  actor: ActorLibreta,
  ip?: string,
) {
  calls.validarArchivos(archivos);
  const periodo = await periodoDelAnio(deps, periodoId);
  await calls.exigirProgramacion(periodoId);
  await calls.exigirAlcance(actor, seccionId);

  const deSeccion = await deps.repository.listarDeSeccion(seccionId, periodoId);
  const otras = await deps.repository.listarCodigosOtrasSecciones(
    periodo.anioAcademicoId,
    seccionId,
  );
  const candidatos = calls.candidatos(deSeccion, otras);
  const porMatricula = new Map(deSeccion.map((item) => [item.matriculaId, item]));
  const manualPorNombre = new Map(asignaciones.map((item) => [item.nombreArchivo, item]));
  const lista = calls.armarPublicacion(archivos, candidatos, porMatricula, otras, manualPorNombre);

  if (lista.length === 0) {
    throw new BadRequestException(MENSAJES_LIBRETAS.SIN_ASIGNADAS);
  }

  const persistidos: PublicacionNotificable[] = [];
  for (const entrada of lista) {
    const archivoUrl = await deps.archivos.guardar(entrada.buffer);
    persistidos.push({
      libretaId: entrada.item.libretaId,
      nombreOriginal: entrada.item.nombreArchivo,
      archivoUrl,
      tamanoBytes: entrada.tamanoBytes,
      asignacion: entrada.item.asignacion,
      codigoLeido: entrada.item.codigoLeido,
      motivo: entrada.motivo,
      esReemplazo: entrada.esReemplazo,
      estado: entrada.estado,
      usuarioEstudianteId: entrada.item.usuarioEstudianteId,
      usuarioApoderadoId: entrada.item.usuarioApoderadoId,
    });
  }

  await deps.repository.publicar(
    persistidos.map(({ usuarioEstudianteId: _est, usuarioApoderadoId: _apo, ...item }) => item),
    actor.id,
  );
  await calls.notificarPublicacion(persistidos, periodo.nombre);

  await deps.auditService.log({
    usuarioId: actor.id,
    accion: "crear",
    tabla: "libretas",
    registroId: periodoId,
    valorNuevo: {
      seccionId,
      cantidad: persistidos.length,
      manuales: persistidos
        .filter((item) => item.asignacion === "manual")
        .map((item) => item.libretaId),
      reemplazos: persistidos
        .filter((item) => item.esReemplazo)
        .map((item) => ({
          libretaId: item.libretaId,
          motivo: item.motivo,
        })),
    },
    direccionIp: ip,
  });

  return { mensaje: mensajePublicadas(persistidos.length), cantidad: persistidos.length };
}

export async function cambiarAlcance(
  deps: LibretasServiceDeps,
  rolId: string,
  alcance: AlcanceLibreta,
  actor: ActorLibreta,
  ip?: string,
) {
  if (actor.role.toLowerCase() !== "administrador") {
    throw new ForbiddenException(MENSAJES_LIBRETAS.ALCANCE_DENEGADO);
  }
  const anterior = await deps.repository.guardarAlcance(rolId, alcance, actor.id);
  await deps.auditService.log({
    usuarioId: actor.id,
    accion: "actualizar",
    tabla: "libreta_alcances",
    registroId: rolId,
    valorAnterior: { alcance: anterior },
    valorNuevo: { alcance },
    direccionIp: ip,
  });
  return { rolId, alcance };
}

export async function listarAlcances(deps: LibretasServiceDeps, actor: ActorLibreta) {
  if (actor.role.toLowerCase() !== "administrador") {
    throw new ForbiddenException(MENSAJES_LIBRETAS.ALCANCE_DENEGADO);
  }
  return deps.repository.listarAlcances();
}

export async function seguimiento(
  deps: LibretasServiceDeps,
  calls: LibretasServiceCalls,
  periodoId: string,
  actor: ActorLibreta,
) {
  await calls.periodoDelAnio(periodoId);
  const alcance = await calls.alcanceEfectivo(actor);
  const seccionIds =
    alcance === "colegio"
      ? undefined
      : await deps.repository.seccionesDePersona(actor.personaId, alcance ?? "tutoria");
  const secciones = await deps.repository.seguimiento(periodoId, seccionIds);
  return {
    secciones: secciones.map((seccion) => {
      const programadas = seccion.aTiempo + seccion.fueraDePlazo + seccion.pendientes;
      return {
        ...seccion,
        programadas,
        porcentajeATiempo:
          programadas === 0 ? 0 : Math.round((seccion.aTiempo / programadas) * 100),
      };
    }),
  };
}

export async function detalle(
  deps: LibretasServiceDeps,
  calls: LibretasServiceCalls,
  seccionId: string,
  periodoId: string,
  actor: ActorLibreta,
) {
  await calls.periodoDelAnio(periodoId);
  await calls.exigirAlcance(actor, seccionId);
  return deps.repository.detalleSeccion(seccionId, periodoId);
}

export async function misLibretas(deps: LibretasServiceDeps, actor: ActorLibreta) {
  const filas = await deps.repository.misLibretas(actor.personaId, actor.role);
  return {
    libretas: filas.map((fila) => ({
      id: fila.id,
      periodoId: fila.periodoId,
      bimestre: fila.bimestre,
      estado: fila.estado,
      fechaLimite: fila.fechaLimite,
      estudianteNombre: fila.estudianteNombre,
      disponible: fila.estado !== "pendiente",
      mensaje: fila.estado === "pendiente" ? mensajeNoDisponible(fila.bimestre) : null,
    })),
  };
}

export async function abrir(
  deps: LibretasServiceDeps,
  calls: LibretasServiceCalls,
  libretaId: string,
  actor: ActorLibreta,
  ip?: string,
) {
  const libreta = await deps.repository.obtenerParaApertura(libretaId);
  if (!libreta) throw new NotFoundException(MENSAJES_LIBRETAS.LIBRETA_NO_ENCONTRADA);

  const esFamilia =
    libreta.estudiantePersonaId === actor.personaId ||
    libreta.apoderadoPersonaIds.includes(actor.personaId);
  if (!esFamilia) {
    const alcance = await calls.alcanceEfectivo(actor);
    if (alcance !== "colegio") {
      const secciones = await deps.repository.seccionesDePersona(
        actor.personaId,
        alcance ?? "tutoria",
      );
      if (!secciones.includes(libreta.seccionId)) {
        throw new ForbiddenException(MENSAJES_LIBRETAS.ACCESO_DENEGADO);
      }
    }
  }

  if (libreta.estado === "pendiente" || !libreta.archivoUrl) {
    throw new BadRequestException(mensajeNoDisponible(libreta.bimestre));
  }

  if (esFamilia && !libreta.vistoEn) {
    await deps.repository.registrarPrimeraVista(libretaId, actor.id);
    await deps.auditService.log({
      usuarioId: actor.id,
      accion: "actualizar",
      tabla: "libretas",
      registroId: libretaId,
      valorNuevo: { primeraVista: true },
      direccionIp: ip,
    });
  }

  return {
    ruta: deps.archivos.rutaAbsoluta(libreta.archivoUrl),
    nombre: libreta.nombreArchivo ?? "libreta.pdf",
  };
}

export async function historial(deps: LibretasServiceDeps, libretaId: string, actor: ActorLibreta) {
  if (!ROLES_HISTORIAL.includes(actor.role.toLowerCase() as (typeof ROLES_HISTORIAL)[number])) {
    throw new ForbiddenException(MENSAJES_LIBRETAS.HISTORIAL_DENEGADO);
  }
  const libreta = await deps.repository.obtenerParaApertura(libretaId);
  if (!libreta) throw new NotFoundException(MENSAJES_LIBRETAS.LIBRETA_NO_ENCONTRADA);
  const archivos = await deps.repository.historial(libretaId);
  return {
    libretaId,
    bimestre: libreta.bimestre,
    archivos: archivos.map((archivo) => ({ ...archivo, vigencia: archivo.vigente ? 1 : 0 })),
  };
}

export async function contexto(
  deps: LibretasServiceDeps,
  calls: LibretasServiceCalls,
  actor: ActorLibreta,
) {
  const anioId = await deps.repository.anioDeTrabajo(deps.anioLectivo.id());
  const alcance = await calls.alcanceEfectivo(actor);
  const [periodos, secciones] = await Promise.all([
    deps.repository.listarPeriodos(anioId),
    deps.repository.listarSecciones(anioId),
  ]);
  const permitidas =
    alcance === "colegio"
      ? null
      : new Set(await deps.repository.seccionesDePersona(actor.personaId, alcance ?? "tutoria"));

  const hoy = fechaHoyLima();

  return {
    puedeProgramar: calls.puedeProgramar(actor),
    esAdministrador: actor.role.toLowerCase() === "administrador",
    alcance,
    periodos: periodos.map((periodo) => ({
      id: periodo.id,
      nombre: periodo.nombre,
      fechaLimite: periodo.fechaLimite,
      fechaInicio: periodo.fechaInicio ?? null,
      fechaFin: periodo.fechaFin ?? null,
      programada: periodo.fechaLimite !== null,
      vigente:
        periodo.fechaInicio != null &&
        periodo.fechaFin != null &&
        hoy >= periodo.fechaInicio &&
        hoy <= periodo.fechaFin,
    })),
    secciones: secciones.filter((seccion) => !permitidas || permitidas.has(seccion.id)),
  };
}
