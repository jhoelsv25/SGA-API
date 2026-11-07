-- SGA-NET (programa del reloj) inserta directo en marcaciones_biometricas: ya no existe la app puente por HTTP.
-- Se quitan las órdenes, las pendientes, la configuración remota del reloj y el tipo de equipo "biometrico".
DROP TABLE IF EXISTS "puente_ordenes";--> statement-breakpoint
DROP TABLE IF EXISTS "marcaciones_biometrico_pendientes";--> statement-breakpoint
DELETE FROM "equipos_autorizados" WHERE "tipo" = 'biometrico';--> statement-breakpoint
ALTER TABLE "equipos_autorizados" DROP CONSTRAINT IF EXISTS "ck_equipos_tipo";--> statement-breakpoint
ALTER TABLE "equipos_autorizados" ADD CONSTRAINT "ck_equipos_tipo" CHECK ((tipo)::text = ANY ((ARRAY['kiosko'::character varying])::text[]));--> statement-breakpoint
ALTER TABLE "equipos_autorizados" DROP COLUMN IF EXISTS "ultimo_latido_en";--> statement-breakpoint
ALTER TABLE "equipos_autorizados" DROP COLUMN IF EXISTS "reloj_respondio_en";--> statement-breakpoint
ALTER TABLE "equipos_autorizados" DROP COLUMN IF EXISTS "ultimo_desfase_min";--> statement-breakpoint
ALTER TABLE "equipos_autorizados" DROP COLUMN IF EXISTS "reloj_ip";--> statement-breakpoint
ALTER TABLE "equipos_autorizados" DROP COLUMN IF EXISTS "reloj_puerto";--> statement-breakpoint
ALTER TABLE "equipos_autorizados" DROP COLUMN IF EXISTS "reloj_clave_comunicacion";--> statement-breakpoint
ALTER TABLE "equipos_autorizados" DROP COLUMN IF EXISTS "intervalo_segundos";--> statement-breakpoint
DELETE FROM "variables_sistema" WHERE "codigo" IN ('biometrico.desfase_maximo_min', 'biometrico.minutos_sin_comunicacion');
