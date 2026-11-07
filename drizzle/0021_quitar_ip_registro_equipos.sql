-- Seguridad: el SGA ya no guarda la IP de los equipos autorizados (no la usa ninguna regla de negocio).
ALTER TABLE "equipos_autorizados" DROP COLUMN IF EXISTS "ip_registro";
