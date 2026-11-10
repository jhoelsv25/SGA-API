-- RF-023 V1: observación de aula y retroalimentación. Idempotente.
-- Instrumento versionado (el contenido de desempeños, aspectos y niveles va en jsonb).
CREATE TABLE IF NOT EXISTS "instrumentos_observacion" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"codigo" varchar(60) NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"fuente" varchar(250),
	"contenido" jsonb NOT NULL,
	"vigente" boolean DEFAULT false NOT NULL,
	"creado_por_id" uuid REFERENCES "usuarios"("id"),
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "uq_instrumentos_observacion_codigo" UNIQUE ("codigo")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ux_instrumentos_observacion_vigente" ON "instrumentos_observacion" ("vigente") WHERE vigente = true;

CREATE TABLE IF NOT EXISTS "observaciones_aula" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"docente_id" uuid NOT NULL REFERENCES "docentes"("id"),
	"curso_seccion_id" uuid NOT NULL REFERENCES "cursos_seccion"("id"),
	"horario_id" uuid REFERENCES "horarios"("id"),
	"sesion_clase_id" uuid REFERENCES "sesiones_clase"("id"),
	"periodo_id" uuid NOT NULL REFERENCES "periodos_academicos"("id"),
	"observador_usuario_id" uuid NOT NULL REFERENCES "usuarios"("id"),
	"instrumento_id" uuid NOT NULL REFERENCES "instrumentos_observacion"("id"),
	"observacion_anterior_id" uuid REFERENCES "observaciones_aula"("id"),
	"fecha" date NOT NULL,
	"hora_inicio_programada" time(0) NOT NULL,
	"hora_fin_programada" time(0) NOT NULL,
	"estado" varchar(20) DEFAULT 'programada' NOT NULL,
	"avisado_en" timestamp(0),
	"hora_inicio_real" time(0),
	"hora_fin_real" time(0),
	"minutos_totales" smallint,
	"estudiantes_presentes" smallint,
	"notas_cerradas_en" timestamp(0),
	"calificada_en" timestamp(0),
	"retro_fecha" date,
	"retro_hora_inicio" time(0),
	"retro_hora_fin" time(0),
	"retro_resumen" varchar(2000),
	"retroalimentada_en" timestamp(0),
	"enterado_en" timestamp(0),
	"motivo_cancelacion" varchar(500),
	"cancelada_en" timestamp(0),
	"cancelada_por_id" uuid REFERENCES "usuarios"("id"),
	"creado_por_id" uuid NOT NULL REFERENCES "usuarios"("id"),
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"actualizado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "ck_observaciones_aula_estado" CHECK ((estado)::text = ANY ((ARRAY['programada'::character varying, 'en_observacion'::character varying, 'notas_cerradas'::character varying, 'calificada'::character varying, 'retroalimentada'::character varying, 'cancelada'::character varying])::text[])),
	CONSTRAINT "ck_observaciones_aula_horas" CHECK (hora_fin_programada > hora_inicio_programada)
);
CREATE INDEX IF NOT EXISTS "ix_observaciones_aula_docente" ON "observaciones_aula" ("docente_id", "fecha");
CREATE INDEX IF NOT EXISTS "ix_observaciones_aula_observador" ON "observaciones_aula" ("observador_usuario_id", "fecha");
CREATE INDEX IF NOT EXISTS "ix_observaciones_aula_periodo" ON "observaciones_aula" ("periodo_id");

-- Historial de reprogramaciones y cancelaciones (nada se elimina).
CREATE TABLE IF NOT EXISTS "observaciones_aula_cambios" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"observacion_id" uuid NOT NULL REFERENCES "observaciones_aula"("id"),
	"tipo" varchar(15) NOT NULL,
	"fecha_anterior" date,
	"hora_anterior" time(0),
	"fecha_nueva" date,
	"hora_nueva" time(0),
	"motivo" varchar(500) NOT NULL,
	"usuario_id" uuid NOT NULL REFERENCES "usuarios"("id"),
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "ck_observaciones_aula_cambios_tipo" CHECK ((tipo)::text = ANY ((ARRAY['reprogramacion'::character varying, 'cancelacion'::character varying])::text[]))
);
CREATE INDEX IF NOT EXISTS "ix_observaciones_aula_cambios_obs" ON "observaciones_aula_cambios" ("observacion_id");

-- Ficha de toma de notas: conductas observables por desempeño.
CREATE TABLE IF NOT EXISTS "observaciones_aula_notas" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"observacion_id" uuid NOT NULL REFERENCES "observaciones_aula"("id"),
	"desempeno" smallint NOT NULL,
	"aspecto" varchar(150),
	"texto" varchar(1000) NOT NULL,
	"hora_aproximada" time(0),
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"actualizado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "ck_observaciones_aula_notas_desempeno" CHECK (desempeno BETWEEN 1 AND 5)
);
CREATE INDEX IF NOT EXISTS "ix_observaciones_aula_notas_obs" ON "observaciones_aula_notas" ("observacion_id", "desempeno");

-- Calificación por desempeño, versionada (una fila por versión).
CREATE TABLE IF NOT EXISTS "observaciones_aula_calificaciones" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"observacion_id" uuid NOT NULL REFERENCES "observaciones_aula"("id"),
	"desempeno" smallint NOT NULL,
	"nivel" smallint NOT NULL,
	"fundamento" varchar(1000) NOT NULL,
	"version" smallint DEFAULT 1 NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL,
	"motivo_cambio" varchar(500),
	"creado_por_id" uuid NOT NULL REFERENCES "usuarios"("id"),
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "ck_observaciones_aula_calif_desempeno" CHECK (desempeno BETWEEN 1 AND 5),
	CONSTRAINT "ck_observaciones_aula_calif_nivel" CHECK (nivel BETWEEN 1 AND 4)
);
CREATE UNIQUE INDEX IF NOT EXISTS "ux_observaciones_aula_calif_vigente" ON "observaciones_aula_calificaciones" ("observacion_id", "desempeno") WHERE vigente = true;

-- Compromisos de mejora, versionados.
CREATE TABLE IF NOT EXISTS "observaciones_aula_compromisos" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"compromiso_id" uuid NOT NULL,
	"observacion_id" uuid NOT NULL REFERENCES "observaciones_aula"("id"),
	"desempeno" smallint NOT NULL,
	"descripcion" varchar(500) NOT NULL,
	"fecha_revision" date NOT NULL,
	"estado" varchar(15) DEFAULT 'pendiente' NOT NULL,
	"observacion_cierre" varchar(500),
	"cerrado_por_id" uuid REFERENCES "usuarios"("id"),
	"cerrado_en" timestamp(0),
	"version" smallint DEFAULT 1 NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL,
	"motivo_cambio" varchar(500),
	"creado_por_id" uuid NOT NULL REFERENCES "usuarios"("id"),
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "ck_observaciones_aula_comp_desempeno" CHECK (desempeno BETWEEN 1 AND 5),
	CONSTRAINT "ck_observaciones_aula_comp_estado" CHECK ((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'cumplido'::character varying, 'no_cumplido'::character varying])::text[]))
);
CREATE UNIQUE INDEX IF NOT EXISTS "ux_observaciones_aula_comp_vigente" ON "observaciones_aula_compromisos" ("compromiso_id") WHERE vigente = true;
CREATE INDEX IF NOT EXISTS "ix_observaciones_aula_comp_obs" ON "observaciones_aula_compromisos" ("observacion_id");

-- Comentario del docente (uno por observación) y archivos de sustento (no se borran).
CREATE TABLE IF NOT EXISTS "observaciones_aula_comentarios" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"observacion_id" uuid NOT NULL REFERENCES "observaciones_aula"("id"),
	"texto" varchar(1000) NOT NULL,
	"usuario_id" uuid NOT NULL REFERENCES "usuarios"("id"),
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "uq_observaciones_aula_comentarios_obs" UNIQUE ("observacion_id")
);
CREATE TABLE IF NOT EXISTS "observaciones_aula_archivos" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"observacion_id" uuid NOT NULL REFERENCES "observaciones_aula"("id"),
	"url" varchar(255) NOT NULL,
	"nombre_original" varchar(255),
	"retirado" boolean DEFAULT false NOT NULL,
	"subido_por_id" uuid NOT NULL REFERENCES "usuarios"("id"),
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "ix_observaciones_aula_archivos_obs" ON "observaciones_aula_archivos" ("observacion_id");
