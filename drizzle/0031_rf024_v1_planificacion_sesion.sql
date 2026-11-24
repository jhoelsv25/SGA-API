-- RF-024 V1 (y RF-011 V4): catálogo curricular, planificación de la sesión de aprendizaje,
-- comentarios del supervisor y verificación de aula. Idempotente.

-- Catálogo curricular (CNEB)
CREATE TABLE IF NOT EXISTS "areas_curriculares" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"codigo" varchar(30) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"orden" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "uq_areas_curriculares_codigo" UNIQUE ("codigo")
);

CREATE TABLE IF NOT EXISTS "competencias_curriculares" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"numero" smallint NOT NULL,
	"area_id" uuid REFERENCES "areas_curriculares"("id"),
	"tipo" varchar(12) DEFAULT 'area' NOT NULL,
	"nombre" varchar(500) NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_competencias_curriculares_numero" UNIQUE ("numero"),
	CONSTRAINT "ck_competencias_curriculares_tipo" CHECK ("tipo" IN ('area', 'transversal')),
	CONSTRAINT "ck_competencias_curriculares_area" CHECK (("tipo" = 'transversal') = ("area_id" IS NULL))
);
CREATE INDEX IF NOT EXISTS "ix_competencias_curriculares_area" ON "competencias_curriculares" ("area_id");

CREATE TABLE IF NOT EXISTS "capacidades_curriculares" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"competencia_id" uuid NOT NULL REFERENCES "competencias_curriculares"("id"),
	"orden" smallint NOT NULL,
	"nombre" varchar(500) NOT NULL,
	CONSTRAINT "uq_capacidades_curriculares_orden" UNIQUE ("competencia_id", "orden")
);

CREATE TABLE IF NOT EXISTS "desempenos_curriculares" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"competencia_id" uuid NOT NULL REFERENCES "competencias_curriculares"("id"),
	"grado" smallint NOT NULL,
	"orden" smallint NOT NULL,
	"texto" text NOT NULL,
	CONSTRAINT "uq_desempenos_curriculares_orden" UNIQUE ("competencia_id", "grado", "orden"),
	CONSTRAINT "ck_desempenos_curriculares_grado" CHECK ("grado" BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS "enfoques_transversales" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"orden" smallint NOT NULL,
	"nombre" varchar(150) NOT NULL,
	CONSTRAINT "uq_enfoques_transversales_nombre" UNIQUE ("nombre")
);

CREATE TABLE IF NOT EXISTS "enfoques_valores" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"enfoque_id" uuid NOT NULL REFERENCES "enfoques_transversales"("id"),
	"orden" smallint NOT NULL,
	"nombre" varchar(150) NOT NULL,
	CONSTRAINT "uq_enfoques_valores_orden" UNIQUE ("enfoque_id", "orden")
);

CREATE TABLE IF NOT EXISTS "enfoques_acciones_observables" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"valor_id" uuid NOT NULL REFERENCES "enfoques_valores"("id"),
	"orden" smallint NOT NULL,
	"texto" text NOT NULL,
	CONSTRAINT "uq_enfoques_acciones_orden" UNIQUE ("valor_id", "orden")
);

-- Listas desplegables del modelo de sesión (niveles de logro, instrumentos, momentos, materiales, referencias)
CREATE TABLE IF NOT EXISTS "catalogo_sesion_opciones" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"tipo" varchar(30) NOT NULL,
	"codigo" varchar(60) NOT NULL,
	"nombre" varchar(300) NOT NULL,
	"orden" smallint DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_catalogo_sesion_opciones" UNIQUE ("tipo", "codigo"),
	CONSTRAINT "ck_catalogo_sesion_opciones_tipo" CHECK ("tipo" IN ('nivel_logro', 'instrumento_evaluacion', 'momento_didactico', 'tipo_material', 'referencia'))
);

-- Planificación de la sesión (una por bloque del horario y fecha)
CREATE TABLE IF NOT EXISTS "planificaciones_sesion" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"docente_id" uuid NOT NULL REFERENCES "docentes"("id"),
	"curso_seccion_id" uuid NOT NULL REFERENCES "cursos_seccion"("id"),
	"horario_id" uuid NOT NULL REFERENCES "horarios"("id"),
	"sesion_clase_id" uuid REFERENCES "sesiones_clase"("id"),
	"fecha" date NOT NULL,
	"numero" smallint,
	"unidad" varchar(50),
	"titulo" varchar(250) NOT NULL,
	"proposito" text,
	"evidencia" text,
	"criterios" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"instrumento_codigo" varchar(60),
	"competencias_transversales" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enfoques" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"materiales" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"referencias" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"estado" varchar(12) DEFAULT 'borrador' NOT NULL,
	"copiada_de_id" uuid REFERENCES "planificaciones_sesion"("id"),
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"actualizado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "uq_planificaciones_sesion_bloque" UNIQUE ("horario_id", "fecha"),
	CONSTRAINT "ck_planificaciones_sesion_estado" CHECK ("estado" IN ('borrador', 'lista', 'ejecutada'))
);
CREATE INDEX IF NOT EXISTS "ix_planificaciones_sesion_docente" ON "planificaciones_sesion" ("docente_id", "fecha");
CREATE INDEX IF NOT EXISTS "ix_planificaciones_sesion_sesion" ON "planificaciones_sesion" ("sesion_clase_id");

-- Competencias de la sesión: los textos se copian al guardar (los cambios del catálogo no alteran lo planificado)
CREATE TABLE IF NOT EXISTS "planificaciones_competencias" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"planificacion_id" uuid NOT NULL REFERENCES "planificaciones_sesion"("id") ON DELETE CASCADE,
	"orden" smallint NOT NULL,
	"competencia_id" uuid NOT NULL REFERENCES "competencias_curriculares"("id"),
	"competencia_texto" varchar(500) NOT NULL,
	"capacidades" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"desempenos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"campo_tematico" text,
	CONSTRAINT "uq_planificaciones_competencias_orden" UNIQUE ("planificacion_id", "orden")
);

CREATE TABLE IF NOT EXISTS "planificaciones_momentos" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"planificacion_id" uuid NOT NULL REFERENCES "planificaciones_sesion"("id") ON DELETE CASCADE,
	"momento" varchar(12) NOT NULL,
	"actividades" text,
	"minutos" smallint,
	CONSTRAINT "uq_planificaciones_momentos" UNIQUE ("planificacion_id", "momento"),
	CONSTRAINT "ck_planificaciones_momentos_momento" CHECK ("momento" IN ('inicio', 'desarrollo', 'cierre')),
	CONSTRAINT "ck_planificaciones_momentos_minutos" CHECK ("minutos" IS NULL OR "minutos" >= 0)
);

-- Supervisión (RF-011 V4): comentarios y verificación de aula
CREATE TABLE IF NOT EXISTS "planificaciones_comentarios" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"planificacion_id" uuid NOT NULL REFERENCES "planificaciones_sesion"("id") ON DELETE CASCADE,
	"usuario_id" uuid NOT NULL REFERENCES "usuarios"("id"),
	"texto" varchar(2000) NOT NULL,
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "ix_planificaciones_comentarios_plan" ON "planificaciones_comentarios" ("planificacion_id");

CREATE TABLE IF NOT EXISTS "sesiones_verificacion_aula" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"sesion_clase_id" uuid NOT NULL REFERENCES "sesiones_clase"("id"),
	"en_aula" boolean NOT NULL,
	"hora_inicio" time(0),
	"hora_fin" time(0),
	"observacion" varchar(500),
	"usuario_id" uuid NOT NULL REFERENCES "usuarios"("id"),
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"actualizado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "uq_sesiones_verificacion_aula_sesion" UNIQUE ("sesion_clase_id"),
	CONSTRAINT "ck_sesiones_verificacion_aula_horas" CHECK ("hora_inicio" IS NULL OR "hora_fin" IS NULL OR "hora_fin" > "hora_inicio")
);
