-- Punto de sincronización del programa del reloj (SGA-NET-BIOMETRICO): la última marca entregada de cada reloj.
-- El programa lo lee al iniciar para seguir desde ahí y lo actualiza tras cada ciclo correcto. Idempotente.
CREATE TABLE IF NOT EXISTS "sincronizaciones_biometrico" (
	"reloj_serie" varchar(100) PRIMARY KEY NOT NULL,
	"ultima_marca" timestamp(0) NOT NULL,
	"ultima_sincronizacion" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"equipo" varchar(100)
);
