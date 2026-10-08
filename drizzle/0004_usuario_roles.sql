-- RF-001 V2 / RF-002 V2 (P-02): varios perfiles por usuario.
CREATE TABLE "usuario_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"rol_id" uuid NOT NULL,
	"es_principal" boolean DEFAULT false NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL,
	"asignado_por_id" uuid,
	"asignado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"retirado_por_id" uuid,
	"retirado_en" timestamp(0),
	CONSTRAINT "ck_usuario_roles_retiro" CHECK (vigente OR (retirado_por_id IS NOT NULL AND retirado_en IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "usuario_roles" ADD CONSTRAINT "fk_usuario_roles_usuario" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_roles" ADD CONSTRAINT "fk_usuario_roles_rol" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_roles" ADD CONSTRAINT "fk_usuario_roles_asignado" FOREIGN KEY ("asignado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_roles" ADD CONSTRAINT "fk_usuario_roles_retirado" FOREIGN KEY ("retirado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_usuario_roles_vigente" ON "usuario_roles" USING btree ("usuario_id" uuid_ops,"rol_id" uuid_ops) WHERE vigente;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_usuario_roles_principal" ON "usuario_roles" USING btree ("usuario_id" uuid_ops) WHERE (vigente AND es_principal);--> statement-breakpoint
-- El rol actual de cada usuario pasa a ser su perfil principal (usuarios.rol_id se mantiene sincronizado).
INSERT INTO "usuario_roles" ("usuario_id", "rol_id", "es_principal")
SELECT u."id", u."rol_id", true
FROM "usuarios" u
WHERE NOT EXISTS (SELECT 1 FROM "usuario_roles" ur WHERE ur."usuario_id" = u."id" AND ur."vigente");
