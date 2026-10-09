-- ============================================================================
-- Función: fn_actualizar_estudiante
-- Descripción: Actualiza los datos de la ficha de estudiante con validaciones
--              de existencia, estado y consistencia de discapacidad, retornando
--              la entidad completa con metadatos calculados.
-- Parámetro: p_params (JSONB) con:
--   - id: UUID (obligatorio)
--   - fechaIngreso: string | null (opcional, 'YYYY-MM-DD')
--   - lenguaMaterna: string | null (opcional)
--   - religion: string | null (opcional)
--   - tieneDiscapacidad: boolean (opcional)
--   - detalleDiscapacidad: string | null (opcional)
--   - grupoSanguineo: string | null (opcional)
--   - alergias: string | null (opcional)
--   - condicionesMedicas: string | null (opcional)
--   - seguroSalud: string | null (opcional)
--   - estado: string (opcional, 'activo' | 'retirado' | 'trasladado' | 'egresado')
-- Retorno: JSONB con el estudiante actualizado (formato EstudianteResponseDto)
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_actualizar_estudiante(p_params JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_id                    UUID;
    v_estado                VARCHAR(20);
    v_tiene_discapacidad    BOOLEAN;
    v_resultado             JSONB;
BEGIN
    v_id := NULLIF(p_params->>'id', '')::UUID;

    IF v_id IS NULL THEN
        RAISE EXCEPTION 'El identificador del estudiante es obligatorio.'
            USING ERRCODE = '22023';
    END IF;

    -- 1. Validar existencia del estudiante
    IF NOT EXISTS (
        SELECT 1 FROM estudiantes 
        WHERE id = v_id AND eliminado_en IS NULL
    ) THEN
        RAISE EXCEPTION 'Estudiante no encontrado.'
            USING ERRCODE = 'P0002';
    END IF;

    -- 2. Validar estado si se proporciona
    IF p_params ? 'estado' THEN
        v_estado := TRIM(p_params->>'estado');
        IF v_estado NOT IN ('activo', 'retirado', 'trasladado', 'egresado') THEN
            RAISE EXCEPTION 'Estado no válido. Valores permitidos: activo, retirado, trasladado, egresado.'
                USING ERRCODE = '22023';
        END IF;
    END IF;

    -- 3. Validar consistencia de discapacidad si se proporciona
    IF p_params ? 'tieneDiscapacidad' THEN
        v_tiene_discapacidad := (p_params->>'tieneDiscapacidad')::BOOLEAN;
        IF v_tiene_discapacidad = TRUE THEN
            IF p_params ? 'detalleDiscapacidad' 
               AND NULLIF(TRIM(p_params->>'detalleDiscapacidad'), '') IS NULL THEN
                RAISE EXCEPTION 'Debe especificar el detalle o tipo de discapacidad del estudiante.'
                    USING ERRCODE = '22023';
            END IF;
        END IF;
    END IF;

    -- 4. Actualizar ficha de estudiante
    UPDATE estudiantes
    SET
        fecha_ingreso        = CASE 
                                WHEN p_params ? 'fechaIngreso' AND NULLIF(p_params->>'fechaIngreso', '') IS NOT NULL 
                                THEN (p_params->>'fechaIngreso')::DATE 
                                ELSE fecha_ingreso 
                               END,
        lengua_materna       = CASE 
                                WHEN p_params ? 'lenguaMaterna' 
                                THEN NULLIF(TRIM(p_params->>'lenguaMaterna'), '') 
                                ELSE lengua_materna 
                               END,
        religion             = CASE 
                                WHEN p_params ? 'religion' 
                                THEN NULLIF(TRIM(p_params->>'religion'), '') 
                                ELSE religion 
                               END,
        tiene_discapacidad   = CASE 
                                WHEN p_params ? 'tieneDiscapacidad' 
                                THEN (p_params->>'tieneDiscapacidad')::BOOLEAN 
                                ELSE tiene_discapacidad 
                               END,
        detalle_discapacidad = CASE 
                                WHEN p_params ? 'tieneDiscapacidad' AND NOT (p_params->>'tieneDiscapacidad')::BOOLEAN 
                                THEN NULL
                                WHEN p_params ? 'detalleDiscapacidad' 
                                THEN NULLIF(TRIM(p_params->>'detalleDiscapacidad'), '') 
                                ELSE detalle_discapacidad 
                               END,
        grupo_sanguineo      = CASE 
                                WHEN p_params ? 'grupoSanguineo' 
                                THEN NULLIF(TRIM(p_params->>'grupoSanguineo'), '') 
                                ELSE grupo_sanguineo 
                               END,
        alergias             = CASE 
                                WHEN p_params ? 'alergias' 
                                THEN NULLIF(TRIM(p_params->>'alergias'), '') 
                                ELSE alergias 
                               END,
        condiciones_medicas  = CASE 
                                WHEN p_params ? 'condicionesMedicas' 
                                THEN NULLIF(TRIM(p_params->>'condicionesMedicas'), '') 
                                ELSE condiciones_medicas 
                               END,
        seguro_salud         = CASE 
                                WHEN p_params ? 'seguroSalud' 
                                THEN NULLIF(TRIM(p_params->>'seguroSalud'), '') 
                                ELSE seguro_salud 
                               END,
        estado               = CASE 
                                WHEN p_params ? 'estado' 
                                THEN TRIM(p_params->>'estado') 
                                ELSE estado 
                               END,
        actualizado_en       = CURRENT_TIMESTAMP
    WHERE id = v_id AND eliminado_en IS NULL;

    -- 5. Retornar estudiante formateado con fn_consultar_estudiantes
    v_resultado := (fn_consultar_estudiantes(jsonb_build_object('id', v_id))->'data')->0;

    RETURN v_resultado;
END;
$$;
