ALTER TABLE "calendario_eventos" ADD COLUMN IF NOT EXISTS "personal_labora" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "asistencia_novedades" ADD COLUMN IF NOT EXISTS "marca_omitida" varchar(10);
--> statement-breakpoint
-- Omisiones registradas con la versión anterior: su plazo se contó desde la salida.
UPDATE "asistencia_novedades" SET "marca_omitida" = 'salida' WHERE "tipo" = 'omision_justificada' AND "marca_omitida" IS NULL;
--> statement-breakpoint
ALTER TABLE "asistencia_novedades" DROP CONSTRAINT IF EXISTS "ck_asistencia_novedades_marca";
--> statement-breakpoint
ALTER TABLE "asistencia_novedades" ADD CONSTRAINT "ck_asistencia_novedades_marca" CHECK ((tipo = 'omision_justificada') = (marca_omitida IS NOT NULL) AND (marca_omitida IS NULL OR marca_omitida IN ('ingreso', 'salida')));
--> statement-breakpoint
-- 3T desactivado por defecto. Solo cambia la variable si conserva el valor anterior por defecto.
UPDATE "variables_sistema" SET valor = '0', descripcion = 'Número de tardanza del mes que el reporte marca como 3T. 0 (por defecto) lo desactiva: el Anexo 03 modificado por la RSG 121-2018 no tiene ese código; actívelo solo si la UGEL lo confirma'
WHERE codigo = 'asistencia.tardanzas_para_inasistencia' AND valor = '3' AND descripcion LIKE '%6.3.1.2%';
