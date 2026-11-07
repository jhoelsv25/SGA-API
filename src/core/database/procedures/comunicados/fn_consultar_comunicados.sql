-- ============================================================================
-- Función: fn_consultar_comunicados
-- Descripción: Consulta el listado de comunicados con filtros, estadísticas
--              de lectura y paginación por cursor.
-- Parámetro: p_params (JSONB) con:
--   - usuarioId: UUID (obligatorio)
--   - soloMios: BOOLEAN (default false)
--   - estado: TEXT | null ('borrador', 'publicado', 'archivado', 'all')
--   - dirigidoA: TEXT | null ('todos', 'docentes', 'estudiantes', 'apoderados', 'all')
--   - prioridad: TEXT | null ('normal', 'importante', 'urgente', 'all')
--   - gradoId: UUID | null
--   - seccionId: UUID | null
--   - search: TEXT | null
--   - cursorCreadoEn: TEXT | null
--   - cursorId: UUID | null
--   - limit: INT (default 20, max 50)
-- Retorno: JSONB con { data: [...], hasMore: boolean, nextCursorCreadoEn, nextCursorId }
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_consultar_comunicados(p_params JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_usuario_id       UUID;
    v_solo_mios        BOOLEAN;
    v_estado           TEXT;
    v_dirigido_a       TEXT;
    v_prioridad        TEXT;
    v_grado_id         UUID;
    v_seccion_id       UUID;
    v_search           TEXT;
    v_cursor_creado_en TIMESTAMPTZ;
    v_cursor_id        UUID;
    v_limit            INT;
    v_has_more         BOOLEAN := FALSE;
    v_next_creado_en   TEXT;
    v_next_id          UUID;
    v_items            JSONB := '[]'::jsonb;
BEGIN
    v_usuario_id       := (p_params->>'usuarioId')::UUID;
    v_solo_mios        := COALESCE((p_params->>'soloMios')::BOOLEAN, FALSE);
    v_estado           := NULLIF(TRIM(p_params->>'estado'), '');
    v_dirigido_a       := NULLIF(TRIM(p_params->>'dirigidoA'), '');
    v_prioridad        := NULLIF(TRIM(p_params->>'prioridad'), '');
    v_grado_id         := NULLIF(TRIM(p_params->>'gradoId'), '')::UUID;
    v_seccion_id       := NULLIF(TRIM(p_params->>'seccionId'), '')::UUID;
    v_search           := NULLIF(TRIM(p_params->>'search'), '');
    v_limit            := LEAST(COALESCE((p_params->>'limit')::INT, 20), 50);

    IF v_usuario_id IS NULL THEN
        RAISE EXCEPTION 'El parámetro usuarioId es obligatorio para consultar comunicados.';
    END IF;

    IF p_params ? 'cursorId' AND (p_params->>'cursorId') IS NOT NULL AND (p_params->>'cursorId') <> '' THEN
        v_cursor_creado_en := (p_params->>'cursorCreadoEn')::TIMESTAMPTZ;
        v_cursor_id        := (p_params->>'cursorId')::UUID;
    END IF;

    WITH base_comunicados AS (
        SELECT 
            c.id,
            c.autor_id,
            TRIM(CONCAT(p.nombres, ' ', p.apellido_paterno, ' ', COALESCE(p.apellido_materno, ''))) AS autor_nombre,
            c.titulo,
            c.contenido,
            c.dirigido_a,
            c.grado_id,
            g.numero AS grado_numero,
            c.seccion_id,
            s.nombre AS seccion_nombre,
            c.prioridad,
            c.estado,
            c.adjunto_url,
            c.publicado_en::TEXT AS publicado_en,
            c.vence_en::TEXT AS vence_en,
            c.creado_en,
            -- Métricas agregadas de lectura desde notificaciones enlazadas
            COALESCE(stats.total_destinatarios, 0) AS total_destinatarios,
            COALESCE(stats.total_leidos, 0) AS total_leidos,
            CASE 
                WHEN COALESCE(stats.total_destinatarios, 0) > 0 
                THEN ROUND((COALESCE(stats.total_leidos, 0)::NUMERIC / stats.total_destinatarios) * 100, 1)
                ELSE 0.0
            END AS porcentaje_lectura,
            -- Indicador si el usuario actual ya lo leyó
            COALESCE(mi_lectura.leida, FALSE) AS leido_por_mi
        FROM comunicados c
        JOIN usuarios u ON u.id = c.autor_id
        JOIN personas p ON p.id = u.persona_id
        LEFT JOIN grados g ON g.id = c.grado_id
        LEFT JOIN secciones s ON s.id = c.seccion_id
        LEFT JOIN LATERAL (
            SELECT 
                COUNT(*)::INT AS total_destinatarios,
                COUNT(*) FILTER (WHERE n.leida)::INT AS total_leidos
            FROM notificaciones n
            WHERE n.comunicado_id = c.id
        ) stats ON TRUE
        LEFT JOIN LATERAL (
            SELECT n.leida
            FROM notificaciones n
            WHERE n.comunicado_id = c.id AND n.usuario_id = v_usuario_id
            LIMIT 1
        ) mi_lectura ON TRUE
        WHERE (
            -- Si es el autor, puede ver sus borradores, publicados y archivados
            c.autor_id = v_usuario_id
            -- Si no es el autor y no es soloMios, solo ve los publicados o archivados donde es destinatario
            OR (NOT v_solo_mios AND c.estado IN ('publicado', 'archivado') AND mi_lectura.leida IS NOT NULL)
        )
        AND (
            v_estado IS NULL OR v_estado = 'all' OR c.estado = v_estado
        )
        AND (
            v_dirigido_a IS NULL OR v_dirigido_a = 'all' OR c.dirigido_a = v_dirigido_a
        )
        AND (
            v_prioridad IS NULL OR v_prioridad = 'all' OR c.prioridad = v_prioridad
        )
        AND (
            v_grado_id IS NULL OR c.grado_id = v_grado_id
        )
        AND (
            v_seccion_id IS NULL OR c.seccion_id = v_seccion_id
        )
        AND (
            v_search IS NULL
            OR c.titulo ILIKE ('%' || v_search || '%')
            OR c.contenido ILIKE ('%' || v_search || '%')
        )
    ),
    filtradas AS (
        SELECT *
        FROM base_comunicados bc
        WHERE (
            v_cursor_id IS NULL 
            OR (bc.creado_en, bc.id) < (v_cursor_creado_en, v_cursor_id)
        )
        ORDER BY bc.creado_en DESC, bc.id DESC
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
                    'autorId', f.autor_id,
                    'autorNombre', f.autor_nombre,
                    'titulo', f.titulo,
                    'contenido', f.contenido,
                    'dirigidoA', f.dirigido_a,
                    'gradoId', f.grado_id,
                    'gradoNumero', f.grado_numero,
                    'seccionId', f.seccion_id,
                    'seccionNombre', f.seccion_nombre,
                    'prioridad', f.prioridad,
                    'estado', f.estado,
                    'adjuntoUrl', f.adjunto_url,
                    'publicadoEn', f.publicado_en,
                    'venceEn', f.vence_en,
                    'creadoEn', f.creado_en::TEXT,
                    'totalDestinatarios', f.total_destinatarios,
                    'totalLeidos', f.total_leidos,
                    'porcentajeLectura', f.porcentaje_lectura,
                    'leidoPorMi', f.leido_por_mi
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
        'hasMore', v_has_more,
        'nextCursorCreadoEn', v_next_creado_en,
        'nextCursorId', v_next_id
    );
END;
$$;
