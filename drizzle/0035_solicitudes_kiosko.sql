-- Solicitudes de aprobación de navegadores kiosko (idempotente).
CREATE TABLE IF NOT EXISTS "solicitudes_kiosko" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"secreto_hash" varchar(64) NOT NULL,
	"estado" smallint DEFAULT 1 NOT NULL,
	"equipo_id" uuid,
	"solicitado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"ultima_consulta_en" timestamp with time zone DEFAULT now() NOT NULL,
	"resuelto_en" timestamp with time zone,
	"resuelto_por" uuid,
	CONSTRAINT "uq_solicitudes_kiosko_secreto" UNIQUE ("secreto_hash"),
	CONSTRAINT "uq_solicitudes_kiosko_codigo" UNIQUE ("codigo"),
	CONSTRAINT "fk_solicitudes_kiosko_equipo" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos_autorizados"("id"),
	CONSTRAINT "fk_solicitudes_kiosko_resuelto_por" FOREIGN KEY ("resuelto_por") REFERENCES "public"."usuarios"("id"),
	CONSTRAINT "ck_solicitudes_kiosko_estado" CHECK ("estado" IN (1, 2, 3))
);
