-- SGA-NET ya no usa un esquema propio: todo vive en public.
-- Mueve los equipos autorizados que hubiera en sga.equipos_acceso (si el esquema existe) y elimina el esquema.
DO $$
BEGIN
	IF to_regclass('sga.equipos_acceso') IS NOT NULL THEN
		INSERT INTO public.equipos_acceso (id, usuario_id, equipo_hash, nombre, plataforma, estado, solicitado_en, resuelto_en, resuelto_por, motivo, ultimo_acceso, vigente_hasta, ip, actualizado_en)
		SELECT id, usuario_id, equipo_hash, nombre, plataforma, estado, solicitado_en, resuelto_en, resuelto_por, motivo, ultimo_acceso, vigente_hasta, ip, actualizado_en
		FROM sga.equipos_acceso
		ON CONFLICT (usuario_id, equipo_hash) DO NOTHING;
	END IF;
END $$;--> statement-breakpoint
DROP SCHEMA IF EXISTS sga CASCADE;
