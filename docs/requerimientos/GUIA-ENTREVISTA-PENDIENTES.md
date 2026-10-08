# Guía de entrevista — Pendientes del SGA Colegio

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Entrevistador:** Hever Lima
**Estado:** 1.ª ronda respondida el 2026-10-09 · **quedan 6 preguntas** (sección A)

> Marque una opción (☐ → ☒) o escriba la respuesta. La opción **(propuesta)** es la que el sistema usa hoy; si el colegio la acepta, basta marcarla.
> Todo valor numérico es **configurable** (tabla de variables del sistema) y todo "quién puede" es **configurable por perfil**.
> Al volver, las respuestas se registran en `PENDIENTES.md` y se corrigen los RF en una nueva versión.

---

# A. PREGUNTAS PENDIENTES (2.ª ronda)

**Fecha de la entrevista:** ____ / ____ / ________

## A.1 Subdirección

**Entrevistado:** ______________________________________ **Cargo:** __________________

### P-03 · Jornada escolar (RF-008)
¿Qué jornada tiene el colegio?
- ☐ Jornada Escolar Regular: 7 horas pedagógicas de 45 min al día **(propuesta)**
- ☐ Jornada Escolar Completa: 9 horas pedagógicas de 45 min al día
- ☐ Otra: ____________________________

Hora de inicio de la primera clase: ________ Recreo: de ________ a ________ ¿Hay un segundo recreo? ☐ No ☐ Sí: ________

### P-04 · Bloque doble (RF-008, RF-011)
¿Un curso puede tener dos horas pedagógicas seguidas (90 min)?
- ☐ No
- ☐ Sí, y el docente **firma una sola vez** (ingreso y salida del bloque completo) **(propuesta)**
- ☐ Sí, pero el docente firma **cada hora por separado**

### P-15 · Conversión de la nota a literal (RF-016)
¿Qué rangos se usan para pasar la nota final del aula virtual (0–20) a AD, A, B, C?

| Literal | Propuesta | Rango del colegio |
|---|---|---|
| AD | 18 – 20 | ____ – ____ |
| A | 14 – 17 | ____ – ____ |
| B | 11 – 13 | ____ – ____ |
| C | 0 – 10 | ____ – ____ |

**Y los pesos de la nota final** (P-16 ya respondida: con peso por tipo):
Examen ____ % · Cuestionario ____ % · Trabajo ____ % · Proyecto ____ % (deben sumar 100 %; hoy 25 % cada uno)

**Observaciones:** ________________________________________________________________

## A.2 Dirección

**Entrevistado:** ______________________________________ **Cargo:** __________________

### P-07 · Justificación de sesiones (RF-011)
¿Qué perfil aprueba la justificación de una sesión no dictada (por ejemplo, por descanso médico)? *(será configurable)*
- ☐ Subdirector **(propuesta)**
- ☐ Director
- ☐ Ambos

**Observaciones:** ________________________________________________________________

## A.3 Secretaría (y docentes que manejan el SIAGIE)

**Entrevistado:** ______________________________________ **Cargo:** __________________

### P-12 · Libreta del SIAGIE (RF-014)
**Pedir un PDF de ejemplo de una libreta descargada del SIAGIE.** ☐ Se obtuvo el PDF

¿Dónde aparece el código del estudiante?
- ☐ En el **nombre del archivo** **(propuesta)** — Ejemplo de nombre: ______________________________
- ☐ **Impreso dentro** del PDF
- ☐ En ambos

¿Qué código es? ☐ Código del estudiante del SIAGIE ☐ DNI ☐ Otro: ______________
¿El SIAGIE descarga un PDF por estudiante o uno por sección? ☐ Por estudiante ☐ Por sección

**Observaciones:** ________________________________________________________________

## A.4 Asesor de tesis

**Asesor:** ______________________________________

### P-18 · Fórmula del CSP (RF-020)
Confirmar que coincide con el Anexo 03 del proyecto:

> **CSP = (sesiones cumplidas + parciales) ÷ (sesiones planificadas − justificadas) × 100**

- ☐ Aprobada tal cual **(propuesta)**
- ☐ Solo sesiones **cumplidas** como ejecutadas
- ☐ Las **justificadas** cuentan como no ejecutadas (no se excluyen)
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

## Resumen de la 2.ª ronda (para registrar al volver)

| N.° | Respuesta corta | ¿Cambia el RF? |
|---|---|---|
| P-03 | | ☐ Sí ☐ No |
| P-04 | | ☐ Sí ☐ No |
| P-07 | | ☐ Sí ☐ No |
| P-12 | | ☐ Sí ☐ No |
| P-15 | | ☐ Sí ☐ No |
| P-18 | | ☐ Sí ☐ No |

---

# B. PREGUNTAS YA RESPONDIDAS (1.ª ronda, 2026-10-09)

| N.° | Pregunta | Respuesta | Aplicado en |
|---|---|---|---|
| P-01 | ¿Cómo se registran los apoderados? | Uno por uno desde la ficha del estudiante **y** masivo con plantilla Excel | `RF-007` V2 |
| P-02 | ¿El docente que es apoderado ve también el portal de apoderado? | Sí: un usuario puede tener **varios perfiles** y cambiar entre ellos | `RF-001`, `RF-002`, `RF-007` V2 |
| P-05 | ¿Desde cuándo se firma el ingreso de la sesión? | Desde **15 minutos antes** hasta que termina el bloque; configurable | `RF-011` V2 |
| P-06 | ¿Tolerancia al firmar? | **15 minutos** al ingresar y **15** al salir; configurables | `RF-011` V2 |
| P-08 | ¿Si olvida firmar la salida? | **Parcial** con "Sin firma de salida" y **hora de salida automática** (fin del bloque) | `RF-011` V2 |
| P-09 | ¿Quién registra ausencias del docente? | Director y Subdirector por defecto; **configurable por perfil** | `RF-012` V2 |
| P-10 | ¿Plazo del descargo? | **7 días calendario**; configurable (tabla de variables) | `RF-012`, `RF-004` V2 |
| P-11 | ¿Se puede corregir o borrar una ausencia? | Se corrige en 24 h antes del descargo; después solo se anula; cada cambio crea versión nueva (vigencia 0) | `RF-012` |
| P-13 | ¿Días para planificar materiales? | **7 días**; configurable | `RF-015` V2 |
| P-14 | ¿Quién aprueba cambios de fecha de materiales? | Subdirector por defecto; **configurable por perfil** | `RF-015` V2 |
| P-16 | ¿Cómo se calcula la nota final del aula virtual? | **Con peso por tipo** (examen, cuestionario, trabajo, proyecto); pesos configurables (faltan los % → ver P-15) | `RF-016` V2 |
| P-17 | ¿Quién más ve observaciones confidenciales? | El **Director** y el **propio estudiante**; configurable por perfil | `RF-018` V2 |

**Decisión adicional (2026-10-09):** se distinguen **perfil** (acceso al sistema) y **cargo** (puesto en el colegio). Los permisos se dan solo por perfil; el cargo solo sugiere perfiles. → `RF-002`, `RF-007` V2.
