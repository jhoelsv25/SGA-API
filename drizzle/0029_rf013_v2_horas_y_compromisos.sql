-- RF-013 V2: horas pedagógicas del consolidado, decisión registrada y compromisos de mejora.
-- Los consolidados anteriores quedan con las horas en NULL (no se pueden reconstruir sin regenerarlos). Idempotente.
ALTER TABLE "consolidados_docente" ADD COLUMN IF NOT EXISTS "minutos_programados" integer;
ALTER TABLE "consolidados_docente" ADD COLUMN IF NOT EXISTS "minutos_dictados" integer;
ALTER TABLE "consolidados_docente" ADD COLUMN IF NOT EXISTS "minutos_hora_pedagogica" smallint;
ALTER TABLE "consolidados_docente" ADD COLUMN IF NOT EXISTS "decision_registrada_en" timestamp(0);
-- Una decisión distinta de «ninguna» ya fue registrada por el Director; «ninguna» no se puede distinguir de «sin decidir».
UPDATE "consolidados_docente" SET "decision_registrada_en" = "generado_en"
WHERE "decision" <> 'ninguna' AND "decision_registrada_en" IS NULL;

CREATE TABLE IF NOT EXISTS "compromisos_consolidado" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"compromiso_id" uuid NOT NULL,
	"consolidado_id" uuid NOT NULL REFERENCES "consolidados_docente"("id"),
	"docente_id" uuid NOT NULL REFERENCES "docentes"("id"),
	"version" smallint DEFAULT 1 NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL,
	"descripcion" varchar(500) NOT NULL,
	"fecha_revision" date NOT NULL,
	"estado" varchar(15) DEFAULT 'pendiente' NOT NULL,
	"observacion_cierre" varchar(500),
	"cerrado_por_id" uuid REFERENCES "usuarios"("id"),
	"cerrado_en" timestamp(0),
	"enterado_en" timestamp(0),
	"anulado" boolean DEFAULT false NOT NULL,
	"motivo_anulacion" varchar(500),
	"anulado_por_id" uuid REFERENCES "usuarios"("id"),
	"anulado_en" timestamp(0),
	"creado_por_id" uuid NOT NULL REFERENCES "usuarios"("id"),
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "ck_compromisos_consolidado_estado" CHECK ((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'cumplido'::character varying, 'no_cumplido'::character varying])::text[]))
);
CREATE UNIQUE INDEX IF NOT EXISTS "ux_compromisos_consolidado_vigente" ON "compromisos_consolidado" ("compromiso_id") WHERE vigente = true;
CREATE INDEX IF NOT EXISTS "ix_compromisos_consolidado_consolidado" ON "compromisos_consolidado" ("consolidado_id");
CREATE INDEX IF NOT EXISTS "ix_compromisos_consolidado_docente" ON "compromisos_consolidado" ("docente_id");
