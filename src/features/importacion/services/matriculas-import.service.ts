import { BadRequestException, Injectable } from "@nestjs/common";
import {
  MATRICULA_MESSAGES,
  MATRICULA_TIPOS,
  type MatriculaTipo,
} from "../../matriculas/constants";
import type { EstudianteParaMatricula, SeccionConVacantes } from "../../matriculas/interfaces";
import { MatriculasService } from "../../matriculas/matriculas.service";
import { MatriculasRepository } from "../../matriculas/repositories";
import type { FilaPrevisualizadaDto } from "../dto";
import { getOptStr, getStr, normalizarSiNo } from "../utils";

const TIPOS_MATRICULA_VALIDOS = new Set<string>(Object.values(MATRICULA_TIPOS));

const MAPA_GRADO_PALABRA: Record<string, number> = {
  primero: 1,
  primer: 1,
  "1ero": 1,
  "1ro": 1,
  segundo: 2,
  "2do": 2,
  tercero: 3,
  tercer: 3,
  "3ero": 3,
  "3ro": 3,
  cuarto: 4,
  "4to": 4,
  quinto: 5,
  "5to": 5,
  sexto: 6,
  "6to": 6,
};

function normalizarTexto(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function extraerNumeroGrado(valor: string): number | null {
  const limpio = normalizarTexto(valor);
  if (!limpio) return null;

  for (const [palabra, numero] of Object.entries(MAPA_GRADO_PALABRA)) {
    if (limpio.includes(palabra)) return numero;
  }

  const coincidencia = /^(\d+)/.exec(limpio);
  if (coincidencia) {
    const n = Number(coincidencia[1]);
    if (Number.isInteger(n) && n >= 1 && n <= 6) return n;
  }

  return null;
}

function normalizarNombreSeccion(valor: string): string {
  return normalizarTexto(valor).replace(/\s+/g, "");
}

function resolverSeccion(
  secciones: SeccionConVacantes[],
  gradoTexto: string,
  seccionTexto: string,
): SeccionConVacantes | null {
  const numeroGrado = extraerNumeroGrado(gradoTexto);
  const gradoNorm = normalizarTexto(gradoTexto);
  const seccionNorm = normalizarNombreSeccion(seccionTexto);
  if (!seccionNorm) return null;

  const buscarPorNombre = (nombreNorm: string): SeccionConVacantes | null => {
    const candidatas = secciones.filter((s) => normalizarNombreSeccion(s.nombre) === nombreNorm);
    if (candidatas.length === 0) return null;

    if (numeroGrado !== null) {
      const porNumero = candidatas.find((s) => s.gradoNumero === numeroGrado);
      if (porNumero) return porNumero;
    }

    return (
      candidatas.find((s) => normalizarTexto(s.gradoNombre) === gradoNorm) ??
      candidatas.find((s) => normalizarTexto(s.gradoNombre).includes(gradoNorm)) ??
      null
    );
  };

  const exacta = buscarPorNombre(seccionNorm);
  if (exacta) return exacta;

  // Fallback SIAGIE: si la sección viene prefijada con el número de grado (ej. "2 AP" -> "AP")
  if (numeroGrado !== null && seccionNorm.startsWith(String(numeroGrado))) {
    const sinPrefijoGrado = seccionNorm.slice(String(numeroGrado).length);
    if (sinPrefijoGrado) {
      return buscarPorNombre(sinPrefijoGrado);
    }
  }

  return null;
}

function normalizarTipoMatricula(raw?: string): MatriculaTipo | null {
  if (!raw) return MATRICULA_TIPOS.CONTINUADOR;
  const limpio = normalizarTexto(raw);
  if (TIPOS_MATRICULA_VALIDOS.has(limpio)) {
    return limpio as MatriculaTipo;
  }
  if (limpio === "ingreso" || limpio === "ingresante") return MATRICULA_TIPOS.NUEVO;
  if (limpio === "continuidad" || limpio === "promovido") return MATRICULA_TIPOS.CONTINUADOR;
  return null;
}

function validarFechaIsoOpcional(fecha?: string): string | null {
  if (!fecha) return new Date().toISOString().split("T")[0];
  const limpia = fecha.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(limpia)) return limpia;
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(limpia);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  return null;
}

export interface ContextoPrevisualizacionMatriculas {
  anioAcademicoId: string;
  anioNumero: number;
  secciones: SeccionConVacantes[];
}

@Injectable()
export class MatriculasImportService {
  constructor(
    private readonly matriculasRepository: MatriculasRepository,
    private readonly matriculasService: MatriculasService,
  ) {}

  async resolverContextoAnio(
    anioAcademicoId?: string,
  ): Promise<ContextoPrevisualizacionMatriculas> {
    const anio = await this.matriculasRepository.findAnioParaMatricula(anioAcademicoId);
    if (!anio || (anio.estado !== "planificado" && anio.estado !== "en_curso")) {
      throw new BadRequestException(MATRICULA_MESSAGES.ANIO_NO_VALIDO);
    }

    const secciones = await this.matriculasRepository.listarSeccionesActivasDeAnio(anio.id);
    return {
      anioAcademicoId: anio.id,
      anioNumero: anio.anio,
      secciones,
    };
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
    const contexto = await this.resolverContextoAnio(anioAcademicoId);
    const cuposRestantes = new Map<string, number>();
    for (const s of contexto.secciones) {
      cuposRestantes.set(s.id, s.vacantesDisponibles);
    }

    // Precarga en bloque (2 consultas en lugar de N+1) para previsualizar 500 filas en < 200 ms
    const filasNormalizadas: Record<string, unknown>[] = filas.map((filaRaw) =>
      Array.isArray(filaRaw) ? Object.assign({}, filaRaw) : filaRaw,
    );

    const identificadores = filasNormalizadas
      .map((datos) =>
        getStr(datos, "codigoSiagie", "codigo_siagie", "codigo", "numeroDocumento", "dni"),
      )
      .filter(Boolean);

    const estudiantesEncontrados =
      await this.matriculasRepository.findEstudiantesPorCodigosODocumentos(identificadores);

    const mapaEstudiantes = new Map<string, EstudianteParaMatricula>();
    for (const est of estudiantesEncontrados) {
      if (est.codigo) mapaEstudiantes.set(est.codigo.trim(), est);
      if (est.numeroDocumento) mapaEstudiantes.set(est.numeroDocumento.trim(), est);
    }

    const matriculasExistentes = await this.matriculasRepository.findMatriculasDeEstudiantesEnAnio(
      estudiantesEncontrados.map((e) => e.id),
      contexto.anioAcademicoId,
    );
    const mapaMatriculas = new Map<string, { id: string; codigo: string; estado: string }>();
    for (const mat of matriculasExistentes) {
      mapaMatriculas.set(mat.estudianteId, {
        id: mat.id,
        codigo: mat.codigo,
        estado: mat.estado,
      });
    }

    const estudiantesEnLote = new Set<string>();
    const filasAnalizadas: FilaPrevisualizadaDto[] = [];
    let validasCount = 0;
    let omitidasCount = 0;
    let erroresCount = 0;

    for (let i = 0; i < filasNormalizadas.length; i++) {
      const datos = filasNormalizadas[i];
      const numeroFila = i + 2;

      const analizada = this.analizarFilaEnMemoria(
        datos,
        numeroFila,
        contexto,
        cuposRestantes,
        estudiantesEnLote,
        mapaEstudiantes,
        mapaMatriculas,
      );

      filasAnalizadas.push(analizada);

      if (analizada.estado === "valida") validasCount++;
      else if (analizada.estado === "ya_registrada") omitidasCount++;
      else erroresCount++;
    }

    return {
      anioAcademicoId: contexto.anioAcademicoId,
      filasAnalizadas,
      validasCount,
      omitidasCount,
      erroresCount,
    };
  }

  private analizarFilaEnMemoria(
    datos: Record<string, unknown>,
    numeroFila: number,
    contexto: ContextoPrevisualizacionMatriculas,
    cuposRestantes: Map<string, number>,
    estudiantesEnLote: Set<string>,
    mapaEstudiantes: Map<string, EstudianteParaMatricula>,
    mapaMatriculas: Map<string, { id: string; codigo: string; estado: string }>,
  ): FilaPrevisualizadaDto {
    const identificador = getStr(
      datos,
      "codigoSiagie",
      "codigo_siagie",
      "codigo",
      "numeroDocumento",
      "dni",
    );
    const gradoTexto = getStr(datos, "grado");
    const seccionTexto = getStr(datos, "seccion");

    if (!identificador) {
      return {
        numeroFila,
        datos,
        estado: "error",
        accion: "omitir",
        mensaje: "El código SIAGIE o número de documento del estudiante es obligatorio.",
      };
    }

    if (!gradoTexto || !seccionTexto) {
      return {
        numeroFila,
        datos,
        estado: "error",
        accion: "omitir",
        mensaje: "El grado y la sección son obligatorios.",
      };
    }

    const estudiante = mapaEstudiantes.get(identificador.trim()) ?? null;
    if (!estudiante) {
      return {
        numeroFila,
        datos,
        estado: "error",
        accion: "omitir",
        mensaje: `No existe un estudiante registrado con «${identificador}».`,
      };
    }

    const nombreCompleto =
      `${estudiante.apellidoPaterno} ${estudiante.apellidoMaterno ?? ""} ${estudiante.nombres}`.trim();
    const datosEnriquecidos: Record<string, unknown> = {
      ...datos,
      codigoSiagie: estudiante.codigo,
      numeroDocumento: estudiante.numeroDocumento,
      estudianteNombre: nombreCompleto,
    };

    if (estudiante.estado !== "activo") {
      return {
        numeroFila,
        datos: datosEnriquecidos,
        estado: "error",
        accion: "omitir",
        mensaje: MATRICULA_MESSAGES.ESTUDIANTE_NO_ACTIVO,
      };
    }

    if (estudiantesEnLote.has(estudiante.id)) {
      return {
        numeroFila,
        datos: datosEnriquecidos,
        estado: "error",
        accion: "omitir",
        mensaje: "El estudiante aparece duplicado en el archivo.",
      };
    }
    estudiantesEnLote.add(estudiante.id);

    const yaMatriculado = mapaMatriculas.get(estudiante.id) ?? null;
    if (yaMatriculado) {
      return {
        numeroFila,
        datos: datosEnriquecidos,
        estado: "ya_registrada",
        accion: "omitir",
        mensaje: `Ya matriculado en el año ${contexto.anioNumero} (${yaMatriculado.codigo}).`,
      };
    }

    const seccion = resolverSeccion(contexto.secciones, gradoTexto, seccionTexto);
    if (!seccion) {
      return {
        numeroFila,
        datos: datosEnriquecidos,
        estado: "error",
        accion: "omitir",
        mensaje: `No existe la sección «${seccionTexto}» para el grado «${gradoTexto}» en el año ${contexto.anioNumero}.`,
      };
    }

    datosEnriquecidos.gradoSeccion = `${seccion.gradoNombre} - ${seccion.nombre}`;

    const cupos = cuposRestantes.get(seccion.id) ?? 0;
    if (cupos <= 0) {
      return {
        numeroFila,
        datos: datosEnriquecidos,
        estado: "error",
        accion: "omitir",
        mensaje: `La sección ${seccion.gradoNombre} ${seccion.nombre} no tiene vacantes disponibles.`,
      };
    }

    const tipoMatricula = normalizarTipoMatricula(
      getOptStr(datos, "tipoMatricula", "tipo_matricula", "tipo"),
    );
    if (!tipoMatricula) {
      return {
        numeroFila,
        datos: datosEnriquecidos,
        estado: "error",
        accion: "omitir",
        mensaje: "Tipo de matrícula inválido. Use: nuevo, continuador o traslado.",
      };
    }

    const colegioProcedencia = getOptStr(datos, "colegioProcedencia", "colegio_procedencia");
    if (tipoMatricula === MATRICULA_TIPOS.TRASLADO && !colegioProcedencia) {
      return {
        numeroFila,
        datos: datosEnriquecidos,
        estado: "error",
        accion: "omitir",
        mensaje: MATRICULA_MESSAGES.FALTA_COLEGIO_PROCEDENCIA,
      };
    }

    const fechaMatricula = validarFechaIsoOpcional(
      getOptStr(datos, "fechaMatricula", "fecha_matricula"),
    );
    if (!fechaMatricula) {
      return {
        numeroFila,
        datos: datosEnriquecidos,
        estado: "error",
        accion: "omitir",
        mensaje: "Formato de fecha de matrícula inválido (use DD/MM/AAAA o AAAA-MM-DD).",
      };
    }

    cuposRestantes.set(seccion.id, cupos - 1);

    return {
      numeroFila,
      datos: {
        ...datosEnriquecidos,
        _estudianteId: estudiante.id,
        _seccionId: seccion.id,
        _anioAcademicoId: contexto.anioAcademicoId,
        tipoMatricula,
        fechaMatricula,
      },
      estado: "valida",
      accion: "crear",
      mensaje: `Se matriculará en ${seccion.gradoNombre} - ${seccion.nombre}.`,
    };
  }

  async procesarFila(
    datos: Record<string, unknown>,
    anioAcademicoId: string | undefined,
    actorId: string,
    ip?: string,
  ): Promise<boolean> {
    let estudianteId = getOptStr(datos, "_estudianteId");
    let seccionId = getOptStr(datos, "_seccionId");
    let anioId = getOptStr(datos, "_anioAcademicoId") || anioAcademicoId;

    if (!estudianteId) {
      const identificador = getStr(
        datos,
        "codigoSiagie",
        "codigo_siagie",
        "codigo",
        "numeroDocumento",
        "dni",
      );
      const est = await this.matriculasRepository.findEstudiantePorCodigoODocumento(identificador);
      if (!est) return false;
      estudianteId = est.id;
    }

    if (!seccionId || !anioId) {
      const contexto = await this.resolverContextoAnio(anioId);
      anioId = contexto.anioAcademicoId;
      const seccion = resolverSeccion(
        contexto.secciones,
        getStr(datos, "grado"),
        getStr(datos, "seccion"),
      );
      if (!seccion) return false;
      seccionId = seccion.id;
    }

    const tipo =
      normalizarTipoMatricula(getOptStr(datos, "tipoMatricula", "tipo_matricula", "tipo")) ??
      MATRICULA_TIPOS.CONTINUADOR;
    const fechaMatricula =
      validarFechaIsoOpcional(getOptStr(datos, "fechaMatricula", "fecha_matricula")) ?? undefined;
    const esRepitente = normalizarSiNo(getStr(datos, "esRepitente", "es_repitente")) ?? false;

    await this.matriculasService.matricular(
      {
        estudianteId,
        anioAcademicoId: anioId,
        seccionId,
        tipo,
        esRepitente,
        colegioProcedencia: getOptStr(datos, "colegioProcedencia", "colegio_procedencia"),
        fechaMatricula,
        observaciones: getOptStr(datos, "observaciones"),
      },
      actorId,
      ip,
      { silenciarNotificacion: true },
    );

    return true;
  }
}
