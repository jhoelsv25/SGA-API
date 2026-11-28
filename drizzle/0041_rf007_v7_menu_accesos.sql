-- RF-007 V7: opción «Accesos y credenciales» para el Administrador y Soporte TI. Idempotente.
-- En una base nueva no hay módulos todavía y la crea la carga inicial (seed).
INSERT INTO "menus" (modulo_id, nombre, orden, es_contenedor)
SELECT m.id, 'Configuración del sistema', 1, true FROM "modulos" m
WHERE m.codigo = 'configuracion'
  AND NOT EXISTS (SELECT 1 FROM "menus" x WHERE x.modulo_id = m.id AND x.es_contenedor AND x.nombre = 'Configuración del sistema');
--> statement-breakpoint
INSERT INTO "menus" (modulo_id, menu_padre_id, nombre, ruta, icono, orden, es_contenedor)
SELECT c.modulo_id, c.id, 'Accesos y credenciales', '/admin/accesos-credenciales', 'Key01Icon', 1, false
FROM "menus" c JOIN "modulos" m ON m.id = c.modulo_id
WHERE m.codigo = 'configuracion' AND c.es_contenedor AND c.nombre = 'Configuración del sistema'
  AND NOT EXISTS (SELECT 1 FROM "menus" x WHERE x.ruta = '/admin/accesos-credenciales');
--> statement-breakpoint
INSERT INTO "rol_menus" (rol_id, menu_id)
SELECT r.id, m.id FROM "roles" r, "menus" m
WHERE r.nombre IN ('Administrador', 'Soporte TI') AND m.ruta = '/admin/accesos-credenciales'
ON CONFLICT DO NOTHING;
