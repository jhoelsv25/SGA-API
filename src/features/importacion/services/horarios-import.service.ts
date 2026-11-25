import { BadRequestException, Injectable, Optional } from "@nestjs/common";
import { AuditService } from "../../../common/services/audit.service";
import { CacheService } from "../../../core/cache/cache.service";
import type { FilaPrevisualizadaDto } from "../dto";
import { ImportacionAcademicaRepository, type AnioImportacionAcademica } from "../repositories";
import {
  NOMBRES_DIA_SEMANA,
  getOptStr,
  getStr,
  normalizarDiaSemana,
  normalizarHoraTexto,
  normalizarTipoBloque,
  resolverCursoPorTexto,
  resolverSeccionPorGradoYNombre,
} from "../utils";

interface BloqueEnMemoria {
  seccionId: string;
  cursoSeccionId: string | null;
  docenteId: string | null;
  diaSemana: number;
  inicioMin: number;
  finMin: number;
  horaInicio: string;
  horaFin: string;
  tipoBloque: string;
  descripcionSeccion: string;
}

function minutosDesdeHHMM(hora: string): number {
  const parsed = normalizarHoraTexto(hora);
  return parsed ? parsed.minutos : 0;
}

@Injectable()
export class HorariosImportService {
  constructor(
    private readonly repo: ImportacionAcademicaRepository,
    private readonly auditService: AuditService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  private async resolverAnioValido(anioAcademicoId?: string): Promise<AnioImportacionAcademica> {
    const anio = await this.repo.findAnioParaImportacion(anioAcademicoId);
    if (!anio || anio.estado === "cerrado") {
      throw new BadRequestException(
        "No existe un año académico activo o planificado abierto para importar horarios.",
      );
    }
    return anio;
  }

  async previsualizarFilas(
    filas: Record<string, unknown>[],
    anioAcademicoId?: string,
  ): Promise<{
    anioAcademicoId: string;
    filasAnalizadas: FilaPrevisualizadaDto[];
    validasCount: number;
    omitidasCount: number;
    erroresCount: number;
  }> {
    const anio = await this.resolverAnioValido(anioAcademicoId);

    const [secciones, cursos, cursosSeccion, bloquesExistentes] = await Promise.all([
      this.repo.listarSeccionesActivasConTutor(anio.id),
      this.repo.listarCursosActivos(),
      this.repo.listarCursosSeccionDeAnio(anio.id),
      this.repo.listarHorariosDeAnio(anio.id),
    ]);

    const cursoSeccionMap = new Map(
      cursosSeccion.map((cs) => [`${cs.seccionId}:${cs.cursoId}`, cs]),
    );

    const bloquesPorSeccion = new Map<string, BloqueEnMemoria[]>();
    const bloquesPorDocente = new Map<string, BloqueEnMemoria[]>();

    for (const b of bloquesExistentes) {
      const mem: BloqueEnMemoria = {
        seccionId: b.seccionId,
        cursoSeccionId: b.cursoSeccionId,
        docenteId: b.docenteId,
        diaSemana: b.diaSemana,
        inicioMin: minutosDesdeHHMM(b.horaInicio),
        finMin: minutosDesdeHHMM(b.horaFin),
        horaInicio: normalizarHoraTexto(b.horaInicio)?.hora ?? b.horaInicio.slice(0, 5),
        horaFin: normalizarHoraTexto(b.horaFin)?.hora ?? b.horaFin.slice(0, 5),
        tipoBloque: b.tipoBloque,
        descripcionSeccion: `${b.gradoNumero}.° ${b.seccionNombre}`,
      };
      const arrSec = bloquesPorSeccion.get(b.seccionId) ?? [];
      arrSec.push(mem);
      bloquesPorSeccion.set(b.seccionId, arrSec);

      if (b.docenteId) {
        const arrDoc = bloquesPorDocente.get(b.docenteId) ?? [];
        arrDoc.push(mem);
        bloquesPorDocente.set(b.docenteId, arrDoc);
      }
    }

    const filasAnalizadas: FilaPrevisualizadaDto[] = [];
    let validasCount = 0;
    let omitidasCount = 0;
    let erroresCount = 0;

    for (let i = 0; i < filas.length; i++) {
      const filaRaw = filas[i];
      const datos: Record<string, unknown> = Array.isArray(filaRaw)
        ? Object.assign({}, filaRaw)
        : filaRaw;
      const numeroFila = i + 2;

      const analizada = this.analizarFila({
        numeroFila,
        datos,
        secciones,
        cursos,
        cursoSeccionMap,
        bloquesPorSeccion,
        bloquesPorDocente,
      });

      filasAnalizadas.push(analizada);
      if (analizada.estado === "valida") validasCount++;
      else if (analizada.estado === "ya_registrada") omitidasCount++;
      else erroresCount++;
    }

    return {
      anioAcademicoId: anio.id,
      filasAnalizadas,
      validasCount,
      omitidasCount,
      erroresCount,
    };
  }

  private analizarFila(params: {
    numeroFila: number;
    datos: Record<string, unknown>;
    secciones: Awaited<
      ReturnType<ImportacionAcademicaRepository["listarSeccionesActivasConTutor"]>
    >;
    cursos: Awaited<ReturnType<ImportacionAcademicaRepository["listarCursosActivos"]>>;
    cursoSeccionMap: Map<
      string,
      { id: string; seccionId: string; cursoId: string; docenteId: string | null }
    >;
    bloquesPorSeccion: Map<string, BloqueEnMemoria[]>;
    bloquesPorDocente: Map<string, BloqueEnMemoria[]>;
  }): FilaPrevisualizadaDto {
    const {
      numeroFila,
      datos,
      secciones,
      cursos,
      cursoSeccionMap,
      bloquesPorSeccion,
      bloquesPorDocente,
    } = params;

    const gradoTxt = getStr(datos, "grado");
    const seccionTxt = getStr(datos, "seccion");
    const diaTxt = getStr(datos, "diaSemana", "dia_semana", "dia");
    const inicioTxt = getStr(datos, "horaInicio", "hora_inicio");
    const finTxt = getStr(datos, "horaFin", "hora_fin");
    const tipoRaw = getOptStr(datos, "tipoBloque", "tipo_bloque", "tipo");
    const cursoTxt = getOptStr(datos, "curso");
    const aulaTxt = getOptStr(datos, "aula");

    const seccion = resolverSeccionPorGradoYNombre(secciones, gradoTxt, seccionTxt);
    if (!seccion) {
      return {
        numeroFila,
        datos,
        estado: "error",
        accion: "omitir",
        mensaje: `No se encontró una sección activa para "${gradoTxt} ${seccionTxt}".`,
      };
    }

    const gradoSeccion = `${seccion.gradoNombre} - ${seccion.nombre}`;
    const diaSemana = normalizarDiaSemana(diaTxt);
    if (!diaSemana) {
      return {
        numeroFila,
        datos: { ...datos, gradoSeccion },
        estado: "error",
        accion: "omitir",
        mensaje: `Día de semana inválido ("${diaTxt}"). Use Lunes a Viernes o 1 a 5.`,
      };
    }

    const diaNombre = NOMBRES_DIA_SEMANA[diaSemana] ?? diaTxt;
    const inicio = normalizarHoraTexto(inicioTxt);
    const fin = normalizarHoraTexto(finTxt);
    if (!inicio || !fin || fin.minutos <= inicio.minutos) {
      return {
        numeroFila,
        datos: { ...datos, gradoSeccion, diaNombre },
        estado: "error",
        accion: "omitir",
        mensaje: `Rango horario inválido ("${inicioTxt}" - "${finTxt}").`,
      };
    }

    const horarioTexto = `${diaNombre} ${inicio.hora}–${fin.hora}`;
    const tipoBloque = normalizarTipoBloque(tipoRaw);
    if (!tipoBloque) {
      return {
        numeroFila,
        datos: { ...datos, gradoSeccion, diaNombre, horarioTexto },
        estado: "error",
        accion: "omitir",
        mensaje: `Tipo de bloque inválido ("${tipoRaw}"). Use clase o receso.`,
      };
    }

    let cursoSeccionId: string | null = null;
    let docenteId: string | null = null;
    let cursoNombre = tipoBloque === "receso" ? "Receso" : "";

    if (tipoBloque === "clase") {
      if (!cursoTxt) {
        return {
          numeroFila,
          datos: { ...datos, gradoSeccion, diaNombre, horarioTexto },
          estado: "error",
          accion: "omitir",
          mensaje: "El curso es obligatorio para bloques de tipo clase.",
        };
      }

      const curso = resolverCursoPorTexto(cursos, cursoTxt);
      if (!curso) {
        return {
          numeroFila,
          datos: { ...datos, gradoSeccion, diaNombre, horarioTexto },
          estado: "error",
          accion: "omitir",
          mensaje: `No existe un curso activo que coincida con "${cursoTxt}".`,
        };
      }

      cursoNombre = curso.nombre;
      const cs = cursoSeccionMap.get(`${seccion.id}:${curso.id}`);
      if (!cs) {
        return {
          numeroFila,
          datos: { ...datos, gradoSeccion, diaNombre, horarioTexto, cursoNombre },
          estado: "error",
          accion: "omitir",
          mensaje: `El curso ${curso.nombre} no figura en la carga académica de ${gradoSeccion}. Importe primero la Carga Académica.`,
        };
      }

      cursoSeccionId = cs.id;
      docenteId = cs.docenteId;
    }

    const existentesSeccion = bloquesPorSeccion.get(seccion.id) ?? [];
    const identico = existentesSeccion.find(
      (b) =>
        b.diaSemana === diaSemana &&
        b.inicioMin === inicio.minutos &&
        b.finMin === fin.minutos &&
        b.tipoBloque === tipoBloque &&
        (tipoBloque === "receso" || b.cursoSeccionId === cursoSeccionId),
    );
    if (identico) {
      return {
        numeroFila,
        datos: { ...datos, gradoSeccion, diaNombre, horarioTexto, cursoNombre },
        estado: "ya_registrada",
        accion: "omitir",
        mensaje: "Este bloque ya se encuentra registrado en el horario.",
      };
    }

    const solapado = existentesSeccion.find(
      (b) => b.diaSemana === diaSemana && inicio.minutos < b.finMin && fin.minutos > b.inicioMin,
    );
    if (solapado) {
      return {
        numeroFila,
        datos: { ...datos, gradoSeccion, diaNombre, horarioTexto, cursoNombre },
        estado: "error",
        accion: "omitir",
        mensaje: `Superposición en ${gradoSeccion} el ${diaNombre} (${solapado.horaInicio}–${solapado.horaFin}).`,
      };
    }

    if (docenteId) {
      const ocupadosDoc = bloquesPorDocente.get(docenteId) ?? [];
      const cruce = ocupadosDoc.find(
        (b) =>
          b.seccionId !== seccion.id &&
          b.diaSemana === diaSemana &&
          inicio.minutos < b.finMin &&
          fin.minutos > b.inicioMin,
      );
      if (cruce) {
        return {
          numeroFila,
          datos: { ...datos, gradoSeccion, diaNombre, horarioTexto, cursoNombre },
          estado: "error",
          accion: "omitir",
          mensaje: `Cruce docente el ${diaNombre} con ${cruce.descripcionSeccion} (${cruce.horaInicio}–${cruce.horaFin}).`,
        };
      }
    }

    const nuevoMem: BloqueEnMemoria = {
      seccionId: seccion.id,
      cursoSeccionId,
      docenteId,
      diaSemana,
      inicioMin: inicio.minutos,
      finMin: fin.minutos,
      horaInicio: inicio.hora,
      horaFin: fin.hora,
      tipoBloque,
      descripcionSeccion: `${seccion.gradoNumero}.° ${seccion.nombre}`,
    };
    existentesSeccion.push(nuevoMem);
    bloquesPorSeccion.set(seccion.id, existentesSeccion);

    if (docenteId) {
      const arrDoc = bloquesPorDocente.get(docenteId) ?? [];
      arrDoc.push(nuevoMem);
      bloquesPorDocente.set(docenteId, arrDoc);
    }

    return {
      numeroFila,
      datos: {
        ...datos,
        _seccionId: seccion.id,
        _cursoSeccionId: cursoSeccionId,
        _diaSemana: diaSemana,
        _horaInicio: inicio.hora,
        _horaFin: fin.hora,
        _tipoBloque: tipoBloque,
        _aula: aulaTxt || null,
        gradoSeccion,
        diaNombre,
        horarioTexto,
        cursoNombre,
      },
      estado: "valida",
      accion: "crear",
      mensaje: `Registrará ${cursoNombre} (${horarioTexto}).`,
    };
  }

  async procesarFila(
    datos: Record<string, unknown>,
    actorId: string,
    ip?: string,
  ): Promise<boolean> {
    const seccionId = getOptStr(datos, "_seccionId");
    const cursoSeccionId = getOptStr(datos, "_cursoSeccionId") || null;
    const diaSemana =
      typeof datos._diaSemana === "number"
        ? datos._diaSemana
        : normalizarDiaSemana(getStr(datos, "diaSemana", "dia_semana", "dia"));
    const horaInicio = getOptStr(datos, "_horaInicio") || getStr(datos, "horaInicio");
    const horaFin = getOptStr(datos, "_horaFin") || getStr(datos, "horaFin");
    const tipoRaw = getOptStr(datos, "_tipoBloque") || getOptStr(datos, "tipoBloque");
    const tipoBloque = normalizarTipoBloque(tipoRaw) ?? "clase";
    const aula = getOptStr(datos, "_aula") || getOptStr(datos, "aula") || null;

    if (!seccionId || !diaSemana || !horaInicio || !horaFin) {
      return false;
    }

    if (tipoBloque === "clase" && !cursoSeccionId) {
      return false;
    }

    const bloqueId = await this.repo.insertarBloqueHorario({
      seccionId,
      cursoSeccionId: tipoBloque === "receso" ? null : cursoSeccionId,
      diaSemana,
      horaInicio,
      horaFin,
      tipoBloque,
      aula,
    });
    await this.cacheService?.del(`horarios:seccion:${seccionId}`);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "horarios",
      registroId: bloqueId,
      valorNuevo: { seccionId, cursoSeccionId, diaSemana, horaInicio, horaFin, tipoBloque },
      direccionIp: ip,
    });

    return true;
  }
}
