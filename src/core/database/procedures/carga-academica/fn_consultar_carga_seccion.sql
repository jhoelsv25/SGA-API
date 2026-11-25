-- ============================================================================
-- Función: fn_consultar_carga_seccion
-- Descripción: Consulta la carga académica de una sección agregando las horas
--              en horario en una sola pasada (sin subconsultas correlacionadas).
-- Parámetro: p_params (JSONB) con:
--   - seccionId: UUID (obligatorio)
-- Retorno: JSONB con { items }
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_consultar_carga_seccion(p_params JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_seccion_id UUID;
    v_min_hora   INT := 45;
    v_items      JSONB := '[]'::jsonb;
BEGIN
    v_seccion_id := (p_params->>'seccionId')::UUID;

    IF v_seccion_id IS NULL THEN
        RAISE EXCEPTION 'El parámetro seccionId es obligatorio en fn_consultar_carga_seccion.';
    END IF;

    SELECT GREATEST(COALESCE(NULLIF(TRIM(valor), '')::INT, 45), 1)
    INTO v_min_hora
    FROM variables_sistema
    WHERE codigo = 'jornada.minutos_hora_pedagogica'
      AND vigente = TRUE
    LIMIT 1;

    v_min_hora := COALESCE(v_min_hora, 45);

    WITH horas_agg AS (
        SELECT
            h.curso_seccion_id,
            COALESCE(
                SUM(
                    ROUND(
                        (EXTRACT(EPOCH FROM (h.hora_fin - h.hora_inicio)) / 60.0) / v_min_hora
                    )
                )::INT,
                0
            ) AS horas_horario
        FROM horarios h
        WHERE h.seccion_id = v_seccion_id
          AND h.tipo_bloque = 'clase'
          AND h.curso_seccion_id IS NOT NULL
        GROUP BY h.curso_seccion_id
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', cs.id,
                'cursoId', cs.curso_id,
                'cursoNombre', c.nombre,
                'colorHex', c.color_hex,
                'horasPlan', COALESCE(pe.horas_semanales, 0),
                'horasHorario', COALESCE(ha.horas_horario, 0),
                'docente', CASE
                    WHEN d.id IS NOT NULL AND d.codigo IS NOT NULL THEN jsonb_build_object(
                        'id', d.id,
                        'codigo', d.codigo,
                        'nombreCompleto', TRIM(CONCAT_WS(' ', p.nombres, p.apellido_paterno, p.apellido_materno))
                    )
                    ELSE NULL
                END
            )
            ORDER BY c.nombre ASC
        ),
        '[]'::jsonb
    )
    INTO v_items
    FROM cursos_seccion cs
    INNER JOIN secciones s ON s.id = cs.seccion_id
    INNER JOIN cursos c ON c.id = cs.curso_id
    LEFT JOIN plan_estudios pe
        ON pe.grado_id = s.grado_id
        AND pe.curso_id = cs.curso_id
        AND pe.activo = TRUE
    LEFT JOIN docentes d ON d.id = cs.docente_id
    LEFT JOIN personas p ON p.id = d.persona_id
    LEFT JOIN horas_agg ha ON ha.curso_seccion_id = cs.id
    WHERE cs.seccion_id = v_seccion_id;

    RETURN jsonb_build_object('items', COALESCE(v_items, '[]'::jsonb));
END;
$$;
