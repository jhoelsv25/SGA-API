import type { Pool } from "pg";
import {
  AREAS_CURRICULARES,
  COMPETENCIAS_SEED,
  COMPETENCIAS_TRANSVERSALES_SEED,
  ENFOQUES_TRANSVERSALES_SEED,
  INSTRUMENTOS_EVALUACION_SEED,
  MOMENTOS_DIDACTICOS_SEED,
  NIVELES_LOGRO_SEED,
  REFERENCIAS_POR_DEFECTO_SEED,
  TIPOS_MATERIAL_SEED,
} from "./seed-catalogo-curricular.data";
import { DESEMPENOS_CURRICULARES_SEED } from "./seed-desempenos-curriculares.data";

function codigoDe(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);
}

/**
 * RF-024 V1, HU1: carga inicial del catálogo curricular. Es idempotente: se puede correr varias
 * veces. Inserta lo que falta y NO pisa los textos que el administrador ya haya corregido.
 */
export async function sembrarCatalogoCurricular(pool: Pool): Promise<void> {
  for (const [i, a] of AREAS_CURRICULARES.entries()) {
    await pool.query(
      `INSERT INTO areas_curriculares (codigo, nombre, orden) VALUES ($1, $2, $3)
       ON CONFLICT (codigo) DO NOTHING`,
      [a.codigo, a.nombre, i + 1],
    );
  }

  const competencias = [
    ...COMPETENCIAS_SEED.map((c) => ({ ...c, tipo: "area" as const })),
    ...COMPETENCIAS_TRANSVERSALES_SEED.map((c) => ({
      ...c,
      area: null,
      tipo: "transversal" as const,
    })),
  ];
  for (const c of competencias) {
    await pool.query(
      `INSERT INTO competencias_curriculares (numero, area_id, tipo, nombre)
       VALUES ($1, (SELECT id FROM areas_curriculares WHERE codigo = $2), $3, $4)
       ON CONFLICT (numero) DO NOTHING`,
      [c.numero, c.area, c.tipo, c.nombre],
    );
    for (const [i, nombre] of c.capacidades.entries()) {
      await pool.query(
        `INSERT INTO capacidades_curriculares (competencia_id, orden, nombre)
         SELECT id, $2, $3 FROM competencias_curriculares WHERE numero = $1
         ON CONFLICT (competencia_id, orden) DO NOTHING`,
        [c.numero, i + 1, nombre],
      );
    }
  }

  for (const [numero, grado, orden, texto] of DESEMPENOS_CURRICULARES_SEED) {
    await pool.query(
      `INSERT INTO desempenos_curriculares (competencia_id, grado, orden, texto)
       SELECT id, $2, $3, $4 FROM competencias_curriculares WHERE numero = $1
       ON CONFLICT (competencia_id, grado, orden) DO NOTHING`,
      [numero, grado, orden, texto],
    );
  }

  for (const [i, e] of ENFOQUES_TRANSVERSALES_SEED.entries()) {
    await pool.query(
      `INSERT INTO enfoques_transversales (orden, nombre) VALUES ($1, $2)
       ON CONFLICT (nombre) DO NOTHING`,
      [i + 1, e.nombre],
    );
    for (const [j, valor] of e.valores.entries()) {
      await pool.query(
        `INSERT INTO enfoques_valores (enfoque_id, orden, nombre)
         SELECT id, $2, $3 FROM enfoques_transversales WHERE nombre = $1
         ON CONFLICT (enfoque_id, orden) DO NOTHING`,
        [e.nombre, j + 1, valor],
      );
    }
  }

  const opciones: { tipo: string; codigo: string; nombre: string }[] = [
    ...NIVELES_LOGRO_SEED.map((n) => ({ tipo: "nivel_logro", codigo: n.codigo, nombre: n.nombre })),
    ...INSTRUMENTOS_EVALUACION_SEED.map((n) => ({
      tipo: "instrumento_evaluacion",
      codigo: codigoDe(n),
      nombre: n,
    })),
    ...MOMENTOS_DIDACTICOS_SEED.map((m) => ({
      tipo: "momento_didactico",
      codigo: m.codigo,
      nombre: m.nombre,
    })),
    ...TIPOS_MATERIAL_SEED.map((n) => ({ tipo: "tipo_material", codigo: codigoDe(n), nombre: n })),
    ...REFERENCIAS_POR_DEFECTO_SEED.map((n, i) => ({
      tipo: "referencia",
      codigo: `cneb_${i + 1}`,
      nombre: n,
    })),
  ];
  for (const [i, o] of opciones.entries()) {
    await pool.query(
      `INSERT INTO catalogo_sesion_opciones (tipo, codigo, nombre, orden) VALUES ($1, $2, $3, $4)
       ON CONFLICT (tipo, codigo) DO NOTHING`,
      [o.tipo, o.codigo, o.nombre, i + 1],
    );
  }
}
