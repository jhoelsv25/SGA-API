ALTER TABLE "tareas" DROP CONSTRAINT IF EXISTS "ck_tareas_tipo";--> statement-breakpoint
ALTER TABLE "tareas" ADD CONSTRAINT "ck_tareas_tipo" CHECK ((tipo)::text = ANY ((ARRAY['trabajo'::character varying, 'entregable'::character varying, 'cuestionario'::character varying, 'proyecto'::character varying, 'examen'::character varying])::text[]));--> statement-breakpoint
ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "limite_tiempo_minutos" integer;--> statement-breakpoint
ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "calculo_nota_intentos" varchar(20) DEFAULT 'mas_alta' NOT NULL;--> statement-breakpoint
ALTER TABLE "tareas" ADD CONSTRAINT "ck_tareas_calculo_intentos" CHECK ((calculo_nota_intentos)::text = ANY ((ARRAY['mas_alta'::character varying, 'ultima'::character varying, 'promedio'::character varying])::text[]));--> statement-breakpoint
ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "revelar_respuestas" varchar(30) DEFAULT 'al_terminar_intentos' NOT NULL;--> statement-breakpoint
ALTER TABLE "tareas" ADD CONSTRAINT "ck_tareas_revelar_respuestas" CHECK ((revelar_respuestas)::text = ANY ((ARRAY['al_terminar_intentos'::character varying, 'despues_fecha_limite'::character varying, 'inmediato'::character varying, 'nunca'::character varying])::text[]));--> statement-breakpoint
ALTER TABLE "tareas" ADD COLUMN IF NOT EXISTS "periodo_id" uuid;--> statement-breakpoint
ALTER TABLE "tareas" ADD CONSTRAINT "fk_tareas_periodo" FOREIGN KEY ("periodo_id") REFERENCES "public"."periodos_academicos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entregas_tarea" ALTER COLUMN "entregada_en" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "entregas_tarea" ADD COLUMN IF NOT EXISTS "iniciado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE "entregas_tarea" ADD COLUMN IF NOT EXISTS "archivo_nombre" varchar(255);--> statement-breakpoint
ALTER TABLE "entregas_tarea" ADD COLUMN IF NOT EXISTS "archivo_tamano_bytes" integer;--> statement-breakpoint
ALTER TABLE "entregas_tarea" DROP CONSTRAINT IF EXISTS "ck_entregas_tarea_estado";--> statement-breakpoint
ALTER TABLE "entregas_tarea" ADD CONSTRAINT "ck_entregas_tarea_estado" CHECK ((estado)::text = ANY ((ARRAY['en_progreso'::character varying, 'borrador'::character varying, 'entregada'::character varying, 'calificada'::character varying, 'devuelta'::character varying])::text[]));--> statement-breakpoint
ALTER TABLE "entregas_tarea" DROP CONSTRAINT IF EXISTS "ck_entregas_tarea_contenido";--> statement-breakpoint
ALTER TABLE "entregas_tarea" ADD CONSTRAINT "ck_entregas_tarea_contenido" CHECK (((estado)::text = 'en_progreso'::text) OR ((estado)::text = 'borrador'::text) OR (texto IS NOT NULL) OR (archivo_url IS NOT NULL) OR (enlace_url IS NOT NULL) OR (respuestas IS NOT NULL));
