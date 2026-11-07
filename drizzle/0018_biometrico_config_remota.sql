ALTER TABLE "equipos_autorizados" ADD COLUMN "reloj_ip" varchar(255);--> statement-breakpoint
ALTER TABLE "equipos_autorizados" ADD COLUMN "reloj_puerto" integer DEFAULT 4370 NOT NULL;--> statement-breakpoint
ALTER TABLE "equipos_autorizados" ADD COLUMN "reloj_clave_comunicacion" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "equipos_autorizados" ADD COLUMN "intervalo_segundos" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "puente_ordenes" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"equipo_id" uuid NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"estado" varchar(15) DEFAULT 'pendiente' NOT NULL,
	"mensaje" varchar(1000),
	"datos" jsonb,
	"solicitada_por_id" uuid,
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"resuelta_en" timestamp(0),
	CONSTRAINT "fk_puente_ordenes_equipo" FOREIGN KEY ("equipo_id") REFERENCES "equipos_autorizados"("id"),
	CONSTRAINT "fk_puente_ordenes_solicitante" FOREIGN KEY ("solicitada_por_id") REFERENCES "usuarios"("id"),
	CONSTRAINT "ck_puente_ordenes_tipo" CHECK ((tipo)::text = ANY ((ARRAY['probar_reloj'::character varying, 'leer_reloj'::character varying, 'sincronizar'::character varying])::text[])),
	CONSTRAINT "ck_puente_ordenes_estado" CHECK ((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'completada'::character varying, 'error'::character varying])::text[]))
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_puente_ordenes_equipo_estado" ON "puente_ordenes" USING btree ("equipo_id" uuid_ops,"estado" text_ops);
