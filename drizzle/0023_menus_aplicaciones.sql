-- Menú: cada opción declara en qué aplicaciones se muestra (web, escritorio, app).
-- Lo existente queda solo para el portal web.
ALTER TABLE "menus" ADD COLUMN IF NOT EXISTS "aplicaciones" text[] DEFAULT ARRAY['web']::text[] NOT NULL;
--> statement-breakpoint
ALTER TABLE "menus" DROP CONSTRAINT IF EXISTS "ck_menus_aplicaciones";
--> statement-breakpoint
ALTER TABLE "menus" ADD CONSTRAINT "ck_menus_aplicaciones" CHECK (cardinality(aplicaciones) > 0 AND aplicaciones <@ ARRAY['web', 'escritorio', 'app']::text[]);
