-- RF-025: reporte mensual de asistencia a la UGEL (RSG 326-2017-MINEDU). Idempotente.
CREATE TABLE IF NOT EXISTS "asistencia_novedades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"persona_id" uuid NOT NULL,
	"tipo" varchar(30) NOT NULL,
	"fecha_desde" date NOT NULL,
	"fecha_hasta" date NOT NULL,
	"minutos" smallint,
	"documento" varchar(150) NOT NULL,
	"observacion" varchar(500),
	"presentado_en" timestamp(0),
	"registrado_por_id" uuid NOT NULL,
	"registrado_en" timestamp(0) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"anulada" boolean DEFAULT false NOT NULL,
	"anulada_por_id" uuid,
	"anulada_en" timestamp(0),
	"motivo_anulacion" varchar(500),
	CONSTRAINT "ck_asistencia_novedades_fechas" CHECK (fecha_hasta >= fecha_desde),
	CONSTRAINT "ck_asistencia_novedades_minutos" CHECK (minutos IS NULL OR minutos > 0),
	CONSTRAINT "fk_asistencia_novedades_persona" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id"),
	CONSTRAINT "fk_asistencia_novedades_registrado_por" FOREIGN KEY ("registrado_por_id") REFERENCES "public"."usuarios"("id"),
	CONSTRAINT "fk_asistencia_novedades_anulada_por" FOREIGN KEY ("anulada_por_id") REFERENCES "public"."usuarios"("id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_asistencia_novedades_persona_fechas" ON "asistencia_novedades" ("persona_id","fecha_desde","fecha_hasta");
--> statement-breakpoint
ALTER TABLE "docentes" DROP CONSTRAINT IF EXISTS "ck_docentes_contrato";
--> statement-breakpoint
ALTER TABLE "docentes" ADD CONSTRAINT "ck_docentes_contrato" CHECK (tipo_contrato IN ('nombrado','contratado','destacado','encargado','practicante'));
--> statement-breakpoint
INSERT INTO "variables_sistema" (codigo, descripcion, modulo, tipo, valor, unidad, valor_minimo, valor_maximo)
SELECT 'asistencia.docente_horario_segun_clases', 'Horario esperado del docente. false: el del Reglamento Interno (turno de docentes en Turnos). true: de su primera a su última clase del día', 'asistencia', 'booleano', 'false', NULL, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM "variables_sistema" WHERE codigo = 'asistencia.docente_horario_segun_clases');
--> statement-breakpoint
INSERT INTO "variables_sistema" (codigo, descripcion, modulo, tipo, valor, unidad, valor_minimo, valor_maximo)
SELECT 'asistencia.tardanzas_para_inasistencia', 'Número de tardanza del mes que el reporte a la UGEL marca como 3T, inasistencia injustificada (RSG 326-2017, 6.3.1.2). 0 lo desactiva', 'asistencia', 'entero', '3', NULL, 0, 31
WHERE NOT EXISTS (SELECT 1 FROM "variables_sistema" WHERE codigo = 'asistencia.tardanzas_para_inasistencia');
--> statement-breakpoint
INSERT INTO "variables_sistema" (codigo, descripcion, modulo, tipo, valor, unidad, valor_minimo, valor_maximo)
SELECT 'asistencia.marca_incompleta_es_inasistencia', 'En el reporte a la UGEL, sin ingreso, sin salida o con salida anticipada sin justificación cuenta como inasistencia (RSG 326-2017, 5.3.2)', 'asistencia', 'booleano', 'true', NULL, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM "variables_sistema" WHERE codigo = 'asistencia.marca_incompleta_es_inasistencia');
--> statement-breakpoint
INSERT INTO "variables_sistema" (codigo, descripcion, modulo, tipo, valor, unidad, valor_minimo, valor_maximo)
SELECT 'asistencia.omisiones_justificables_mes', 'Omisiones de marca que se pueden justificar al mes por persona (RSG 326-2017, 6.1.5)', 'asistencia', 'entero', '1', NULL, 0, 31
WHERE NOT EXISTS (SELECT 1 FROM "variables_sistema" WHERE codigo = 'asistencia.omisiones_justificables_mes');
--> statement-breakpoint
INSERT INTO "variables_sistema" (codigo, descripcion, modulo, tipo, valor, unidad, valor_minimo, valor_maximo)
SELECT 'asistencia.horas_para_justificar_omision', 'Horas desde la omisión para presentar el sustento (RSG 326-2017, 6.1.5)', 'asistencia', 'entero', '24', 'horas', 1, 720
WHERE NOT EXISTS (SELECT 1 FROM "variables_sistema" WHERE codigo = 'asistencia.horas_para_justificar_omision');
--> statement-breakpoint
INSERT INTO "variables_sistema" (codigo, descripcion, modulo, tipo, valor, unidad, valor_minimo, valor_maximo)
SELECT 'asistencia.reporte_nivel_modalidad', 'Texto «Nivel/Modalidad Educativa» del reporte a la UGEL', 'asistencia', 'texto', 'EBR - Secundaria', NULL, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM "variables_sistema" WHERE codigo = 'asistencia.reporte_nivel_modalidad');
--> statement-breakpoint
INSERT INTO "variables_sistema" (codigo, descripcion, modulo, tipo, valor, unidad, valor_minimo, valor_maximo)
SELECT 'asistencia.reporte_turno', 'Texto «Turno» del reporte a la UGEL', 'asistencia', 'texto', 'Mañana', NULL, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM "variables_sistema" WHERE codigo = 'asistencia.reporte_turno');
