# Diferencias: diseño v3.3 vs. esquema Drizzle actual

**Fecha de la comparación:** 2026-10-09
**Diseño (fuente de verdad):** [`Diseno-Base-Datos-PostgreSQL.sql`](Diseno-Base-Datos-PostgreSQL.sql) — v3.3, 58 tablas, probado en PostgreSQL 17.
**Implementado:** `src/core/database/schema/tables.ts` (Drizzle) — 48 tablas, equivalente al diseño v3.1.

> Lista de lo que falta migrar para que la base del backend coincida con el diseño. Se generó comparando tablas y columnas de forma automática y se revisó a mano. **No incluye** diferencias de tipos, índices ni `CHECK`: revisarlas al escribir cada migración.
> Cada cambio se origina en un RF; implementarlo junto con ese RF y actualizar el backlog con la skill `actualizar-backlog-rf`.

## 1. Tablas nuevas (11)

| Tabla | Para qué | RF |
|---|---|---|
| `usuario_roles` | Varios perfiles por usuario, uno principal, con historial | `RF-001`, `RF-002` V2 (P-02) |
| `variables_sistema` | Valores configurables con historial (reemplaza a `parametros_sistema`) | `RF-004` V2 (P-10) |
| `cargos` | Catálogo de puestos del colegio | `RF-002` V2 |
| `persona_cargos` | Cargos de cada persona con fechas e historial | `RF-007` V2 |
| `cargo_perfiles_sugeridos` | Perfiles que se sugieren por cargo | `RF-002` V2 |
| `dispositivos_marcacion` | Kioskos y biométricos autorizados | `RF-004`, `RF-010`, `RF-011` |
| `libretas_archivos` | PDF de cada libreta con historial de reemplazos | `RF-014` |
| `materiales_cambios_fecha` | Solicitudes de cambio de fecha de materiales | `RF-015` |
| `solicitudes_revision_consolidado` | Solicitudes del docente sobre su consolidado | `RF-013` |
| `escalas_calificacion` | Rangos para convertir la nota final a AD/A/B/C al exportar | `RF-016` |
| `mediciones_indicador` | Pretest y postest congelados de ISA, CSP e IGM | `RF-020` |

## 2. Tabla a reemplazar

| Actual | Nueva | Nota |
|---|---|---|
| `parametros_sistema` (clave–valor) | `variables_sistema` | Migrar los valores existentes; la nueva guarda tipo, rango, módulo e historial (vigente = 0) |

## 3. Columnas por tabla

**Faltan** = están en el diseño y no en Drizzle. **Sobran** = están en Drizzle y el diseño las retiró.

| Tabla | Faltan | Sobran | Motivo | RF |
|---|---|---|---|---|
| `usuarios` | — | `rol_id` | Pasa a `usuario_roles` (migrar el rol actual como perfil principal) | `RF-002` V2 |
| `rol_permisos` | `alcance` | — | Alcance por permiso: propio, tutoría, mis secciones, colegio | `RF-002` V2 |
| `institucion` | — | `latitud`, `longitud`, `radio_geocerca_m` | Sin geolocalización | `RF-004` |
| `turnos` | `entrada_desde`, `entrada_hasta`, `salida_desde`, `salida_hasta` | — | Ventanas de marcado | `RF-004` |
| `marcaciones` | `dispositivo_id`, `observacion`, `registrado_por_id` | `latitud`, `longitud`, `dentro_geocerca` | Equipos autorizados; marcación manual | `RF-010` |
| `sesiones_clase` | `dispositivo_inicio_id`, `dispositivo_fin_id`, `justificacion_estado`, `justificacion_documento_url`, `justificada_por_id`, `justificada_en`, `salida_automatica` | `latitud`, `longitud`, `dentro_geocerca` | Kiosko de sesiones, justificación, salida automática | `RF-011` V2 |
| `asistencias_estudiante` | `sesion_clase_id`, `justificada_por_id` | `curso_seccion_id`, `fecha` | Asistencia por sesión, no por curso y fecha | `RF-010` |
| `ausencias_sesion` | `ausencia_origen_id`, `version`, `vigente`, `motivo_cambio`, `anulada_en`, `anulada_por_id`, `motivo_anulacion` | — | Versiones con baja lógica y anulación | `RF-012` |
| `evidencias_ausencia` | `vigente`, `creado_por_id` | — | Baja lógica de fotos | `RF-012` |
| `consolidados_docente` | `consolidado_origen_id`, `version`, `vigente`, `estado`, `motivo_cambio`, `reabierto_por_id`, `reabierto_en`, `sesiones_parciales`, `sesiones_no_cumplidas`, `sesiones_justificadas`, `minutos_perdidos_firma` | `enviado_en` | Consolidado informativo, versionado y reabrible | `RF-013` |
| `libretas` | `programada_por_id`, `publicada_en` | `archivo_url`, `codigo_leido`, `subido_por_id`, `subido_en` | Los archivos pasan a `libretas_archivos` | `RF-014` |
| `matriculas` | `colegio_destino` | — | Traslado a otro colegio | `RF-009` |
| `materiales` | `horario_id`, `planificado`, `fecha_congelada`, `tamano_bytes`, `vigente` | — | Planificación congelada para el IGM | `RF-015` V2 |
| `tareas` | `nota_por_intentos`, `mostrar_resultados`, `tiempo_limite_min` | — | Tipos configurables e intentos | `RF-016` V2 |
| `entregas_tarea` | `calificacion` | — | Calificación automática o manual | `RF-016` |
| `publicaciones_aula`, `comentarios_publicacion` | `vigente`, `ocultado_por_id`, `ocultado_en`, `motivo_ocultado` | `eliminado_en` | Moderación con baja lógica | `RF-017` |
| `mensajes_chat` | `vigente`, `ocultado_por_id`, `ocultado_en`, `motivo_ocultado` | `eliminado_en`, `leido_en`, `receptor_id` | Chat solo grupal, moderación | `RF-017` |
| `incidencias_conducta`, `observaciones_estudiante` | `*_origen_id`, `version`, `vigente`, `motivo_cambio`, `anulada_en`, `anulada_por_id`, `motivo_anulacion` | — | Versiones con baja lógica | `RF-018` V2 |

Las demás tablas (37) coinciden en columnas.

## 4. Elementos de PostgreSQL del diseño

| Elemento | Dónde |
|---|---|
| Trigger `fn_actualizar_fecha` | Mantiene `actualizado_en` en las 30 tablas que lo tienen |
| Columnas calculadas (`GENERATED ... STORED`) | `ausencias_sesion.minutos`, `mediciones_indicador.valor` |
| Índices únicos parciales (`WHERE vigente = true`, etc.) | 32 índices: un solo valor vigente, un solo perfil principal, etc. |
| `jsonb` | `bitacora_auditoria.valor_anterior` / `valor_nuevo`, `entregas_tarea.respuestas`, `mediciones_indicador.detalle` |

## 5. Orden sugerido de migración

1. **Seguridad (impacta lo ya desarrollado):** `usuario_roles` (migrar `usuarios.rol_id`), `rol_permisos.alcance`, `variables_sistema` (migrar `parametros_sistema`), `cargos`, `persona_cargos`, `cargo_perfiles_sugeridos` → cierra `RF-001` y `RF-002` V2.
2. **Configuración:** `turnos`, `institucion`, `dispositivos_marcacion` → `RF-004`.
3. **Resto:** por RF, en el orden del backlog.
