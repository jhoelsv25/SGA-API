-- ============================================================================
-- Función: fn_actualizar_persona
-- Descripción: Actualiza los datos de una persona en el padrón único con
--              validaciones de existencia y unicidad, retornando la entidad
--              completa con metadatos calculados.
-- Parámetro: p_params (JSONB) con:
--   - id: UUID (obligatorio)
--   - tipoDocumento: string (opcional)
--   - numeroDocumento: string (opcional)
--   - nombres: string (opcional)
--   - apellidoPaterno: string (opcional)
--   - apellidoMaterno: string | null (opcional)
--   - sexo: 'M' | 'F' (opcional)
--   - fechaNacimiento: string | null (opcional)
--   - direccion: string | null (opcional)
--   - distrito: string | null (opcional)
--   - telefono: string | null (opcional)
--   - celular: string | null (opcional)
--   - correo: string | null (opcional)
--   - fotoUrl: string | null (opcional)
-- Retorno: JSONB con la persona actualizada (formato PersonaResponseDto)
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_actualizar_persona(p_params JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_id              UUID;
    v_tipo_doc        VARCHAR(20);
    v_numero_doc      VARCHAR(20);
    v_correo          VARCHAR(100);
    v_resultado       JSONB;
BEGIN
    v_id := NULLIF(p_params->>'id', '')::UUID;

    IF v_id IS NULL THEN
        RAISE EXCEPTION 'El identificador de la persona es obligatorio.'
            USING ERRCODE = '22023';
    END IF;

    -- 1. Validar que la persona exista y no esté eliminada
    IF NOT EXISTS (
        SELECT 1 FROM personas WHERE id = v_id AND eliminado_en IS NULL
    ) THEN
        RAISE EXCEPTION 'Persona no encontrada.'
            USING ERRCODE = 'P0002';
    END IF;

    -- 2. Validar unicidad de documento si se proporciona
    IF p_params ? 'tipoDocumento' OR p_params ? 'numeroDocumento' THEN
        SELECT 
            COALESCE(NULLIF(p_params->>'tipoDocumento', ''), p.tipo_documento),
            COALESCE(NULLIF(TRIM(p_params->>'numeroDocumento'), ''), p.numero_documento)
        INTO v_tipo_doc, v_numero_doc
        FROM personas p
        WHERE p.id = v_id;

        IF EXISTS (
            SELECT 1 FROM personas
            WHERE tipo_documento = v_tipo_doc
              AND numero_documento = v_numero_doc
              AND id <> v_id
              AND eliminado_en IS NULL
        ) THEN
            RAISE EXCEPTION 'Esta persona ya está registrada. Se usarán sus datos.'
                USING ERRCODE = '23505';
        END IF;
    END IF;

    -- 3. Validar unicidad de correo si se proporciona
    IF p_params ? 'correo' THEN
        v_correo := NULLIF(TRIM(p_params->>'correo'), '');
        IF v_correo IS NOT NULL AND EXISTS (
            SELECT 1 FROM personas
            WHERE LOWER(correo) = LOWER(v_correo)
              AND id <> v_id
              AND eliminado_en IS NULL
        ) THEN
            RAISE EXCEPTION 'El correo ya está registrado para otra persona.'
                USING ERRCODE = '23505';
        END IF;
    END IF;

    -- 4. Actualizar campos
    UPDATE personas
    SET
        tipo_documento   = CASE WHEN p_params ? 'tipoDocumento' THEN NULLIF(p_params->>'tipoDocumento', '') ELSE tipo_documento END,
        numero_documento = CASE WHEN p_params ? 'numeroDocumento' THEN NULLIF(TRIM(p_params->>'numeroDocumento'), '') ELSE numero_documento END,
        nombres          = CASE WHEN p_params ? 'nombres' THEN NULLIF(TRIM(p_params->>'nombres'), '') ELSE nombres END,
        apellido_paterno = CASE WHEN p_params ? 'apellidoPaterno' THEN NULLIF(TRIM(p_params->>'apellidoPaterno'), '') ELSE apellido_paterno END,
        apellido_materno = CASE WHEN p_params ? 'apellidoMaterno' THEN NULLIF(TRIM(p_params->>'apellidoMaterno'), '') ELSE apellido_materno END,
        sexo             = CASE WHEN p_params ? 'sexo' THEN p_params->>'sexo' ELSE sexo END,
        fecha_nacimiento = CASE WHEN p_params ? 'fechaNacimiento' THEN NULLIF(p_params->>'fechaNacimiento', '')::DATE ELSE fecha_nacimiento END,
        direccion        = CASE WHEN p_params ? 'direccion' THEN NULLIF(TRIM(p_params->>'direccion'), '') ELSE direccion END,
        distrito         = CASE WHEN p_params ? 'distrito' THEN NULLIF(TRIM(p_params->>'distrito'), '') ELSE distrito END,
        telefono         = CASE WHEN p_params ? 'telefono' THEN NULLIF(TRIM(p_params->>'telefono'), '') ELSE telefono END,
        celular          = CASE WHEN p_params ? 'celular' THEN NULLIF(TRIM(p_params->>'celular'), '') ELSE celular END,
        correo           = CASE WHEN p_params ? 'correo' THEN NULLIF(TRIM(p_params->>'correo'), '') ELSE correo END,
        foto_url         = CASE WHEN p_params ? 'fotoUrl' THEN NULLIF(TRIM(p_params->>'fotoUrl'), '') ELSE foto_url END,
        actualizado_en   = CURRENT_TIMESTAMP
    WHERE id = v_id AND eliminado_en IS NULL;

    -- 5. Retornar entidad actualizada
    v_resultado := (fn_consultar_personas(jsonb_build_object('id', v_id))->'data')->0;

    RETURN v_resultado;
END;
$$;
