# Sustento documental del SGA

Qué documento respalda cada función del sistema. Orden de prioridad: **1) MINEDU, 2) leyes y otras entidades del Estado, 3) tesis anteriores, 4) decisiones del proyecto.**

- [Documentos fuente (PDF y Markdown)](fuentes/README.md)
- Fichas revisadas: [asistencia docente](por-funcion/asistencia-docente.md) · [sesión de aprendizaje](por-funcion/sesion-de-aprendizaje.md)

## Cómo se marca cada punto en las fichas

| Marca | Significado |
|---|---|
| ✅ Coincide | El documento lo dice y el sistema lo cumple |
| 🟡 Parcial | El sistema cumple solo una parte |
| ❌ Falta | El documento lo dice y el sistema no lo tiene |
| ⚠️ Difiere | El sistema hace algo distinto de lo que dice el documento |
| 🔵 Decisión propia | No se encontró norma; lo decidió el proyecto |

**Reglas:** solo se cita lo leído en el documento, con su número de página del PDF. «No se encontró» no significa que no exista. Una ficha no cambia el sistema: las diferencias van a `requerimientos/PENDIENTES.md` y las decide el colegio.

## Estado por requerimiento

«Por revisar» = hay documentos que parecen relacionados, pero **todavía no se han comparado campo por campo**. La relación de esas filas es preliminar.

| RF | Función | Documentos | Revisión |
|---|---|---|---|
| RF-001 | Acceso al sistema | Ley 29733, DS 016-2024-JUS | Por revisar |
| RF-002 | Usuarios, roles y menú | Ley 29733, DS 016-2024-JUS | Por revisar |
| RF-003 | Bitácora de auditoría | DS 016-2024-JUS | Por revisar |
| RF-004 | Institución y turnos | RSG 326-2017 | [Turnos revisados](por-funcion/asistencia-docente.md); institución y equipos por revisar |
| RF-005 | Año escolar y calendario | RM 501-2025 | Por revisar |
| RF-006 | Grados, cursos y plan de estudios | CNEB, Programa Curricular | Por revisar |
| RF-007 | Personas | RM 010-2026, Ley 29733, DS 016-2024-JUS | Por revisar (campos obligatorios y datos de menores) |
| RF-008 | Secciones, carga y horarios | RM 501-2025, CNEB, reglamento magisterial | Por revisar |
| RF-009 | Matrícula, retiro y traslado | RM 010-2026 | Por revisar. **Prioridad:** norma de 2026 |
| RF-010 | Marcación y asistencia | RSG 326-2017 | [Personal revisado](por-funcion/asistencia-docente.md); estudiantes por revisar |
| RF-011 | Registro de sesión de clase | RSG 326-2017, cartilla | [Revisado en parte](por-funcion/sesion-de-aprendizaje.md) |
| RF-012 | Supervisión y ausencias del docente | RSG 326-2017, reglamento magisterial | Por revisar |
| RF-013 | Consolidado y ficha de seguimiento | RSG 326-2017, RM 501-2025 | Por revisar |
| RF-014 | Libretas del SIAGIE | RVM 094-2020, RM 452-2025 | Por revisar. Falta la RM 432-2020 |
| RF-015 | Unidades y materiales de reforzamiento | Cartilla, CNEB | Por revisar |
| RF-016 | Tareas y calificación | RVM 094-2020 | Por revisar |
| RF-017 | Interacción del curso | — | No se buscó documento |
| RF-018 | Conducta y observaciones | DS 021-2026, DS 004-2018 | Por revisar. **Prioridad:** norma del 2026-11-07 |
| RF-019 | Comunicados y notificaciones | Ley 29733, DS 016-2024-JUS | Por revisar |
| RF-020 | Indicadores de la tesis | Tesis UDEA | Por revisar |
| RF-021 | Accesos por rol y panel | — | No se buscó documento |
| RF-022 | Biométrico ZKTeco | RSG 326-2017, Ley 29733, DS 016-2024-JUS, tesis UDEA 2021 | [Control de asistencia revisado](por-funcion/asistencia-docente.md); datos biométricos por revisar |
| RF-023 | Observación de aula | Rúbricas 2017, Marco del Buen Desempeño | Por revisar |
| RF-024 | Planificación de sesión | Cartilla, CNEB, Programa Curricular | [Revisado en parte](por-funcion/sesion-de-aprendizaje.md) |
| RF-025 | Reporte de asistencia para la UGEL | RSG 326-2017 | [Revisado e implementado](por-funcion/asistencia-docente.md) |

## Siguiente orden sugerido

1. Confirmar con el colegio los puntos de la asistencia docente (P-99).
2. Matrícula y personas con RM 010-2026 (campos obligatorios y opcionales).
3. Conducta con DS 021-2026.
4. Evaluación y libretas con RVM 094-2020.
5. Datos biométricos y de menores con DS 016-2024-JUS.
