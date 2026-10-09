-- ============================================================================
-- Función: fn_consultar_docentes
-- Descripción: Consulta el padrón de docentes con metadatos de persona,
--              cargo vigente, cuenta de usuario, credencial de marcación,
--              filtros dinámicos y paginación por cursor.
-- Parámetro: p_params (JSONB) con:
--   - id: UUID string | null (consulta por ID específico de docente)
--   - personaId: UUID string | null
--   - codigo: string | null (búsqueda por código exacto)
--   - search: string | null (búsqueda en código, documento o nombres/apellidos)
--   - tipoContrato: string | null ('nombrado', 'contratado', 'practicante')
--   - estado: string | null ('activo', 'licencia', 'cesado')
--   - cursorPaterno: string | null
--   - cursorMaterno: string | null
--   - cursorNombres: string | null
--   - cursorId: UUID string | null
--   - limit: INT (default 10)
-- Retorno: JSONB con { data: [...], hasMore: boolean, nextCursorPaterno: string, ... }
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_consultar_docentes(p_params JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_id              UUID;
    v_persona_id      UUID;
    v_codigo          TEXT;
    v_search          TEXT;
    v_pattern         TEXT;
    v_tipo_contrato   TEXT;
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
    v_tipo_contrato  := NULLIF(TRIM(p_params->>'tipoContrato'), '');
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

    WITH base_docentes AS (
        SELECT 
            d.id,
            d.codigo,
            d.persona_id,
            d.especialidad,
            d.titulo_profesional,
            d.tipo_contrato,
            d.jornada_horas,
            d.fecha_ingreso::TEXT AS fecha_ingreso,
            d.fecha_cese::TEXT AS fecha_cese,
            d.estado,
            d.firma_url,
            d.creado_en::TEXT AS creado_en,
            d.actualizado_en::TEXT AS actualizado_en,
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
                SELECT 1 FROM estudiantes e 
                WHERE e.persona_id = p.id AND e.eliminado_en IS NULL
            ) AS es_estudiante,
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
        FROM docentes d
        INNER JOIN personas p ON d.persona_id = p.id
        WHERE d.eliminado_en IS NULL
          AND p.eliminado_en IS NULL
          AND (v_id IS NULL OR d.id = v_id)
          AND (v_persona_id IS NULL OR d.persona_id = v_persona_id)
          AND (v_codigo IS NULL OR d.codigo = v_codigo)
          AND (v_tipo_contrato IS NULL OR d.tipo_contrato = v_tipo_contrato)
          AND (v_estado IS NULL OR d.estado = v_estado)
          AND (
              v_pattern IS NULL 
              OR d.codigo ILIKE v_pattern
              OR p.numero_documento ILIKE v_pattern
              OR p.nombres ILIKE v_pattern
              OR p.apellido_paterno ILIKE v_pattern
              OR p.apellido_materno ILIKE v_pattern
          )
    ),
    filtradas AS (
        SELECT *
        FROM base_docentes bd
        WHERE (
            v_cursor_id IS NULL 
            OR (bd.apellido_paterno, COALESCE(bd.apellido_materno, ''), bd.nombres, bd.id) > 
               (v_cursor_paterno, v_cursor_materno, v_cursor_nombres, v_cursor_id)
        )
        ORDER BY bd.apellido_paterno ASC, COALESCE(bd.apellido_materno, '') ASC, bd.nombres ASC, bd.id ASC
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
                    'especialidad', f.especialidad,
                    'tituloProfesional', f.titulo_profesional,
                    'tipoContrato', f.tipo_contrato,
                    'jornadaHoras', f.jornada_horas,
                    'fechaIngreso', f.fecha_ingreso,
                    'fechaCese', f.fecha_cese,
                    'estado', f.estado,
                    'firmaUrl', f.firma_url,
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
                            'esDocente', true,
                            'esEstudiante', f.es_estudiante,
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
        )
    INTO v_has_more, v_items
    FROM con_numero f;

    IF v_has_more THEN
        SELECT 
            apellido_paterno,
            COALESCE(apellido_materno, ''),
            nombres,
            id
        INTO v_next_paterno, v_next_materno, v_next_nombres, v_next_id
        FROM con_numero
        WHERE rn = v_limit;
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
