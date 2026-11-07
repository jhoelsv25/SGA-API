-- RF-007 V4: una persona solo puede tener UNA ficha académica vigente (docente o estudiante).
-- Vigente = docente 'activo'/'licencia' o estudiante 'activo'. Una ficha dada de baja
-- (docente 'cesado'; estudiante 'retirado'/'trasladado'/'egresado') no cuenta.
-- El trigger solo evalúa altas y cambios de estado, así que no bloquea la edición de datos
-- de personas que hoy ya tienen ambas fichas; esos casos se listan con la consulta del final.

CREATE OR REPLACE FUNCTION fn_validar_ficha_academica_unica()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.eliminado_en IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.estado IS NOT DISTINCT FROM NEW.estado
     AND OLD.eliminado_en IS NOT DISTINCT FROM NEW.eliminado_en THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'docentes' THEN
    IF NEW.estado IN ('activo', 'licencia') AND EXISTS (
      SELECT 1 FROM estudiantes e
      WHERE e.persona_id = NEW.persona_id AND e.eliminado_en IS NULL AND e.estado = 'activo'
    ) THEN
      RAISE EXCEPTION 'La persona ya tiene una ficha de estudiante activa; debe darla de baja primero.'
        USING ERRCODE = '23514';
    END IF;
  ELSE
    IF NEW.estado = 'activo' AND EXISTS (
      SELECT 1 FROM docentes d
      WHERE d.persona_id = NEW.persona_id AND d.eliminado_en IS NULL
        AND d.estado IN ('activo', 'licencia')
    ) THEN
      RAISE EXCEPTION 'La persona ya tiene una ficha de docente activa; debe darla de baja primero.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_docentes_ficha_unica ON docentes;
--> statement-breakpoint
CREATE TRIGGER trg_docentes_ficha_unica
  BEFORE INSERT OR UPDATE OF estado, eliminado_en ON docentes
  FOR EACH ROW EXECUTE FUNCTION fn_validar_ficha_academica_unica();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_estudiantes_ficha_unica ON estudiantes;
--> statement-breakpoint
CREATE TRIGGER trg_estudiantes_ficha_unica
  BEFORE INSERT OR UPDATE OF estado, eliminado_en ON estudiantes
  FOR EACH ROW EXECUTE FUNCTION fn_validar_ficha_academica_unica();

-- Personas que HOY tienen ambas fichas vigentes (resolver a mano dando de baja una de las dos):
--   SELECT p.numero_documento, p.apellido_paterno, p.nombres, d.codigo AS cod_docente, d.estado AS estado_docente,
--          e.codigo AS cod_estudiante, e.estado AS estado_estudiante
--   FROM personas p
--   JOIN docentes d ON d.persona_id = p.id AND d.eliminado_en IS NULL AND d.estado IN ('activo','licencia')
--   JOIN estudiantes e ON e.persona_id = p.id AND e.eliminado_en IS NULL AND e.estado = 'activo';
