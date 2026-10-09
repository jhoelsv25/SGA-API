-- ============================================================================
-- Función: fn_desvincular_estudiante_apoderado
-- Descripción: Elimina el vínculo familiar entre un estudiante y un apoderado
--              sin eliminar a la persona ni la ficha de apoderado.
-- Parámetro: p_params (JSONB) con:
--   - estudianteId: UUID (obligatorio)
--   - apoderadoId: UUID (obligatorio)
-- Retorno: JSONB con { success: boolean, estudianteId: UUID, apoderadoId: UUID }
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_desvincular_estudiante_apoderado(p_params JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_estudiante_id UUID;
    v_apoderado_id  UUID;
    v_deleted_count INT;
BEGIN
    v_estudiante_id := NULLIF(p_params->>'estudianteId', '')::UUID;
    v_apoderado_id  := NULLIF(p_params->>'apoderadoId', '')::UUID;

    IF v_estudiante_id IS NULL OR v_apoderado_id IS NULL THEN
        RAISE EXCEPTION 'Los identificadores de estudiante y apoderado son obligatorios.'
            USING ERRCODE = '22023';
    END IF;

    DELETE FROM estudiante_apoderados
    WHERE estudiante_id = v_estudiante_id AND apoderado_id = v_apoderado_id;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    IF v_deleted_count = 0 THEN
        RAISE EXCEPTION 'El vínculo familiar no existe.'
            USING ERRCODE = 'P0002';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'estudianteId', v_estudiante_id,
        'apoderadoId', v_apoderado_id
    );
END;
$$;
