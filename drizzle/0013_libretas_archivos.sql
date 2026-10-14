ALTER TABLE "libretas" ADD COLUMN IF NOT EXISTS "visto_por_id" uuid;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "libretas" ADD CONSTRAINT "fk_libretas_visto_por" FOREIGN KEY ("visto_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "libreta_archivos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "libreta_id" uuid NOT NULL,
  "nombre_original" varchar(255) NOT NULL,
  "archivo_url" varchar(500) NOT NULL,
  "tamano_bytes" integer NOT NULL,
  "asignacion" varchar(20) NOT NULL,
  "vigente" boolean DEFAULT true NOT NULL,
  "motivo" varchar(500),
  "subido_por_id" uuid NOT NULL,
  "subido_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "fk_libreta_archivos_libreta" FOREIGN KEY ("libreta_id") REFERENCES "public"."libretas"("id") ON DELETE cascade,
  CONSTRAINT "fk_libreta_archivos_subido_por" FOREIGN KEY ("subido_por_id") REFERENCES "public"."usuarios"("id"),
  CONSTRAINT "ck_libreta_archivos_asignacion" CHECK ((asignacion)::text = ANY ((ARRAY['automatica'::character varying, 'manual'::character varying])::text[])),
  CONSTRAINT "ck_libreta_archivos_tamano" CHECK (tamano_bytes > 0)
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_libreta_archivos_libreta" ON "libreta_archivos" USING btree ("libreta_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ux_libreta_archivos_vigente" ON "libreta_archivos" USING btree ("libreta_id") WHERE vigente;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "libreta_alcances" (
  "rol_id" uuid PRIMARY KEY NOT NULL,
  "alcance" varchar(20) NOT NULL,
  "actualizado_por_id" uuid,
  "actualizado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "fk_libreta_alcances_rol" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE cascade,
  CONSTRAINT "fk_libreta_alcances_actualizado_por" FOREIGN KEY ("actualizado_por_id") REFERENCES "public"."usuarios"("id"),
  CONSTRAINT "ck_libreta_alcances_alcance" CHECK ((alcance)::text = ANY ((ARRAY['tutoria'::character varying, 'mis_secciones'::character varying, 'colegio'::character varying])::text[]))
);--> statement-breakpoint
INSERT INTO "libreta_alcances" ("rol_id", "alcance")
SELECT r.id,
       CASE WHEN r.nombre = 'Docente' THEN 'mis_secciones' ELSE 'colegio' END
FROM "roles" r
WHERE r.nombre IN ('Administrador', 'Director', 'Subdirector', 'Secretaria', 'Docente')
ON CONFLICT ("rol_id") DO NOTHING;
