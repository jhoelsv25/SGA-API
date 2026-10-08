-- RF-002 V2 (Roles-Menú): el acceso se da por los menús asignados a cada rol.
-- Reemplaza a permisos / rol_permisos (y su alcance).
CREATE TABLE "rol_menus" (
	"rol_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"asignado_por_id" uuid,
	"asignado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "pk_rol_menus" PRIMARY KEY("rol_id","menu_id")
);
--> statement-breakpoint
ALTER TABLE "rol_menus" ADD CONSTRAINT "fk_rol_menus_rol" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rol_menus" ADD CONSTRAINT "fk_rol_menus_menu" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rol_menus" ADD CONSTRAINT "fk_rol_menus_asignado" FOREIGN KEY ("asignado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Conserva lo que cada rol ya veía: opciones sin permiso o con un permiso del rol.
INSERT INTO "rol_menus" ("rol_id", "menu_id")
SELECT r."id", m."id"
FROM "roles" r
CROSS JOIN "menus" m
WHERE m."es_contenedor" = false
  AND (m."permiso_id" IS NULL
       OR EXISTS (SELECT 1 FROM "rol_permisos" rp WHERE rp."rol_id" = r."id" AND rp."permiso_id" = m."permiso_id"));
--> statement-breakpoint
ALTER TABLE "menus" DROP CONSTRAINT "fk_menus_permiso";--> statement-breakpoint
ALTER TABLE "menus" DROP COLUMN "permiso_id";--> statement-breakpoint
DROP TABLE "rol_permisos";--> statement-breakpoint
DROP TABLE "permisos";
--> statement-breakpoint
-- Un solo término: "rol" (ya no "perfil")
ALTER TABLE "cargo_perfiles_sugeridos" RENAME TO "cargo_roles_sugeridos";--> statement-breakpoint
ALTER TABLE "cargo_roles_sugeridos" RENAME CONSTRAINT "pk_cargo_perfiles_sugeridos" TO "pk_cargo_roles_sugeridos";--> statement-breakpoint
ALTER TABLE "cargo_roles_sugeridos" RENAME CONSTRAINT "fk_cargo_perfiles_cargo" TO "fk_cargo_roles_cargo";--> statement-breakpoint
ALTER TABLE "cargo_roles_sugeridos" RENAME CONSTRAINT "fk_cargo_perfiles_rol" TO "fk_cargo_roles_rol";
