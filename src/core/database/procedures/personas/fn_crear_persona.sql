-- ============================================================================
-- Función: fn_crear_persona
-- Descripción: Inserta una persona en el padrón único con validaciones de
--              unicidad y retorna la entidad completa con metadatos calculados.
-- Parámetro: p_params (JSONB) con:
--   - tipoDocumento: string (obligatorio)
--   - numeroDocumento: string (obligatorio)
--   - nombres: string (obligatorio)
--   - apellidoPaterno: string (obligatorio)
--   - apellidoMaterno: string | null
--   - sexo: 'M' | 'F' (obligatorio)
--   - fechaNacimiento: string | null ('YYYY-MM-DD')
--   - direccion: string | null
--   - distrito: string | null
--   - telefono: string | null
--   - celular: string | null
--   - correo: string | null
--   - fotoUrl: string | null
-- Retorno: JSONB con la persona creada (formato PersonaResponseDto)
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_crear_persona(p_params JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_tipo_doc        VARCHAR(20);
    v_numero_doc      VARCHAR(20);
    v_nombres         VARCHAR(100);
    v_paterno         VARCHAR(60);
    v_materno         VARCHAR(60);
    v_sexo            CHAR(1);
    v_fecha_nac       DATE;
    v_direccion       VARCHAR(255);
    v_distrito        VARCHAR(100);
    v_telefono        VARCHAR(20);
    v_celular         VARCHAR(20);
    v_correo          VARCHAR(100);
    v_foto_url        VARCHAR(255);
    v_id              UUID;
    v_resultado       JSONB;
BEGIN
    v_tipo_doc   := TRIM(p_params->>'tipoDocumento');
    v_numero_doc := TRIM(p_params->>'numeroDocumento');
    v_nombres    := TRIM(p_params->>'nombres');
    v_paterno    := TRIM(p_params->>'apellidoPaterno');
    v_materno    := NULLIF(TRIM(p_params->>'apellidoMaterno'), '');
    v_sexo       := p_params->>'sexo';
    v_fecha_nac  := NULLIF(p_params->>'fechaNacimiento', '')::DATE;
    v_direccion  := NULLIF(TRIM(p_params->>'direccion'), '');
    v_distrito   := NULLIF(TRIM(p_params->>'distrito'), '');
    v_telefono   := NULLIF(TRIM(p_params->>'telefono'), '');
    v_celular    := NULLIF(TRIM(p_params->>'celular'), '');
    v_correo     := NULLIF(TRIM(p_params->>'correo'), '');
    v_foto_url   := NULLIF(TRIM(p_params->>'fotoUrl'), '');

    -- 1. Validar unicidad de documento
    IF EXISTS (
        SELECT 1 FROM personas
        WHERE tipo_documento = v_tipo_doc
          AND numero_documento = v_numero_doc
          AND eliminado_en IS NULL
    ) THEN
        RAISE EXCEPTION 'Esta persona ya está registrada. Se usarán sus datos.'
            USING ERRCODE = '23505';
    END IF;

    -- 2. Validar unicidad de correo
    IF v_correo IS NOT NULL AND EXISTS (
        SELECT 1 FROM personas
        WHERE LOWER(correo) = LOWER(v_correo)
          AND eliminado_en IS NULL
    ) THEN
        RAISE EXCEPTION 'El correo ya está registrado para otra persona.'
            USING ERRCODE = '23505';
    END IF;

    -- 3. Inserción en tabla personas
    INSERT INTO personas (
        tipo_documento,
        numero_documento,
        nombres,
        apellido_paterno,
        apellido_materno,
        sexo,
        fecha_nacimiento,
        direccion,
        distrito,
        telefono,
        celular,
        correo,
        foto_url
    ) VALUES (
        v_tipo_doc,
        v_numero_doc,
        v_nombres,
        v_paterno,
        v_materno,
        v_sexo,
        v_fecha_nac,
        v_direccion,
        v_distrito,
        v_telefono,
        v_celular,
        v_correo,
        v_foto_url
    )
    RETURNING id INTO v_id;

    -- 4. Retornar persona formateada con fn_consultar_personas
    v_resultado := (fn_consultar_personas(jsonb_build_object('id', v_id))->'data')->0;

    RETURN v_resultado;
END;
$$;
