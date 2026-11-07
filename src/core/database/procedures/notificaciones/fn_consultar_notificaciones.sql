-- ============================================================================
-- Función: fn_consultar_notificaciones
-- Descripción: Consulta la bandeja personal de notificaciones de un usuario
--              con filtros (search, tipo, estado), conteo de no leídas y
--              paginación por cursor.
-- Parámetro: p_params (JSONB) con:
--   - usuarioId: UUID (obligatorio)
--   - soloNoLeidas: BOOLEAN | null
--   - estado: TEXT | null ('no_leidas', 'leidas', 'all')
--   - tipo: TEXT | null ('informacion', 'alerta', 'recordatorio', 'all')
--   - search: TEXT | null (búsqueda en título o mensaje)
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
    v_estado           TEXT;
    v_tipo             TEXT;
    v_search           TEXT;
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
    v_estado         := NULLIF(TRIM(p_params->>'estado'), '');
    v_tipo           := NULLIF(TRIM(p_params->>'tipo'), '');
    v_search         := NULLIF(TRIM(p_params->>'search'), '');
    v_limit          := LEAST(COALESCE((p_params->>'limit')::INT, 20), 50);

    IF v_usuario_id IS NULL THEN
        RAISE EXCEPTION 'El parámetro usuarioId es obligatorio para consultar notificaciones.';
    END IF;

    -- Conteo total de no leídas del usuario (siempre global)
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
          AND (
              CASE 
                  WHEN v_solo_no_leidas THEN NOT n.leida
                  WHEN v_estado = 'no_leidas' THEN NOT n.leida
                  WHEN v_estado = 'leidas' THEN n.leida
                  ELSE TRUE
              END
          )
          AND (v_tipo IS NULL OR v_tipo = 'all' OR n.tipo = v_tipo)
          AND (
              v_search IS NULL
              OR n.titulo ILIKE ('%' || v_search || '%')
              OR n.mensaje ILIKE ('%' || v_search || '%')
          )
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
        ),
        MAX(CASE WHEN f.rn = v_limit THEN f.creado_en::text END),
        MAX(CASE WHEN f.rn = v_limit THEN f.id::text END)::uuid
    INTO v_has_more, v_items, v_next_creado_en, v_next_id
    FROM con_numero f;

    IF NOT v_has_more THEN
        v_next_creado_en := NULL;
        v_next_id        := NULL;
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
