-- ============================================================================
-- Función: fn_consultar_usuarios
-- Descripción: Consulta cuentas de usuarios con padrón de personas y roles,
--              filtros dinámicos y paginación por cursor ordenada por apellidos.
-- Parámetro: p_params (JSONB) con:
--   - rolId: UUID string | null
--   - estado: string | null ('activo' | 'bloqueado' | 'inactivo')
--   - search: string | null (búsqueda en nombreUsuario o nombres/apellidos)
--   - cursorPaterno: string | null
--   - cursorMaterno: string | null
--   - cursorNombres: string | null
--   - cursorId: UUID string | null
--   - limit: INT (default 10)
-- Retorno: JSONB con { data: [...], hasMore: boolean, nextCursorPaterno: string, ... }
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_consultar_usuarios(p_params JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_rol_id          UUID;
    v_estado          TEXT;
    v_search          TEXT;
    v_pattern         TEXT;
    v_cursor_paterno  TEXT;
    v_cursor_materno  TEXT;
    v_cursor_nombres  TEXT;
    v_cursor_id       UUID;
    v_limit           INT;
    v_has_more        BOOLEAN := FALSE;
    v_next_paterno    TEXT;
    v_next_materno    TEXT;
    v_next_nombres    TEXT;
    v_next_id         UUID;
    v_items           JSONB := '[]'::jsonb;
BEGIN
    v_rol_id   := NULLIF(p_params->>'rolId', '')::UUID;
    v_estado   := NULLIF(TRIM(p_params->>'estado'), '');
    v_search   := NULLIF(TRIM(p_params->>'search'), '');
    v_limit    := COALESCE((p_params->>'limit')::INT, 10);

    IF v_search IS NOT NULL THEN
        v_pattern := '%' || v_search || '%';
    END IF;

    IF p_params ? 'cursorId' AND (p_params->>'cursorId') IS NOT NULL THEN
        v_cursor_paterno := COALESCE(p_params->>'cursorPaterno', '');
        v_cursor_materno := COALESCE(p_params->>'cursorMaterno', '');
        v_cursor_nombres := COALESCE(p_params->>'cursorNombres', '');
        v_cursor_id      := (p_params->>'cursorId')::UUID;
    END IF;

    WITH filas AS (
        SELECT 
            u.id AS usuario_id,
            u.nombre_usuario,
            u.estado,
            u.debe_cambiar_contrasena,
            u.intentos_fallidos,
            u.ultimo_acceso,
            u.creado_en,
            u.actualizado_en,
            p.id AS persona_id,
            p.tipo_documento,
            p.numero_documento,
            p.nombres,
            p.apellido_paterno,
            p.apellido_materno,
            p.correo,
            p.foto_url,
            r.id AS rol_id,
            r.nombre AS rol_nombre,
            r.es_sistema AS rol_es_sistema
        FROM usuarios u
        INNER JOIN personas p ON u.persona_id = p.id
        INNER JOIN roles r ON u.rol_id = r.id
        WHERE u.eliminado_en IS NULL
          AND (v_rol_id IS NULL OR u.rol_id = v_rol_id)
          AND (v_estado IS NULL OR u.estado = v_estado)
          AND (
              v_pattern IS NULL 
              OR u.nombre_usuario ILIKE v_pattern
              OR p.nombres ILIKE v_pattern
              OR p.apellido_paterno ILIKE v_pattern
              OR p.apellido_materno ILIKE v_pattern
          )
          AND (
              v_cursor_id IS NULL 
              OR (p.apellido_paterno, p.apellido_materno, p.nombres, u.id) > 
                 (v_cursor_paterno, v_cursor_materno, v_cursor_nombres, v_cursor_id)
          )
        ORDER BY p.apellido_paterno ASC, p.apellido_materno ASC, p.nombres ASC, u.id ASC
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
                    'id', usuario_id,
                    'nombreUsuario', nombre_usuario,
                    'estado', estado,
                    'debeCambiarContrasena', debe_cambiar_contrasena,
                    'intentosFallidos', intentos_fallidos,
                    'ultimoAcceso', to_char(ultimo_acceso, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                    'creadoEn', to_char(creado_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                    'actualizadoEn', to_char(actualizado_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                    'persona', jsonb_build_object(
                        'id', persona_id,
                        'tipoDocumento', tipo_documento,
                        'numeroDocumento', numero_documento,
                        'nombres', nombres,
                        'apellidoPaterno', apellido_paterno,
                        'apellidoMaterno', apellido_materno,
                        'correo', correo,
                        'fotoUrl', foto_url
                    ),
                    'rol', jsonb_build_object(
                        'id', rol_id,
                        'nombre', rol_nombre,
                        'esSistema', rol_es_sistema
                    )
                )
            ) FILTER (WHERE rn <= v_limit),
            '[]'::jsonb
        ),
        MAX(CASE WHEN rn = v_limit THEN apellido_paterno END),
        MAX(CASE WHEN rn = v_limit THEN apellido_materno END),
        MAX(CASE WHEN rn = v_limit THEN nombres END),
        MAX(CASE WHEN rn = v_limit THEN usuario_id END)
    INTO v_has_more, v_items, v_next_paterno, v_next_materno, v_next_nombres, v_next_id
    FROM con_numero;

    RETURN jsonb_build_object(
        'data', v_items,
        'hasMore', COALESCE(v_has_more, FALSE),
        'nextCursorPaterno', CASE WHEN v_has_more THEN v_next_paterno ELSE NULL END,
        'nextCursorMaterno', CASE WHEN v_has_more THEN v_next_materno ELSE NULL END,
        'nextCursorNombres', CASE WHEN v_has_more THEN v_next_nombres ELSE NULL END,
        'nextCursorId', CASE WHEN v_has_more THEN v_next_id ELSE NULL END
    );
END;
$$;
