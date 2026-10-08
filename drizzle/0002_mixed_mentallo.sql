CREATE TABLE "variables_sistema" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "variables_sistema_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"codigo" varchar(60) NOT NULL,
	"descripcion" varchar(255) NOT NULL,
	"modulo" varchar(30) NOT NULL,
	"tipo" varchar(10) NOT NULL,
	"valor" text NOT NULL,
	"unidad" varchar(20),
	"valor_minimo" numeric(18, 4),
	"valor_maximo" numeric(18, 4),
	"editable" boolean DEFAULT true NOT NULL,
	"carga_en_aplicacion" boolean DEFAULT true NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL,
	"motivo_cambio" varchar(500),
	"actualizado_por_id" uuid,
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "ck_variables_sistema_tipo" CHECK ((tipo)::text = ANY ((ARRAY['texto'::character varying, 'entero'::character varying, 'decimal'::character varying, 'booleano'::character varying, 'fecha'::character varying, 'hora'::character varying, 'lista'::character varying])::text[]))
);
--> statement-breakpoint
ALTER TABLE "variables_sistema" ADD CONSTRAINT "fk_variables_sistema_actualizado_por" FOREIGN KEY ("actualizado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_variables_sistema_vigente" ON "variables_sistema" USING btree ("codigo") WHERE vigente = true;