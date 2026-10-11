import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import { AnioLectivoCls } from "../../common/anio-lectivo";
import { AuditService } from "../../common/services/audit.service";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { AniosAcademicosService } from "../anio-escolar/anios.service";
import { ahoraEnColegio } from "../marcaciones/utils";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import {
  CARPETA_MATERIALES,
  DIAS_PLANIFICACION_POR_DEFECTO,
  MENSAJES_AULA_VIRTUAL,
  ROLES_NOTIFICADOS_SOLICITUD,
  ROLES_SEGUIMIENTO_MATERIALES,
  TAMANO_MAXIMO_MB_POR_DEFECTO,
  VARIABLES_MATERIAL,
  mensajeFueraDePlazo,
  mensajePlanificado,
  type EstadoSolicitudFecha,
  type TipoMaterial,
} from "./constants";
import type {
  ActualizarMaterialDto,
  ActualizarUnidadDto,
  AulaVirtualResponse,
  ContenidoMaterialDto,
  CrearUnidadDto,
  CursoAulaResponse,
  MaterialResponse,
  MutacionMaterialResponse,
  PlanificarMaterialDto,
  PublicarMaterialExtraDto,
  ResolverSolicitudDto,
  SeguimientoFilaResponse,
  SeguimientoResponse,
  SolicitarCambioFechaDto,
  SolicitudCambioResponse,
  UnidadResponse,
} from "./dto";
import type {
  CursoAula,
  ContenidoMaterial,
  MaterialFila,
  PeriodoAula,
  SolicitudFila,
  UnidadFila,
} from "./interfaces";
import { AulaVirtualRepository } from "./repositories";
import {
  diaIsoDe,
  esEnlaceValido,
  estaEnVentana,
  estadoPlazo,
  fechaMinimaFueraDeVentana,
  formatearFecha,
  formatoPermitido,
  porcentajeATiempo,
} from "./utils";

@Injectable()
export class AulaVirtualService {
  constructor(
    private readonly repository: AulaVirtualRepository,
    private readonly aniosService: AniosAcademicosService,
    private readonly anioLectivoCls: AnioLectivoCls,
    private readonly notificaciones: NotificacionesService,
    private readonly auditService: AuditService,
  ) {}

  // ───────────────────────── Consulta del aula ─────────────────────────

  /** Cursos con aula virtual del usuario: dicta (docente) o cursa (estudiante). */
  async misCursos(usuario: AuthenticatedUser): Promise<CursoAulaResponse[]> {
    const anioId = await this.anioDeTrabajo();
    const docenteId = await this.repository.findDocenteIdPorPersona(usuario.personaId);
    if (docenteId) {
      const dictados = await this.repository.cursosDelDocente(docenteId, anioId);
      if (dictados.length > 0) return dictados;
    }
    return this.repository.cursosDelEstudiante(usuario.personaId, anioId);
  }

  async obtenerAula(
    cursoSeccionId: string,
    usuario: AuthenticatedUser,
  ): Promise<AulaVirtualResponse> {
    const curso = await this.requerirCurso(cursoSeccionId);
    const esDocente = await this.esDocenteDelCurso(curso, usuario);
    const esDirectivo = this.esRolDeSeguimiento(usuario);
    if (!esDocente && !esDirectivo) {
      const matriculado = await this.repository.estudianteTieneMatriculaEnSeccion(
        usuario.personaId,
        curso.seccionId,
      );
      if (!matriculado) throw new ForbiddenException(MENSAJES_AULA_VIRTUAL.SIN_ACCESO_AULA);
    }

    const verTodo = esDocente || esDirectivo;
    const [unidades, materiales, dias, tamano, bloques] = await Promise.all([
      this.repository.listarUnidades(cursoSeccionId, !verTodo),
      this.repository.listarMateriales(cursoSeccionId, { soloPublicados: !verTodo }),
      this.diasPlanificacion(),
      this.tamanoMaximoMb(),
      esDocente ? this.repository.bloquesDelCurso(cursoSeccionId) : Promise.resolve([]),
    ]);
    const hoy = ahoraEnColegio().fecha;
    const respuestas = await Promise.all(
      materiales.map((m) => this.armarMaterial(m, hoy, verTodo)),
    );

    return {
      cursoSeccionId: curso.id,
      cursoNombre: curso.cursoNombre,
      seccionNombre: curso.seccionNombre,
      puedeAdministrar: esDocente,
      diasPlanificacion: dias,
      tamanoMaximoMb: tamano,
      bloques: bloques.map((b) => ({
        id: b.id,
        diaSemana: b.diaSemana,
        horaInicio: b.horaInicio,
        horaFin: b.horaFin,
      })),
      unidades: unidades.map<UnidadResponse>((u) => ({
        id: u.id,
        periodoId: u.periodoId,
        titulo: u.titulo,
        descripcion: u.descripcion,
        orden: u.orden,
        fechaInicio: u.fechaInicio,
        fechaFin: u.fechaFin,
        publicada: u.publicada,
        materiales: respuestas.filter((m) => m.unidadId === u.id),
      })),
    };
  }

  // ───────────────────────── HU1: unidades ─────────────────────────

  async crearUnidad(
    cursoSeccionId: string,
    dto: CrearUnidadDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<UnidadFila> {
    const curso = await this.requerirCurso(cursoSeccionId);
    await this.exigirDocenteDelCurso(curso, usuario);
    if (dto.fechaFin < dto.fechaInicio) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.FECHAS_UNIDAD_INVERTIDAS);
    }
    const periodo = await this.requerirPeriodo(dto.periodoId);
    if (periodo.anioAcademicoId !== curso.anioAcademicoId) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.BIMESTRE_AJENO);
    }
    const unidad = await this.repository.crearUnidad({
      cursoSeccionId,
      periodoId: dto.periodoId,
      titulo: dto.titulo.trim(),
      descripcion: dto.descripcion?.trim() || null,
      orden: dto.orden ?? (await this.repository.siguienteOrdenUnidad(cursoSeccionId)),
      fechaInicio: dto.fechaInicio,
      fechaFin: dto.fechaFin,
      publicada: dto.publicada ?? true,
    });
    await this.auditar(
      "crear",
      "unidades_aprendizaje",
      unidad.id,
      usuario.id,
      null,
      {
        titulo: unidad.titulo,
        cursoSeccionId,
        periodoId: dto.periodoId,
      },
      ip,
    );
    return unidad;
  }

  async actualizarUnidad(
    unidadId: string,
    dto: ActualizarUnidadDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<UnidadFila> {
    const unidad = await this.requerirUnidad(unidadId);
    const curso = await this.requerirCurso(unidad.cursoSeccionId);
    await this.exigirDocenteDelCurso(curso, usuario);
    const inicio = dto.fechaInicio ?? unidad.fechaInicio;
    const fin = dto.fechaFin ?? unidad.fechaFin;
    if (inicio && fin && fin < inicio) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.FECHAS_UNIDAD_INVERTIDAS);
    }
    const actualizada = await this.repository.actualizarUnidad(unidadId, {
      titulo: dto.titulo?.trim(),
      descripcion: dto.descripcion === undefined ? undefined : dto.descripcion.trim() || null,
      fechaInicio: dto.fechaInicio,
      fechaFin: dto.fechaFin,
      orden: dto.orden,
      publicada: dto.publicada,
    });
    await this.auditar(
      "actualizar",
      "unidades_aprendizaje",
      unidadId,
      usuario.id,
      { titulo: unidad.titulo, publicada: unidad.publicada },
      { titulo: actualizada.titulo, publicada: actualizada.publicada },
      ip,
    );
    return actualizada;
  }

  // ───────────────────────── HU2: planificar ─────────────────────────

  async planificarMaterial(
    unidadId: string,
    dto: PlanificarMaterialDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<MutacionMaterialResponse> {
    const unidad = await this.requerirUnidad(unidadId);
    const curso = await this.requerirCurso(unidad.cursoSeccionId);
    const docenteId = await this.exigirDocenteDelCurso(curso, usuario);
    const periodo = await this.periodoDeUnidad(unidad);
    this.exigirBimestreAbierto(periodo);

    const { horarioId, fecha } = await this.resolverFechaProgramada(curso, dto);
    this.exigirDentroDelBimestre(fecha, periodo);

    const dias = await this.diasPlanificacion();
    const hoy = ahoraEnColegio().fecha;
    const enVentana = estaEnVentana(hoy, periodo.fechaInicio, dias);
    if (!enVentana && fecha < fechaMinimaFueraDeVentana(hoy, dias)) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.FECHA_MUY_CERCANA(dias));
    }

    const creado = await this.repository.crearMaterial({
      unidadId,
      docenteId,
      titulo: dto.titulo.trim(),
      descripcion: dto.descripcion?.trim() || null,
      tipo: dto.tipo,
      horarioId,
      esPlanificado: true,
      fechaCongelada: !enVentana,
      fechaProgramada: fecha,
      orden: await this.repository.siguienteOrdenMaterial(unidadId),
    });
    await this.auditar(
      "crear",
      "materiales",
      creado.id,
      usuario.id,
      null,
      {
        accion: "planificar",
        titulo: creado.titulo,
        fechaProgramada: fecha,
        horarioId,
        congelada: !enVentana,
      },
      ip,
    );
    return {
      mensaje: mensajePlanificado(formatearFecha(fecha)),
      material: await this.armarMaterial(creado, hoy, true),
    };
  }

  async actualizarMaterial(
    materialId: string,
    dto: ActualizarMaterialDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<MutacionMaterialResponse> {
    const material = await this.requerirMaterial(materialId);
    const curso = await this.requerirCurso(material.cursoSeccionId);
    await this.exigirDocenteDelCurso(curso, usuario);

    const cambiaFecha =
      dto.fechaProgramada !== undefined ||
      dto.fechaClase !== undefined ||
      dto.horarioId !== undefined;
    let horarioId = material.horarioId;
    let fecha = material.fechaProgramada;
    if (cambiaFecha) {
      if (!material.esPlanificado) {
        throw new BadRequestException(MENSAJES_AULA_VIRTUAL.SOLO_PLANIFICADOS);
      }
      const periodo = await this.periodoDeMaterial(material);
      this.exigirBimestreAbierto(periodo);
      const dias = await this.diasPlanificacion();
      const hoy = ahoraEnColegio().fecha;
      if (material.fechaCongelada || !estaEnVentana(hoy, periodo.fechaInicio, dias)) {
        throw new ForbiddenException(MENSAJES_AULA_VIRTUAL.FECHA_CONGELADA);
      }
      const resuelta = await this.resolverFechaProgramada(curso, {
        horarioId: dto.horarioId,
        fechaClase: dto.fechaClase,
        fechaProgramada: dto.fechaProgramada,
      });
      this.exigirDentroDelBimestre(resuelta.fecha, periodo);
      horarioId = resuelta.horarioId;
      fecha = resuelta.fecha;
    }

    const actualizado = await this.repository.actualizarMaterial(materialId, {
      titulo: dto.titulo?.trim(),
      descripcion: dto.descripcion === undefined ? undefined : dto.descripcion.trim() || null,
      visible: dto.visible,
      ...(cambiaFecha ? { horarioId, fechaProgramada: fecha } : {}),
    });
    await this.auditar(
      "actualizar",
      "materiales",
      materialId,
      usuario.id,
      {
        titulo: material.titulo,
        fechaProgramada: material.fechaProgramada,
        visible: material.visible,
      },
      {
        titulo: actualizado.titulo,
        fechaProgramada: actualizado.fechaProgramada,
        visible: actualizado.visible,
      },
      ip,
    );
    return {
      mensaje: "Material actualizado.",
      material: await this.armarMaterial(actualizado, ahoraEnColegio().fecha, true),
    };
  }

  // ───────────────────────── HU3: cambio de fecha ─────────────────────────

  async solicitarCambioFecha(
    materialId: string,
    dto: SolicitarCambioFechaDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<{ mensaje: string; id: string }> {
    const material = await this.requerirMaterial(materialId);
    const curso = await this.requerirCurso(material.cursoSeccionId);
    await this.exigirDocenteDelCurso(curso, usuario);
    if (!material.esPlanificado || !material.fechaProgramada) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.SOLO_PLANIFICADOS);
    }
    const periodo = await this.periodoDeMaterial(material);
    this.exigirBimestreAbierto(periodo);

    const motivo = dto.motivo?.trim();
    if (!motivo) throw new BadRequestException(MENSAJES_AULA_VIRTUAL.MOTIVO_REQUERIDO);

    const dias = await this.diasPlanificacion();
    const hoy = ahoraEnColegio().fecha;
    if (!material.fechaCongelada && estaEnVentana(hoy, periodo.fechaInicio, dias)) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.FECHA_NO_CONGELADA);
    }
    this.exigirDentroDelBimestre(dto.fechaSolicitada, periodo);
    if (await this.repository.findSolicitudAbierta(materialId)) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.SOLICITUD_REPETIDA);
    }

    const solicitud = await this.repository.crearSolicitud({
      materialId,
      fechaAnterior: material.fechaProgramada,
      fechaSolicitada: dto.fechaSolicitada,
      motivo,
      solicitadoPorId: usuario.id,
    });
    await this.auditar(
      "crear",
      "material_cambios_fecha",
      solicitud.id,
      usuario.id,
      null,
      {
        materialId,
        fechaAnterior: material.fechaProgramada,
        fechaSolicitada: dto.fechaSolicitada,
        motivo,
      },
      ip,
    );

    const destinatarios = await this.repository.usuariosConRol(ROLES_NOTIFICADOS_SOLICITUD);
    await Promise.all(
      destinatarios.map((usuarioId) =>
        this.notificaciones.enviar({
          usuarioId,
          titulo: "Solicitud de cambio de fecha",
          mensaje: `${curso.cursoNombre} ${curso.seccionNombre}: solicitan mover «${material.titulo}» al ${formatearFecha(dto.fechaSolicitada)}.`,
          tipo: "recordatorio",
          enlaceUrl: "/admin/solicitudes-cambio-fecha",
        }),
      ),
    );
    return { mensaje: MENSAJES_AULA_VIRTUAL.SOLICITUD_ENVIADA, id: solicitud.id };
  }

  /** Subdirector: pendientes por defecto. Docente: las suyas. */
  async listarSolicitudes(
    usuario: AuthenticatedUser,
    estado?: EstadoSolicitudFecha,
  ): Promise<SolicitudCambioResponse[]> {
    const filas = this.esRolDeSeguimiento(usuario)
      ? await this.repository.listarSolicitudes({ estado: estado ?? "solicitada" })
      : await this.repository.listarSolicitudes({ estado, solicitadoPorId: usuario.id });
    return filas.map((fila) => this.armarSolicitud(fila));
  }

  async aprobarSolicitud(
    solicitudId: string,
    dto: ResolverSolicitudDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<{ mensaje: string }> {
    const solicitud = await this.requerirSolicitudAbierta(solicitudId);
    await this.exigirBimestreAbiertoDeMaterial(solicitud.materialId);
    const respuesta = dto.respuesta?.trim() || null;
    await this.repository.aprobarSolicitud(solicitudId, usuario.id, respuesta);
    await this.auditar(
      "actualizar",
      "material_cambios_fecha",
      solicitudId,
      usuario.id,
      { estado: "solicitada", fechaProgramada: solicitud.fechaAnterior },
      { estado: "aprobada", fechaProgramada: solicitud.fechaSolicitada, respuesta },
      ip,
    );
    await this.notificaciones.enviar({
      usuarioId: solicitud.solicitadoPorId,
      titulo: "Cambio de fecha aprobado",
      mensaje: `«${solicitud.materialTitulo}» ahora tiene fecha programada ${formatearFecha(solicitud.fechaSolicitada)}.`,
      tipo: "informacion",
      enlaceUrl: `/admin/aula-virtual/${solicitud.cursoSeccionId}`,
    });
    return { mensaje: "Solicitud aprobada. El material tiene la nueva fecha programada." };
  }

  async rechazarSolicitud(
    solicitudId: string,
    dto: ResolverSolicitudDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<{ mensaje: string }> {
    const respuesta = dto.respuesta?.trim();
    if (!respuesta) throw new BadRequestException(MENSAJES_AULA_VIRTUAL.RESPUESTA_REQUERIDA);
    const solicitud = await this.requerirSolicitudAbierta(solicitudId);
    await this.repository.rechazarSolicitud(solicitudId, usuario.id, respuesta);
    await this.auditar(
      "actualizar",
      "material_cambios_fecha",
      solicitudId,
      usuario.id,
      { estado: "solicitada" },
      { estado: "rechazada", respuesta },
      ip,
    );
    await this.notificaciones.enviar({
      usuarioId: solicitud.solicitadoPorId,
      titulo: "Cambio de fecha rechazado",
      mensaje: `«${solicitud.materialTitulo}» conserva su fecha. Respuesta: ${respuesta}`,
      tipo: "alerta",
      enlaceUrl: `/admin/aula-virtual/${solicitud.cursoSeccionId}`,
    });
    return { mensaje: "Solicitud rechazada. El docente fue notificado." };
  }

  // ───────────────────────── HU4: publicar ─────────────────────────

  async publicarPlanificado(
    materialId: string,
    dto: ContenidoMaterialDto,
    archivo: Express.Multer.File | undefined,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<MutacionMaterialResponse> {
    const material = await this.requerirMaterial(materialId);
    const curso = await this.requerirCurso(material.cursoSeccionId);
    await this.exigirDocenteDelCurso(curso, usuario);
    if (!material.vigente) throw new BadRequestException(MENSAJES_AULA_VIRTUAL.MATERIAL_RETIRADO);
    if (material.publicadoEn) throw new BadRequestException(MENSAJES_AULA_VIRTUAL.YA_PUBLICADO);

    const contenido = await this.prepararContenido(material.tipo, dto.enlace, archivo);
    const ahora = ahoraEnColegio();
    const publicado = await this.repository.publicarMaterial(
      materialId,
      contenido,
      ahora.fechaHora,
      usuario.id,
    );
    await this.auditar(
      "actualizar",
      "materiales",
      materialId,
      usuario.id,
      { publicado: false },
      {
        accion: "publicar",
        url: contenido.url,
        fechaProgramada: material.fechaProgramada,
      },
      ip,
    );
    await this.avisarAEstudiantes(curso, publicado);

    const programada = material.fechaProgramada;
    const plazo = programada ? estadoPlazo(programada, ahora.fechaHora, ahora.fecha) : null;
    const mensaje =
      plazo === "fuera_de_plazo" && programada
        ? mensajeFueraDePlazo(formatearFecha(programada))
        : MENSAJES_AULA_VIRTUAL.PUBLICADO_A_TIEMPO;
    return { mensaje, material: await this.armarMaterial(publicado, ahora.fecha, true) };
  }

  async publicarExtra(
    unidadId: string,
    dto: PublicarMaterialExtraDto,
    archivo: Express.Multer.File | undefined,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<MutacionMaterialResponse> {
    const unidad = await this.requerirUnidad(unidadId);
    const curso = await this.requerirCurso(unidad.cursoSeccionId);
    const docenteId = await this.exigirDocenteDelCurso(curso, usuario);
    const contenido = await this.prepararContenido(dto.tipo, dto.enlace, archivo);
    const creado = await this.repository.crearMaterial({
      unidadId,
      docenteId,
      titulo: dto.titulo.trim(),
      descripcion: dto.descripcion?.trim() || null,
      tipo: dto.tipo,
      horarioId: null,
      esPlanificado: false,
      fechaCongelada: false,
      fechaProgramada: null,
      orden: await this.repository.siguienteOrdenMaterial(unidadId),
    });
    const ahora = ahoraEnColegio();
    const publicado = await this.repository.publicarMaterial(
      creado.id,
      contenido,
      ahora.fechaHora,
      usuario.id,
    );
    await this.auditar(
      "crear",
      "materiales",
      creado.id,
      usuario.id,
      null,
      {
        accion: "publicar_extra",
        titulo: creado.titulo,
        url: contenido.url,
      },
      ip,
    );
    await this.avisarAEstudiantes(curso, publicado);
    return {
      mensaje: MENSAJES_AULA_VIRTUAL.MATERIAL_EXTRA_PUBLICADO,
      material: await this.armarMaterial(publicado, ahora.fecha, true),
    };
  }

  /** El reemplazo conserva la primera publicación: la medición del IGM no cambia. */
  async reemplazarMaterial(
    materialId: string,
    dto: ContenidoMaterialDto,
    archivo: Express.Multer.File | undefined,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<MutacionMaterialResponse> {
    const material = await this.requerirMaterial(materialId);
    const curso = await this.requerirCurso(material.cursoSeccionId);
    await this.exigirDocenteDelCurso(curso, usuario);
    if (!material.publicadoEn) throw new BadRequestException(MENSAJES_AULA_VIRTUAL.NO_PUBLICADO);
    if (!material.vigente) throw new BadRequestException(MENSAJES_AULA_VIRTUAL.MATERIAL_RETIRADO);

    const contenido = await this.prepararContenido(material.tipo, dto.enlace, archivo);
    const reemplazado = await this.repository.reemplazarContenido(
      materialId,
      contenido,
      usuario.id,
    );
    await this.auditar(
      "actualizar",
      "materiales",
      materialId,
      usuario.id,
      { url: material.url },
      { accion: "reemplazar", url: contenido.url },
      ip,
    );
    return {
      mensaje: "Material reemplazado. La versión anterior quedó en el historial.",
      material: await this.armarMaterial(reemplazado, ahoraEnColegio().fecha, true),
    };
  }

  async retirarMaterial(
    materialId: string,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<{ mensaje: string }> {
    const material = await this.requerirMaterial(materialId);
    const curso = await this.requerirCurso(material.cursoSeccionId);
    await this.exigirDocenteDelCurso(curso, usuario);
    if (!material.publicadoEn) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.SOLO_PUBLICADO_SE_RETIRA);
    }
    await this.repository.retirarMaterial(materialId);
    await this.auditar(
      "actualizar",
      "materiales",
      materialId,
      usuario.id,
      { vigente: true },
      { vigente: false, accion: "retirar" },
      ip,
    );
    return { mensaje: "Material retirado. Sigue contando en el IGM según su primera publicación." };
  }

  // ───────────────────────── HU5: seguimiento ─────────────────────────

  async seguimiento(
    periodoId: string | undefined,
    hoyInyectado?: string,
  ): Promise<SeguimientoResponse> {
    const periodo = periodoId
      ? await this.requerirPeriodo(periodoId)
      : await this.periodoEnCursoDelAnio();
    const hoy = hoyInyectado ?? ahoraEnColegio().fecha;
    const filas = await this.repository.seguimiento(periodo.id, hoy);
    const salida = filas.map<SeguimientoFilaResponse>((fila) => ({
      ...fila,
      porcentajeATiempo: porcentajeATiempo(fila.aTiempo, fila.planificados),
    }));
    const suma = (
      clave: "planificados" | "aTiempo" | "fueraDePlazo" | "noPublicados" | "solicitudesPendientes",
    ) => salida.reduce((total, fila) => total + fila[clave], 0);
    return {
      periodoId: periodo.id,
      periodoNombre: periodo.nombre,
      filas: salida,
      totales: {
        planificados: suma("planificados"),
        aTiempo: suma("aTiempo"),
        fueraDePlazo: suma("fueraDePlazo"),
        noPublicados: suma("noPublicados"),
        porcentajeATiempo: porcentajeATiempo(suma("aTiempo"), suma("planificados")),
        solicitudesPendientes: suma("solicitudesPendientes"),
      },
    };
  }

  // ───────────────────────── Internos ─────────────────────────

  private async anioDeTrabajo(): Promise<string> {
    const anioId = this.anioLectivoCls.id();
    const anio = anioId
      ? await this.aniosService.findById(anioId)
      : await this.aniosService.findEnCurso();
    return anio.id;
  }

  private async periodoEnCursoDelAnio(): Promise<PeriodoAula> {
    const anioId = await this.anioDeTrabajo();
    const periodo = await this.repository.findPeriodoEnCurso(anioId);
    if (!periodo) throw new NotFoundException(MENSAJES_AULA_VIRTUAL.BIMESTRE_NO_ENCONTRADO);
    return periodo;
  }

  private async diasPlanificacion(): Promise<number> {
    return this.repository.leerVariableEntera(
      VARIABLES_MATERIAL.DIAS_PLANIFICACION,
      DIAS_PLANIFICACION_POR_DEFECTO,
    );
  }

  private async tamanoMaximoMb(): Promise<number> {
    return this.repository.leerVariableEntera(
      VARIABLES_MATERIAL.TAMANO_MAXIMO_MB,
      TAMANO_MAXIMO_MB_POR_DEFECTO,
    );
  }

  private esRolDeSeguimiento(usuario: AuthenticatedUser): boolean {
    return (ROLES_SEGUIMIENTO_MATERIALES as readonly string[]).includes(usuario.role);
  }

  private async esDocenteDelCurso(curso: CursoAula, usuario: AuthenticatedUser): Promise<boolean> {
    if (!curso.docenteId) return false;
    const docenteId = await this.repository.findDocenteIdPorPersona(usuario.personaId);
    return docenteId === curso.docenteId;
  }

  /** Devuelve el id del docente asignado o rechaza si el usuario no lo es. */
  private async exigirDocenteDelCurso(
    curso: CursoAula,
    usuario: AuthenticatedUser,
  ): Promise<string> {
    if (!(await this.esDocenteDelCurso(curso, usuario)) || !curso.docenteId) {
      throw new ForbiddenException(MENSAJES_AULA_VIRTUAL.AULA_AJENA);
    }
    return curso.docenteId;
  }

  private async requerirCurso(cursoSeccionId: string): Promise<CursoAula> {
    const curso = await this.repository.findCurso(cursoSeccionId);
    if (!curso) throw new NotFoundException(MENSAJES_AULA_VIRTUAL.AULA_NO_ENCONTRADA);
    return curso;
  }

  private async requerirUnidad(unidadId: string): Promise<UnidadFila> {
    const unidad = await this.repository.findUnidad(unidadId);
    if (!unidad) throw new NotFoundException(MENSAJES_AULA_VIRTUAL.UNIDAD_NO_ENCONTRADA);
    return unidad;
  }

  private async requerirMaterial(materialId: string): Promise<MaterialFila> {
    const material = await this.repository.findMaterial(materialId);
    if (!material) throw new NotFoundException(MENSAJES_AULA_VIRTUAL.MATERIAL_NO_ENCONTRADO);
    return material;
  }

  private async requerirPeriodo(periodoId: string): Promise<PeriodoAula> {
    const periodo = await this.repository.findPeriodo(periodoId);
    if (!periodo) throw new NotFoundException(MENSAJES_AULA_VIRTUAL.BIMESTRE_NO_ENCONTRADO);
    return periodo;
  }

  private async periodoDeUnidad(unidad: UnidadFila): Promise<PeriodoAula> {
    if (!unidad.periodoId)
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.BIMESTRE_NO_ENCONTRADO);
    return this.requerirPeriodo(unidad.periodoId);
  }

  private async periodoDeMaterial(material: MaterialFila): Promise<PeriodoAula> {
    if (!material.periodoId)
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.BIMESTRE_NO_ENCONTRADO);
    return this.requerirPeriodo(material.periodoId);
  }

  private async requerirSolicitudAbierta(solicitudId: string): Promise<SolicitudFila> {
    const solicitud = await this.repository.findSolicitud(solicitudId);
    if (!solicitud) throw new NotFoundException(MENSAJES_AULA_VIRTUAL.SOLICITUD_NO_ENCONTRADA);
    if (solicitud.estado !== "solicitada") {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.SOLICITUD_RESUELTA);
    }
    return solicitud;
  }

  private async exigirBimestreAbiertoDeMaterial(materialId: string): Promise<void> {
    const material = await this.requerirMaterial(materialId);
    this.exigirBimestreAbierto(await this.periodoDeMaterial(material));
  }

  private exigirBimestreAbierto(periodo: PeriodoAula): void {
    if (periodo.estado === "cerrado") {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.BIMESTRE_CERRADO);
    }
  }

  private exigirDentroDelBimestre(fecha: string, periodo: PeriodoAula): void {
    if (fecha < periodo.fechaInicio || fecha > periodo.fechaFin) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.FECHA_FUERA_BIMESTRE);
    }
  }

  /** Con bloque: la fecha es la de esa clase. Sin bloque: la fecha libre del bimestre. */
  private async resolverFechaProgramada(
    curso: CursoAula,
    datos: { horarioId?: string; fechaClase?: string; fechaProgramada?: string },
  ): Promise<{ horarioId: string | null; fecha: string }> {
    if (datos.horarioId) {
      const bloque = await this.repository.findHorario(datos.horarioId);
      if (!bloque || bloque.cursoSeccionId !== curso.id || bloque.tipoBloque !== "clase") {
        throw new BadRequestException(MENSAJES_AULA_VIRTUAL.BLOQUE_AJENO);
      }
      if (!datos.fechaClase) {
        throw new BadRequestException(MENSAJES_AULA_VIRTUAL.BLOQUE_CLASE_REQUERIDO);
      }
      if (diaIsoDe(datos.fechaClase) !== bloque.diaSemana) {
        throw new BadRequestException(MENSAJES_AULA_VIRTUAL.FECHA_NO_COINCIDE_BLOQUE);
      }
      return { horarioId: bloque.id, fecha: datos.fechaClase };
    }
    if (!datos.fechaProgramada) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.FECHA_REQUERIDA);
    }
    return { horarioId: null, fecha: datos.fechaProgramada };
  }

  /** Valida enlace o archivo según el tipo y guarda el archivo en disco. */
  private async prepararContenido(
    tipo: TipoMaterial,
    enlace: string | undefined,
    archivo: Express.Multer.File | undefined,
  ): Promise<ContenidoMaterial> {
    if (tipo === "enlace") {
      const url = enlace?.trim() ?? "";
      if (!esEnlaceValido(url)) {
        throw new BadRequestException(MENSAJES_AULA_VIRTUAL.ENLACE_INVALIDO);
      }
      return { url, archivoNombre: null, archivoTamanoBytes: null };
    }
    if (!archivo) throw new BadRequestException(MENSAJES_AULA_VIRTUAL.ARCHIVO_REQUERIDO);
    const maximoMb = await this.tamanoMaximoMb();
    if (archivo.size > maximoMb * 1024 * 1024) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.ARCHIVO_MUY_PESADO(maximoMb));
    }
    if (!formatoPermitido(tipo, archivo.originalname)) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.FORMATO_NO_PERMITIDO);
    }
    const carpeta = path.join(process.cwd(), "uploads", CARPETA_MATERIALES);
    await fs.promises.mkdir(carpeta, { recursive: true });
    const extension = path.extname(archivo.originalname).toLowerCase();
    const nombreGuardado = `${randomUUID()}${extension}`;
    await fs.promises.writeFile(path.join(carpeta, nombreGuardado), archivo.buffer);
    return {
      url: `/uploads/${CARPETA_MATERIALES}/${nombreGuardado}`,
      archivoNombre: archivo.originalname.slice(0, 255),
      archivoTamanoBytes: archivo.size,
    };
  }

  private async avisarAEstudiantes(curso: CursoAula, material: MaterialFila): Promise<void> {
    const destinatarios = await this.repository.usuariosEstudiantesDeSeccion(
      curso.seccionId,
      curso.anioAcademicoId,
    );
    await Promise.all(
      destinatarios.map((usuarioId) =>
        this.notificaciones.enviar({
          usuarioId,
          titulo: `Nuevo material de ${curso.cursoNombre}`,
          mensaje: `Se publicó «${material.titulo}» en el aula virtual.`,
          tipo: "informacion",
          enlaceUrl: `/admin/aula-virtual/${curso.id}`,
        }),
      ),
    );
  }

  private async armarMaterial(
    material: MaterialFila,
    hoy: string,
    conGestion: boolean,
  ): Promise<MaterialResponse> {
    const sesion =
      material.horarioId && material.fechaProgramada
        ? await this.repository.findSesionDeBloque(material.horarioId, material.fechaProgramada)
        : null;
    const cambios =
      conGestion && material.esPlanificado
        ? await this.repository.historialCambiosFecha(material.id)
        : [];
    return {
      id: material.id,
      unidadId: material.unidadId,
      titulo: material.titulo,
      descripcion: material.descripcion,
      tipo: material.tipo,
      url: material.url,
      archivoNombre: material.archivoNombre,
      esPlanificado: material.esPlanificado,
      esExtra: !material.esPlanificado,
      visible: material.visible,
      vigente: material.vigente,
      fechaProgramada: material.fechaProgramada,
      fechaCongelada: material.fechaCongelada,
      publicadoEn: material.publicadoEn,
      plazo:
        material.esPlanificado && material.fechaProgramada
          ? estadoPlazo(material.fechaProgramada, material.publicadoEn, hoy)
          : null,
      horarioId: material.horarioId,
      sesionClase: sesion,
      solicitudAbierta: cambios.some((c) => c.estado === "solicitada"),
      cambiosDeFecha: cambios,
    };
  }

  private armarSolicitud(fila: SolicitudFila): SolicitudCambioResponse {
    return {
      id: fila.id,
      materialId: fila.materialId,
      materialTitulo: fila.materialTitulo,
      cursoNombre: fila.cursoNombre,
      seccionNombre: fila.seccionNombre,
      docenteNombre: fila.docenteNombre,
      fechaAnterior: fila.fechaAnterior,
      fechaSolicitada: fila.fechaSolicitada,
      motivo: fila.motivo,
      estado: fila.estado,
      solicitadoEn: fila.solicitadoEn,
      resueltoEn: fila.resueltoEn,
      respuesta: fila.respuesta,
    };
  }

  private async auditar(
    accion: "crear" | "actualizar",
    tabla: string,
    registroId: string,
    usuarioId: string,
    valorAnterior: Record<string, unknown> | null,
    valorNuevo: Record<string, unknown>,
    ip?: string,
  ): Promise<void> {
    await this.auditService.log({
      usuarioId,
      accion,
      tabla,
      registroId,
      valorAnterior,
      valorNuevo,
      direccionIp: ip,
    });
  }
}
