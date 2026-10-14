ALTER TABLE "consolidados_docente" DROP CONSTRAINT "uq_consolidados_docente";--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD COLUMN "consolidado_raiz_id" uuid;--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD COLUMN "estado" varchar(20) DEFAULT 'cerrado' NOT NULL;--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD COLUMN "version" smallint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD COLUMN "vigente" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD COLUMN "motivo_cambio" varchar(500);--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD COLUMN "sesiones_parciales" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD COLUMN "sesiones_no_cumplidas" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD COLUMN "sesiones_justificadas" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD COLUMN "minutos_perdidos_firma" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD COLUMN "reabierto_por_id" uuid;--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD COLUMN "reabierto_en" timestamp(0);--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD CONSTRAINT "fk_consolidados_docente_raiz" FOREIGN KEY ("consolidado_raiz_id") REFERENCES "public"."consolidados_docente"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD CONSTRAINT "fk_consolidados_docente_reabierto_por" FOREIGN KEY ("reabierto_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_consolidados_docente_raiz" ON "consolidados_docente" USING btree ("consolidado_raiz_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "ix_consolidados_docente_docente_vigente" ON "consolidados_docente" USING btree ("docente_id","vigente");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_consolidados_docente_vigente" ON "consolidados_docente" USING btree ("docente_id","periodo_id") WHERE vigente = true;--> statement-breakpoint
UPDATE "consolidados_docente" SET "decision" = 'ninguna' WHERE "decision" = 'descuento';--> statement-breakpoint
ALTER TABLE "consolidados_docente" DROP CONSTRAINT "ck_consolidados_docente_decision";--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD CONSTRAINT "ck_consolidados_docente_decision" CHECK ((decision)::text = ANY ((ARRAY['ninguna'::character varying, 'llamada_atencion'::character varying, 'compromiso_mejora'::character varying, 'derivado'::character varying])::text[]));--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD CONSTRAINT "ck_consolidados_docente_estado" CHECK ((estado)::text = ANY ((ARRAY['cerrado'::character varying, 'reabierto'::character varying])::text[]));--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD CONSTRAINT "ck_consolidados_docente_version" CHECK (version >= 1);--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD CONSTRAINT "ck_consolidados_docente_cambio" CHECK (version = 1 OR motivo_cambio IS NOT NULL);--> statement-breakpoint
CREATE TABLE "solicitudes_revision_consolidado" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consolidado_id" uuid NOT NULL,
	"docente_id" uuid NOT NULL,
	"motivo" varchar(1000) NOT NULL,
	"adjunto_ruta" varchar(500),
	"adjunto_nombre" varchar(255),
	"estado" varchar(20) DEFAULT 'solicitada' NOT NULL,
	"respuesta" varchar(1000),
	"resuelta_por_id" uuid,
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"resuelta_en" timestamp(0)
);--> statement-breakpoint
ALTER TABLE "solicitudes_revision_consolidado" ADD CONSTRAINT "fk_solicitudes_revision_consolidado_consolidado" FOREIGN KEY ("consolidado_id") REFERENCES "public"."consolidados_docente"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_revision_consolidado" ADD CONSTRAINT "fk_solicitudes_revision_consolidado_docente" FOREIGN KEY ("docente_id") REFERENCES "public"."docentes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_revision_consolidado" ADD CONSTRAINT "fk_solicitudes_revision_consolidado_resuelta_por" FOREIGN KEY ("resuelta_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_solicitudes_revision_consolidado_consolidado" ON "solicitudes_revision_consolidado" USING btree ("consolidado_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "ix_solicitudes_revision_consolidado_docente" ON "solicitudes_revision_consolidado" USING btree ("docente_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_solicitudes_revision_consolidado_abierta" ON "solicitudes_revision_consolidado" USING btree ("consolidado_id") WHERE (estado = 'solicitada');--> statement-breakpoint
ALTER TABLE "solicitudes_revision_consolidado" ADD CONSTRAINT "ck_solicitudes_revision_consolidado_estado" CHECK ((estado)::text = ANY ((ARRAY['solicitada'::character varying, 'aceptada'::character varying, 'rechazada'::character varying])::text[]));--> statement-breakpoint
ALTER TABLE "solicitudes_revision_consolidado" ADD CONSTRAINT "ck_solicitudes_revision_consolidado_resolucion" CHECK (((estado)::text = 'solicitada'::text) OR (resuelta_por_id IS NOT NULL AND resuelta_en IS NOT NULL AND ((estado)::text <> 'rechazada'::text OR respuesta IS NOT NULL)));
