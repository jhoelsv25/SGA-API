-- Agrega el área curricular 'quechua', sus 3 competencias comunicativas y el curso base Quechua (idempotente).

ALTER TABLE "cursos" DROP CONSTRAINT IF EXISTS "ck_cursos_area";

ALTER TABLE "cursos"
  ADD CONSTRAINT "ck_cursos_area"
  CHECK (
    (area_curricular)::text = ANY (
      ARRAY[
        'matematica'::character varying,
        'comunicacion'::character varying,
        'quechua'::character varying,
        'ingles'::character varying,
        'arte_cultura'::character varying,
        'ciencias_sociales'::character varying,
        'dpcc'::character varying,
        'educacion_fisica'::character varying,
        'educacion_religiosa'::character varying,
        'ciencia_tecnologia'::character varying,
        'ept'::character varying,
        'taller'::character varying,
        'tutoria'::character varying
      ]::text[]
    )
  );

INSERT INTO "areas_curriculares" ("codigo", "nombre", "orden")
VALUES ('quechua', 'Quechua (Lengua Originaria)', 11)
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "competencias_curriculares" ("numero", "area_id", "tipo", "nombre")
SELECT 32, id, 'area', 'Se comunica oralmente en Quechua como lengua originaria'
FROM "areas_curriculares" WHERE "codigo" = 'quechua'
ON CONFLICT ("numero") DO NOTHING;

INSERT INTO "competencias_curriculares" ("numero", "area_id", "tipo", "nombre")
SELECT 33, id, 'area', 'Lee diversos tipos de textos escritos en Quechua como lengua originaria'
FROM "areas_curriculares" WHERE "codigo" = 'quechua'
ON CONFLICT ("numero") DO NOTHING;

INSERT INTO "competencias_curriculares" ("numero", "area_id", "tipo", "nombre")
SELECT 34, id, 'area', 'Escribe diversos tipos de textos en Quechua como lengua originaria'
FROM "areas_curriculares" WHERE "codigo" = 'quechua'
ON CONFLICT ("numero") DO NOTHING;

INSERT INTO "capacidades_curriculares" ("competencia_id", "orden", "nombre")
SELECT c.id, v.orden, v.nombre
FROM "competencias_curriculares" c
CROSS JOIN (
  VALUES
    (1, 'Obtiene información de textos orales'),
    (2, 'Infiere e interpreta información de textos orales'),
    (3, 'Adecúa, organiza y desarrolla las ideas de forma coherente y cohesionada'),
    (4, 'Utiliza recursos no verbales y paraverbales de forma estratégica'),
    (5, 'Interactúa estratégicamente con distintos interlocutores'),
    (6, 'Reflexiona y evalúa la forma, el contenido y el contexto del texto oral')
) AS v(orden, nombre)
WHERE c.numero = 32
ON CONFLICT ("competencia_id", "orden") DO NOTHING;

INSERT INTO "capacidades_curriculares" ("competencia_id", "orden", "nombre")
SELECT c.id, v.orden, v.nombre
FROM "competencias_curriculares" c
CROSS JOIN (
  VALUES
    (1, 'Obtiene información del texto escrito'),
    (2, 'Infiere e interpreta información del texto'),
    (3, 'Reflexiona y evalúa la forma, el contenido y el contexto del texto escrito')
) AS v(orden, nombre)
WHERE c.numero = 33
ON CONFLICT ("competencia_id", "orden") DO NOTHING;

INSERT INTO "capacidades_curriculares" ("competencia_id", "orden", "nombre")
SELECT c.id, v.orden, v.nombre
FROM "competencias_curriculares" c
CROSS JOIN (
  VALUES
    (1, 'Adecúa el texto a la situación comunicativa'),
    (2, 'Organiza y desarrolla las ideas de forma coherente y cohesionada'),
    (3, 'Utiliza convenciones del lenguaje escrito de forma pertinente'),
    (4, 'Reflexiona y evalúa la forma, el contenido y el contexto del texto escrito')
) AS v(orden, nombre)
WHERE c.numero = 34
ON CONFLICT ("competencia_id", "orden") DO NOTHING;

-- Si ya existe un curso llamado Quechua, lo reasigna a su área propia; si no existe, lo crea.
UPDATE "cursos"
SET "area_curricular" = 'quechua',
    "actualizado_en" = CURRENT_TIMESTAMP
WHERE LOWER("nombre") LIKE '%quechua%'
  AND "eliminado_en" IS NULL;

INSERT INTO "cursos" ("codigo", "nombre", "area_curricular", "color_hex", "descripcion")
SELECT 'QUE', 'Quechua', 'quechua', '#F59E0B', 'Área de Comunicación en Lengua Originaria - Quechua'
WHERE NOT EXISTS (
  SELECT 1 FROM "cursos"
  WHERE (UPPER("codigo") = 'QUE' OR LOWER("nombre") LIKE '%quechua%')
    AND "eliminado_en" IS NULL
);
