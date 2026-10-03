# RF-004: Institución y Turnos

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Configuración
**Versión:** 1.0
**BA responsable:** Hever Lima
**Prioridad:** Media | **Complejidad:** Baja | **Esfuerzo estimado:** 4 hh (IA Agéntica)
**Prerrequisitos:** `RF-002` (permiso de configuración).

## Consideraciones y supuestos de negocio

*   **Propósito.** Registrar los datos del colegio que aparecen en todo el sistema y definir los horarios de entrada y salida con los que se calculan las tardanzas en las marcaciones (`RF-010`).
*   **Un solo colegio.** El sistema atiende a una sola institución. Sus datos se editan; no se crean ni se eliminan colegios.
*   **Datos de la institución.**

    | Dato | Obligatorio | Observación |
    |---|---|---|
    | Nombre | Sí | Aparece en la cabecera y los reportes |
    | Código modular | Sí | Código del MINEDU |
    | Código de local | No | |
    | Tipo de gestión | Sí | `publica`, `privada` o `convenio` |
    | UGEL / DRE | No | |
    | Director | No | Nombre que firma los reportes |
    | Dirección | Sí | |
    | Distrito / Provincia / Departamento | No | |
    | Teléfono / Correo | No | Correo con formato válido |
    | Logo | No | Imagen PNG o JPG de hasta 1 MB |
    | Ubicación (latitud y longitud) | No | Centro de la geocerca |
    | Radio de la geocerca | Sí | En metros, mayor que 0; por defecto 120 m |

*   **Geocerca.** Es el área alrededor del colegio dentro de la cual una marcación por intranet (`RF-010`) o una firma de sesión (`RF-011`) se considera hecha "en el colegio". Si no se registra la ubicación, el sistema no valida la geocerca y lo indica en pantalla.
*   **Turnos: uno por tipo de persona.** Hay exactamente tres turnos posibles: **Estudiantes**, **Docentes** y **Administrativos**. No se puede crear un segundo turno para el mismo tipo.
*   **Datos del turno.** Hora de entrada, hora de salida (posterior a la de entrada), tolerancia en minutos (de 0 a 60) y días laborables (de lunes a domingo, por defecto de lunes a viernes).
*   **Tardanza.** Una marcación de entrada después de *hora de entrada + tolerancia* es tardanza (`RF-010`). Una salida antes de la hora de salida es salida anticipada.
*   **Cambios sin efecto retroactivo.** Cambiar un turno afecta solo a las marcaciones nuevas; las ya registradas conservan el resultado con el que se calcularon.
*   **Turno inactivo.** Si el turno de un tipo está inactivo o no existe, las marcaciones de ese tipo se guardan sin calcular tardanza.
*   **Quién configura.** Solo los roles con permiso de configuración; por defecto, el Administrador.
*   **Operación 100% en línea.**
*   **Auditoría inmutable.** Todo cambio en la institución o en los turnos queda en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación | Mensaje |
|---|---|
| Datos guardados | "Los datos se guardaron correctamente." |
| Correo inválido | "Ingrese un correo válido." |
| Logo inválido | "El logo debe ser una imagen PNG o JPG de hasta 1 MB." |
| Radio inválido | "El radio de la geocerca debe ser mayor que 0." |
| Horas invertidas | "La hora de salida debe ser posterior a la hora de entrada." |
| Tolerancia fuera de rango | "La tolerancia debe estar entre 0 y 60 minutos." |
| Turno repetido | "Ya existe un turno para este tipo de persona." |
| Sin días laborables | "Seleccione al menos un día laborable." |

## Requerimientos fuera de alcance (Out of Scope)

*   **Registro de las marcaciones y cálculo de tardanzas.** Corresponde a `RF-010`.
*   **Varios turnos para un mismo tipo de persona** (por ejemplo, docentes de mañana y de tarde). No se contempla; el colegio tiene un turno por tipo.
*   **Horario de clases de cada sección.** Corresponde a `RF-008`.
*   **Feriados y suspensiones.** Corresponde a `RF-005`.
*   **Varias sedes o colegios.** No se contempla.

## Historia de Usuario 1: Datos de la institución

**Como** Administrador
**Quiero** registrar y actualizar los datos del colegio
**Para** que aparezcan correctamente en el sistema y en los reportes.

### Escenario: Actualizar los datos
**Dado** que estoy en "Institución"
**Cuando** completo los datos obligatorios y presiono "Guardar"
**Entonces** el sistema guarda los cambios, los registra en la bitácora y muestra "Los datos se guardaron correctamente."

### Escenario: Campos obligatorios incompletos
**Dado** que estoy en "Institución"
**Cuando** intento guardar sin nombre, código modular, tipo de gestión o dirección
**Entonces** el sistema impide guardar y señala los campos faltantes.

### Escenario: Correo inválido
**Dado** que estoy en "Institución"
**Cuando** ingreso un correo sin formato válido
**Entonces** el sistema impide guardar y muestra "Ingrese un correo válido."

### Escenario: Subir el logo
**Dado** que estoy en "Institución"
**Cuando** subo una imagen PNG de 300 KB
**Entonces** el sistema la muestra como vista previa y la usa en la cabecera y los reportes al guardar.

### Escenario: Logo inválido
**Dado** que estoy en "Institución"
**Cuando** subo un archivo PDF o una imagen de más de 1 MB
**Entonces** el sistema rechaza el archivo y muestra "El logo debe ser una imagen PNG o JPG de hasta 1 MB."

### Escenario: Definir la geocerca
**Dado** que estoy en "Institución"
**Cuando** marco la ubicación del colegio en el mapa, ingreso un radio de 150 metros y guardo
**Entonces** el sistema guarda el centro y el radio, y los usa para validar las marcaciones y firmas desde ese momento.

### Escenario: Radio inválido
**Dado** que estoy en "Institución"
**Cuando** ingreso un radio de 0 metros
**Entonces** el sistema impide guardar y muestra "El radio de la geocerca debe ser mayor que 0."

### Escenario: Geocerca sin ubicación
**Dado** que el colegio no tiene ubicación registrada
**Cuando** abro "Institución"
**Entonces** el sistema indica que la geocerca no está configurada y que las marcaciones no se validarán por ubicación.

## Historia de Usuario 2: Turnos de marcación

**Como** Administrador
**Quiero** definir la hora de entrada, salida y tolerancia de estudiantes, docentes y administrativos
**Para** que el sistema calcule las tardanzas en las marcaciones.

### Escenario: Registrar el turno de docentes
**Dado** que no existe turno para Docentes
**Cuando** registro entrada 07:30, salida 14:00, tolerancia 5 minutos, de lunes a viernes, y guardo
**Entonces** el sistema crea el turno activo de Docentes.

### Escenario: Turno repetido
**Dado** que ya existe el turno de Docentes
**Cuando** intento crear otro turno para Docentes
**Entonces** el sistema bloquea el guardado y muestra "Ya existe un turno para este tipo de persona."

### Escenario: Horas invertidas
**Dado** que estoy registrando un turno
**Cuando** ingreso una hora de salida anterior o igual a la de entrada
**Entonces** el sistema impide guardar y muestra "La hora de salida debe ser posterior a la hora de entrada."

### Escenario: Tolerancia fuera de rango
**Dado** que estoy registrando un turno
**Cuando** ingreso una tolerancia de 90 minutos
**Entonces** el sistema impide guardar y muestra "La tolerancia debe estar entre 0 y 60 minutos."

### Escenario: Sin días laborables
**Dado** que estoy registrando un turno
**Cuando** desmarco todos los días
**Entonces** el sistema impide guardar y muestra "Seleccione al menos un día laborable."

### Escenario: Cambiar un turno
**Dado** que el turno de Estudiantes tiene entrada a las 07:45
**Cuando** la cambio a las 08:00 y guardo
**Entonces** las marcaciones nuevas se calculan con 08:00
**Y** las marcaciones ya registradas conservan su resultado.

### Escenario: Desactivar un turno
**Dado** que el turno de Administrativos está activo
**Cuando** lo desactivo y confirmo
**Entonces** las marcaciones de administrativos se registran sin calcular tardanza hasta que se reactive.

### Escenario: Usuario sin permiso
**Dado** que mi rol no tiene permiso de configuración
**Cuando** intento abrir "Institución" o "Turnos" por su ruta
**Entonces** el sistema no muestra la opción en el menú y rechaza el acceso a la pantalla.

---

## Reglas de validación y negocio (resumen)

*   **Institución:** una sola; obligatorios Nombre, Código modular, Tipo de gestión, Dirección y Radio de geocerca.
*   **Formatos:** correo válido; logo PNG o JPG de hasta 1 MB; radio mayor que 0.
*   **Geocerca:** sin ubicación registrada no se valida.
*   **Turnos:** uno por tipo de persona (Estudiantes, Docentes, Administrativos); salida posterior a entrada; tolerancia de 0 a 60 minutos; al menos un día laborable.
*   **Tardanza:** entrada después de *hora de entrada + tolerancia*; salida antes de la hora de salida es salida anticipada.
*   **Sin efecto retroactivo:** los cambios de turno solo afectan a marcaciones nuevas.
*   **Permisos:** solo roles con permiso de configuración.
*   **Auditoría:** todo cambio en la institución o en los turnos (`RF-003`).

## Anexos y Prototipo Interactivo

*   👉 **Prototipo interactivo:** Portal web. Pantallas: Institución (formulario con mapa para la geocerca) · Turnos (tres tarjetas: Estudiantes, Docentes, Administrativos). Escenarios: Guardado · Campos faltantes · Logo inválido · Sin geocerca · Turno repetido · Horas invertidas.
