-- ============================================================================
-- Función: fn_consultar_secciones
-- Descripción: Consulta secciones del año lectivo con conteos agregados en CTEs
--              (matriculados, totalCursos, cursosSinDocente) en una sola pasada.
-- Parámetro: p_params (JSONB) con:
--   - anioAcademicoId: UUID (obligatorio)
--   - gradoId: UUID | null
--   - estado: TEXT | null
-- Retorno: JSONB con { data }
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_consultar_secciones(p_params JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_anio_id  UUID;
    v_grado_id UUID;
    v_estado   TEXT;
    v_data     JSONB := '[]'::jsonb;
BEGIN
    v_anio_id  := (p_params->>'anioAcademicoId')::UUID;
    v_grado_id := NULLIF(TRIM(p_params->>'gradoId'), '')::UUID;
    v_estado   := NULLIF(TRIM(p_params->>'estado'), '');

    IF v_anio_id IS NULL THEN
        RAISE EXCEPTION 'El parámetro anioAcademicoId es obligatorio en fn_consultar_secciones.';
    END IF;

    WITH secciones_filtradas AS (
        SELECT s.*
        FROM secciones s
        WHERE s.anio_academico_id = v_anio_id
          AND (v_grado_id IS NULL OR s.grado_id = v_grado_id)
          AND (v_estado IS NULL OR s.estado = v_estado)
    ),
    mat_agg AS (
        SELECT
            m.seccion_id,
            COUNT(*)::INT AS matriculados
        FROM matriculas m
        INNER JOIN secciones_filtradas sf ON sf.id = m.seccion_id
        WHERE m.estado = 'matriculado'
        GROUP BY m.seccion_id
    ),
    cursos_agg AS (
        SELECT
            cs.seccion_id,
            COUNT(*)::INT AS total_cursos,
            COUNT(*) FILTER (WHERE cs.docente_id IS NULL)::INT AS cursos_sin_docente
        FROM cursos_seccion cs
        INNER JOIN secciones_filtradas sf ON sf.id = cs.seccion_id
        GROUP BY cs.seccion_id
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', s.id,
                'anioAcademicoId', s.anio_academico_id,
                'gradoId', s.grado_id,
                'gradoNumero', g.numero,
                'gradoNombre', g.nombre,
                'nombre', s.nombre,
                'aula', s.aula,
                'vacantes', s.vacantes,
                'estado', s.estado,
                'tutor', CASE
                    WHEN d.id IS NOT NULL AND d.codigo IS NOT NULL THEN jsonb_build_object(
                        'id', d.id,
                        'codigo', d.codigo,
                        'nombreCompleto', TRIM(CONCAT_WS(' ', p.nombres, p.apellido_paterno, p.apellido_materno))
                    )
                    ELSE NULL
                END,
                'matriculados', COALESCE(ma.matriculados, 0),
                'totalCursos', COALESCE(ca.total_cursos, 0),
                'cursosSinDocente', COALESCE(ca.cursos_sin_docente, 0)
            )
            ORDER BY g.numero ASC, s.nombre ASC
        ),
        '[]'::jsonb
    )
    INTO v_data
    FROM secciones_filtradas s
    INNER JOIN grados g ON g.id = s.grado_id
    LEFT JOIN docentes d ON d.id = s.tutor_id
    LEFT JOIN personas p ON p.id = d.persona_id
    LEFT JOIN mat_agg ma ON ma.seccion_id = s.id
    LEFT JOIN cursos_agg ca ON ca.seccion_id = s.id;

    RETURN jsonb_build_object('data', COALESCE(v_data, '[]'::jsonb));
END;
$$;
