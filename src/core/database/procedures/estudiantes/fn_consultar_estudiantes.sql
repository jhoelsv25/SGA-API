-- ============================================================================
-- Función: fn_consultar_estudiantes
-- Descripción: Consulta el padrón de estudiantes con metadatos de persona,
--              cargo vigente, cuenta de usuario, credencial de marcación,
--              filtros dinámicos y paginación por cursor.
-- Parámetro: p_params (JSONB) con:
--   - id: UUID string | null (consulta por ID específico de estudiante)
--   - personaId: UUID string | null
--   - codigo: string | null (búsqueda por código SIAGIE exacto)
--   - search: string | null (búsqueda en código SIAGIE, documento o nombres/apellidos)
--   - estado: string | null ('activo', 'retirado', 'trasladado', 'egresado')
--   - cursorPaterno: string | null
--   - cursorMaterno: string | null
--   - cursorNombres: string | null
--   - cursorId: UUID string | null
--   - limit: INT (default 10)
-- Retorno: JSONB con { data: [...], hasMore: boolean, nextCursorPaterno: string, ... }
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_consultar_estudiantes(p_params JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_id              UUID;
    v_persona_id      UUID;
    v_codigo          TEXT;
    v_search          TEXT;
    v_pattern         TEXT;
    v_estado          TEXT;
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
    v_persona_id     := NULLIF(p_params->>'personaId', '')::UUID;
    v_codigo         := NULLIF(TRIM(p_params->>'codigo'), '');
    v_search         := NULLIF(TRIM(p_params->>'search'), '');
    v_estado         := NULLIF(TRIM(p_params->>'estado'), '');
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

    WITH base_estudiantes AS (
        SELECT 
            e.id,
            e.codigo,
            e.persona_id,
            e.fecha_ingreso::TEXT AS fecha_ingreso,
            e.lengua_materna,
            e.religion,
            e.tiene_discapacidad,
            e.detalle_discapacidad,
            e.grupo_sanguineo,
            e.alergias,
            e.condiciones_medicas,
            e.seguro_salud,
            e.estado,
            e.creado_en::TEXT AS creado_en,
            e.actualizado_en::TEXT AS actualizado_en,
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
            p.creado_en::TEXT AS persona_creado_en,
            p.actualizado_en::TEXT AS persona_actualizado_en,
            EXISTS (
                SELECT 1 FROM docentes d 
                WHERE d.persona_id = p.id AND d.eliminado_en IS NULL
            ) AS es_docente,
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
            ) AS cargo_vigente,
            (
                SELECT jsonb_build_object(
                    'id', u.id,
                    'nombreUsuario', u.nombre_usuario,
                    'estado', u.estado
                )
                FROM usuarios u
                WHERE u.persona_id = p.id AND u.eliminado_en IS NULL
                LIMIT 1
            ) AS usuario_json,
            (
                SELECT jsonb_build_object(
                    'id', cr.id,
                    'codigo', cr.codigo,
                    'activa', cr.activa
                )
                FROM credenciales cr
                WHERE cr.persona_id = p.id AND cr.activa = true
                LIMIT 1
            ) AS credencial_json
        FROM estudiantes e
        INNER JOIN personas p ON e.persona_id = p.id
        WHERE e.eliminado_en IS NULL
          AND p.eliminado_en IS NULL
          AND (v_id IS NULL OR e.id = v_id)
          AND (v_persona_id IS NULL OR e.persona_id = v_persona_id)
          AND (v_codigo IS NULL OR e.codigo = v_codigo)
          AND (v_estado IS NULL OR e.estado = v_estado)
          AND (
              v_pattern IS NULL 
              OR e.codigo ILIKE v_pattern
              OR p.numero_documento ILIKE v_pattern
              OR p.nombres ILIKE v_pattern
              OR p.apellido_paterno ILIKE v_pattern
              OR p.apellido_materno ILIKE v_pattern
          )
    ),
    filtradas AS (
        SELECT *
        FROM base_estudiantes be
        WHERE (
            v_cursor_id IS NULL 
            OR (be.apellido_paterno, COALESCE(be.apellido_materno, ''), be.nombres, be.id) > 
               (v_cursor_paterno, v_cursor_materno, v_cursor_nombres, v_cursor_id)
        )
        ORDER BY be.apellido_paterno ASC, COALESCE(be.apellido_materno, '') ASC, be.nombres ASC, be.id ASC
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
                    'personaId', f.persona_id,
                    'fechaIngreso', f.fecha_ingreso,
                    'lenguaMaterna', f.lengua_materna,
                    'religion', f.religion,
                    'tieneDiscapacidad', f.tiene_discapacidad,
                    'detalleDiscapacidad', f.detalle_discapacidad,
                    'grupoSanguineo', f.grupo_sanguineo,
                    'alergias', f.alergias,
                    'condicionesMedicas', f.condiciones_medicas,
                    'seguroSalud', f.seguro_salud,
                    'estado', f.estado,
                    'cargoVigente', f.cargo_vigente,
                    'usuario', f.usuario_json,
                    'credencial', f.credencial_json,
                    'creadoEn', f.creado_en,
                    'actualizadoEn', f.actualizado_en,
                    'persona', jsonb_build_object(
                        'id', f.persona_id,
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
                        'esProvisional', false,
                        'fichas', jsonb_build_object(
                            'esDocente', f.es_docente,
                            'esEstudiante', true,
                            'esApoderado', f.es_apoderado,
                            'tieneUsuario', f.tiene_usuario
                        ),
                        'cargoVigente', f.cargo_vigente,
                        'creadoEn', f.persona_creado_en,
                        'actualizadoEn', f.persona_actualizado_en
                    )
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
