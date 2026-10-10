-- ============================================================================
-- Función: fn_consultar_notificaciones
-- Descripción: Consulta la bandeja personal de notificaciones de un usuario
--              con filtros, conteo de no leídas y paginación por cursor.
-- Parámetro: p_params (JSONB) con:
--   - usuarioId: UUID (obligatorio)
--   - soloNoLeidas: BOOLEAN | null
--   - cursorCreadoEn: TEXT | null (ISO timestamp)
--   - cursorId: UUID | null
--   - limit: INT (default 20, max 50)
-- Retorno: JSONB con { data: [...], unreadCount: int, hasMore: boolean, nextCursorCreadoEn, nextCursorId }
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_consultar_notificaciones(p_params JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_usuario_id       UUID;
    v_solo_no_leidas   BOOLEAN;
    v_cursor_creado_en TIMESTAMPTZ;
    v_cursor_id        UUID;
    v_limit            INT;
    v_unread_count     INT := 0;
    v_has_more         BOOLEAN := FALSE;
    v_next_creado_en   TEXT;
    v_next_id          UUID;
    v_items            JSONB := '[]'::jsonb;
BEGIN
    v_usuario_id     := (p_params->>'usuarioId')::UUID;
    v_solo_no_leidas := COALESCE((p_params->>'soloNoLeidas')::BOOLEAN, FALSE);
    v_limit          := LEAST(COALESCE((p_params->>'limit')::INT, 20), 50);

    IF v_usuario_id IS NULL THEN
        RAISE EXCEPTION 'El parámetro usuarioId es obligatorio para consultar notificaciones.';
    END IF;

    -- Conteo total de no leídas del usuario
    SELECT COUNT(*)
    INTO v_unread_count
    FROM notificaciones
    WHERE usuario_id = v_usuario_id AND NOT leida;

    IF p_params ? 'cursorId' AND (p_params->>'cursorId') IS NOT NULL AND (p_params->>'cursorId') <> '' THEN
        v_cursor_creado_en := (p_params->>'cursorCreadoEn')::TIMESTAMPTZ;
        v_cursor_id        := (p_params->>'cursorId')::UUID;
    END IF;

    WITH base_notificaciones AS (
        SELECT 
            n.id,
            n.usuario_id,
            n.titulo,
            n.mensaje,
            n.tipo,
            n.enlace_url,
            n.comunicado_id,
            n.sesion_clase_id,
            n.leida,
            n.leida_en::TEXT AS leida_en,
            n.creado_en
        FROM notificaciones n
        WHERE n.usuario_id = v_usuario_id
          AND (NOT v_solo_no_leidas OR NOT n.leida)
    ),
    filtradas AS (
        SELECT *
        FROM base_notificaciones bn
        WHERE (
            v_cursor_id IS NULL 
            OR (bn.creado_en, bn.id) < (v_cursor_creado_en, v_cursor_id)
        )
        ORDER BY bn.creado_en DESC, bn.id DESC
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
                    'usuarioId', f.usuario_id,
                    'titulo', f.titulo,
                    'mensaje', f.mensaje,
                    'tipo', f.tipo,
                    'enlaceUrl', f.enlace_url,
                    'comunicadoId', f.comunicado_id,
                    'sesionClaseId', f.sesion_clase_id,
                    'leida', f.leida,
                    'leidaEn', f.leida_en,
                    'creadoEn', f.creado_en::TEXT
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
        'unreadCount', v_unread_count,
        'hasMore', v_has_more,
        'nextCursorCreadoEn', v_next_creado_en,
        'nextCursorId', v_next_id
    );
END;
$$;
