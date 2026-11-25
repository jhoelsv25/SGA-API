-- ============================================================================
-- Función: fn_consultar_horario_seccion
-- Descripción: Retorna en una sola consulta los bloques del horario semanal de
--              una sección y el resumen de horas planificadas vs plan de estudios.
-- Parámetro: p_params (JSONB) con:
--   - seccionId: UUID (obligatorio)
-- Retorno: JSONB con { bloques, resumenHoras }
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_consultar_horario_seccion(p_params JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_seccion_id UUID;
    v_min_hora   INT := 45;
    v_bloques    JSONB := '[]'::jsonb;
    v_resumen    JSONB := '[]'::jsonb;
BEGIN
    v_seccion_id := (p_params->>'seccionId')::UUID;

    IF v_seccion_id IS NULL THEN
        RAISE EXCEPTION 'El parámetro seccionId es obligatorio en fn_consultar_horario_seccion.';
    END IF;

    SELECT GREATEST(COALESCE(NULLIF(TRIM(valor), '')::INT, 45), 1)
    INTO v_min_hora
    FROM variables_sistema
    WHERE codigo = 'jornada.minutos_hora_pedagogica'
      AND vigente = TRUE
    LIMIT 1;

    v_min_hora := COALESCE(v_min_hora, 45);

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', h.id,
                'seccionId', h.seccion_id,
                'cursoSeccionId', h.curso_seccion_id,
                'cursoNombre', c.nombre,
                'colorHex', c.color_hex,
                'docenteNombre', NULLIF(TRIM(CONCAT_WS(' ', p.nombres, p.apellido_paterno, p.apellido_materno)), ''),
                'diaSemana', h.dia_semana,
                'horaInicio', TO_CHAR(h.hora_inicio, 'HH24:MI'),
                'horaFin', TO_CHAR(h.hora_fin, 'HH24:MI'),
                'tipoBloque', h.tipo_bloque,
                'aula', h.aula
            )
            ORDER BY h.dia_semana ASC, h.hora_inicio ASC
        ),
        '[]'::jsonb
    )
    INTO v_bloques
    FROM horarios h
    LEFT JOIN cursos_seccion cs ON cs.id = h.curso_seccion_id
    LEFT JOIN cursos c ON c.id = cs.curso_id
    LEFT JOIN docentes d ON d.id = cs.docente_id
    LEFT JOIN personas p ON p.id = d.persona_id
    WHERE h.seccion_id = v_seccion_id;

    WITH horas_curso AS (
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
                'cursoId', cs.id,
                'cursoNombre', c.nombre,
                'horasHorario', COALESCE(hc.horas_horario, 0),
                'horasPlan', pe.horas_semanales
            )
            ORDER BY c.nombre ASC
        ),
        '[]'::jsonb
    )
    INTO v_resumen
    FROM cursos_seccion cs
    INNER JOIN secciones s ON s.id = cs.seccion_id
    INNER JOIN plan_estudios pe
        ON pe.grado_id = s.grado_id
        AND pe.curso_id = cs.curso_id
        AND pe.activo = TRUE
    INNER JOIN cursos c ON c.id = cs.curso_id
    LEFT JOIN horas_curso hc ON hc.curso_seccion_id = cs.id
    WHERE cs.seccion_id = v_seccion_id;

    RETURN jsonb_build_object(
        'bloques', COALESCE(v_bloques, '[]'::jsonb),
        'resumenHoras', COALESCE(v_resumen, '[]'::jsonb)
    );
END;
$$;
