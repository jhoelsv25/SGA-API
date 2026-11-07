ALTER TABLE "personas" ADD COLUMN "codigo_biometrico" varchar(20);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ux_personas_codigo_biometrico" ON "personas" USING btree ("codigo_biometrico" text_ops) WHERE ((codigo_biometrico IS NOT NULL) AND (eliminado_en IS NULL));--> statement-breakpoint
ALTER TABLE "equipos_autorizados" ADD COLUMN "ultimo_latido_en" timestamp(0);--> statement-breakpoint
ALTER TABLE "equipos_autorizados" ADD COLUMN "reloj_respondio_en" timestamp(0);--> statement-breakpoint
ALTER TABLE "equipos_autorizados" ADD COLUMN "ultimo_desfase_min" integer;--> statement-breakpoint
ALTER TABLE "marcaciones" ADD COLUMN "equipo_id" uuid;--> statement-breakpoint
ALTER TABLE "marcaciones" ADD CONSTRAINT "fk_marcaciones_equipo" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos_autorizados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marcaciones" DROP CONSTRAINT "ck_marcaciones_origen";--> statement-breakpoint
ALTER TABLE "marcaciones" ADD CONSTRAINT "ck_marcaciones_origen" CHECK ((origen)::text = ANY ((ARRAY['kiosko'::character varying, 'intranet'::character varying, 'manual'::character varying, 'biometrico'::character varying])::text[]));--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ux_marcaciones_biometrico_persona_hora" ON "marcaciones" USING btree ("persona_id" uuid_ops,"fecha_hora" timestamp_ops) WHERE ((origen)::text = 'biometrico'::text);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marcaciones_biometrico_pendientes" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"equipo_id" uuid NOT NULL,
	"codigo_biometrico" varchar(20) NOT NULL,
	"fecha_hora" timestamp(0) NOT NULL,
	"motivo" varchar(30) NOT NULL,
	"estado" varchar(15) DEFAULT 'pendiente' NOT NULL,
	"persona_id" uuid,
	"marcacion_id" uuid,
	"motivo_descarte" varchar(500),
	"resuelta_por_id" uuid,
	"resuelta_en" timestamp(0),
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "fk_pendientes_biometrico_equipo" FOREIGN KEY ("equipo_id") REFERENCES "equipos_autorizados"("id"),
	CONSTRAINT "fk_pendientes_biometrico_persona" FOREIGN KEY ("persona_id") REFERENCES "personas"("id"),
	CONSTRAINT "fk_pendientes_biometrico_marcacion" FOREIGN KEY ("marcacion_id") REFERENCES "marcaciones"("id"),
	CONSTRAINT "fk_pendientes_biometrico_resuelta_por" FOREIGN KEY ("resuelta_por_id") REFERENCES "usuarios"("id"),
	CONSTRAINT "ck_pendientes_biometrico_motivo" CHECK ((motivo)::text = ANY ((ARRAY['codigo_desconocido'::character varying, 'no_docente'::character varying, 'sin_turno'::character varying])::text[])),
	CONSTRAINT "ck_pendientes_biometrico_estado" CHECK ((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'asignada'::character varying, 'descartada'::character varying])::text[])),
	CONSTRAINT "ck_pendientes_biometrico_descarte" CHECK (((estado)::text <> 'descartada'::text) OR (motivo_descarte IS NOT NULL))
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ux_pendientes_biometrico_equipo_codigo_hora" ON "marcaciones_biometrico_pendientes" USING btree ("equipo_id" uuid_ops,"codigo_biometrico" text_ops,"fecha_hora" timestamp_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_pendientes_biometrico_estado" ON "marcaciones_biometrico_pendientes" USING btree ("estado" text_ops,"fecha_hora" timestamp_ops);
