-- ============================================================================
-- Función: fn_crear_estudiante
-- Descripción: Inserta una ficha de estudiante en el padrón con validaciones
--              de existencia de persona, unicidad de código SIAGIE, consistencia
--              de discapacidad y retorna la entidad completa con metadatos.
-- Parámetro: p_params (JSONB) con:
--   - personaId: UUID string | null (opcional si se provee nuevaPersona)
--   - nuevaPersona: JSONB | null (datos para crear persona vía fn_crear_persona)
--   - codigo: string (obligatorio, código SIAGIE)
--   - fechaIngreso: string (obligatorio, 'YYYY-MM-DD')
--   - lenguaMaterna: string | null
--   - religion: string | null
--   - tieneDiscapacidad: boolean (opcional, default false)
--   - detalleDiscapacidad: string | null
--   - grupoSanguineo: string | null
--   - alergias: string | null
--   - condicionesMedicas: string | null
--   - seguroSalud: string | null
--   - estado: string (opcional, default 'activo')
-- Retorno: JSONB con el estudiante creado (formato EstudianteResponseDto)
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_crear_estudiante(p_params JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_id                    UUID;
    v_persona_id            UUID;
    v_codigo                VARCHAR(20);
    v_fecha_ingreso         DATE;
    v_lengua_materna        VARCHAR(50);
    v_religion              VARCHAR(50);
    v_tiene_discapacidad    BOOLEAN;
    v_detalle_discapacidad  VARCHAR(255);
    v_grupo_sanguineo       VARCHAR(5);
    v_alergias              VARCHAR(255);
    v_condiciones_medicas   VARCHAR(500);
    v_seguro_salud          VARCHAR(100);
    v_estado                VARCHAR(20);
    v_persona_json          JSONB;
    v_resultado             JSONB;
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

    -- 3. Validar que la persona no tenga ya una ficha de estudiante activa
    IF EXISTS (
        SELECT 1 FROM estudiantes 
        WHERE persona_id = v_persona_id AND eliminado_en IS NULL
    ) THEN
        RAISE EXCEPTION 'Esta persona ya cuenta con una ficha de estudiante registrada.'
            USING ERRCODE = '23505';
    END IF;

    -- 4. Validar código SIAGIE
    v_codigo := NULLIF(TRIM(p_params->>'codigo'), '');
    IF v_codigo IS NULL THEN
        RAISE EXCEPTION 'El código de estudiante (SIAGIE) es obligatorio.'
            USING ERRCODE = '22023';
    END IF;

    IF EXISTS (
        SELECT 1 FROM estudiantes 
        WHERE codigo = v_codigo AND eliminado_en IS NULL
    ) THEN
        RAISE EXCEPTION 'El código de estudiante ya se encuentra registrado.'
            USING ERRCODE = '23505';
    END IF;

    -- 5. Validar fecha de ingreso
    v_fecha_ingreso := NULLIF(p_params->>'fechaIngreso', '')::DATE;
    IF v_fecha_ingreso IS NULL THEN
        RAISE EXCEPTION 'La fecha de ingreso es obligatoria.'
            USING ERRCODE = '22023';
    END IF;

    -- 6. Validar datos médicos y discapacidad
    v_lengua_materna       := NULLIF(TRIM(p_params->>'lenguaMaterna'), '');
    v_religion             := NULLIF(TRIM(p_params->>'religion'), '');
    v_tiene_discapacidad   := COALESCE((p_params->>'tieneDiscapacidad')::BOOLEAN, FALSE);
    v_detalle_discapacidad := NULLIF(TRIM(p_params->>'detalleDiscapacidad'), '');

    IF v_tiene_discapacidad = FALSE THEN
        v_detalle_discapacidad := NULL;
    ELSIF v_detalle_discapacidad IS NULL THEN
        RAISE EXCEPTION 'Debe especificar el detalle o tipo de discapacidad del estudiante.'
            USING ERRCODE = '22023';
    END IF;

    v_grupo_sanguineo     := NULLIF(TRIM(p_params->>'grupoSanguineo'), '');
    v_alergias            := NULLIF(TRIM(p_params->>'alergias'), '');
    v_condiciones_medicas := NULLIF(TRIM(p_params->>'condicionesMedicas'), '');
    v_seguro_salud        := NULLIF(TRIM(p_params->>'seguroSalud'), '');
    v_estado              := COALESCE(NULLIF(TRIM(p_params->>'estado'), ''), 'activo');

    IF v_estado NOT IN ('activo', 'retirado', 'trasladado', 'egresado') THEN
        RAISE EXCEPTION 'Estado no válido. Valores permitidos: activo, retirado, trasladado, egresado.'
            USING ERRCODE = '22023';
    END IF;

    -- 7. Insertar en tabla estudiantes
    INSERT INTO estudiantes (
        persona_id,
        codigo,
        fecha_ingreso,
        lengua_materna,
        religion,
        tiene_discapacidad,
        detalle_discapacidad,
        grupo_sanguineo,
        alergias,
        condiciones_medicas,
        seguro_salud,
        estado
    ) VALUES (
        v_persona_id,
        v_codigo,
        v_fecha_ingreso,
        v_lengua_materna,
        v_religion,
        v_tiene_discapacidad,
        v_detalle_discapacidad,
        v_grupo_sanguineo,
        v_alergias,
        v_condiciones_medicas,
        v_seguro_salud,
        v_estado
    )
    RETURNING id INTO v_id;

    -- 8. Retornar estudiante formateado con fn_consultar_estudiantes
    v_resultado := (fn_consultar_estudiantes(jsonb_build_object('id', v_id))->'data')->0;

    RETURN v_resultado;
END;
$$;
