import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import { AuditService } from "@/common/services/audit.service";
import { NotificacionesService } from "@/features/notificaciones/notificaciones.service";
import {
  MAX_ARCHIVOS_POR_CARGA,
  MAX_BYTES_PDF,
  MENSAJES_LIBRETAS,
  ROLES_HISTORIAL,
  ROLES_PROGRAMAN,
  mensajeNoDisponible,
  mensajeOtraSeccion,
  mensajeProgramadas,
  mensajePublicadas,
  mensajeVistaPrevia,
} from "./constants";
import type {
  ActorLibreta,
  AlcanceLibreta,
  ArchivoAsignado,
  ArchivoCarga,
  AsignacionManual,
  CandidatoLibreta,
  EstadoLibreta,
  LibretaSeccionRow,
  PublicacionPersistida,
} from "./interfaces";
import { LibretasRepository } from "./repositories";
import {
  LibretaArchivoStore,
  clasificarArchivo,
  estaATiempo,
  formatearFechaLimite,
  resumirClasificacion,
} from "./utils";

interface PublicacionLista {
  item: ArchivoAsignado;
  buffer: Buffer;
  tamanoBytes: number;
  motivo: string | null;
  esReemplazo: boolean;
  estado: EstadoLibreta;
}

interface PublicacionNotificable extends PublicacionPersistida {
  usuarioEstudianteId: string | null;
  usuarioApoderadoId: string | null;
}

@Injectable()
export class LibretasService {
  constructor(
    private readonly repository: LibretasRepository,
    private readonly archivos: LibretaArchivoStore,
    private readonly auditService: AuditService,
    private readonly anioLectivo: AnioLectivoCls,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  async programar(periodoId: string, fechaLimite: string, actor: ActorLibreta, ip?: string) {
    this.exigirPrograma(actor);
    const periodo = await this.periodoDelAnio(periodoId);
    if (await this.repository.existeProgramacion(periodoId)) {
      throw new ConflictException(MENSAJES_LIBRETAS.YA_PROGRAMADO);
    }

    const cantidad = await this.repository.programar(
      periodoId,
      periodo.anioAcademicoId,
      fechaLimite.slice(0, 10),
    );
    const mensaje = mensajeProgramadas(cantidad, periodo.nombre, formatearFechaLimite(fechaLimite));

    await this.auditService.log({
      usuarioId: actor.id,
      accion: "crear",
      tabla: "libretas",
      registroId: periodoId,
      valorNuevo: { periodoId, fechaLimite, cantidad },
      direccionIp: ip,
    });

    return { mensaje, cantidad, periodoId, fechaLimite: fechaLimite.slice(0, 10) };
  }

  async cambiarFecha(periodoId: string, fechaLimite: string, actor: ActorLibreta, ip?: string) {
    this.exigirPrograma(actor);
    await this.periodoDelAnio(periodoId);
    if (!(await this.repository.existeProgramacion(periodoId))) {
      throw new BadRequestException(MENSAJES_LIBRETAS.SIN_PROGRAMAR);
    }

    const actualizadas = await this.repository.cambiarFechaPendientes(
      periodoId,
      fechaLimite.slice(0, 10),
    );
    if (actualizadas === 0) {
      throw new BadRequestException(MENSAJES_LIBRETAS.SIN_PENDIENTES);
    }

    await this.auditService.log({
      usuarioId: actor.id,
      accion: "actualizar",
      tabla: "libretas",
      registroId: periodoId,
      valorNuevo: { fechaLimite, actualizadas, soloPendientes: true },
      direccionIp: ip,
    });

    return { actualizadas, fechaLimite: fechaLimite.slice(0, 10) };
  }

  async crearPendientesDeMatricula(matriculaId: string): Promise<number> {
    return this.repository.crearPendientesDeMatricula(matriculaId);
  }

  async eliminarPendientesPorRetiro(matriculaId: string, fechaRetiro: string): Promise<number> {
    return this.repository.eliminarPendientesAntesDeLimite(matriculaId, fechaRetiro.slice(0, 10));
  }

  async vistaPrevia(
    seccionId: string,
    periodoId: string,
    archivos: ArchivoCarga[],
    actor: ActorLibreta,
  ) {
    this.validarArchivos(archivos);
    const periodo = await this.periodoDelAnio(periodoId);
    await this.exigirProgramacion(periodoId);
    await this.exigirAlcance(actor, seccionId);
    const clasificados = await this.clasificar(
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
      estudiantes: (await this.repository.listarDeSeccion(seccionId, periodoId)).map((item) => ({
        matriculaId: item.matriculaId,
        nombreCompleto: item.nombreCompleto,
        estado: item.estado,
      })),
    };
  }

  async publicar(
    seccionId: string,
    periodoId: string,
    archivos: ArchivoCarga[],
    asignaciones: AsignacionManual[],
    actor: ActorLibreta,
    ip?: string,
  ) {
    this.validarArchivos(archivos);
    const periodo = await this.periodoDelAnio(periodoId);
    await this.exigirProgramacion(periodoId);
    await this.exigirAlcance(actor, seccionId);

    const deSeccion = await this.repository.listarDeSeccion(seccionId, periodoId);
    const otras = await this.repository.listarCodigosOtrasSecciones(
      periodo.anioAcademicoId,
      seccionId,
    );
    const candidatos = this.candidatos(deSeccion, otras);
    const porMatricula = new Map(deSeccion.map((item) => [item.matriculaId, item]));
    const manualPorNombre = new Map(asignaciones.map((item) => [item.nombreArchivo, item]));
    const lista = this.armarPublicacion(archivos, candidatos, porMatricula, otras, manualPorNombre);

    if (lista.length === 0) {
      throw new BadRequestException(MENSAJES_LIBRETAS.SIN_ASIGNADAS);
    }

    const persistidos: PublicacionNotificable[] = [];
    for (const entrada of lista) {
      const archivoUrl = await this.archivos.guardar(entrada.buffer);
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

    await this.repository.publicar(
      persistidos.map(({ usuarioEstudianteId: _est, usuarioApoderadoId: _apo, ...item }) => item),
      actor.id,
    );
    await this.notificarPublicacion(persistidos, periodo.nombre);

    await this.auditService.log({
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

  async cambiarAlcance(rolId: string, alcance: AlcanceLibreta, actor: ActorLibreta, ip?: string) {
    if (actor.role.toLowerCase() !== "administrador") {
      throw new ForbiddenException(MENSAJES_LIBRETAS.ALCANCE_DENEGADO);
    }
    const anterior = await this.repository.guardarAlcance(rolId, alcance, actor.id);
    await this.auditService.log({
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

  async listarAlcances(actor: ActorLibreta) {
    if (actor.role.toLowerCase() !== "administrador") {
      throw new ForbiddenException(MENSAJES_LIBRETAS.ALCANCE_DENEGADO);
    }
    return this.repository.listarAlcances();
  }

  async seguimiento(periodoId: string, actor: ActorLibreta) {
    await this.periodoDelAnio(periodoId);
    const alcance = await this.alcanceEfectivo(actor);
    const seccionIds =
      alcance === "colegio"
        ? undefined
        : await this.repository.seccionesDePersona(actor.personaId, alcance ?? "tutoria");
    const secciones = await this.repository.seguimiento(periodoId, seccionIds);
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

  async detalle(seccionId: string, periodoId: string, actor: ActorLibreta) {
    await this.periodoDelAnio(periodoId);
    await this.exigirAlcance(actor, seccionId);
    return this.repository.detalleSeccion(seccionId, periodoId);
  }

  async misLibretas(actor: ActorLibreta) {
    const filas = await this.repository.misLibretas(actor.personaId, actor.role);
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

  async abrir(libretaId: string, actor: ActorLibreta, ip?: string) {
    const libreta = await this.repository.obtenerParaApertura(libretaId);
    if (!libreta) throw new NotFoundException(MENSAJES_LIBRETAS.LIBRETA_NO_ENCONTRADA);

    const esFamilia =
      libreta.estudiantePersonaId === actor.personaId ||
      libreta.apoderadoPersonaIds.includes(actor.personaId);
    if (!esFamilia) {
      const alcance = await this.alcanceEfectivo(actor);
      if (alcance !== "colegio") {
        const secciones = await this.repository.seccionesDePersona(
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
      await this.repository.registrarPrimeraVista(libretaId, actor.id);
      await this.auditService.log({
        usuarioId: actor.id,
        accion: "actualizar",
        tabla: "libretas",
        registroId: libretaId,
        valorNuevo: { primeraVista: true },
        direccionIp: ip,
      });
    }

    return {
      ruta: this.archivos.rutaAbsoluta(libreta.archivoUrl),
      nombre: libreta.nombreArchivo ?? "libreta.pdf",
    };
  }

  async historial(libretaId: string, actor: ActorLibreta) {
    if (!ROLES_HISTORIAL.includes(actor.role.toLowerCase() as (typeof ROLES_HISTORIAL)[number])) {
      throw new ForbiddenException(MENSAJES_LIBRETAS.HISTORIAL_DENEGADO);
    }
    const libreta = await this.repository.obtenerParaApertura(libretaId);
    if (!libreta) throw new NotFoundException(MENSAJES_LIBRETAS.LIBRETA_NO_ENCONTRADA);
    const archivos = await this.repository.historial(libretaId);
    return {
      libretaId,
      bimestre: libreta.bimestre,
      archivos: archivos.map((archivo) => ({ ...archivo, vigencia: archivo.vigente ? 1 : 0 })),
    };
  }

  async contexto(actor: ActorLibreta) {
    const anioId = await this.repository.anioDeTrabajo(this.anioLectivo.id());
    const alcance = await this.alcanceEfectivo(actor);
    const [periodos, secciones] = await Promise.all([
      this.repository.listarPeriodos(anioId),
      this.repository.listarSecciones(anioId),
    ]);
    const permitidas =
      alcance === "colegio"
        ? null
        : new Set(await this.repository.seccionesDePersona(actor.personaId, alcance ?? "tutoria"));

    return {
      puedeProgramar: this.puedeProgramar(actor),
      esAdministrador: actor.role.toLowerCase() === "administrador",
      alcance,
      periodos: periodos.map((periodo) => ({
        id: periodo.id,
        nombre: periodo.nombre,
        fechaLimite: periodo.fechaLimite,
        programada: periodo.fechaLimite !== null,
      })),
      secciones: secciones.filter((seccion) => !permitidas || permitidas.has(seccion.id)),
    };
  }

  private armarPublicacion(
    archivos: ArchivoCarga[],
    candidatos: CandidatoLibreta[],
    porMatricula: Map<string, LibretaSeccionRow>,
    otras: Array<{ matriculaId: string; nombreCompleto: string }>,
    manualPorNombre: Map<string, AsignacionManual>,
  ): PublicacionLista[] {
    const lista: PublicacionLista[] = [];
    const estadoEnLote = new Map<string, EstadoLibreta>();

    for (const archivo of archivos) {
      const clasificado = clasificarArchivo(archivo.nombre, candidatos);
      const elegido = this.resolverElegido(
        clasificado,
        manualPorNombre,
        porMatricula,
        otras,
        archivo.nombre,
      );
      if (!elegido) continue;

      const estadoPrevio = estadoEnLote.get(elegido.matriculaId) ?? elegido.estado;
      const esReemplazo = estadoPrevio !== "pendiente";
      const motivo = (manualPorNombre.get(archivo.nombre)?.motivo ?? "").trim();
      if (esReemplazo && !motivo) {
        throw new BadRequestException(MENSAJES_LIBRETAS.REEMPLAZO_SIN_MOTIVO);
      }

      const fila = porMatricula.get(elegido.matriculaId);
      const estado: EstadoLibreta = esReemplazo
        ? estadoPrevio
        : estaATiempo(fila?.fechaLimite ?? "1970-01-01")
          ? "a_tiempo"
          : "fuera_de_plazo";
      estadoEnLote.set(elegido.matriculaId, estado);

      lista.push({
        item: { ...elegido, estado },
        buffer: archivo.buffer,
        tamanoBytes: archivo.tamanoBytes,
        motivo: esReemplazo ? motivo : null,
        esReemplazo,
        estado,
      });
    }

    return lista;
  }

  private resolverElegido(
    clasificado: ReturnType<typeof clasificarArchivo>,
    manualPorNombre: Map<string, AsignacionManual>,
    porMatricula: Map<string, LibretaSeccionRow>,
    otras: Array<{ matriculaId: string; nombreCompleto: string }>,
    nombreArchivo: string,
  ): ArchivoAsignado | null {
    if (clasificado.tipo === "asignada") return clasificado;
    if (clasificado.tipo !== "sin_reconocer") return null;

    const manual = manualPorNombre.get(nombreArchivo);
    if (!manual) return null;
    const estudiante = porMatricula.get(manual.matriculaId);
    if (!estudiante?.libretaId || !estudiante.estado) {
      const nombre = otras.find((item) => item.matriculaId === manual.matriculaId)?.nombreCompleto;
      throw new BadRequestException(
        nombre ? mensajeOtraSeccion(nombre) : MENSAJES_LIBRETAS.ASIGNACION_INVALIDA,
      );
    }
    return {
      nombreArchivo,
      matriculaId: estudiante.matriculaId,
      nombreCompleto: estudiante.nombreCompleto,
      libretaId: estudiante.libretaId,
      estado: estudiante.estado,
      asignacion: "manual",
      codigoLeido: null,
      usuarioEstudianteId: estudiante.usuarioEstudianteId,
      usuarioApoderadoId: estudiante.usuarioApoderadoId,
    };
  }

  private async clasificar(
    seccionId: string,
    periodoId: string,
    anioId: string,
    archivos: ArchivoCarga[],
  ) {
    const deSeccion = await this.repository.listarDeSeccion(seccionId, periodoId);
    const otras = await this.repository.listarCodigosOtrasSecciones(anioId, seccionId);
    const candidatos = this.candidatos(deSeccion, otras);
    return archivos.map((archivo) => clasificarArchivo(archivo.nombre, candidatos));
  }

  private candidatos(
    deSeccion: LibretaSeccionRow[],
    otras: Array<{ matriculaId: string; codigo: string; nombreCompleto: string }>,
  ): CandidatoLibreta[] {
    return [
      ...deSeccion.map((item) => ({
        matriculaId: item.matriculaId,
        codigo: item.codigo,
        nombreCompleto: item.nombreCompleto,
        enSeccion: true,
        libretaId: item.libretaId,
        estado: item.estado,
        usuarioEstudianteId: item.usuarioEstudianteId,
        usuarioApoderadoId: item.usuarioApoderadoId,
      })),
      ...otras.map((item) => ({
        matriculaId: item.matriculaId,
        codigo: item.codigo,
        nombreCompleto: item.nombreCompleto,
        enSeccion: false,
        libretaId: null,
        estado: null,
        usuarioEstudianteId: null,
        usuarioApoderadoId: null,
      })),
    ];
  }

  private validarArchivos(archivos: ArchivoCarga[]): void {
    if (archivos.length === 0) {
      throw new BadRequestException(MENSAJES_LIBRETAS.SIN_ARCHIVOS);
    }
    if (archivos.length > MAX_ARCHIVOS_POR_CARGA) {
      throw new BadRequestException(MENSAJES_LIBRETAS.DEMASIADOS_ARCHIVOS);
    }
    const invalido = archivos.some(
      (archivo) =>
        archivo.mime !== "application/pdf" ||
        !archivo.nombre.toLowerCase().endsWith(".pdf") ||
        archivo.tamanoBytes > MAX_BYTES_PDF ||
        archivo.tamanoBytes <= 0,
    );
    if (invalido) {
      throw new BadRequestException(MENSAJES_LIBRETAS.ARCHIVO_INVALIDO);
    }
  }

  private async periodoDelAnio(periodoId: string) {
    const periodo = await this.repository.obtenerPeriodo(periodoId);
    if (!periodo) throw new NotFoundException(MENSAJES_LIBRETAS.PERIODO_NO_ENCONTRADO);
    const anioId = await this.repository.anioDeTrabajo(this.anioLectivo.id());
    if (periodo.anioAcademicoId !== anioId) {
      throw new BadRequestException(MENSAJES_LIBRETAS.PERIODO_NO_ENCONTRADO);
    }
    return periodo;
  }

  private async exigirProgramacion(periodoId: string): Promise<void> {
    if (!(await this.repository.existeProgramacion(periodoId))) {
      throw new BadRequestException(MENSAJES_LIBRETAS.SIN_PROGRAMAR);
    }
  }

  private async exigirAlcance(actor: ActorLibreta, seccionId: string): Promise<void> {
    const alcance = await this.alcanceEfectivo(actor);
    if (alcance === "colegio") return;
    if (alcance === "tutoria") {
      const esTutor = await this.repository.esTutorDeSeccion(actor.personaId, seccionId);
      if (!esTutor) throw new ForbiddenException(MENSAJES_LIBRETAS.SIN_PERMISO_SECCION);
      return;
    }
    if (alcance === "mis_secciones") {
      const esTutor = await this.repository.esTutorDeSeccion(actor.personaId, seccionId);
      const dicta = await this.repository.dictaEnSeccion(actor.personaId, seccionId);
      if (!esTutor && !dicta) throw new ForbiddenException(MENSAJES_LIBRETAS.SIN_PERMISO_SECCION);
      return;
    }
    throw new ForbiddenException(MENSAJES_LIBRETAS.SIN_PERMISO_SECCION);
  }

  private async alcanceEfectivo(actor: ActorLibreta): Promise<AlcanceLibreta | null> {
    const guardado = await this.repository.obtenerAlcance(actor.roleId);
    if (guardado) return guardado;
    const rol = actor.role.toLowerCase();
    if (rol === "docente") return "mis_secciones";
    if (["director", "subdirector", "secretaria", "administrador"].includes(rol)) return "colegio";
    return null;
  }

  private puedeProgramar(actor: ActorLibreta): boolean {
    return ROLES_PROGRAMAN.includes(actor.role.toLowerCase() as (typeof ROLES_PROGRAMAN)[number]);
  }

  private exigirPrograma(actor: ActorLibreta): void {
    if (!this.puedeProgramar(actor)) {
      throw new ForbiddenException(MENSAJES_LIBRETAS.PROGRAMAR_DENEGADO);
    }
  }

  private async notificarPublicacion(
    items: Array<{ usuarioEstudianteId: string | null; usuarioApoderadoId: string | null }>,
    bimestre: string,
  ): Promise<void> {
    const destinatarios = new Set<string>();
    for (const item of items) {
      if (item.usuarioEstudianteId) destinatarios.add(item.usuarioEstudianteId);
      if (item.usuarioApoderadoId) destinatarios.add(item.usuarioApoderadoId);
    }
    await Promise.all(
      [...destinatarios].map((usuarioId) =>
        this.notificacionesService
          .enviar({
            usuarioId,
            titulo: "Libreta disponible",
            mensaje: `Ya puedes ver la libreta del ${bimestre}.`,
            tipo: "informacion",
            enlaceUrl: "/admin/mis-libretas",
            canales: ["in_app"],
          })
          .catch(() => undefined),
      ),
    );
  }
}
