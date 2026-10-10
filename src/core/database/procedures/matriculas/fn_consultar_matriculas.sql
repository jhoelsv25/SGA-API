-- ============================================================================
-- Función: fn_consultar_matriculas
-- Descripción: Consulta matrículas con datos completos de estudiante, persona,
--              grado, sección y año lectivo, con filtros dinámicos y
--              paginación eficiente basada en cursor (creado_en, id).
-- Parámetro: p_params (JSONB) con:
--   - id: UUID | null (consulta por ID específico)
--   - anioAcademicoId: UUID | null
--   - gradoId: UUID | null
--   - seccionId: UUID | null
--   - tipo: TEXT | null ('nuevo', 'continuador', 'traslado')
--   - estado: TEXT | null ('matriculado', 'retirado', 'trasladado', 'culminado')
--   - search: TEXT | null (búsqueda en código, DNI o nombres/apellidos)
--   - cursorCreadoEn: TEXT | null (ISO timestamp string)
--   - cursorId: UUID | null
--   - limit: INT (default 20, max 100)
-- Retorno: JSONB con { data: [...], hasMore: boolean, nextCursorCreadoEn: text, nextCursorId: uuid }
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_consultar_matriculas(p_params JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_id               UUID;
    v_anio_id          UUID;
    v_grado_id         UUID;
    v_seccion_id       UUID;
    v_tipo             TEXT;
    v_estado           TEXT;
    v_search           TEXT;
    v_pattern          TEXT;
    v_cursor_creado_en TIMESTAMPTZ;
    v_cursor_id        UUID;
    v_limit            INT;
    v_has_more         BOOLEAN := FALSE;
    v_next_creado_en   TEXT;
    v_next_id          UUID;
    v_items            JSONB := '[]'::jsonb;
BEGIN
    v_id             := NULLIF(p_params->>'id', '')::UUID;
    v_anio_id        := NULLIF(p_params->>'anioAcademicoId', '')::UUID;
    v_grado_id       := NULLIF(p_params->>'gradoId', '')::UUID;
    v_seccion_id     := NULLIF(p_params->>'seccionId', '')::UUID;
    v_tipo           := NULLIF(TRIM(p_params->>'tipo'), '');
    v_estado         := NULLIF(TRIM(p_params->>'estado'), '');
    v_search         := NULLIF(TRIM(p_params->>'search'), '');
    v_limit          := LEAST(COALESCE((p_params->>'limit')::INT, 20), 100);

    IF v_search IS NOT NULL THEN
        v_pattern := '%' || v_search || '%';
    END IF;

    IF p_params ? 'cursorId' AND (p_params->>'cursorId') IS NOT NULL AND (p_params->>'cursorId') <> '' THEN
        v_cursor_creado_en := (p_params->>'cursorCreadoEn')::TIMESTAMPTZ;
        v_cursor_id        := (p_params->>'cursorId')::UUID;
    END IF;

    WITH base_matriculas AS (
        SELECT 
            m.id,
            m.codigo,
            m.fecha_matricula::TEXT AS fecha_matricula,
            m.tipo,
            m.estado,
            m.es_repitente,
            m.colegio_procedencia,
            m.fecha_retiro::TEXT AS fecha_retiro,
            m.motivo_retiro,
            m.observaciones,
            m.registrado_por_id,
            m.creado_en,
            m.actualizado_en::TEXT AS actualizado_en,
            -- Año académico
            m.anio_academico_id,
            a.anio AS anio_numero,
            -- Grado y Sección
            sec.grado_id,
            g.numero AS grado_numero,
            g.nombre AS grado_nombre,
            m.seccion_id,
            sec.nombre AS seccion_nombre,
            -- Estudiante y Persona
            e.id AS estudiante_id,
            e.codigo AS estudiante_codigo,
            e.estado AS estudiante_estado,
            p.nombres AS persona_nombres,
            p.apellido_paterno AS persona_apellido_paterno,
            p.apellido_materno AS persona_apellido_materno,
            CASE 
                WHEN p.apellido_materno IS NOT NULL AND TRIM(p.apellido_materno) <> '' 
                THEN p.apellido_paterno || ' ' || p.apellido_materno
                ELSE p.apellido_paterno 
            END AS persona_apellidos,
            p.tipo_documento AS persona_tipo_documento,
            p.numero_documento AS persona_numero_documento
        FROM matriculas m
        INNER JOIN anios_academicos a ON m.anio_academico_id = a.id
        INNER JOIN secciones sec ON m.seccion_id = sec.id
        INNER JOIN grados g ON sec.grado_id = g.id
        INNER JOIN estudiantes e ON m.estudiante_id = e.id
        INNER JOIN personas p ON e.persona_id = p.id
        WHERE (v_id IS NULL OR m.id = v_id)
          AND (v_anio_id IS NULL OR m.anio_academico_id = v_anio_id)
          AND (v_grado_id IS NULL OR sec.grado_id = v_grado_id)
          AND (v_seccion_id IS NULL OR m.seccion_id = v_seccion_id)
          AND (v_tipo IS NULL OR m.tipo = v_tipo)
          AND (v_estado IS NULL OR m.estado = v_estado)
          AND (
              v_pattern IS NULL
              OR m.codigo ILIKE v_pattern
              OR e.codigo ILIKE v_pattern
              OR p.numero_documento ILIKE v_pattern
              OR p.nombres ILIKE v_pattern
              OR p.apellido_paterno ILIKE v_pattern
              OR p.apellido_materno ILIKE v_pattern
          )
    ),
    filtradas AS (
        SELECT *
        FROM base_matriculas bm
        WHERE (
            v_cursor_id IS NULL 
            OR (bm.creado_en, bm.id) < (v_cursor_creado_en, v_cursor_id)
        )
        ORDER BY bm.creado_en DESC, bm.id DESC
        LIMIT (v_limit + 1)
    ),
    con_numero AS (
        SELECT *, ROW_NUMBER() OVER () AS rn FROM filtradas
    )
    SELECT 
        COUNT(*) > v_limit,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', f.id,
                    'codigo', f.codigo,
                    'fechaMatricula', f.fecha_matricula,
                    'tipo', f.tipo,
                    'estado', f.estado,
                    'esRepitente', f.es_repitente,
                    'colegioProcedencia', f.colegio_procedencia,
                    'fechaRetiro', f.fecha_retiro,
                    'motivoRetiro', f.motivo_retiro,
                    'observaciones', f.observaciones,
                    'registradoPorId', f.registrado_por_id,
                    'creadoEn', f.creado_en::TEXT,
                    'actualizadoEn', f.actualizado_en,
                    'anioAcademicoId', f.anio_academico_id,
                    'anioNumero', f.anio_numero,
                    'gradoId', f.grado_id,
                    'gradoNumero', f.grado_numero,
                    'gradoNombre', f.grado_nombre,
                    'seccionId', f.seccion_id,
                    'seccionNombre', f.seccion_nombre,
                    'estudiante', jsonb_build_object(
                        'id', f.estudiante_id,
                        'codigo', f.estudiante_codigo,
                        'nombres', f.persona_nombres,
                        'apellidos', f.persona_apellidos,
                        'tipoDocumento', f.persona_tipo_documento,
                        'numeroDocumento', f.persona_numero_documento,
                        'estado', f.estudiante_estado
                    )
                )
            ) FILTER (WHERE f.rn <= v_limit),
            '[]'::jsonb
        )
    INTO v_has_more, v_items
    FROM con_numero f;

    IF v_has_more THEN
        SELECT 
            creado_en::TEXT,
            id
        INTO v_next_creado_en, v_next_id
        FROM con_numero
        WHERE rn = v_limit;
    END IF;

    RETURN jsonb_build_object(
        'data', v_items,
        'hasMore', v_has_more,
        'nextCursorCreadoEn', v_next_creado_en,
        'nextCursorId', v_next_id
    );
END;
$$;
