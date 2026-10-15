# Ejecución de pruebas — RF-014: Libretas del SIAGIE

| Dato                       | Valor                                                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fecha**                  | 2026-10-14, hora de Lima                                                                                                                                                                                                  |
| **Tester**                 | Antigravity AI (Pair Programming)                                                                                                                                                                                         |
| **Ambiente**               | Desarrollo: API local (:3000) y WEB local (:3001) contra PostgreSQL Supabase; Drizzle ORM migración `0013_libretas_archivos`; Jest en `sga-api` y Next.js Turbopack en `sga-web`                                          |
| **Versión del RF**         | V1                                                                                                                                                                                                                        |
| **Versión del sistema**    | Commit backend: `9335f50` · Commit frontend: `df78fb1`                                                                                                                                                                    |
| **Datos de prueba usados** | Cuentas del seed y pruebas unitarias (`libretas.service.spec.ts` con 22 casos CP-RF014-01 a 20): director, docente con y sin tutoría, estudiante matriculado, apoderado vinculado, archivos PDF de prueba ≤ 5 MB y > 5 MB |

## Resultados

Leyenda: ✅ Pasa · ❌ Falla · ⏸️ Bloqueado · ➖ No aplica

| ID          | Escenario                                    | Resultado | Evidencia                                                      | Observación                                                                                                                                                                              |
| ----------- | -------------------------------------------- | --------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CP-RF014-01 | Programar las libretas                       | ✅ Pasa   | `libretas.service.spec.ts` (L134) & `panel-programar-libretas` | Crea registros en estado `pendiente` para estudiantes matriculados y registra en bitácora. En UI muestra modal con confirmación de fecha límite.                                         |
| CP-RF014-02 | Estudiante matriculado después               | ✅ Pasa   | `libretas.service.spec.ts` (L144) & `matricula-operaciones`    | Integrado con RF-009: al confirmar la matrícula posterior crea automáticamente su libreta pendiente con la misma fecha límite.                                                           |
| CP-RF014-03 | Estudiante retirado antes de la fecha límite | ✅ Pasa   | `libretas.service.spec.ts` (L149) & `matricula-operaciones`    | Integrado con RF-009: al registrar el retiro antes de la fecha límite, la libreta pendiente se elimina de BD y deja de contabilizarse en el ISA.                                         |
| CP-RF014-04 | Cambiar la fecha límite                      | ✅ Pasa   | `libretas.service.spec.ts` (L154) & `panel-programar-libretas` | Solo modifica las libretas en estado `pendiente`, dejando intactas las ya publicadas. Registro auditado en `bitacora_auditoria`.                                                         |
| CP-RF014-05 | Subir y publicar a tiempo                    | ✅ Pasa   | `libretas.service.spec.ts` (L161) & `panel-subir-libretas`     | Carga en bloque con matching por código en el nombre del archivo. Publica como `a_tiempo` y notifica a estudiante y apoderado mediante `NotificacionesService`.                          |
| CP-RF014-06 | Publicar fuera de plazo                      | ✅ Pasa   | `libretas.service.spec.ts` (L179) & `libretas.service.ts`      | Si la publicación se realiza después de la fecha límite del bimestre, el estado asignado es `fuera_de_plazo`.                                                                            |
| CP-RF014-07 | Vista previa con archivos no reconocidos     | ✅ Pasa   | `libretas.service.spec.ts` (L189) & `panel-subir-libretas`     | El endpoint `vistaPrevia` analiza los archivos sin publicar nada: clasifica asignadas, sin reconocer y de otra sección, mostrando el resumen al usuario.                                 |
| CP-RF014-08 | Asignar manualmente un archivo               | ✅ Pasa   | `libretas.service.spec.ts` (L206) & `modal-asignar-archivo`    | Permite vincular un archivo no reconocido seleccionando al estudiante de la nómina de la sección; se registra con asignación `manual`.                                                   |
| CP-RF014-09 | Archivo inválido                             | ✅ Pasa   | `libretas.service.spec.ts` (L221) & `panel-subir-libretas`     | Validación tanto en cliente como en servidor: rechazo inmediato si el formato no es PDF o si el tamaño supera los 5 MB ("Solo se aceptan archivos PDF de hasta 5 MB.").                  |
| CP-RF014-10 | Demasiados archivos                          | ✅ Pasa   | `libretas.service.spec.ts` (L235) & `panel-subir-libretas`     | Bloqueo a nivel de hook y endpoint al intentar subir más de 50 archivos simultáneos ("Puede subir hasta 50 archivos por carga.").                                                        |
| CP-RF014-11 | Bimestre sin programar                       | ✅ Pasa   | `libretas.service.spec.ts` (L242) & `panel-subir-libretas`     | El selector de bimestres filtra solo bimestres con programación activa; en backend se valida con `BadRequestException` ("El bimestre aún no tiene libretas programadas.").               |
| CP-RF014-12 | Sección sin permiso                          | ✅ Pasa   | `libretas.service.spec.ts` (L249) & `libretas.service.ts`      | Validación de alcance del rol: si tiene alcance `mis_secciones` y no dicta en ella, la API responde `ForbiddenException` ("No tiene permiso para subir libretas de esta sección.").      |
| CP-RF014-13 | Cambiar el alcance                           | ✅ Pasa   | `libretas.service.spec.ts` (L258) & `libretas-page.tsx`        | Pestaña "Quién sube" exclusiva para Administrador. Modifica el alcance en `libreta_alcances` (ej. a `tutoria`) y registra la auditoría.                                                  |
| CP-RF014-14 | Reemplazar con motivo                        | ✅ Pasa   | `libretas.service.spec.ts` (L270) & `panel-subir-libretas`     | Al subir un nuevo archivo para una libreta ya publicada, el archivo anterior pasa a `vigente = false` y el nuevo queda vigente con motivo obligatorio, conservando el estado `a_tiempo`. |
| CP-RF014-15 | Reemplazo sin motivo                         | ✅ Pasa   | `libretas.service.spec.ts` (L297) & `panel-subir-libretas`     | Validación obligatoria del campo motivo en frontend y backend: rechazo con mensaje `"Indique el motivo del reemplazo."`.                                                                 |
| CP-RF014-16 | Historial de archivos                        | ✅ Pasa   | `libretas.service.spec.ts` (L305) & `modal-historial-libreta`  | Modal accesible para directivos/docentes que lista todos los archivos subidos para la libreta, indicando vigencia (1 o 0), quién lo subió, fecha y motivo.                               |
| CP-RF014-17 | Ver la libreta publicada                     | ✅ Pasa   | `libretas.service.spec.ts` (L343) & `mis-libretas-page.tsx`    | Estudiante o apoderado autorizado puede visualizar/descargar el PDF vigente. Se registra automáticamente la fecha y hora de la primera vista en la libreta.                              |
| CP-RF014-18 | Libreta aún no publicada                     | ✅ Pasa   | `libretas.service.spec.ts` (L363) & `mis-libretas-page.tsx`    | En "Mis libretas", si el estado es `pendiente`, se oculta el botón de descarga y se muestra el mensaje "Tu libreta del [Bimestre] aún no está disponible.".                              |
| CP-RF014-19 | Libreta de otro estudiante                   | ✅ Pasa   | `libretas.service.spec.ts` (L385) & guard backend              | Verificación estricta de titularidad familiar o matrícula activa: acceso a libreta ajena es denegado con `ForbiddenException`.                                                           |
| CP-RF014-20 | Avance por sección                           | ✅ Pasa   | `libretas.service.spec.ts` (L401) & `panel-seguimiento`        | Panel de seguimiento que calcula y visualiza por sección los conteos de a tiempo, fuera de plazo, pendientes, vistas por familia y el porcentaje de cumplimiento a tiempo.               |

## Resumen

| Total | ✅ Pasa | ❌ Falla | ⏸️ Bloqueado | ➖ No aplica | % de éxito |
| ----- | ------- | -------- | ------------ | ------------ | ---------- |
| 20    | 20      | 0        | 0            | 0            | 100 %      |

**% de éxito** = casos que pasan ÷ (total − no aplica) × 100

## Conclusión

☑ **Validado:** todos los casos aplicables pasan (20 de 20).
