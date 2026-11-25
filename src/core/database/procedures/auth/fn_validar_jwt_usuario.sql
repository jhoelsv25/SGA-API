-- ============================================================================
-- Función: fn_validar_jwt_usuario
-- Descripción: Valida en una sola consulta si el token fue cerrado, el estado
--              del usuario y sus roles vigentes para JwtStrategy.
-- Parámetro: p_params (JSONB) con:
--   - usuarioId: UUID (obligatorio)
--   - tokenHash: TEXT | null
-- Retorno: JSONB con { sesionCerrada, usuario, roles }
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_validar_jwt_usuario(p_params JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_usuario_id     UUID;
    v_token_hash     TEXT;
    v_sesion_cerrada BOOLEAN := FALSE;
    v_usuario        JSONB;
    v_roles          JSONB := '[]'::jsonb;
BEGIN
    v_usuario_id := (p_params->>'usuarioId')::UUID;
    v_token_hash := NULLIF(TRIM(p_params->>'tokenHash'), '');

    IF v_usuario_id IS NULL THEN
        RAISE EXCEPTION 'El parámetro usuarioId es obligatorio en fn_validar_jwt_usuario.';
    END IF;

    IF v_token_hash IS NOT NULL THEN
        SELECT COALESCE(s.cerrada_en IS NOT NULL, FALSE)
        INTO v_sesion_cerrada
        FROM sesiones s
        WHERE s.token_hash = v_token_hash
        LIMIT 1;

        v_sesion_cerrada := COALESCE(v_sesion_cerrada, FALSE);
    END IF;

    SELECT jsonb_build_object(
        'id', u.id,
        'nombreUsuario', u.nombre_usuario,
        'personaId', u.persona_id,
        'rolId', u.rol_id,
        'estado', u.estado,
        'debeCambiarContrasena', u.debe_cambiar_contrasena,
        'eliminadoEn', u.eliminado_en
    )
    INTO v_usuario
    FROM usuarios u
    WHERE u.id = v_usuario_id
      AND u.eliminado_en IS NULL
    LIMIT 1;

    IF v_usuario IS NOT NULL THEN
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
    END IF;

    RETURN jsonb_build_object(
        'sesionCerrada', v_sesion_cerrada,
        'usuario', v_usuario,
        'roles', COALESCE(v_roles, '[]'::jsonb)
    );
END;
$$;
