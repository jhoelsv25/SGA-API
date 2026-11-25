export interface SeccionIdentificable {
  id: string;
  gradoId: string;
  gradoNumero: number;
  gradoNombre: string;
  nombre: string;
  estado?: string;
}

export interface CursoIdentificable {
  id: string;
  codigo: string;
  nombre: string;
  areaCurricular?: string;
  activo?: boolean;
}

export interface DocenteIdentificable {
  id: string;
  codigo: string;
  estado: string;
  numeroDocumento: string | null;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  nombres: string;
}

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

const ALIAS_CURSO: Array<{ patron: RegExp; terminos: string[] }> = [
  { patron: /^mat\.?$|^matematica$/, terminos: ["matematica"] },
  { patron: /^com\.?$|^comunicacion$/, terminos: ["comunicacion"] },
  { patron: /^ing\.?$|^ingles$/, terminos: ["ingles"] },
  { patron: /^c\s*y\s*t$|^cyt$|^ciencia y tecnologia$/, terminos: ["ciencia y tecnologia", "cyt"] },
  { patron: /^cc\s*ss$|^ccss$|^ciencias sociales$/, terminos: ["ciencias sociales", "ccss"] },
  {
    patron: /^dpcc$|^desarrollo personal/,
    terminos: ["desarrollo personal", "dpcc", "ciudadania"],
  },
  { patron: /^arte$|^art\.?$|^arte y cultura$/, terminos: ["arte y cultura", "arte"] },
  { patron: /^ed\s*fis\.?$|^ed_fis$|^educacion fisica$/, terminos: ["educacion fisica"] },
  { patron: /^ept$|^educacion para el trabajo$/, terminos: ["educacion para el trabajo", "ept"] },
  {
    patron: /^rel\.?$|^religion$|^educacion religiosa$/,
    terminos: ["educacion religiosa", "religion"],
  },
  { patron: /^quechua$/, terminos: ["quechua"] },
  { patron: /^tut\.?$|^tutoria$/, terminos: ["tutoria"] },
];

const DIAS_SEMANA_MAP: Record<string, number> = {
  "1": 1,
  lu: 1,
  lun: 1,
  lunes: 1,
  "2": 2,
  ma: 2,
  mar: 2,
  martes: 2,
  "3": 3,
  mi: 3,
  mie: 3,
  miercoles: 3,
  "4": 4,
  ju: 4,
  jue: 4,
  jueves: 4,
  "5": 5,
  vi: 5,
  vie: 5,
  viernes: 5,
};

export const NOMBRES_DIA_SEMANA: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
};

/**
 * Normaliza un texto a minúsculas sin tildes ni espacios repetidos.
 */
export function normalizarTextoAcademico(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[°.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extrae el número de grado (1..6) desde palabras o prefijos numéricos.
 */
export function extraerNumeroGrado(valor: string): number | null {
  const limpio = normalizarTextoAcademico(valor);
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

function normalizarNombreSeccionCompacto(valor: string): string {
  return normalizarTextoAcademico(valor).replace(/\s+/g, "");
}

/**
 * Resuelve una sección a partir de grado y nombre de sección (tolera formatos SIAGIE como "2 AP").
 */
export function resolverSeccionPorGradoYNombre<T extends SeccionIdentificable>(
  secciones: T[],
  gradoTexto: string,
  seccionTexto: string,
): T | null {
  const numeroGrado = extraerNumeroGrado(gradoTexto);
  const gradoNorm = normalizarTextoAcademico(gradoTexto);
  const seccionNorm = normalizarNombreSeccionCompacto(seccionTexto);
  if (!seccionNorm) return null;

  const buscarPorNombre = (nombreNorm: string): T | null => {
    const candidatas = secciones.filter(
      (s) => normalizarNombreSeccionCompacto(s.nombre) === nombreNorm,
    );
    if (candidatas.length === 0) return null;

    if (numeroGrado !== null) {
      const porNumero = candidatas.find((s) => s.gradoNumero === numeroGrado);
      if (porNumero) return porNumero;
    }

    return (
      candidatas.find((s) => normalizarTextoAcademico(s.gradoNombre) === gradoNorm) ??
      candidatas.find((s) => normalizarTextoAcademico(s.gradoNombre).includes(gradoNorm)) ??
      null
    );
  };

  const exacta = buscarPorNombre(seccionNorm);
  if (exacta) return exacta;

  if (numeroGrado !== null && seccionNorm.startsWith(String(numeroGrado))) {
    const sinPrefijoGrado = seccionNorm.slice(String(numeroGrado).length);
    if (sinPrefijoGrado) {
      return buscarPorNombre(sinPrefijoGrado);
    }
  }

  return null;
}

/**
 * Resuelve un curso del catálogo por código, nombre normalizado o abreviatura escolar común.
 */
export function resolverCursoPorTexto<T extends CursoIdentificable>(
  listaCursos: T[],
  textoCurso: string,
): T | null {
  const activos = listaCursos.filter((c) => c.activo !== false);
  const buscado = normalizarTextoAcademico(textoCurso);
  if (!buscado) return null;

  const porCodigo = activos.find((c) => normalizarTextoAcademico(c.codigo) === buscado);
  if (porCodigo) return porCodigo;

  const porNombreExacto = activos.find((c) => normalizarTextoAcademico(c.nombre) === buscado);
  if (porNombreExacto) return porNombreExacto;

  for (const regla of ALIAS_CURSO) {
    if (regla.patron.test(buscado)) {
      const match = activos.find((c) => {
        const nom = normalizarTextoAcademico(c.nombre);
        const cod = normalizarTextoAcademico(c.codigo);
        return regla.terminos.some((t) => nom.includes(t) || cod === t);
      });
      if (match) return match;
    }
  }

  const porContiene = activos.filter((c) => normalizarTextoAcademico(c.nombre).includes(buscado));
  if (porContiene.length === 1) return porContiene[0];

  return null;
}

/**
 * Formatea nombre completo de docente para vista previa y comparación.
 */
export function nombreCompletoDocente(docente: DocenteIdentificable): string {
  return [docente.apellidoPaterno, docente.apellidoMaterno, docente.nombres]
    .filter((p) => Boolean(p && p.trim()))
    .join(" ");
}

/**
 * Resuelve un docente por DNI/documento, código de docente o coincidencia única de nombre/apellidos.
 */
export function resolverDocentePorIdentificador<T extends DocenteIdentificable>(
  listaDocentes: T[],
  identificador: string,
): T | null {
  const limpio = identificador.trim();
  if (!limpio) return null;

  const norm = normalizarTextoAcademico(limpio);

  const porDocumento = listaDocentes.find(
    (d) => d.numeroDocumento && d.numeroDocumento.trim().toLowerCase() === limpio.toLowerCase(),
  );
  if (porDocumento) return porDocumento;

  const porCodigo = listaDocentes.find(
    (d) => d.codigo.trim().toLowerCase() === limpio.toLowerCase(),
  );
  if (porCodigo) return porCodigo;

  const porNombreExacto = listaDocentes.filter((d) => {
    const apNom = normalizarTextoAcademico(nombreCompletoDocente(d));
    const nomAp = normalizarTextoAcademico(
      `${d.nombres} ${d.apellidoPaterno} ${d.apellidoMaterno ?? ""}`,
    );
    return apNom === norm || nomAp === norm;
  });
  if (porNombreExacto.length === 1) return porNombreExacto[0];

  const tokens = norm.split(" ").filter((t) => t.length >= 2);
  if (tokens.length === 0) return null;

  const coincidencias = listaDocentes.filter((d) => {
    const completo = normalizarTextoAcademico(
      `${d.apellidoPaterno} ${d.apellidoMaterno ?? ""} ${d.nombres}`,
    );
    return tokens.every((tk) => completo.includes(tk));
  });

  if (coincidencias.length === 1) return coincidencias[0];

  return null;
}

/**
 * Convierte día textual ("Lunes", "Lu", "1") en entero 1..5.
 */
export function normalizarDiaSemana(valor: string): number | null {
  const limpio = normalizarTextoAcademico(valor);
  if (!limpio) return null;
  return DIAS_SEMANA_MAP[limpio] ?? null;
}

/**
 * Convierte horas "8:00" o "08:00:00" en "HH:mm" válido y retorna minutos desde medianoche.
 */
export function normalizarHoraTexto(valor: string): { hora: string; minutos: number } | null {
  const limpio = valor.trim();
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(limpio);
  if (!match) return null;

  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isInteger(hh) || !Number.isInteger(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return null;
  }

  return {
    hora: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
    minutos: hh * 60 + mm,
  };
}

/**
 * Normaliza el tipo de bloque de horario ("clase" o "receso"; "almuerzo" -> "receso").
 */
export function normalizarTipoBloque(valor?: string): "clase" | "receso" | null {
  if (!valor || !valor.trim()) return "clase";
  const norm = normalizarTextoAcademico(valor);
  if (norm === "clase") return "clase";
  if (norm === "receso" || norm === "recreo" || norm === "almuerzo" || norm === "descanso") {
    return "receso";
  }
  return null;
}
