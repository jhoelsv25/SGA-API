import { BadRequestException, Injectable } from "@nestjs/common";
import { AuditService } from "../../../common/services/audit.service";
import { MATRICULA_MESSAGES } from "../constants";
import {
  EgresarSeccionDto,
  EgresarSeccionResultadoDto,
  PreviewEgresoDto,
  PreviewEgresoResultadoDto,
  PreviewEstudianteItemDto,
  PreviewPromocionDto,
  PreviewPromocionResultadoDto,
  ResumenPromocionQueryDto,
  ResumenPromocionResultadoDto,
} from "../dto";
import { MatriculasRepository } from "../repositories";

@Injectable()
export class PromocionService {
  constructor(
    private readonly matriculasRepository: MatriculasRepository,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Devuelve el progreso persistido por sección de un año de cierre (culminados, promovidos,
   * egresados y pendientes) para que el asistente mantenga el estado real entre sesiones.
   */
  async obtenerResumenPromocion(
    query: ResumenPromocionQueryDto,
  ): Promise<ResumenPromocionResultadoDto> {
    const anioOrigen = await this.matriculasRepository.findAnioById(query.anioOrigenId);
    if (!anioOrigen) {
      throw new BadRequestException("Año académico de origen no encontrado.");
    }

    if (query.anioDestinoId) {
      const anioDestino = await this.matriculasRepository.findAnioById(query.anioDestinoId);
      if (!anioDestino) {
        throw new BadRequestException("Año académico de destino no encontrado.");
      }
    }

    const secciones = await this.matriculasRepository.obtenerResumenPromocionPorAnio(
      query.anioOrigenId,
      query.anioDestinoId,
    );

    const totalCulminados = secciones.reduce((acc, s) => acc + s.totalCulminados, 0);
    const totalMatriculadosDestino = secciones.reduce((acc, s) => acc + s.yaMatriculadosDestino, 0);
    const totalEgresados = secciones.reduce((acc, s) => acc + s.yaEgresados, 0);
    const totalPendientes = secciones.reduce((acc, s) => acc + s.pendientes, 0);

    return {
      anioOrigenId: query.anioOrigenId,
      anioDestinoId: query.anioDestinoId ?? null,
      totalCulminados,
      totalMatriculadosDestino,
      totalEgresados,
      totalPendientes,
      secciones,
    };
  }

  /**
   * Vista previa (sin persistir) de los estudiantes elegibles para promover
   * de una sección del año cerrado a una sección del año destino.
   */
  async previewPromocion(dto: PreviewPromocionDto): Promise<PreviewPromocionResultadoDto> {
    const seccionOrigen = await this.matriculasRepository.findSeccionById(dto.seccionOrigenId);
    if (!seccionOrigen) {
      throw new BadRequestException("Sección de origen no encontrada.");
    }

    const seccionDestino = await this.matriculasRepository.findSeccionById(dto.seccionDestinoId);
    if (!seccionDestino || seccionDestino.estado !== "activa") {
      throw new BadRequestException(MATRICULA_MESSAGES.SECCION_NO_ENCONTRADA);
    }

    const anioDestino = await this.matriculasRepository.findAnioById(
      seccionDestino.anioAcademicoId,
    );
    if (
      !anioDestino ||
      (anioDestino.estado !== "planificado" && anioDestino.estado !== "en_curso")
    ) {
      throw new BadRequestException(MATRICULA_MESSAGES.ANIO_NO_VALIDO);
    }

    const culminados = await this.matriculasRepository.obtenerEstudiantesCulminadosSeccion(
      dto.seccionOrigenId,
    );

    const aPromover: PreviewEstudianteItemDto[] = [];
    const noPromovidos: PreviewEstudianteItemDto[] = [];

    for (const est of culminados) {
      const nombreCompleto =
        `${est.apellidoPaterno} ${est.apellidoMaterno ?? ""} ${est.nombres}`.trim();

      if (est.estado !== "activo") {
        noPromovidos.push({
          estudianteId: est.id,
          nombreCompleto,
          numeroDocumento: est.numeroDocumento,
          tipoDocumento: est.tipoDocumento,
          motivo: `Estado del estudiante: ${est.estado}`,
        });
        continue;
      }

      const yaMatriculado = await this.matriculasRepository.findMatriculaByEstudianteYAnio(
        est.id,
        seccionDestino.anioAcademicoId,
      );
      if (yaMatriculado) {
        noPromovidos.push({
          estudianteId: est.id,
          nombreCompleto,
          numeroDocumento: est.numeroDocumento,
          tipoDocumento: est.tipoDocumento,
          motivo: `Ya matriculado en el año destino (${yaMatriculado.codigo})`,
        });
        continue;
      }

      aPromover.push({
        estudianteId: est.id,
        nombreCompleto,
        numeroDocumento: est.numeroDocumento,
        tipoDocumento: est.tipoDocumento,
      });
    }

    aPromover.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, "es"));

    return {
      seccionOrigen: {
        id: seccionOrigen.id,
        nombre: seccionOrigen.nombre,
        grado: seccionOrigen.gradoNombre,
        anio: seccionOrigen.anioNumero,
        totalCulminados: culminados.length,
      },
      seccionDestino: {
        id: seccionDestino.id,
        nombre: seccionDestino.nombre,
        grado: seccionDestino.gradoNombre,
        anio: seccionDestino.anioNumero,
        vacantesDisponibles: seccionDestino.vacantesDisponibles,
      },
      aPromover,
      noPromovidos,
      totalAPromover: aPromover.length,
      totalNoPromovidos: noPromovidos.length,
      sinVacantes: Math.max(0, aPromover.length - seccionDestino.vacantesDisponibles),
    };
  }

  /**
   * Vista previa de los estudiantes de 5.° grado listos para egresar.
   */
  async previewEgreso(dto: PreviewEgresoDto): Promise<PreviewEgresoResultadoDto> {
    const seccion = await this.matriculasRepository.findSeccionById(dto.seccionId);
    if (!seccion) {
      throw new BadRequestException("Sección no encontrada.");
    }

    if (seccion.gradoNumero !== 5) {
      throw new BadRequestException(
        "El egreso solo aplica a estudiantes de 5.° grado de secundaria.",
      );
    }

    const culminados = await this.matriculasRepository.obtenerEstudiantesCulminadosSeccion(
      dto.seccionId,
    );

    const aEgresar: PreviewEstudianteItemDto[] = [];
    const noEgresables: PreviewEstudianteItemDto[] = [];

    for (const est of culminados) {
      const nombreCompleto =
        `${est.apellidoPaterno} ${est.apellidoMaterno ?? ""} ${est.nombres}`.trim();

      if (est.estado === "egresado") {
        noEgresables.push({
          estudianteId: est.id,
          nombreCompleto,
          numeroDocumento: est.numeroDocumento,
          tipoDocumento: est.tipoDocumento,
          motivo: "Ya egresado",
        });
        continue;
      }

      if (est.estado !== "activo") {
        noEgresables.push({
          estudianteId: est.id,
          nombreCompleto,
          numeroDocumento: est.numeroDocumento,
          tipoDocumento: est.tipoDocumento,
          motivo: `Estado del estudiante: ${est.estado}`,
        });
        continue;
      }

      aEgresar.push({
        estudianteId: est.id,
        nombreCompleto,
        numeroDocumento: est.numeroDocumento,
        tipoDocumento: est.tipoDocumento,
      });
    }

    aEgresar.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, "es"));

    return {
      seccion: {
        id: seccion.id,
        nombre: seccion.nombre,
        grado: seccion.gradoNombre,
        anio: seccion.anioNumero,
        totalCulminados: culminados.length,
      },
      aEgresar,
      noEgresables,
      totalAEgresar: aEgresar.length,
      totalNoEgresables: noEgresables.length,
    };
  }

  /**
   * Egresa a los estudiantes culminados seleccionados (o todos los activos) de una sección de 5.° grado.
   * Cambia el estado del estudiante a "egresado" y registra en bitácora.
   */
  async egresarSeccion(
    dto: EgresarSeccionDto,
    actorId: string,
    ip?: string,
  ): Promise<EgresarSeccionResultadoDto> {
    const seccion = await this.matriculasRepository.findSeccionById(dto.seccionId);
    if (!seccion) {
      throw new BadRequestException("Sección no encontrada.");
    }

    if (seccion.gradoNumero !== 5) {
      throw new BadRequestException(
        "El egreso solo aplica a estudiantes de 5.° grado de secundaria.",
      );
    }

    const culminados = await this.matriculasRepository.obtenerEstudiantesCulminadosSeccion(
      dto.seccionId,
    );

    if (culminados.length === 0) {
      throw new BadRequestException(
        "No hay estudiantes en estado culminado en esta sección para egresar.",
      );
    }

    const seleccionados = dto.estudianteIds?.length
      ? culminados.filter((e) => dto.estudianteIds!.includes(e.id))
      : culminados;

    if (seleccionados.length === 0) {
      throw new BadRequestException(
        "Ninguno de los estudiantes seleccionados pertenece a los culminados de esta sección.",
      );
    }

    const egresados: { estudianteId: string; nombreCompleto: string }[] = [];
    const noEgresados: { estudianteId: string; nombreCompleto: string; motivo: string }[] = [];

    for (const est of seleccionados) {
      const nombreCompleto =
        `${est.apellidoPaterno} ${est.apellidoMaterno ?? ""} ${est.nombres}`.trim();

      if (est.estado === "egresado") {
        noEgresados.push({ estudianteId: est.id, nombreCompleto, motivo: "Ya egresado" });
        continue;
      }

      if (est.estado !== "activo") {
        noEgresados.push({
          estudianteId: est.id,
          nombreCompleto,
          motivo: `Estado del estudiante: ${est.estado}`,
        });
        continue;
      }

      await this.matriculasRepository.egresarEstudianteYDesactivarCredenciales(est.id);
      egresados.push({ estudianteId: est.id, nombreCompleto });
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "estudiantes",
      registroId: dto.seccionId,
      valorNuevo: {
        accion: "egreso_masivo",
        seccion: `${seccion.gradoNombre} ${seccion.nombre}`,
        anio: seccion.anioNumero,
        totalEgresados: egresados.length,
        totalNoEgresados: noEgresados.length,
      },
      direccionIp: ip,
    });

    const gradoSeccion = `${seccion.gradoNombre} ${seccion.nombre}`;
    return {
      message: `Se egresaron ${egresados.length} estudiantes de ${gradoSeccion}. ${noEgresados.length} no fueron procesados.`,
      totalEgresados: egresados.length,
      totalNoEgresados: noEgresados.length,
      egresados,
      noEgresados,
    };
  }
}
