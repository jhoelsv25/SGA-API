-- RF-024 V2: nuevo formato de la sesión de aprendizaje. Solo agrega columnas; no borra datos. Idempotente.
ALTER TABLE "planificaciones_sesion" ADD COLUMN IF NOT EXISTS "producto" text;
--> statement-breakpoint
ALTER TABLE "planificaciones_sesion" ADD COLUMN IF NOT EXISTS "coordinador" varchar(150);
--> statement-breakpoint
ALTER TABLE "planificaciones_sesion" ADD COLUMN IF NOT EXISTS "acuerdos" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "planificaciones_sesion" ADD COLUMN IF NOT EXISTS "mapa_visual" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "planificaciones_sesion" ADD COLUMN IF NOT EXISTS "secciones_adicionales" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
INSERT INTO "variables_sistema" (codigo, descripcion, modulo, tipo, valor)
SELECT 'institucion.lema_anual', 'Nombre oficial del año que encabeza la sesión de aprendizaje. Vacío no se imprime', 'organizacion', 'texto', 'AÑO DE LA ESPERANZA Y EL FORTALECIMIENTO DE LA DEMOCRACIA'
WHERE NOT EXISTS (SELECT 1 FROM "variables_sistema" WHERE codigo = 'institucion.lema_anual');
