-- ============================================================================
-- Función: fn_consultar_bitacora_auditoria
-- Descripción: Consulta la bitácora de auditoría con filtros dinámicos y
--              paginación por cursor (Keyset pagination).
-- Parámetro: p_params (JSONB) con:
--   - fechaInicio: TIMESTAMP string (obligatorio)
--   - fechaFin: TIMESTAMP string (obligatorio)
--   - usuario: string | null
--   - accion: string | null
--   - tablas: string[] | null (lista de tablas específicas del módulo)
--   - entidad: string | null (búsqueda parcial de tabla)
--   - cursorFecha: TIMESTAMP string | null
--   - cursorId: BIGINT | null
--   - limit: INT (default 50)
-- Retorno: JSONB con { data: [...], hasMore: boolean, nextCursorFecha: string, nextCursorId: number }
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_consultar_bitacora_auditoria(p_params JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_fecha_inicio       TIMESTAMP;
    v_fecha_fin          TIMESTAMP;
    v_usuario            TEXT;
    v_accion             TEXT;
    v_tablas             TEXT[];
    v_entidad            TEXT;
    v_cursor_fecha       TIMESTAMP;
    v_cursor_id          BIGINT;
    v_limit              INT;
    v_has_more           BOOLEAN := FALSE;
    v_next_cursor_fecha  TIMESTAMP;
    v_next_cursor_id     BIGINT;
    v_items              JSONB := '[]'::jsonb;
BEGIN
    -- 1. Extracción y sanitización de parámetros JSONB
    v_fecha_inicio := (p_params->>'fechaInicio')::TIMESTAMP;
    v_fecha_fin    := (p_params->>'fechaFin')::TIMESTAMP;
    v_usuario      := NULLIF(TRIM(p_params->>'usuario'), '');
    v_accion       := NULLIF(TRIM(p_params->>'accion'), '');
    v_entidad      := NULLIF(TRIM(p_params->>'entidad'), '');
    
    IF p_params ? 'tablas' AND jsonb_typeof(p_params->'tablas') = 'array' THEN
        SELECT array_agg(x) INTO v_tablas 
        FROM jsonb_array_elements_text(p_params->'tablas') t(x);
    END IF;

    IF p_params ? 'cursorFecha' AND (p_params->>'cursorFecha') IS NOT NULL THEN
        v_cursor_fecha := (p_params->>'cursorFecha')::TIMESTAMP;
    END IF;

    IF p_params ? 'cursorId' AND (p_params->>'cursorId') IS NOT NULL THEN
        v_cursor_id := (p_params->>'cursorId')::BIGINT;
    END IF;

    v_limit := COALESCE((p_params->>'limit')::INT, 50);

    -- 2. Keyset Query con límite (v_limit + 1) para inferir hasMore sin COUNT(*)
    WITH filas AS (
        SELECT 
            b.id,
            b.registrado_en,
            b.usuario_id,
            u.nombre_usuario AS usuario_nombre,
            b.accion,
            b.tabla,
            b.registro_id,
            b.valor_anterior,
            b.valor_nuevo,
            b.direccion_ip
        FROM bitacora_auditoria b
        LEFT JOIN usuarios u ON b.usuario_id = u.id
        WHERE b.registrado_en >= v_fecha_inicio
          AND b.registrado_en <= v_fecha_fin
          AND (
              v_usuario IS NULL 
              OR (LOWER(v_usuario) = 'sistema' AND b.usuario_id IS NULL)
              OR (b.usuario_id::text = v_usuario)
              OR (u.nombre_usuario ILIKE '%' || v_usuario || '%')
          )
          AND (v_accion IS NULL OR b.accion = v_accion)
          AND (
              (v_tablas IS NULL AND v_entidad IS NULL)
              OR (v_tablas IS NOT NULL AND b.tabla = ANY(v_tablas))
              OR (v_entidad IS NOT NULL AND b.tabla ILIKE '%' || v_entidad || '%')
          )
          -- Condición Keyset / Cursor (O(1) index scan)
          AND (
              v_cursor_fecha IS NULL 
              OR (b.registrado_en, b.id) < (v_cursor_fecha, v_cursor_id)
          )
        ORDER BY b.registrado_en DESC, b.id DESC
        LIMIT (v_limit + 1)
    ),
    con_numero AS (
        SELECT *, ROW_NUMBER() OVER () AS rn FROM filas
    )
    SELECT 
        COUNT(*) > v_limit,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'usuarioId', usuario_id,
                    'usuarioNombre', usuario_nombre,
                    'accion', accion,
                    'tabla', tabla,
                    'registroId', registro_id,
                    'valorAnterior', valor_anterior,
                    'valorNuevo', valor_nuevo,
                    'direccionIp', direccion_ip,
                    'registradoEn', to_char(registrado_en, 'YYYY-MM-DD HH24:MI:SS')
                )
            ) FILTER (WHERE rn <= v_limit),
            '[]'::jsonb
        ),
        MAX(CASE WHEN rn = v_limit THEN registrado_en END),
        MAX(CASE WHEN rn = v_limit THEN id END)
    INTO v_has_more, v_items, v_next_cursor_fecha, v_next_cursor_id
    FROM con_numero;

    -- 3. Respuesta JSONB unificada
    RETURN jsonb_build_object(
        'data', v_items,
        'hasMore', COALESCE(v_has_more, FALSE),
        'nextCursorFecha', CASE WHEN v_has_more THEN to_char(v_next_cursor_fecha, 'YYYY-MM-DD HH24:MI:SS') ELSE NULL END,
        'nextCursorId', CASE WHEN v_has_more THEN v_next_cursor_id ELSE NULL END
    );
END;
$$;
