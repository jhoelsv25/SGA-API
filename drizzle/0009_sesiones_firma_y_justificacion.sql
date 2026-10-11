ALTER TABLE "sesiones_clase" ADD COLUMN "hora_inicio_plan" time(0);--> statement-breakpoint
ALTER TABLE "sesiones_clase" ADD COLUMN "hora_fin_plan" time(0);--> statement-breakpoint
ALTER TABLE "sesiones_clase" ADD COLUMN "minutos_retraso" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sesiones_clase" ADD COLUMN "salida_automatica" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sesiones_clase" ADD COLUMN "equipo_ingreso_id" uuid;--> statement-breakpoint
ALTER TABLE "sesiones_clase" ADD COLUMN "equipo_salida_id" uuid;--> statement-breakpoint
ALTER TABLE "sesiones_clase" ADD COLUMN "docente_titular_id" uuid;--> statement-breakpoint
ALTER TABLE "sesiones_clase" ADD COLUMN "justificacion_estado" varchar(15);--> statement-breakpoint
ALTER TABLE "sesiones_clase" ADD COLUMN "justificacion_documento_url" varchar(255);--> statement-breakpoint
ALTER TABLE "sesiones_clase" ADD COLUMN "justificacion_solicitada_en" timestamp(0);--> statement-breakpoint
ALTER TABLE "sesiones_clase" ADD COLUMN "justificacion_revisada_por_id" uuid;--> statement-breakpoint
ALTER TABLE "sesiones_clase" ADD COLUMN "justificacion_revisada_en" timestamp(0);--> statement-breakpoint
ALTER TABLE "sesiones_clase" ADD COLUMN "justificacion_comentario" varchar(500);--> statement-breakpoint
ALTER TABLE "sesiones_clase" ADD CONSTRAINT "fk_sesiones_clase_equipo_ingreso" FOREIGN KEY ("equipo_ingreso_id") REFERENCES "public"."equipos_autorizados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones_clase" ADD CONSTRAINT "fk_sesiones_clase_equipo_salida" FOREIGN KEY ("equipo_salida_id") REFERENCES "public"."equipos_autorizados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones_clase" ADD CONSTRAINT "fk_sesiones_clase_docente_titular" FOREIGN KEY ("docente_titular_id") REFERENCES "public"."docentes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones_clase" ADD CONSTRAINT "fk_sesiones_clase_justificacion_revisada_por" FOREIGN KEY ("justificacion_revisada_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones_clase" ADD CONSTRAINT "ck_sesiones_clase_justificacion_estado" CHECK ((justificacion_estado IS NULL) OR ((justificacion_estado)::text = ANY ((ARRAY['solicitada'::character varying, 'aprobada'::character varying, 'rechazada'::character varying])::text[])));--> statement-breakpoint
ALTER TABLE "sesiones_clase" ADD CONSTRAINT "ck_sesiones_clase_retraso" CHECK (minutos_retraso >= 0);