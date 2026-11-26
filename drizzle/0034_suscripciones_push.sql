-- La tabla estaba en schema/tables.ts pero ninguna migración la creaba (idempotente).
CREATE TABLE IF NOT EXISTS "suscripciones_push" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"dispositivo" varchar(150),
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"actualizado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "fk_suscripciones_push_usuario" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ux_suscripciones_push_endpoint" ON "suscripciones_push" ("endpoint");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_suscripciones_push_usuario" ON "suscripciones_push" ("usuario_id");
