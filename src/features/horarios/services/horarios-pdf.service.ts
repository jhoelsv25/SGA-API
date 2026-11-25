import { Injectable, NotFoundException } from "@nestjs/common";
import { AnioLectivoCls } from "../../../common/anio-lectivo";
import { sinFichaDocente } from "../../../common/utils/ficha-docente.util";
import { AniosAcademicosService } from "../../anio-escolar/anios.service";
import { DocentesRepository } from "../../docentes";
import { MENSAJES_HORARIOS } from "../constants";
import type { BloqueHorarioResponseDto } from "../dto";
import { HorariosRepository } from "../repositories";
import { generarHorarioPdfBuffer, generarHorariosPdfBuffer } from "../utils";
import { resolverAnioHorario } from "./horarios-base.helper";
import {
  HorariosConsultaService,
  type UsuarioConsultaEstudiante,
} from "./horarios-consulta.service";

function slugTexto(valor: string): string {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Servicio especializado en la generación de reportes PDF de horarios
 * (por sección, consolidado multipágina, docente y estudiante).
 */
@Injectable()
export class HorariosPdfService {
  constructor(
    private readonly horariosRepo: HorariosRepository,
    private readonly docentesRepo: DocentesRepository,
    private readonly aniosService: AniosAcademicosService,
    private readonly anioLectivoCls: AnioLectivoCls,
    private readonly consultaService: HorariosConsultaService,
  ) {}

  async generarHorarioSeccionPdf(
    seccionId: string,
    docenteId?: string,
  ): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    const [info, data] = await Promise.all([
      this.horariosRepo.infoSeccion(seccionId),
      this.consultaService.listarPorSeccion(seccionId),
    ]);
    if (!info) {
      throw new NotFoundException(MENSAJES_HORARIOS.SECCION_NO_ENCONTRADA);
    }

    let bloquesFiltrados: BloqueHorarioResponseDto[] = data.bloques;
    let docenteNombre: string | undefined;

    if (docenteId) {
      const cursosSeccion = await this.horariosRepo.cursosSeccionPorSeccion(seccionId);
      const cursosDocente = new Set(
        cursosSeccion.filter((c) => c.docenteId === docenteId).map((c) => c.cursoSeccionId),
      );
      bloquesFiltrados = data.bloques.filter(
        (b) =>
          b.tipoBloque === "receso" ||
          (b.cursoSeccionId !== null &&
            b.cursoSeccionId !== undefined &&
            cursosDocente.has(b.cursoSeccionId)),
      );
      docenteNombre =
        bloquesFiltrados.find((b) => b.tipoBloque === "clase")?.docenteNombre ?? undefined;
    }

    const buffer = await generarHorarioPdfBuffer({
      titulo: `${info.gradoNombre} – Sección ${info.seccionNombre}`,
      subtitulo: `Año académico ${info.anio}`,
      filtroDocente: docenteNombre,
      bloques: bloquesFiltrados,
    });
    const slug = slugTexto(`${info.gradoNombre}-${info.seccionNombre}-${info.anio}`);
    return { buffer, nombreArchivo: `horario-${slug || "seccion"}.pdf` };
  }

  async generarHorariosConsolidadoPdf(filtros?: {
    gradoId?: string;
    seccionId?: string;
    docenteId?: string;
  }): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    const { anio, secciones } = await this.consultaService.listarBloquesConsolidados({
      gradoId: filtros?.gradoId,
      seccionId: filtros?.seccionId,
    });

    if (filtros?.seccionId && secciones.length === 0) {
      throw new NotFoundException(MENSAJES_HORARIOS.SECCION_NO_ENCONTRADA);
    }

    let filtroDocenteNombre: string | undefined;
    if (filtros?.docenteId) {
      const docente = await this.docentesRepo.findById(filtros.docenteId);
      filtroDocenteNombre = docente?.persona?.nombreCompleto;
    }

    const seccionesFiltradas = secciones
      .map((sec) => {
        if (!filtros?.docenteId) {
          return sec;
        }
        const bloquesDocente = sec.bloques.filter(
          (b) => b.tipoBloque === "receso" || b.docenteId === filtros.docenteId,
        );
        return { ...sec, bloques: bloquesDocente };
      })
      .filter((sec) => {
        if (!filtros?.docenteId) return true;
        return sec.bloques.some((b) => b.tipoBloque === "clase");
      });

    const buffer = await generarHorariosPdfBuffer(
      seccionesFiltradas.map((sec) => ({
        titulo: `${sec.gradoNombre} – Sección ${sec.seccionNombre}`,
        subtitulo: `Año académico ${anio}`,
        filtroDocente: filtroDocenteNombre,
        bloques: sec.bloques,
      })),
    );

    let nombreArchivo = `horarios-colegio-${anio}.pdf`;
    if (filtros?.seccionId && secciones[0]) {
      nombreArchivo = `horario-${slugTexto(`${secciones[0].gradoNombre}-${secciones[0].seccionNombre}`)}-${anio}.pdf`;
    } else if (filtros?.gradoId && secciones[0]) {
      nombreArchivo = `horarios-${slugTexto(secciones[0].gradoNombre)}-${anio}.pdf`;
    }

    return { buffer, nombreArchivo };
  }

  async generarMiHorarioPdf(personaId: string): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    const anio = await resolverAnioHorario(this.anioLectivoCls, this.aniosService, false);
    const docente = await this.horariosRepo.docentePorPersonaId(personaId);
    if (!docente) {
      throw sinFichaDocente();
    }

    const bloquesDocente = await this.horariosRepo.findByDocente(anio.id, docente.id);
    const bloques: BloqueHorarioResponseDto[] = bloquesDocente.map((b) => ({
      id: b.id,
      seccionId: "",
      cursoSeccionId: null,
      cursoNombre: b.cursoNombre,
      docenteNombre: `${b.gradoNumero}.° · Sección ${b.seccionNombre}`,
      diaSemana: b.diaSemana,
      horaInicio: b.horaInicio,
      horaFin: b.horaFin,
      tipoBloque: b.cursoNombre ? "clase" : "receso",
      aula: b.aula,
      colorHex: b.colorHex,
    }));

    const buffer = await generarHorarioPdfBuffer({
      titulo: "Mi Horario Docente",
      subtitulo: `Año académico ${anio.anio}`,
      bloques,
    });
    return { buffer, nombreArchivo: `mi-horario-docente-${anio.anio}.pdf` };
  }

  async generarHorarioEstudiantePdf(
    estudianteId: string,
    usuario: UsuarioConsultaEstudiante,
  ): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    const horario = await this.consultaService.horarioDeEstudiante(estudianteId, usuario);
    return this.generarHorarioSeccionPdf(horario.seccionId);
  }
}
