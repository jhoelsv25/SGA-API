-- RF-011 V3: motivo catalogado de la justificación de una sesión (descanso_medico, permiso_personal, ...).
-- La columna `justificacion` sigue guardando el texto del motivo. Idempotente.
ALTER TABLE "sesiones_clase" ADD COLUMN IF NOT EXISTS "justificacion_motivo_codigo" varchar(30);
-- Las solicitudes anteriores a la V3 traían el motivo en texto libre; se asigna el código del catálogo si coincide.
UPDATE "sesiones_clase" SET "justificacion_motivo_codigo" = CASE lower(btrim("justificacion"))
    WHEN 'descanso médico' THEN 'descanso_medico'
    WHEN 'permiso personal' THEN 'permiso_personal'
    WHEN 'comisión de servicio' THEN 'comision_de_servicio'
    WHEN 'licencia' THEN 'licencia'
    ELSE 'otro'
  END
WHERE "justificacion" IS NOT NULL AND "justificacion_motivo_codigo" IS NULL;
