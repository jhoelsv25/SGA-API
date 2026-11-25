-- Repara la migración 0012_interaccion_y_actividad que no estaba registrada en _journal.json.
-- Agrega columnas de moderación/vigencia en publicaciones_aula, comentarios_publicacion, mensajes_chat,
-- crea chat_lecturas y actualiza ck_actividad_aula_accion de forma idempotente.

ALTER TABLE "publicaciones_aula" ADD COLUMN IF NOT EXISTS "vigente" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "publicaciones_aula" ADD COLUMN IF NOT EXISTS "ocultado_por_id" uuid;--> statement-breakpoint
ALTER TABLE "publicaciones_aula" ADD COLUMN IF NOT EXISTS "ocultado_en" timestamp(0);--> statement-breakpoint
ALTER TABLE "publicaciones_aula" ADD COLUMN IF NOT EXISTS "motivo_ocultamiento" varchar(255);--> statement-breakpoint
ALTER TABLE "publicaciones_aula" DROP CONSTRAINT IF EXISTS "fk_publicaciones_aula_ocultado_por";--> statement-breakpoint
ALTER TABLE "publicaciones_aula" ADD CONSTRAINT "fk_publicaciones_aula_ocultado_por" FOREIGN KEY ("ocultado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "comentarios_publicacion" ADD COLUMN IF NOT EXISTS "actualizado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE "comentarios_publicacion" ADD COLUMN IF NOT EXISTS "vigente" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "comentarios_publicacion" ADD COLUMN IF NOT EXISTS "ocultado_por_id" uuid;--> statement-breakpoint
ALTER TABLE "comentarios_publicacion" ADD COLUMN IF NOT EXISTS "ocultado_en" timestamp(0);--> statement-breakpoint
ALTER TABLE "comentarios_publicacion" ADD COLUMN IF NOT EXISTS "motivo_ocultamiento" varchar(255);--> statement-breakpoint
ALTER TABLE "comentarios_publicacion" DROP CONSTRAINT IF EXISTS "fk_comentarios_publicacion_ocultado_por";--> statement-breakpoint
ALTER TABLE "comentarios_publicacion" ADD CONSTRAINT "fk_comentarios_publicacion_ocultado_por" FOREIGN KEY ("ocultado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "mensajes_chat" ADD COLUMN IF NOT EXISTS "actualizado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE "mensajes_chat" ADD COLUMN IF NOT EXISTS "vigente" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "mensajes_chat" ADD COLUMN IF NOT EXISTS "ocultado_por_id" uuid;--> statement-breakpoint
ALTER TABLE "mensajes_chat" ADD COLUMN IF NOT EXISTS "ocultado_en" timestamp(0);--> statement-breakpoint
ALTER TABLE "mensajes_chat" ADD COLUMN IF NOT EXISTS "motivo_ocultamiento" varchar(255);--> statement-breakpoint
ALTER TABLE "mensajes_chat" DROP CONSTRAINT IF EXISTS "fk_mensajes_chat_ocultado_por";--> statement-breakpoint
ALTER TABLE "mensajes_chat" ADD CONSTRAINT "fk_mensajes_chat_ocultado_por" FOREIGN KEY ("ocultado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "chat_lecturas" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "curso_seccion_id" uuid NOT NULL,
    "usuario_id" uuid NOT NULL,
    "ultimo_leido_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "uq_chat_lecturas_curso_usuario" UNIQUE ("curso_seccion_id", "usuario_id"),
    CONSTRAINT "fk_chat_lecturas_curso_seccion" FOREIGN KEY ("curso_seccion_id") REFERENCES "public"."cursos_seccion"("id") ON DELETE cascade ON UPDATE no action,
    CONSTRAINT "fk_chat_lecturas_usuario" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_chat_lecturas_curso_usuario" ON "chat_lecturas" ("curso_seccion_id", "usuario_id");--> statement-breakpoint

ALTER TABLE "actividad_aula" DROP CONSTRAINT IF EXISTS "ck_actividad_aula_accion";--> statement-breakpoint
ALTER TABLE "actividad_aula" ADD CONSTRAINT "ck_actividad_aula_accion" CHECK ((accion)::text = ANY ((ARRAY['visualizo'::character varying, 'descargo'::character varying, 'abrio'::character varying, 'completo'::character varying])::text[]));
