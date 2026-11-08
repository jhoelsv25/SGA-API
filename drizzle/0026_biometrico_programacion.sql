-- Horas de sincronización del programa del reloj (SGA-NET-BIOMETRICO). Cada fila es una tarea programada de Windows
-- que el programa crea cuando se pulsa «Crear y sincronizar tareas programadas». dias: 1 = lunes ... 7 = domingo. Idempotente.
CREATE TABLE IF NOT EXISTS "biometrico_programacion" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"hora" time(0) NOT NULL,
	"dias" varchar(20) DEFAULT '1,2,3,4,5' NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"actualizado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "uq_biometrico_programacion_hora" UNIQUE("hora"),
	CONSTRAINT "ck_biometrico_programacion_dias" CHECK (dias ~ '^[1-7](,[1-7])*$')
);--> statement-breakpoint
-- El programa del reloj solo la lee (si el rol ya existe en esta base).
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'biometrico') THEN
		GRANT SELECT ON public.biometrico_programacion TO biometrico;
	END IF;
END $$;
