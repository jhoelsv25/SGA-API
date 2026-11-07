-- ============================================================================
-- Función: fn_consultar_personas
-- Descripción: Consulta padrón único de personas con metadatos de fichas activas
--              (docente, estudiante, apoderado, usuario) y cargo vigente,
--              filtros dinámicos y paginación por cursor ordenada por apellidos.
-- Parámetro: p_params (JSONB) con:
--   - id: UUID string | null (consulta por ID específico)
--   - search: string | null (búsqueda en numero_documento o nombres/apellidos)
--   - tipoDocumento: string | null
--   - numeroDocumento: string | null
--   - esProvisional: boolean | null
--   - cursorPaterno: string | null
--   - cursorMaterno: string | null
--   - cursorNombres: string | null
--   - cursorId: UUID string | null
--   - limit: INT (default 10)
-- Retorno: JSONB con { data: [...], hasMore: boolean, nextCursorPaterno: string, ... }
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_consultar_personas(p_params JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_id              UUID;
    v_search          TEXT;
    v_pattern         TEXT;
    v_tipo_doc        TEXT;
    v_numero_doc      TEXT;
    v_es_provisional  BOOLEAN;
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
    v_id             := NULLIF(p_params->>'id', '')::UUID;
    v_search         := NULLIF(TRIM(p_params->>'search'), '');
    v_tipo_doc       := NULLIF(TRIM(p_params->>'tipoDocumento'), '');
    v_numero_doc     := NULLIF(TRIM(p_params->>'numeroDocumento'), '');
    v_es_provisional := (p_params->>'esProvisional')::BOOLEAN;
    v_limit          := COALESCE((p_params->>'limit')::INT, 10);

    IF v_search IS NOT NULL THEN
        v_pattern := '%' || v_search || '%';
    END IF;

    IF p_params ? 'cursorId' AND (p_params->>'cursorId') IS NOT NULL THEN
        v_cursor_paterno := COALESCE(p_params->>'cursorPaterno', '');
        v_cursor_materno := COALESCE(p_params->>'cursorMaterno', '');
        v_cursor_nombres := COALESCE(p_params->>'cursorNombres', '');
        v_cursor_id      := (p_params->>'cursorId')::UUID;
    END IF;

    WITH base_personas AS (
        SELECT 
            p.id,
            p.tipo_documento,
            p.numero_documento,
            p.nombres,
            p.apellido_paterno,
            p.apellido_materno,
            CASE 
                WHEN p.apellido_materno IS NOT NULL AND TRIM(p.apellido_materno) <> '' 
                THEN p.apellido_paterno || ' ' || p.apellido_materno || ', ' || p.nombres
                ELSE p.apellido_paterno || ', ' || p.nombres
            END AS nombre_completo,
            p.sexo,
            p.fecha_nacimiento::TEXT AS fecha_nacimiento,
            p.direccion,
            p.distrito,
            p.telefono,
            p.celular,
            p.correo,
            p.foto_url,
            p.creado_en::TEXT AS creado_en,
            p.actualizado_en::TEXT AS actualizado_en,
            EXISTS (
                SELECT 1 FROM docentes d 
                WHERE d.persona_id = p.id AND d.eliminado_en IS NULL
            ) AS es_docente,
            EXISTS (
                SELECT 1 FROM estudiantes e 
                WHERE e.persona_id = p.id AND e.eliminado_en IS NULL
            ) AS es_estudiante,
            (
                SELECT d.estado FROM docentes d
                WHERE d.persona_id = p.id AND d.eliminado_en IS NULL
                LIMIT 1
            ) AS estado_docente,
            (
                SELECT e.estado FROM estudiantes e
                WHERE e.persona_id = p.id AND e.eliminado_en IS NULL
                LIMIT 1
            ) AS estado_estudiante,
            EXISTS (
                SELECT 1 FROM apoderados a 
                WHERE a.persona_id = p.id AND a.eliminado_en IS NULL
            ) AS es_apoderado,
            EXISTS (
                SELECT 1 FROM usuarios u 
                WHERE u.persona_id = p.id AND u.eliminado_en IS NULL
            ) AS tiene_usuario,
            (
                SELECT c.nombre 
                FROM persona_cargos pc
                INNER JOIN cargos c ON pc.cargo_id = c.id
                WHERE pc.persona_id = p.id AND pc.vigente = true
                LIMIT 1
            ) AS cargo_vigente
        FROM personas p
        WHERE p.eliminado_en IS NULL
          AND (v_id IS NULL OR p.id = v_id)
          AND (v_tipo_doc IS NULL OR p.tipo_documento = v_tipo_doc)
          AND (v_numero_doc IS NULL OR p.numero_documento = v_numero_doc)
          AND (
              v_pattern IS NULL 
              OR p.numero_documento ILIKE v_pattern
              OR p.nombres ILIKE v_pattern
              OR p.apellido_paterno ILIKE v_pattern
              OR p.apellido_materno ILIKE v_pattern
          )
    ),
    con_provisional AS (
        SELECT 
            bp.*,
            NOT (bp.es_docente OR bp.es_estudiante OR bp.es_apoderado OR bp.tiene_usuario) AS es_provisional
        FROM base_personas bp
    ),
    filtradas AS (
        SELECT *
        FROM con_provisional cp
        WHERE (v_es_provisional IS NULL OR cp.es_provisional = v_es_provisional)
          AND (
              v_cursor_id IS NULL 
              OR (cp.apellido_paterno, COALESCE(cp.apellido_materno, ''), cp.nombres, cp.id) > 
                 (v_cursor_paterno, v_cursor_materno, v_cursor_nombres, v_cursor_id)
          )
        ORDER BY cp.apellido_paterno ASC, COALESCE(cp.apellido_materno, '') ASC, cp.nombres ASC, cp.id ASC
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
                    'tipoDocumento', f.tipo_documento,
                    'numeroDocumento', f.numero_documento,
                    'nombres', f.nombres,
                    'apellidoPaterno', f.apellido_paterno,
                    'apellidoMaterno', f.apellido_materno,
                    'nombreCompleto', f.nombre_completo,
                    'sexo', f.sexo,
                    'fechaNacimiento', f.fecha_nacimiento,
                    'direccion', f.direccion,
                    'distrito', f.distrito,
                    'telefono', f.telefono,
                    'celular', f.celular,
                    'correo', f.correo,
                    'fotoUrl', f.foto_url,
                    'esProvisional', f.es_provisional,
                    'fichas', jsonb_build_object(
                        'esDocente', f.es_docente,
                        'esEstudiante', f.es_estudiante,
                        'estadoDocente', f.estado_docente,
                        'estadoEstudiante', f.estado_estudiante,
                        'esApoderado', f.es_apoderado,
                        'tieneUsuario', f.tiene_usuario
                    ),
                    'cargoVigente', f.cargo_vigente,
                    'creadoEn', f.creado_en,
                    'actualizadoEn', f.actualizado_en
                )
            ) FILTER (WHERE f.rn <= v_limit),
            '[]'::jsonb
        ),
        MAX(CASE WHEN f.rn = v_limit THEN f.apellido_paterno END),
        MAX(CASE WHEN f.rn = v_limit THEN COALESCE(f.apellido_materno, '') END),
        MAX(CASE WHEN f.rn = v_limit THEN f.nombres END),
        MAX(CASE WHEN f.rn = v_limit THEN f.id::text END)::uuid
    INTO v_has_more, v_items, v_next_paterno, v_next_materno, v_next_nombres, v_next_id
    FROM con_numero f;

    IF NOT v_has_more THEN
        v_next_paterno := NULL;
        v_next_materno := NULL;
        v_next_nombres := NULL;
        v_next_id      := NULL;
    END IF;

    RETURN jsonb_build_object(
        'data', v_items,
        'hasMore', v_has_more,
        'nextCursorPaterno', v_next_paterno,
        'nextCursorMaterno', v_next_materno,
        'nextCursorNombres', v_next_nombres,
        'nextCursorId', v_next_id,
        'limit', v_limit
    );
END;
$$;
