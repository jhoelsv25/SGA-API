-- ============================================================================
-- Función: fn_consultar_apoderados
-- Descripción: Consulta el padrón de apoderados con datos de persona,
--              estudiantes a cargo, cargo vigente, cuenta de usuario,
--              filtros dinámicos y paginación por cursor alfabético.
-- Parámetro: p_params (JSONB) con:
--   - id: UUID string | null (consulta por ID específico de apoderado)
--   - personaId: UUID string | null
--   - estudianteId: UUID string | null (filtra apoderados de un estudiante)
--   - search: string | null (búsqueda en documento, nombres, apellidos o teléfono)
--   - gradoInstruccion: string | null
--   - cursorPaterno: string | null
--   - cursorMaterno: string | null
--   - cursorNombres: string | null
--   - cursorId: UUID string | null
--   - limit: INT (default 10)
-- Retorno: JSONB con { data: [...], hasMore: boolean, nextCursorPaterno: string, ... }
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_consultar_apoderados(p_params JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_id                 UUID;
    v_persona_id         UUID;
    v_estudiante_id      UUID;
    v_search             TEXT;
    v_pattern            TEXT;
    v_grado_instruccion  TEXT;
    v_cursor_paterno     TEXT;
    v_cursor_materno     TEXT;
    v_cursor_nombres     TEXT;
    v_cursor_id          UUID;
    v_limit              INT;
    v_has_more           BOOLEAN := FALSE;
    v_next_paterno       TEXT;
    v_next_materno       TEXT;
    v_next_nombres       TEXT;
    v_next_id            UUID;
    v_items              JSONB := '[]'::jsonb;
BEGIN
    v_id                := NULLIF(p_params->>'id', '')::UUID;
    v_persona_id        := NULLIF(p_params->>'personaId', '')::UUID;
    v_estudiante_id     := NULLIF(p_params->>'estudianteId', '')::UUID;
    v_search            := NULLIF(TRIM(p_params->>'search'), '');
    v_grado_instruccion := NULLIF(TRIM(p_params->>'gradoInstruccion'), '');
    v_limit             := COALESCE((p_params->>'limit')::INT, 10);

    IF v_search IS NOT NULL THEN
        v_pattern := '%' || v_search || '%';
    END IF;

    IF p_params ? 'cursorId' AND (p_params->>'cursorId') IS NOT NULL THEN
        v_cursor_paterno := COALESCE(p_params->>'cursorPaterno', '');
        v_cursor_materno := COALESCE(p_params->>'cursorMaterno', '');
        v_cursor_nombres := COALESCE(p_params->>'cursorNombres', '');
        v_cursor_id      := (p_params->>'cursorId')::UUID;
    END IF;

    WITH base_apoderados AS (
        SELECT
            a.id,
            a.persona_id,
            a.ocupacion,
            a.centro_laboral,
            a.telefono_laboral,
            a.grado_instruccion,
            a.creado_en,
            a.actualizado_en,
            p.tipo_documento,
            p.numero_documento,
            p.nombres,
            p.apellido_paterno,
            p.apellido_materno,
            TRIM(CONCAT(p.apellido_paterno, ' ', COALESCE(p.apellido_materno, ''), ', ', p.nombres)) AS nombre_completo,
            p.sexo,
            p.fecha_nacimiento,
            p.direccion,
            p.distrito,
            p.telefono,
            p.celular,
            p.correo,
            p.foto_url,
            p.creado_en AS persona_creado_en,
            p.actualizado_en AS persona_actualizado_en,
            EXISTS(SELECT 1 FROM docentes d WHERE d.persona_id = p.id AND d.eliminado_en IS NULL) AS es_docente,
            EXISTS(SELECT 1 FROM estudiantes e WHERE e.persona_id = p.id AND e.eliminado_en IS NULL) AS es_estudiante,
            EXISTS(SELECT 1 FROM usuarios u WHERE u.persona_id = p.id AND u.eliminado_en IS NULL) AS tiene_usuario,
            (
                SELECT c.nombre
                FROM persona_cargos pc
                INNER JOIN cargos c ON c.id = pc.cargo_id
                WHERE pc.persona_id = p.id AND pc.vigente = TRUE
                ORDER BY pc.creado_en DESC
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
            COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'estudianteId', ea.estudiante_id,
                            'codigoSiagie', est.codigo,
                            'nombreCompleto', TRIM(CONCAT(pest.apellido_paterno, ' ', COALESCE(pest.apellido_materno, ''), ', ', pest.nombres)),
                            'parentesco', ea.parentesco,
                            'esPrincipal', ea.es_principal,
                            'viveConEstudiante', ea.vive_con_estudiante,
                            'autorizadoRecoger', ea.autorizado_recoger,
                            'contactoEmergencia', ea.contacto_emergencia
                        )
                        ORDER BY ea.es_principal DESC, pest.apellido_paterno ASC
                    )
                    FROM estudiante_apoderados ea
                    INNER JOIN estudiantes est ON est.id = ea.estudiante_id AND est.eliminado_en IS NULL
                    INNER JOIN personas pest ON pest.id = est.persona_id AND pest.eliminado_en IS NULL
                    WHERE ea.apoderado_id = a.id
                ),
                '[]'::jsonb
            ) AS estudiantes_json
        FROM apoderados a
        INNER JOIN personas p ON p.id = a.persona_id AND p.eliminado_en IS NULL
        WHERE a.eliminado_en IS NULL
          AND (v_id IS NULL OR a.id = v_id)
          AND (v_persona_id IS NULL OR a.persona_id = v_persona_id)
          AND (v_grado_instruccion IS NULL OR a.grado_instruccion = v_grado_instruccion)
          AND (
              v_estudiante_id IS NULL OR EXISTS (
                  SELECT 1 FROM estudiante_apoderados ea2 
                  WHERE ea2.apoderado_id = a.id AND ea2.estudiante_id = v_estudiante_id
              )
          )
          AND (
              v_pattern IS NULL 
              OR p.numero_documento ILIKE v_pattern
              OR p.nombres ILIKE v_pattern
              OR p.apellido_paterno ILIKE v_pattern
              OR p.apellido_materno ILIKE v_pattern
              OR p.celular ILIKE v_pattern
              OR a.ocupacion ILIKE v_pattern
          )
    ),
    filtradas AS (
        SELECT *
        FROM base_apoderados ba
        WHERE (
            v_cursor_id IS NULL 
            OR (ba.apellido_paterno, COALESCE(ba.apellido_materno, ''), ba.nombres, ba.id) > 
               (v_cursor_paterno, v_cursor_materno, v_cursor_nombres, v_cursor_id)
        )
        ORDER BY ba.apellido_paterno ASC, COALESCE(ba.apellido_materno, '') ASC, ba.nombres ASC, ba.id ASC
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
                    'personaId', f.persona_id,
                    'ocupacion', f.ocupacion,
                    'centroLaboral', f.centro_laboral,
                    'telefonoLaboral', f.telefono_laboral,
                    'gradoInstruccion', f.grado_instruccion,
                    'cargoVigente', f.cargo_vigente,
                    'usuario', f.usuario_json,
                    'estudiantes', f.estudiantes_json,
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
                            'esEstudiante', f.es_estudiante,
                            'esApoderado', true,
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
