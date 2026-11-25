-- ============================================================================
-- Función: fn_obtener_contexto_sesion
-- Descripción: Obtiene en un solo viaje SQL los datos del usuario, persona,
--              institución, roles, módulos con su primera ruta web (sin N+1)
--              y rutas permitidas por rol_menus.
-- Parámetro: p_params (JSONB) con:
--   - usuarioId: UUID (obligatorio)
--   - rolId: UUID | null (opcional)
-- Retorno: JSONB | NULL
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_obtener_contexto_sesion(p_params JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_usuario_id       UUID;
    v_rol_solicitado   UUID;
    v_usuario          RECORD;
    v_institucion      JSONB;
    v_roles            JSONB := '[]'::jsonb;
    v_active_role      JSONB;
    v_active_rol_id    UUID;
    v_active_sistema   BOOLEAN := FALSE;
    v_modules          JSONB := '[]'::jsonb;
    v_menu_routes      JSONB := '[]'::jsonb;
BEGIN
    v_usuario_id     := (p_params->>'usuarioId')::UUID;
    v_rol_solicitado := NULLIF(TRIM(p_params->>'rolId'), '')::UUID;

    IF v_usuario_id IS NULL THEN
        RAISE EXCEPTION 'El parámetro usuarioId es obligatorio en fn_obtener_contexto_sesion.';
    END IF;

    SELECT
        u.id,
        u.nombre_usuario,
        u.persona_id,
        u.rol_id,
        u.estado,
        u.debe_cambiar_contrasena,
        p.nombres AS persona_nombres,
        p.apellido_paterno AS persona_apellido_paterno,
        p.apellido_materno AS persona_apellido_materno,
        p.correo AS persona_correo,
        p.foto_url AS persona_foto_url
    INTO v_usuario
    FROM usuarios u
    LEFT JOIN personas p ON p.id = u.persona_id
    WHERE u.id = v_usuario_id
      AND u.eliminado_en IS NULL
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Roles vigentes ordenados (principal primero)
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'rolId', ur.rol_id,
                'nombre', r.nombre,
                'esSistema', r.es_sistema,
                'esPrincipal', ur.es_principal
            )
            ORDER BY ur.es_principal DESC, r.nombre ASC
        ),
        '[]'::jsonb
    )
    INTO v_roles
    FROM usuario_roles ur
    INNER JOIN roles r ON r.id = ur.rol_id
    WHERE ur.usuario_id = v_usuario_id
      AND ur.vigente = TRUE;

    -- Respaldo con usuarios.rol_id si no hubiera filas en usuario_roles
    IF jsonb_array_length(v_roles) = 0 THEN
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'rolId', r.id,
                    'nombre', r.nombre,
                    'esSistema', r.es_sistema,
                    'esPrincipal', TRUE
                )
            ),
            '[]'::jsonb
        )
        INTO v_roles
        FROM roles r
        WHERE r.id = v_usuario.rol_id;
    END IF;

    -- Resolver rol activo: solicitado > principal > primero
    SELECT elem
    INTO v_active_role
    FROM jsonb_array_elements(v_roles) elem
    ORDER BY
        CASE WHEN v_rol_solicitado IS NOT NULL AND (elem->>'rolId')::UUID = v_rol_solicitado THEN 0 ELSE 1 END,
        CASE WHEN (elem->>'esPrincipal')::BOOLEAN THEN 0 ELSE 1 END
    LIMIT 1;

    IF v_active_role IS NOT NULL THEN
        v_active_rol_id  := (v_active_role->>'rolId')::UUID;
        v_active_sistema := COALESCE((v_active_role->>'esSistema')::BOOLEAN, FALSE);
    END IF;

    SELECT jsonb_build_object('id', i.id, 'nombre', i.nombre)
    INTO v_institucion
    FROM institucion i
    LIMIT 1;

    IF v_active_rol_id IS NOT NULL THEN
        IF v_active_sistema THEN
            SELECT COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'id', m.id,
                        'name', m.nombre,
                        'code', m.codigo,
                        'icon', m.icono,
                        'path', COALESCE(pm.ruta, '/' || m.codigo)
                    )
                    ORDER BY m.orden ASC
                ),
                '[]'::jsonb
            )
            INTO v_modules
            FROM modulos m
            LEFT JOIN LATERAL (
                SELECT mn.ruta
                FROM menus mn
                WHERE mn.modulo_id = m.id
                  AND mn.vigente = TRUE
                  AND 'web' = ANY(mn.aplicaciones)
                ORDER BY mn.orden ASC
                LIMIT 1
            ) pm ON TRUE
            WHERE m.vigente = TRUE;
        ELSE
            WITH modulos_permitidos AS (
                SELECT DISTINCT
                    m.id,
                    m.nombre,
                    m.codigo,
                    m.icono,
                    m.orden
                FROM rol_menus rm
                INNER JOIN menus mn ON rm.menu_id = mn.id
                INNER JOIN modulos m ON mn.modulo_id = m.id
                WHERE rm.rol_id = v_active_rol_id
                  AND mn.vigente = TRUE
                  AND m.vigente = TRUE
                  AND 'web' = ANY(mn.aplicaciones)
            )
            SELECT COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'id', mp.id,
                        'name', mp.nombre,
                        'code', mp.codigo,
                        'icon', mp.icono,
                        'path', COALESCE(pm.ruta, '/' || mp.codigo)
                    )
                    ORDER BY mp.orden ASC
                ),
                '[]'::jsonb
            )
            INTO v_modules
            FROM modulos_permitidos mp
            LEFT JOIN LATERAL (
                SELECT mn.ruta
                FROM menus mn
                WHERE mn.modulo_id = mp.id
                  AND mn.vigente = TRUE
                  AND 'web' = ANY(mn.aplicaciones)
                ORDER BY mn.orden ASC
                LIMIT 1
            ) pm ON TRUE;
        END IF;

        SELECT COALESCE(jsonb_agg(mn.ruta), '[]'::jsonb)
        INTO v_menu_routes
        FROM rol_menus rm
        INNER JOIN menus mn ON rm.menu_id = mn.id
        WHERE rm.rol_id = v_active_rol_id
          AND mn.vigente = TRUE
          AND 'web' = ANY(mn.aplicaciones)
          AND mn.ruta IS NOT NULL;
    END IF;

    RETURN jsonb_build_object(
        'usuario', jsonb_build_object(
            'id', v_usuario.id,
            'nombreUsuario', v_usuario.nombre_usuario,
            'personaId', v_usuario.persona_id,
            'rolId', v_usuario.rol_id,
            'estado', v_usuario.estado,
            'debeCambiarContrasena', v_usuario.debe_cambiar_contrasena
        ),
        'persona', CASE WHEN v_usuario.persona_nombres IS NOT NULL THEN jsonb_build_object(
            'nombres', v_usuario.persona_nombres,
            'apellidoPaterno', v_usuario.persona_apellido_paterno,
            'apellidoMaterno', v_usuario.persona_apellido_materno,
            'correo', v_usuario.persona_correo,
            'fotoUrl', v_usuario.persona_foto_url
        ) ELSE NULL END,
        'institucion', v_institucion,
        'roles', COALESCE(v_roles, '[]'::jsonb),
        'activeRole', v_active_role,
        'modules', COALESCE(v_modules, '[]'::jsonb),
        'menuRoutes', COALESCE(v_menu_routes, '[]'::jsonb)
    );
END;
$$;
