-- ============================================================================
-- Función: fn_actualizar_apoderado
-- Descripción: Actualiza los datos de la ficha de apoderado con validaciones
--              de existencia y grado de instrucción, retornando la entidad
--              completa con metadatos calculados.
-- Parámetro: p_params (JSONB) con:
--   - id: UUID (obligatorio)
--   - ocupacion: string | null (opcional)
--   - centroLaboral: string | null (opcional)
--   - telefonoLaboral: string | null (opcional)
--   - gradoInstruccion: string | null (opcional)
-- Retorno: JSONB con el apoderado actualizado (formato ApoderadoResponseDto)
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_actualizar_apoderado(p_params JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_id                UUID;
    v_grado_instruccion VARCHAR(20);
    v_resultado         JSONB;
BEGIN
    v_id := NULLIF(p_params->>'id', '')::UUID;

    IF v_id IS NULL THEN
        RAISE EXCEPTION 'El identificador del apoderado es obligatorio.'
            USING ERRCODE = '22023';
    END IF;

    -- 1. Validar existencia del apoderado
    IF NOT EXISTS (
        SELECT 1 FROM apoderados 
        WHERE id = v_id AND eliminado_en IS NULL
    ) THEN
        RAISE EXCEPTION 'Apoderado no encontrado.'
            USING ERRCODE = 'P0002';
    END IF;

    -- 2. Validar grado de instrucción si se proporciona
    IF p_params ? 'gradoInstruccion' THEN
        v_grado_instruccion := NULLIF(TRIM(p_params->>'gradoInstruccion'), '');
        IF v_grado_instruccion IS NOT NULL 
           AND v_grado_instruccion NOT IN ('sin_estudios', 'primaria', 'secundaria', 'tecnica', 'universitaria', 'posgrado') THEN
            RAISE EXCEPTION 'Grado de instrucción no válido. Valores permitidos: sin_estudios, primaria, secundaria, tecnica, universitaria, posgrado.'
                USING ERRCODE = '22023';
        END IF;
    END IF;

    -- 3. Actualizar campos
    UPDATE apoderados
    SET
        ocupacion         = CASE 
                              WHEN p_params ? 'ocupacion' 
                              THEN NULLIF(TRIM(p_params->>'ocupacion'), '') 
                              ELSE ocupacion 
                            END,
        centro_laboral    = CASE 
                              WHEN p_params ? 'centroLaboral' 
                              THEN NULLIF(TRIM(p_params->>'centroLaboral'), '') 
                              ELSE centro_laboral 
                            END,
        telefono_laboral  = CASE 
                              WHEN p_params ? 'telefonoLaboral' 
                              THEN NULLIF(TRIM(p_params->>'telefonoLaboral'), '') 
                              ELSE telefono_laboral 
                            END,
        grado_instruccion = CASE 
                              WHEN p_params ? 'gradoInstruccion' 
                              THEN NULLIF(TRIM(p_params->>'gradoInstruccion'), '') 
                              ELSE grado_instruccion 
                            END,
        actualizado_en    = CURRENT_TIMESTAMP
    WHERE id = v_id AND eliminado_en IS NULL;

    -- 4. Retornar apoderado formateado con fn_consultar_apoderados
    v_resultado := (fn_consultar_apoderados(jsonb_build_object('id', v_id))->'data')->0;

    RETURN v_resultado;
END;
$$;
