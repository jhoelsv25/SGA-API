-- ============================================================================
-- Función: fn_crear_apoderado
-- Descripción: Inserta una ficha de apoderado en el padrón con validaciones
--              de existencia de persona, unicidad de ficha y grado de instrucción,
--              retornando la entidad completa con metadatos calculados.
-- Parámetro: p_params (JSONB) con:
--   - personaId: UUID string | null (opcional si se provee nuevaPersona)
--   - nuevaPersona: JSONB | null (datos para crear persona vía fn_crear_persona)
--   - ocupacion: string | null
--   - centroLaboral: string | null
--   - telefonoLaboral: string | null
--   - gradoInstruccion: string | null ('sin_estudios', 'primaria', 'secundaria', 'tecnica', 'universitaria', 'posgrado')
-- Retorno: JSONB con el apoderado creado (formato ApoderadoResponseDto)
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_crear_apoderado(p_params JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_id                UUID;
    v_persona_id        UUID;
    v_ocupacion         VARCHAR(100);
    v_centro_laboral    VARCHAR(150);
    v_telefono_laboral  VARCHAR(20);
    v_grado_instruccion VARCHAR(20);
    v_persona_json      JSONB;
    v_resultado         JSONB;
BEGIN
    -- 1. Obtener o crear persona
    IF p_params ? 'nuevaPersona' 
       AND p_params->'nuevaPersona' IS NOT NULL 
       AND p_params->'nuevaPersona' <> 'null'::jsonb THEN
        v_persona_json := fn_crear_persona(p_params->'nuevaPersona');
        v_persona_id := (v_persona_json->>'id')::UUID;
    ELSE
        v_persona_id := NULLIF(p_params->>'personaId', '')::UUID;
    END IF;

    IF v_persona_id IS NULL THEN
        RAISE EXCEPTION 'El identificador de la persona o los datos de la nueva persona son obligatorios.'
            USING ERRCODE = '22023';
    END IF;

    -- 2. Validar que la persona exista y no esté eliminada
    IF NOT EXISTS (
        SELECT 1 FROM personas 
        WHERE id = v_persona_id AND eliminado_en IS NULL
    ) THEN
        RAISE EXCEPTION 'Persona no encontrada.'
            USING ERRCODE = 'P0002';
    END IF;

    -- 3. Validar que la persona no tenga ya una ficha de apoderado activa
    IF EXISTS (
        SELECT 1 FROM apoderados 
        WHERE persona_id = v_persona_id AND eliminado_en IS NULL
    ) THEN
        RAISE EXCEPTION 'Esta persona ya cuenta con una ficha de apoderado registrada.'
            USING ERRCODE = '23505';
    END IF;

    -- 4. Validar campos opcionales
    v_ocupacion        := NULLIF(TRIM(p_params->>'ocupacion'), '');
    v_centro_laboral   := NULLIF(TRIM(p_params->>'centroLaboral'), '');
    v_telefono_laboral := NULLIF(TRIM(p_params->>'telefonoLaboral'), '');
    v_grado_instruccion:= NULLIF(TRIM(p_params->>'gradoInstruccion'), '');

    IF v_grado_instruccion IS NOT NULL 
       AND v_grado_instruccion NOT IN ('sin_estudios', 'primaria', 'secundaria', 'tecnica', 'universitaria', 'posgrado') THEN
        RAISE EXCEPTION 'Grado de instrucción no válido. Valores permitidos: sin_estudios, primaria, secundaria, tecnica, universitaria, posgrado.'
            USING ERRCODE = '22023';
    END IF;

    -- 5. Insertar en tabla apoderados
    INSERT INTO apoderados (
        persona_id,
        ocupacion,
        centro_laboral,
        telefono_laboral,
        grado_instruccion
    ) VALUES (
        v_persona_id,
        v_ocupacion,
        v_centro_laboral,
        v_telefono_laboral,
        v_grado_instruccion
    )
    RETURNING id INTO v_id;

    -- 6. Retornar apoderado formateado con fn_consultar_apoderados
    v_resultado := (fn_consultar_apoderados(jsonb_build_object('id', v_id))->'data')->0;

    RETURN v_resultado;
END;
$$;
