-- ============================================================================
-- Función: fn_vincular_estudiante_apoderado
-- Descripción: Crea o actualiza el vínculo familiar entre un estudiante y
--              un apoderado, garantizando unicidad de apoderado principal
--              y consistencia de parentesco (RF-007 V3 Historia de Usuario 4).
-- Parámetro: p_params (JSONB) con:
--   - estudianteId: UUID (obligatorio)
--   - apoderadoId: UUID (obligatorio)
--   - parentesco: string (obligatorio)
--   - esPrincipal: boolean (opcional, default false)
--   - viveConEstudiante: boolean (opcional, default false)
--   - autorizadoRecoger: boolean (opcional, default false)
--   - contactoEmergencia: boolean (opcional, default false)
-- Retorno: JSONB con el vínculo registrado y metadatos de ambas entidades
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_vincular_estudiante_apoderado(p_params JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_estudiante_id        UUID;
    v_apoderado_id         UUID;
    v_parentesco           VARCHAR(20);
    v_es_principal         BOOLEAN;
    v_vive_con_estudiante  BOOLEAN;
    v_autorizado_recoger   BOOLEAN;
    v_contacto_emergencia  BOOLEAN;
    v_resultado            JSONB;
BEGIN
    v_estudiante_id := NULLIF(p_params->>'estudianteId', '')::UUID;
    v_apoderado_id  := NULLIF(p_params->>'apoderadoId', '')::UUID;
    v_parentesco    := NULLIF(TRIM(p_params->>'parentesco'), '');

    IF v_estudiante_id IS NULL OR v_apoderado_id IS NULL THEN
        RAISE EXCEPTION 'Los identificadores de estudiante y apoderado son obligatorios.'
            USING ERRCODE = '22023';
    END IF;

    IF v_parentesco IS NULL THEN
        RAISE EXCEPTION 'El parentesco con el estudiante es obligatorio.'
            USING ERRCODE = '22023';
    END IF;

    -- 1. Validar que el estudiante exista y no esté eliminado
    IF NOT EXISTS (
        SELECT 1 FROM estudiantes 
        WHERE id = v_estudiante_id AND eliminado_en IS NULL
    ) THEN
        RAISE EXCEPTION 'Estudiante no encontrado.'
            USING ERRCODE = 'P0002';
    END IF;

    -- 2. Validar que el apoderado exista y no esté eliminado
    IF NOT EXISTS (
        SELECT 1 FROM apoderados 
        WHERE id = v_apoderado_id AND eliminado_en IS NULL
    ) THEN
        RAISE EXCEPTION 'Apoderado no encontrado.'
            USING ERRCODE = 'P0002';
    END IF;

    -- 3. Validar parentesco permitido
    IF v_parentesco NOT IN ('padre', 'madre', 'abuelo', 'abuela', 'hermano', 'hermana', 'tio', 'tia', 'tutor_legal', 'otro') THEN
        RAISE EXCEPTION 'Parentesco no válido. Valores permitidos: padre, madre, abuelo, abuela, hermano, hermana, tio, tia, tutor_legal, otro.'
            USING ERRCODE = '22023';
    END IF;

    v_es_principal        := COALESCE((p_params->>'esPrincipal')::BOOLEAN, FALSE);
    v_vive_con_estudiante := COALESCE((p_params->>'viveConEstudiante')::BOOLEAN, FALSE);
    v_autorizado_recoger  := COALESCE((p_params->>'autorizadoRecoger')::BOOLEAN, FALSE);
    v_contacto_emergencia := COALESCE((p_params->>'contactoEmergencia')::BOOLEAN, FALSE);

    -- 4. Si se marca como principal, desactivar cualquier principal previo del estudiante
    IF v_es_principal = TRUE THEN
        UPDATE estudiante_apoderados
        SET es_principal = FALSE
        WHERE estudiante_id = v_estudiante_id 
          AND es_principal = TRUE 
          AND apoderado_id <> v_apoderado_id;
    END IF;

    -- 5. Insertar o actualizar el vínculo
    INSERT INTO estudiante_apoderados (
        estudiante_id,
        apoderado_id,
        parentesco,
        es_principal,
        vive_con_estudiante,
        autorizado_recoger,
        contacto_emergencia
    ) VALUES (
        v_estudiante_id,
        v_apoderado_id,
        v_parentesco,
        v_es_principal,
        v_vive_con_estudiante,
        v_autorizado_recoger,
        v_contacto_emergencia
    )
    ON CONFLICT (estudiante_id, apoderado_id) DO UPDATE SET
        parentesco          = EXCLUDED.parentesco,
        es_principal        = EXCLUDED.es_principal,
        vive_con_estudiante = EXCLUDED.vive_con_estudiante,
        autorizado_recoger  = EXCLUDED.autorizado_recoger,
        contacto_emergencia = EXCLUDED.contacto_emergencia;

    -- 6. Retornar datos del vínculo confirmado
    SELECT jsonb_build_object(
        'estudianteId', ea.estudiante_id,
        'apoderadoId', ea.apoderado_id,
        'parentesco', ea.parentesco,
        'esPrincipal', ea.es_principal,
        'viveConEstudiante', ea.vive_con_estudiante,
        'autorizadoRecoger', ea.autorizado_recoger,
        'contactoEmergencia', ea.contacto_emergencia,
        'creadoEn', ea.creado_en,
        'estudiante', (fn_consultar_estudiantes(jsonb_build_object('id', ea.estudiante_id))->'data')->0,
        'apoderado', (fn_consultar_apoderados(jsonb_build_object('id', ea.apoderado_id))->'data')->0
    ) INTO v_resultado
    FROM estudiante_apoderados ea
    WHERE ea.estudiante_id = v_estudiante_id AND ea.apoderado_id = v_apoderado_id;

    RETURN v_resultado;
END;
$$;
