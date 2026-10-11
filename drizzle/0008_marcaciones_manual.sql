ALTER TABLE "marcaciones" ADD COLUMN "observacion" varchar(500);--> statement-breakpoint
ALTER TABLE "marcaciones" ADD COLUMN "registrada_por_id" uuid;--> statement-breakpoint
ALTER TABLE "marcaciones" ADD CONSTRAINT "fk_marcaciones_registrada_por" FOREIGN KEY ("registrada_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marcaciones" ADD CONSTRAINT "ck_marcaciones_manual" CHECK (((origen)::text <> 'manual'::text) OR ((observacion IS NOT NULL) AND (registrada_por_id IS NOT NULL)));