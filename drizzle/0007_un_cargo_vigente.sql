-- parametros_sistema ya no se usa: la reemplazó variables_sistema (RF-004 V2, P-10).
DROP TABLE "parametros_sistema" CASCADE;--> statement-breakpoint
-- RF-002 V3: un solo cargo vigente por persona. Si una persona tiene varios, se
-- conserva el principal (o el más reciente) y los demás pasan al historial.
UPDATE "persona_cargos" pc
SET "vigente" = false,
    "es_principal" = false,
    "fecha_fin" = GREATEST(pc."fecha_inicio", CURRENT_DATE)
WHERE pc."vigente"
  AND pc."id" <> (
    SELECT x."id" FROM "persona_cargos" x
    WHERE x."persona_id" = pc."persona_id" AND x."vigente"
    ORDER BY x."es_principal" DESC, x."fecha_inicio" DESC, x."creado_en" DESC
    LIMIT 1
  );--> statement-breakpoint
UPDATE "persona_cargos" SET "es_principal" = true WHERE "vigente" AND NOT "es_principal";--> statement-breakpoint
DROP INDEX "ux_persona_cargos_principal";--> statement-breakpoint
DROP INDEX "ux_persona_cargos_vigente";--> statement-breakpoint
CREATE UNIQUE INDEX "ux_persona_cargos_vigente" ON "persona_cargos" USING btree ("persona_id") WHERE vigente;
