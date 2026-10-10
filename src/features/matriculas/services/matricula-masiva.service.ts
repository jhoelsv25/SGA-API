import { BadRequestException, Injectable } from "@nestjs/common";
import { AuditService } from "../../../common/services/audit.service";
import { MATRICULA_MESSAGES } from "../constants";
import {
  MatriculaMasivaDto,
  MatriculaMasivaResultadoDto,
  MatriculaNoProcesadaItemDto,
  MatriculaResponseDto,
} from "../dto";
import { EstudianteParaMatricula } from "../interfaces";
import { MatriculasRepository } from "../repositories";
import { generarCodigoMatricula } from "../utils";

@Injectable()
export class MatriculaMasivaService {
  constructor(
    private readonly matriculasRepository: MatriculasRepository,
    private readonly auditService: AuditService,
  ) {}

  /**
   * RF-009 HU2: Matrícula masiva de continuadores.
   * Selecciona estudiantes que culminaron una sección del año anterior y los matricula
   * en la sección destino en orden alfabético respetando las vacantes disponibles.
   */
  async matricularMasivamente(
    dto: MatriculaMasivaDto,
    actorId: string,
    ip?: string,
  ): Promise<MatriculaMasivaResultadoDto> {
    // 1. Validar sección destino
    const seccionDestino = await this.matriculasRepository.findSeccionById(dto.seccionDestinoId);
    if (!seccionDestino || seccionDestino.estado !== "activa") {
      throw new BadRequestException(MATRICULA_MESSAGES.SECCION_NO_ENCONTRADA);
    }

    // 2. Validar que el año académico de destino sea válido (planificado o en_curso)
    const anioDestino = await this.matriculasRepository.findAnioById(
      seccionDestino.anioAcademicoId,
    );
    if (
      !anioDestino ||
      (anioDestino.estado !== "planificado" && anioDestino.estado !== "en_curso")
    ) {
      throw new BadRequestException(MATRICULA_MESSAGES.ANIO_NO_VALIDO);
    }

    // 3. Obtener estudiantes que culminaron el año en la sección origen
    const estudiantesCulminados =
      await this.matriculasRepository.obtenerEstudiantesCulminadosSeccion(dto.seccionOrigenId);

    if (estudiantesCulminados.length === 0) {
      throw new BadRequestException(
        "No se encontraron estudiantes en estado culminado en la sección de origen.",
      );
    }

    // Si se enviaron IDs específicos, filtrar
    const seleccionados = dto.estudianteIds?.length
      ? estudiantesCulminados.filter((e) => dto.estudianteIds!.includes(e.id))
      : estudiantesCulminados;

    const matriculados: MatriculaResponseDto[] = [];
    const noMatriculados: MatriculaNoProcesadaItemDto[] = [];

    // 4. Filtrar estudiantes ya matriculados en el año o no activos
    const elegibles: { est: EstudianteParaMatricula; nombreCompleto: string }[] = [];
    for (const est of seleccionados) {
      const nombreCompleto =
        `${est.apellidoPaterno} ${est.apellidoMaterno ?? ""} ${est.nombres}`.trim();

      if (est.estado !== "activo") {
        noMatriculados.push({
          estudianteId: est.id,
          estudianteNombre: nombreCompleto,
          motivo: MATRICULA_MESSAGES.ESTUDIANTE_NO_ACTIVO,
        });
        continue;
      }

      const yaMatriculado = await this.matriculasRepository.findMatriculaByEstudianteYAnio(
        est.id,
        seccionDestino.anioAcademicoId,
      );
      if (yaMatriculado) {
        noMatriculados.push({
          estudianteId: est.id,
          estudianteNombre: nombreCompleto,
          motivo: `El estudiante ya está matriculado en el año escolar (${yaMatriculado.codigo}).`,
        });
        continue;
      }

      elegibles.push({ est, nombreCompleto });
    }

    // 5. Ordenar alfabéticamente por apellidos y nombres (regla HU2)
    elegibles.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, "es"));

    // 6. Verificar vacantes disponibles
    const vacantesDisponibles = seccionDestino.vacantesDisponibles;
    const fecha = dto.fechaMatricula || new Date().toISOString().split("T")[0];

    // Correlativo inicial
    let siguienteNumero = await this.matriculasRepository.getNextCorrelativo(anioDestino.anio);

    for (let i = 0; i < elegibles.length; i++) {
      const { est, nombreCompleto } = elegibles[i];

      // Si supera las vacantes, marcar como no matriculado por falta de vacantes
      if (i >= vacantesDisponibles) {
        noMatriculados.push({
          estudianteId: est.id,
          estudianteNombre: nombreCompleto,
          motivo: "No se matriculó por falta de vacantes disponibles en la sección.",
        });
        continue;
      }

      // Matricular
      const codigo = generarCodigoMatricula(anioDestino.anio, siguienteNumero++);
      const id = await this.matriculasRepository.create({
        estudianteId: est.id,
        seccionId: seccionDestino.id,
        anioAcademicoId: seccionDestino.anioAcademicoId,
        codigo,
        fechaMatricula: fecha,
        tipo: "continuador",
        registradoPorId: actorId,
      });

      const nuevaMatricula = (await this.matriculasRepository.findMatriculaById(id))!;
      matriculados.push(nuevaMatricula);
    }

    // 7. Auditoría
    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "matriculas",
      registroId: seccionDestino.id,
      valorNuevo: {
        tipo: "matricula_masiva",
        seccionDestino: seccionDestino.nombre,
        totalMatriculados: matriculados.length,
        totalNoMatriculados: noMatriculados.length,
      },
      direccionIp: ip,
    });

    const destinoTexto = `${seccionDestino.gradoNombre} ${seccionDestino.nombre}`;
    const message = `Se matricularon ${matriculados.length} estudiantes en ${destinoTexto}. ${noMatriculados.length} no se matricularon; revise el detalle.`;

    return {
      message,
      totalMatriculados: matriculados.length,
      totalNoMatriculados: noMatriculados.length,
      matriculados,
      noMatriculados,
    };
  }
}
