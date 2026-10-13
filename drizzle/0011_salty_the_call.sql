ALTER TABLE "evidencias_ausencia" DROP CONSTRAINT "uq_evidencias_ausencia_orden";--> statement-breakpoint
ALTER TABLE "ausencias_sesion" ADD COLUMN "ausencia_raiz_id" uuid;--> statement-breakpoint
ALTER TABLE "ausencias_sesion" ADD COLUMN "version" smallint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "ausencias_sesion" ADD COLUMN "vigente" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "ausencias_sesion" ADD COLUMN "motivo_cambio" varchar(500);--> statement-breakpoint
ALTER TABLE "ausencias_sesion" ADD COLUMN "anulada" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ausencias_sesion" ADD COLUMN "anulada_por_id" uuid;--> statement-breakpoint
ALTER TABLE "ausencias_sesion" ADD COLUMN "anulada_en" timestamp(0);--> statement-breakpoint
ALTER TABLE "ausencias_sesion" ADD COLUMN "motivo_anulacion" varchar(500);--> statement-breakpoint
ALTER TABLE "evidencias_ausencia" ADD COLUMN "vigente" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "ausencias_sesion" ADD CONSTRAINT "fk_ausencias_sesion_anulada_por" FOREIGN KEY ("anulada_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_ausencias_sesion_raiz" ON "ausencias_sesion" USING btree ("ausencia_raiz_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "ix_ausencias_sesion_sesion_vigente" ON "ausencias_sesion" USING btree ("sesion_clase_id","vigente");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_evidencias_ausencia_orden" ON "evidencias_ausencia" USING btree ("ausencia_id","orden") WHERE vigente = true;--> statement-breakpoint
ALTER TABLE "ausencias_sesion" ADD CONSTRAINT "ck_ausencias_anulada" CHECK ((NOT anulada) OR (motivo_anulacion IS NOT NULL AND anulada_por_id IS NOT NULL AND anulada_en IS NOT NULL));--> statement-breakpoint
ALTER TABLE "ausencias_sesion" ADD CONSTRAINT "ck_ausencias_version" CHECK (version >= 1);--> statement-breakpoint
ALTER TABLE "ausencias_sesion" ADD CONSTRAINT "ck_ausencias_cambio" CHECK (version = 1 OR motivo_cambio IS NOT NULL);