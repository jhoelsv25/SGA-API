CREATE TABLE IF NOT EXISTS "indicadores_pretest" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"indicador" varchar(10) NOT NULL,
	"periodo_descrito" varchar(120) NOT NULL,
	"fecha_inicio" date NOT NULL,
	"fecha_fin" date NOT NULL,
	"numerador" integer NOT NULL,
	"denominador" integer NOT NULL,
	"porcentaje" numeric(5, 2) NOT NULL,
	"fuente" varchar(500) NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL,
	"registrado_por_id" uuid,
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "fk_indicadores_pretest_registrado_por" FOREIGN KEY ("registrado_por_id") REFERENCES "usuarios"("id"),
	CONSTRAINT "ck_indicadores_pretest_fechas" CHECK (fecha_fin >= fecha_inicio),
	CONSTRAINT "ck_indicadores_pretest_numerador" CHECK (numerador >= 0),
	CONSTRAINT "ck_indicadores_pretest_denominador" CHECK (denominador > 0),
	CONSTRAINT "ck_indicadores_pretest_num_den" CHECK (numerador <= denominador),
	CONSTRAINT "ck_indicadores_pretest_fuente" CHECK (length(btrim(fuente::text)) > 0),
	CONSTRAINT "ck_indicadores_pretest_indicador" CHECK ((indicador)::text = ANY ((ARRAY['CSP'::character varying, 'ISA'::character varying, 'IGM'::character varying])::text[]))
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_indicadores_pretest_vigente" ON "indicadores_pretest" ("indicador") WHERE vigente = true;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mediciones_bimestre" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"periodo_id" uuid NOT NULL,
	"version" smallint DEFAULT 1 NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL,
	"motivo_cambio" varchar(500),
	"cerrada_por_id" uuid,
	"cerrada_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "fk_mediciones_bimestre_periodo" FOREIGN KEY ("periodo_id") REFERENCES "periodos_academicos"("id"),
	CONSTRAINT "fk_mediciones_bimestre_cerrada_por" FOREIGN KEY ("cerrada_por_id") REFERENCES "usuarios"("id"),
	CONSTRAINT "ck_mediciones_bimestre_version" CHECK (version >= 1),
	CONSTRAINT "ck_mediciones_bimestre_motivo" CHECK (version = 1 OR motivo_cambio IS NOT NULL)
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_mediciones_bimestre_vigente" ON "mediciones_bimestre" ("periodo_id") WHERE vigente = true;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mediciones_bimestre_indicadores" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"medicion_id" uuid NOT NULL,
	"indicador" varchar(10) NOT NULL,
	"numerador" integer NOT NULL,
	"denominador" integer NOT NULL,
	"porcentaje" numeric(5, 2) NOT NULL,
	"desglose" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "uq_mediciones_bimestre_ind" UNIQUE ("medicion_id", "indicador"),
	CONSTRAINT "fk_mediciones_bimestre_ind_medicion" FOREIGN KEY ("medicion_id") REFERENCES "mediciones_bimestre"("id") ON DELETE CASCADE,
	CONSTRAINT "ck_mediciones_bimestre_ind_tipo" CHECK ((indicador)::text = ANY ((ARRAY['CSP'::character varying, 'ISA'::character varying, 'IGM'::character varying])::text[])),
	CONSTRAINT "ck_mediciones_bimestre_ind_num" CHECK (numerador >= 0),
	CONSTRAINT "ck_mediciones_bimestre_ind_den" CHECK (denominador >= 0)
);
