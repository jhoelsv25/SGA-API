-- RF-005: opción de menú del calendario. Sin ella solo el Administrador podía registrar eventos.
-- En una base nueva no hay módulos todavía y la crea la carga inicial (seed).
INSERT INTO "menus" (modulo_id, nombre, orden, es_contenedor)
SELECT m.id, 'Organización escolar', 1, true FROM "modulos" m
WHERE m.codigo = 'academico'
  AND NOT EXISTS (SELECT 1 FROM "menus" x WHERE x.modulo_id = m.id AND x.es_contenedor AND x.nombre = 'Organización escolar');
--> statement-breakpoint
INSERT INTO "menus" (modulo_id, menu_padre_id, nombre, ruta, icono, orden, es_contenedor)
SELECT c.modulo_id, c.id, 'Calendario escolar', '/admin/calendario', 'Calendar03Icon', 4, false
FROM "menus" c JOIN "modulos" m ON m.id = c.modulo_id
WHERE m.codigo = 'academico' AND c.es_contenedor AND c.nombre = 'Organización escolar'
  AND NOT EXISTS (SELECT 1 FROM "menus" x WHERE x.ruta = '/admin/calendario');
--> statement-breakpoint
INSERT INTO "rol_menus" (rol_id, menu_id)
SELECT r.id, m.id FROM "roles" r, "menus" m
WHERE r.nombre IN ('Administrador', 'Director') AND m.ruta = '/admin/calendario'
ON CONFLICT DO NOTHING;
