# RF-003: Bitácora de Auditoría

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Seguridad
**Versión:** 1.0
**BA responsable:** Hever Lima
**Prioridad:** Baja | **Complejidad:** Baja | **Esfuerzo estimado:** 4 hh (IA Agéntica)
**Prerrequisitos:** `RF-001` (eventos de inicio y cierre de sesión), `RF-002` (permiso de consulta de la bitácora).

## Consideraciones y supuestos de negocio

- **Propósito.** Dejar evidencia de quién hizo qué cambio en el sistema y cuándo, para resolver reclamos y controlar el uso de la información.
- **Qué se registra.** Cada vez que un RF indica "queda en la bitácora", se guarda un registro con:

  | Dato                         | Descripción                                                                                                                       |
  | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
  | Usuario                      | Cuenta que hizo la acción. Vacío si la hizo el sistema (por ejemplo, el bloqueo automático o la generación de sesiones de clase). |
  | Acción                       | `crear`, `actualizar`, `eliminar`, `iniciar_sesion` o `cerrar_sesion`.                                                            |
  | Entidad                      | Qué tipo de dato se tocó (por ejemplo, Usuarios, Sesiones de clase, Libretas).                                                    |
  | Registro                     | Identificador del dato afectado.                                                                                                  |
  | Valor anterior / Valor nuevo | Los campos que cambiaron, antes y después. En `crear` solo hay valor nuevo; en `eliminar`, solo valor anterior.                   |
  | Dirección IP                 | Desde dónde se hizo la acción.                                                                                                    |
  | Fecha y hora                 | Hora del servidor (zona horaria de Lima).                                                                                         |

- **Cambios de estado y contraseña.** El bloqueo, desbloqueo, desactivación y el cambio o restablecimiento de contraseña se registran como `actualizar` sobre la cuenta. **Nunca** se guarda la contraseña ni su hash en la bitácora: solo se indica que el campo cambió.
- **Inmutable.** Ningún usuario, ni siquiera el Administrador, puede editar ni eliminar registros de la bitácora. La pantalla no ofrece esas acciones y el servidor las rechaza.
- **Se conserva aunque el usuario desaparezca.** El registro mantiene su usuario aunque la cuenta se desactive.
- **Solo consulta.** Este RF trata de consultar la bitácora; el registro lo hace automáticamente cada RF.
- **Quién consulta.** Solo los roles con el permiso de consulta de la bitácora; por defecto, el Administrador.
- **Listado.** Ordenado del más reciente al más antiguo, paginado de 50 en 50. Por defecto muestra los últimos 7 días.
- **Filtros.** Rango de fechas, usuario, acción y entidad. El rango máximo de una consulta es de 31 días, para que la pantalla responda rápido. _(Supuesto.)_
- **Conservación.** Los registros se conservan de forma indefinida. _(Supuesto.)_
- **Operación 100% en línea.**

## Mensajes del requerimiento

| Situación                 | Mensaje                                                         |
| ------------------------- | --------------------------------------------------------------- |
| Rango de fechas invertido | "La fecha final no puede ser anterior a la fecha inicial."      |
| Rango mayor a 31 días     | "El rango de consulta no puede superar los 31 días."            |
| Sin resultados            | "No hay registros de auditoría para los filtros seleccionados." |

## Requerimientos fuera de alcance (Out of Scope)

- **Generación de los registros.** La hace cada RF al ejecutar sus acciones; este RF solo los consulta.
- **Exportación a Excel o PDF.** No se contempla en esta versión.
- **Alertas automáticas ante acciones sospechosas.** No se contempla.
- **Registro de consultas o lecturas.** Solo se registran cambios e inicios y cierres de sesión, no cada pantalla que se abre. La lectura de libretas se registra aparte en `RF-014`.
- **Depuración o archivado de registros antiguos.** No se contempla.

## Acuerdos y puntos abiertos

- **Valores por confirmar.** Rango máximo de consulta (31 días) y conservación indefinida.

## Historia de Usuario 1: Consulta de la bitácora

**Como** Administrador
**Quiero** consultar quién hizo cada cambio en el sistema
**Para** resolver reclamos y controlar el uso de la información.

### Escenario: Consulta inicial

**Dado** que tengo el permiso de consulta de la bitácora
**Cuando** abro "Auditoría"
**Entonces** el sistema lista los registros de los últimos 7 días, del más reciente al más antiguo, de 50 en 50
**Y** cada fila muestra fecha y hora, usuario, acción, entidad y dirección IP.

### Escenario: Filtrar por usuario y acción

**Dado** que estoy en "Auditoría"
**Cuando** filtro por un usuario y la acción `actualizar`
**Entonces** el sistema muestra solo los cambios hechos por ese usuario en el rango de fechas elegido.

### Escenario: Ver el detalle de un cambio

**Dado** que estoy en el listado
**Cuando** abro un registro de acción `actualizar`
**Entonces** el sistema muestra cada campo modificado con su valor anterior y su valor nuevo, uno al lado del otro.

### Escenario: Cambio de contraseña en el detalle

**Dado** que abro el registro de un cambio de contraseña
**Cuando** veo su detalle
**Entonces** el sistema indica que la contraseña cambió, sin mostrar ningún valor de la contraseña.

### Escenario: Acción hecha por el sistema

**Dado** que una cuenta se bloqueó por intentos fallidos
**Cuando** veo ese registro
**Entonces** el usuario aparece como "Sistema".

### Escenario: Rango de fechas invertido

**Dado** que estoy en "Auditoría"
**Cuando** elijo una fecha final anterior a la inicial
**Entonces** el sistema impide la consulta y muestra "La fecha final no puede ser anterior a la fecha inicial."

### Escenario: Rango mayor a 31 días

**Dado** que estoy en "Auditoría"
**Cuando** elijo un rango de más de 31 días
**Entonces** el sistema impide la consulta y muestra "El rango de consulta no puede superar los 31 días."

### Escenario: Sin resultados

**Dado** que no hay registros para los filtros elegidos
**Cuando** consulto
**Entonces** el sistema muestra "No hay registros de auditoría para los filtros seleccionados."

### Escenario: Intento de modificar o eliminar un registro

**Dado** que estoy viendo un registro de la bitácora
**Cuando** busco cómo editarlo o eliminarlo
**Entonces** el sistema no ofrece esas acciones
**Y** si se intenta por cualquier otra vía, el servidor lo rechaza.

### Escenario: Usuario sin permiso

**Dado** que mi rol no tiene el permiso de consulta de la bitácora
**Cuando** intento abrir "Auditoría" por su ruta
**Entonces** el sistema no muestra la opción en el menú y rechaza el acceso a la pantalla.

---

## Reglas de validación y negocio (resumen)

- **Datos de cada registro:** usuario (o "Sistema"), acción, entidad, registro afectado, valor anterior y nuevo, IP, fecha y hora del servidor.
- **Acciones:** `crear`, `actualizar`, `eliminar`, `iniciar_sesion`, `cerrar_sesion`.
- **Contraseñas:** nunca se guardan en la bitácora; solo se indica que cambiaron.
- **Inmutabilidad:** sin edición ni eliminación, ni por pantalla ni por servidor.
- **Filtros:** rango de fechas (máximo 31 días, fin ≥ inicio), usuario, acción y entidad; por defecto, los últimos 7 días.
- **Listado:** del más reciente al más antiguo, 50 por página.
- **Permisos:** solo roles con el permiso de consulta de la bitácora (por defecto, el Administrador).

## Anexos y Prototipo Interactivo

- 👉 **Prototipo interactivo:** Portal web. Pantallas: Auditoría (listado con filtros) · Detalle del registro (antes y después). Escenarios: Listado inicial · Vacío · Detalle de cambio · Rango inválido · Sin permiso.
