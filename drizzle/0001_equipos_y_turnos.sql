CREATE TABLE "equipos_autorizados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"ubicacion" varchar(150) NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"proposito" varchar(20) NOT NULL,
	"usuarios_permitidos" varchar(100) NOT NULL,
	"numero_serie" varchar(100),
	"token_autorizacion" varchar(255),
	"autorizado" boolean DEFAULT false NOT NULL,
	"autorizado_en" timestamp(0),
	"autorizado_por_id" uuid,
	"activo" boolean DEFAULT true NOT NULL,
	"ultimo_acceso" timestamp(0),
	"ip_registro" varchar(45),
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"actualizado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"eliminado_en" timestamp(0),
	CONSTRAINT "uq_equipos_autorizados_nombre" UNIQUE("nombre"),
	CONSTRAINT "ck_equipos_tipo" CHECK ((tipo)::text = ANY ((ARRAY['kiosko'::character varying, 'biometrico'::character varying])::text[])),
	CONSTRAINT "ck_equipos_proposito" CHECK ((proposito)::text = ANY ((ARRAY['marcacion'::character varying, 'sesiones'::character varying])::text[]))
);
--> statement-breakpoint
ALTER TABLE "turnos" ADD COLUMN IF NOT EXISTS "ventana_entrada_inicio" time(0);--> statement-breakpoint
ALTER TABLE "turnos" ADD COLUMN IF NOT EXISTS "ventana_entrada_fin" time(0);--> statement-breakpoint
ALTER TABLE "turnos" ADD COLUMN IF NOT EXISTS "ventana_salida_inicio" time(0);--> statement-breakpoint
ALTER TABLE "turnos" ADD COLUMN IF NOT EXISTS "ventana_salida_fin" time(0);--> statement-breakpoint
ALTER TABLE "equipos_autorizados" ADD CONSTRAINT "fk_equipos_autorizado_por" FOREIGN KEY ("autorizado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_bitacora_auditoria_cursor" ON "bitacora_auditoria" USING btree ("registrado_en" timestamp_ops,"id" int8_ops);
