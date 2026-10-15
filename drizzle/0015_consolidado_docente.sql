ALTER TABLE "consolidados_docente" DROP CONSTRAINT IF EXISTS "uq_consolidados_docente";--> statement-breakpoint
ALTER TABLE "consolidados_docente" DROP CONSTRAINT IF EXISTS "ck_consolidados_docente_decision";--> statement-breakpoint
ALTER TABLE "consolidados_docente" DROP CONSTRAINT IF EXISTS "ck_consolidados_docente_sesiones";--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD COLUMN IF NOT EXISTS "estado" varchar(20) DEFAULT 'cerrado' NOT NULL;--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD COLUMN IF NOT EXISTS "vigente" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD COLUMN IF NOT EXISTS "motivo_cambio" varchar(1000);--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD COLUMN IF NOT EXISTS "sesiones_parciales" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD COLUMN IF NOT EXISTS "sesiones_no_cumplidas" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD COLUMN IF NOT EXISTS "sesiones_justificadas" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD COLUMN IF NOT EXISTS "minutos_perdidos_firma" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD COLUMN IF NOT EXISTS "minutos_total_fuera" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_consolidados_docente_vigente" ON "consolidados_docente" ("docente_id", "periodo_id") WHERE vigente = true;--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD CONSTRAINT "ck_consolidados_docente_decision" CHECK ((decision)::text = ANY ((ARRAY['ninguna'::character varying, 'llamada_atencion'::character varying, 'compromiso_mejora'::character varying, 'descuento'::character varying, 'derivado'::character varying])::text[]));--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD CONSTRAINT "ck_consolidados_docente_sesiones" CHECK (sesiones_programadas >= 0 AND sesiones_cumplidas >= 0);--> statement-breakpoint
ALTER TABLE "consolidados_docente" ADD CONSTRAINT "ck_consolidados_docente_estado" CHECK ((estado)::text = ANY ((ARRAY['cerrado'::character varying, 'reabierto'::character varying])::text[]));--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "solicitudes_revision_consolidado" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    "consolidado_id" uuid NOT NULL REFERENCES "consolidados_docente"("id") ON DELETE CASCADE,
    "docente_id" uuid NOT NULL REFERENCES "docentes"("id"),
    "estado" varchar(20) DEFAULT 'solicitada' NOT NULL,
    "motivo" varchar(1000) NOT NULL,
    "adjunto_url" varchar(500),
    "solicitado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "resuelto_por_id" uuid REFERENCES "usuarios"("id"),
    "resuelto_en" timestamp(0),
    "respuesta" varchar(1000),
    CONSTRAINT "ck_solicitudes_revision_estado" CHECK ((estado)::text = ANY ((ARRAY['solicitada'::character varying, 'aceptada'::character varying, 'rechazada'::character varying])::text[]))
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_solicitud_revision_pendiente" ON "solicitudes_revision_consolidado" ("consolidado_id") WHERE estado = 'solicitada';
