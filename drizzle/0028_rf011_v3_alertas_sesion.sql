-- RF-011 V3: registro de alertas de sesiones ya enviadas al Subdirector y al Director.
-- La clave identifica la alerta (salida:<sesión>, minutos-dia:<docente>:<fecha>, minutos-semana:<docente>:<lunes>).
-- Un insert con ON CONFLICT DO NOTHING decide, sin carreras, si la notificación se envía. Idempotente.
CREATE TABLE IF NOT EXISTS "alertas_sesion_enviadas" (
	"clave" varchar(120) PRIMARY KEY NOT NULL,
	"creado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
