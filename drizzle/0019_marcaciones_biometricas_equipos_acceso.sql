-- Marcaciones crudas del reloj biométrico (las inserta SGA-NET; SGA-API las procesa), equipos de acceso a SGA-NET,
-- permisos finos de menú y origen "biometrico" en marcaciones. Idempotente: SGA-NET pudo haber creado antes parte de esto.
CREATE TABLE IF NOT EXISTS "marcaciones_biometricas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reloj_serie" varchar(100) NOT NULL,
	"codigo_usuario" varchar(50) NOT NULL,
	"fecha_hora" timestamp(0) NOT NULL,
	"tipo_reloj" varchar(20),
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"motivo_rechazo" varchar(255),
	"marcacion_id" uuid,
	"recibida_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"procesada_en" timestamp(0),
	CONSTRAINT "fk_marcaciones_biometricas_marcacion" FOREIGN KEY ("marcacion_id") REFERENCES "marcaciones"("id"),
	CONSTRAINT "ck_marcaciones_biometricas_estado" CHECK ((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'procesada'::character varying, 'rechazada'::character varying])::text[]))
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ux_marcaciones_biometricas_marca" ON "marcaciones_biometricas" ("reloj_serie","codigo_usuario","fecha_hora");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_marcaciones_biometricas_pendientes" ON "marcaciones_biometricas" ("fecha_hora") WHERE estado = 'pendiente';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "equipos_acceso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"equipo_hash" varchar(128) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"plataforma" smallint NOT NULL,
	"estado" smallint DEFAULT 1 NOT NULL,
	"solicitado_en" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"resuelto_en" timestamp(6) with time zone,
	"resuelto_por" uuid,
	"motivo" varchar(255),
	"ultimo_acceso" timestamp(6) with time zone,
	"vigente_hasta" timestamp(6) with time zone,
	"ip" varchar(45),
	"actualizado_en" timestamp(6) with time zone,
	CONSTRAINT "fk_equipos_acceso_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id"),
	CONSTRAINT "fk_equipos_acceso_resuelto" FOREIGN KEY ("resuelto_por") REFERENCES "usuarios"("id"),
	CONSTRAINT "ck_equipos_acceso_plataforma" CHECK (plataforma IN (0, 1, 2, 3)),
	CONSTRAINT "ck_equipos_acceso_estado" CHECK (estado IN (1, 2, 3, 4))
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ux_equipos_acceso_usuario_hash" ON "equipos_acceso" ("usuario_id","equipo_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_equipos_acceso_estado" ON "equipos_acceso" ("estado","solicitado_en");--> statement-breakpoint
ALTER TABLE "rol_menus" ADD COLUMN IF NOT EXISTS "puede_crear" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rol_menus" ADD COLUMN IF NOT EXISTS "puede_editar" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rol_menus" ADD COLUMN IF NOT EXISTS "puede_eliminar" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "marcaciones" DROP CONSTRAINT IF EXISTS "ck_marcaciones_origen";--> statement-breakpoint
ALTER TABLE "marcaciones" ADD CONSTRAINT "ck_marcaciones_origen" CHECK ((origen)::text = ANY ((ARRAY['kiosko'::character varying, 'intranet'::character varying, 'manual'::character varying, 'biometrico'::character varying])::text[]));
