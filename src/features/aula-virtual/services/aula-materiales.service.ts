import { BadRequestException, ForbiddenException, Injectable, Optional } from "@nestjs/common";
import { AnioLectivoCls } from "../../../common/anio-lectivo";
import { AuditService } from "../../../common/services/audit.service";
import { AniosAcademicosService } from "../../anio-escolar/anios.service";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import { ahoraEnColegio } from "../../marcaciones/utils";
import { NotificacionesService } from "../../notificaciones/notificaciones.service";
import {
  CARPETA_MATERIALES,
  MENSAJES_AULA_VIRTUAL,
  mensajeFueraDePlazo,
  mensajePlanificado,
  type TipoMaterial,
} from "../constants";
import type {
  ActualizarMaterialDto,
  ContenidoMaterialDto,
  MutacionMaterialResponse,
  PlanificarMaterialDto,
  PublicarMaterialExtraDto,
} from "../dto";
import type { ContenidoMaterial, CursoAula, MaterialFila } from "../interfaces";
import { AulaVirtualRepository } from "../repositories";
import {
  diaIsoDe,
  esEnlaceValido,
  estaEnVentana,
  estadoPlazo,
  fechaMinimaFueraDeVentana,
  formatearFecha,
  formatoPermitido,
} from "../utils";
import { AulaContextoHelper } from "./aula-contexto.helper";

/**
 * Servicio de dominio para el ciclo de vida de materiales de clase:
 * planificar, actualizar, publicar, publicar extra, reemplazar y retirar (RF-015 HU2 & HU4).
 */
@Injectable()
export class AulaMaterialesService {
  private readonly ctx: AulaContextoHelper;

  constructor(
    private readonly repository: AulaVirtualRepository,
    aniosService: AniosAcademicosService,
    anioLectivoCls: AnioLectivoCls,
    private readonly notificaciones: NotificacionesService,
    auditService: AuditService,
    @Optional() contexto?: AulaContextoHelper,
  ) {
    this.ctx =
      contexto ?? new AulaContextoHelper(repository, aniosService, anioLectivoCls, auditService);
  }

  async planificarMaterial(
    unidadId: string,
    dto: PlanificarMaterialDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<MutacionMaterialResponse> {
    const unidad = await this.ctx.requerirUnidad(unidadId);
    const curso = await this.ctx.requerirCurso(unidad.cursoSeccionId);
    const docenteId = await this.ctx.exigirDocenteDelCurso(curso, usuario);
    const periodo = await this.ctx.periodoDeUnidad(unidad);
    this.ctx.exigirBimestreAbierto(periodo);

    const { horarioId, fecha } = await this.resolverFechaProgramada(curso, dto);
    this.ctx.exigirDentroDelBimestre(fecha, periodo);

    const dias = await this.ctx.diasPlanificacion();
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
    await this.ctx.auditar(
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
      material: await this.ctx.armarMaterial(creado, hoy, true),
    };
  }

  async actualizarMaterial(
    materialId: string,
    dto: ActualizarMaterialDto,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<MutacionMaterialResponse> {
    const material = await this.ctx.requerirMaterial(materialId);
    const curso = await this.ctx.requerirCurso(material.cursoSeccionId);
    await this.ctx.exigirDocenteDelCurso(curso, usuario);

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
      const periodo = await this.ctx.periodoDeMaterial(material);
      this.ctx.exigirBimestreAbierto(periodo);
      const dias = await this.ctx.diasPlanificacion();
      const hoy = ahoraEnColegio().fecha;
      if (material.fechaCongelada || !estaEnVentana(hoy, periodo.fechaInicio, dias)) {
        throw new ForbiddenException(MENSAJES_AULA_VIRTUAL.FECHA_CONGELADA);
      }
      const resuelta = await this.resolverFechaProgramada(curso, {
        horarioId: dto.horarioId,
        fechaClase: dto.fechaClase,
        fechaProgramada: dto.fechaProgramada,
      });
      this.ctx.exigirDentroDelBimestre(resuelta.fecha, periodo);
      horarioId = resuelta.horarioId;
      fecha = resuelta.fecha;
    }

    const actualizado = await this.repository.actualizarMaterial(materialId, {
      titulo: dto.titulo?.trim(),
      descripcion: dto.descripcion === undefined ? undefined : dto.descripcion.trim() || null,
      visible: dto.visible,
      ...(cambiaFecha ? { horarioId, fechaProgramada: fecha } : {}),
    });
    await this.ctx.auditar(
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
      material: await this.ctx.armarMaterial(actualizado, ahoraEnColegio().fecha, true),
    };
  }

  async publicarPlanificado(
    materialId: string,
    dto: ContenidoMaterialDto,
    archivo: Express.Multer.File | undefined,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<MutacionMaterialResponse> {
    const material = await this.ctx.requerirMaterial(materialId);
    const curso = await this.ctx.requerirCurso(material.cursoSeccionId);
    await this.ctx.exigirDocenteDelCurso(curso, usuario);
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
    await this.ctx.auditar(
      "actualizar",
      "materiales",
      materialId,
      usuario.id,
      { publicado: false },
      { accion: "publicar", url: contenido.url, fechaProgramada: material.fechaProgramada },
      ip,
    );
    await this.avisarAEstudiantes(curso, publicado);

    const programada = material.fechaProgramada;
    const plazo = programada ? estadoPlazo(programada, ahora.fechaHora, ahora.fecha) : null;
    const mensaje =
      plazo === "fuera_de_plazo" && programada
        ? mensajeFueraDePlazo(formatearFecha(programada))
        : MENSAJES_AULA_VIRTUAL.PUBLICADO_A_TIEMPO;
    return { mensaje, material: await this.ctx.armarMaterial(publicado, ahora.fecha, true) };
  }

  async publicarExtra(
    unidadId: string,
    dto: PublicarMaterialExtraDto,
    archivo: Express.Multer.File | undefined,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<MutacionMaterialResponse> {
    const unidad = await this.ctx.requerirUnidad(unidadId);
    const curso = await this.ctx.requerirCurso(unidad.cursoSeccionId);
    const docenteId = await this.ctx.exigirDocenteDelCurso(curso, usuario);
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
    await this.ctx.auditar(
      "crear",
      "materiales",
      creado.id,
      usuario.id,
      null,
      { accion: "publicar_extra", titulo: creado.titulo, url: contenido.url },
      ip,
    );
    await this.avisarAEstudiantes(curso, publicado);
    return {
      mensaje: MENSAJES_AULA_VIRTUAL.MATERIAL_EXTRA_PUBLICADO,
      material: await this.ctx.armarMaterial(publicado, ahora.fecha, true),
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
    const material = await this.ctx.requerirMaterial(materialId);
    const curso = await this.ctx.requerirCurso(material.cursoSeccionId);
    await this.ctx.exigirDocenteDelCurso(curso, usuario);
    if (!material.publicadoEn) throw new BadRequestException(MENSAJES_AULA_VIRTUAL.NO_PUBLICADO);
    if (!material.vigente) throw new BadRequestException(MENSAJES_AULA_VIRTUAL.MATERIAL_RETIRADO);

    const contenido = await this.prepararContenido(material.tipo, dto.enlace, archivo);
    const reemplazado = await this.repository.reemplazarContenido(
      materialId,
      contenido,
      usuario.id,
    );
    await this.ctx.auditar(
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
      material: await this.ctx.armarMaterial(reemplazado, ahoraEnColegio().fecha, true),
    };
  }

  async retirarMaterial(
    materialId: string,
    usuario: AuthenticatedUser,
    ip?: string,
  ): Promise<{ mensaje: string }> {
    const material = await this.ctx.requerirMaterial(materialId);
    const curso = await this.ctx.requerirCurso(material.cursoSeccionId);
    await this.ctx.exigirDocenteDelCurso(curso, usuario);
    if (!material.publicadoEn) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.SOLO_PUBLICADO_SE_RETIRA);
    }
    await this.repository.retirarMaterial(materialId);
    await this.ctx.auditar(
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

  private async prepararContenido(
    tipo: TipoMaterial,
    enlace: string | undefined,
    archivo: Express.Multer.File | undefined,
  ): Promise<ContenidoMaterial> {
    const url = enlace?.trim() ?? "";
    if (tipo === "enlace" || (tipo === "video" && url) || (url && !archivo)) {
      if (!esEnlaceValido(url))
        throw new BadRequestException(MENSAJES_AULA_VIRTUAL.ENLACE_INVALIDO);
      return { url, archivoNombre: null, archivoTamanoBytes: null };
    }
    if (!archivo) throw new BadRequestException(MENSAJES_AULA_VIRTUAL.ARCHIVO_REQUERIDO);
    const maximoMb = await this.ctx.tamanoMaximoMb();
    if (archivo.size > maximoMb * 1024 * 1024) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.ARCHIVO_MUY_PESADO(maximoMb));
    }
    if (!formatoPermitido(tipo, archivo.originalname)) {
      throw new BadRequestException(MENSAJES_AULA_VIRTUAL.FORMATO_NO_PERMITIDO);
    }
    return this.ctx.guardarArchivoLocal(CARPETA_MATERIALES, archivo);
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
}
