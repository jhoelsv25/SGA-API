CREATE TABLE "material_cambios_fecha" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"fecha_anterior" date NOT NULL,
	"fecha_solicitada" date NOT NULL,
	"motivo" varchar(500) NOT NULL,
	"estado" varchar(20) DEFAULT 'solicitada' NOT NULL,
	"solicitado_por_id" uuid NOT NULL,
	"solicitado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"resuelto_por_id" uuid,
	"resuelto_en" timestamp(0),
	"respuesta" varchar(500),
	CONSTRAINT "ck_material_cambios_fecha_estado" CHECK ((estado)::text = ANY ((ARRAY['solicitada'::character varying, 'aprobada'::character varying, 'rechazada'::character varying])::text[])),
	CONSTRAINT "ck_material_cambios_fecha_resuelto" CHECK (((estado)::text = 'solicitada'::text) OR ((resuelto_por_id IS NOT NULL) AND (resuelto_en IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "material_versiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"url" varchar(500) NOT NULL,
	"archivo_nombre" varchar(255),
	"archivo_tamano_bytes" integer,
	"vigente" boolean DEFAULT true NOT NULL,
	"creado_por_id" uuid NOT NULL,
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "materiales" DROP CONSTRAINT "ck_materiales_tipo";--> statement-breakpoint
ALTER TABLE "materiales" ALTER COLUMN "url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "materiales" ALTER COLUMN "fecha_programada" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "materiales" ADD COLUMN "archivo_nombre" varchar(255);--> statement-breakpoint
ALTER TABLE "materiales" ADD COLUMN "archivo_tamano_bytes" integer;--> statement-breakpoint
ALTER TABLE "materiales" ADD COLUMN "horario_id" uuid;--> statement-breakpoint
ALTER TABLE "materiales" ADD COLUMN "es_planificado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "materiales" ADD COLUMN "fecha_congelada" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "materiales" ADD COLUMN "vigente" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "material_cambios_fecha" ADD CONSTRAINT "fk_material_cambios_fecha_material" FOREIGN KEY ("material_id") REFERENCES "public"."materiales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_cambios_fecha" ADD CONSTRAINT "fk_material_cambios_fecha_solicitado_por" FOREIGN KEY ("solicitado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_cambios_fecha" ADD CONSTRAINT "fk_material_cambios_fecha_resuelto_por" FOREIGN KEY ("resuelto_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_versiones" ADD CONSTRAINT "fk_material_versiones_material" FOREIGN KEY ("material_id") REFERENCES "public"."materiales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_versiones" ADD CONSTRAINT "fk_material_versiones_creado_por" FOREIGN KEY ("creado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_material_cambios_fecha_material" ON "material_cambios_fecha" USING btree ("material_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_material_cambios_fecha_abierta" ON "material_cambios_fecha" USING btree ("material_id") WHERE ((estado)::text = 'solicitada'::text);--> statement-breakpoint
CREATE INDEX "ix_material_versiones_material" ON "material_versiones" USING btree ("material_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_material_versiones_vigente" ON "material_versiones" USING btree ("material_id") WHERE vigente = true;--> statement-breakpoint
ALTER TABLE "materiales" ADD CONSTRAINT "fk_materiales_horario" FOREIGN KEY ("horario_id") REFERENCES "public"."horarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materiales" ADD CONSTRAINT "ck_materiales_planificado" CHECK ((NOT es_planificado) OR (fecha_programada IS NOT NULL));--> statement-breakpoint
ALTER TABLE "materiales" ADD CONSTRAINT "ck_materiales_publicado" CHECK ((publicado_en IS NULL) OR (url IS NOT NULL));--> statement-breakpoint
ALTER TABLE "materiales" ADD CONSTRAINT "ck_materiales_tipo" CHECK ((tipo)::text = ANY ((ARRAY['documento'::character varying, 'presentacion'::character varying, 'hoja_calculo'::character varying, 'imagen'::character varying, 'audio'::character varying, 'video'::character varying, 'enlace'::character varying])::text[]));