CREATE TABLE "cargo_perfiles_sugeridos" (
	"cargo_id" uuid NOT NULL,
	"rol_id" uuid NOT NULL,
	CONSTRAINT "pk_cargo_perfiles_sugeridos" PRIMARY KEY("cargo_id","rol_id")
);
--> statement-breakpoint
CREATE TABLE "cargos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"descripcion" varchar(255),
	"vigente" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"actualizado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "uq_cargos_nombre" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "persona_cargos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"persona_id" uuid NOT NULL,
	"cargo_id" uuid NOT NULL,
	"fecha_inicio" date NOT NULL,
	"fecha_fin" date,
	"es_principal" boolean DEFAULT true NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL,
	"registrado_por_id" uuid,
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "ck_persona_cargos_fechas" CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio),
	CONSTRAINT "ck_persona_cargos_vigente" CHECK (vigente OR fecha_fin IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "rol_permisos" ADD COLUMN "alcance" varchar(20) DEFAULT 'colegio' NOT NULL;--> statement-breakpoint
ALTER TABLE "cargo_perfiles_sugeridos" ADD CONSTRAINT "fk_cargo_perfiles_cargo" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cargo_perfiles_sugeridos" ADD CONSTRAINT "fk_cargo_perfiles_rol" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_cargos" ADD CONSTRAINT "fk_persona_cargos_persona" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_cargos" ADD CONSTRAINT "fk_persona_cargos_cargo" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_cargos" ADD CONSTRAINT "fk_persona_cargos_registrado" FOREIGN KEY ("registrado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_persona_cargos_vigente" ON "persona_cargos" USING btree ("persona_id","cargo_id") WHERE vigente;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_persona_cargos_principal" ON "persona_cargos" USING btree ("persona_id") WHERE (vigente AND es_principal);--> statement-breakpoint
ALTER TABLE "rol_permisos" ADD CONSTRAINT "ck_rol_permisos_alcance" CHECK ((alcance)::text = ANY ((ARRAY['propio'::character varying, 'tutoria'::character varying, 'mis_secciones'::character varying, 'colegio'::character varying])::text[]));
