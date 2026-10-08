---
title: Año lectivo de trabajo
trigger: always_on
---

# Año lectivo de trabajo

El año con el que opera el sistema no es un query param ni un campo que cada endpoint reciba por su cuenta. Llega en el header `x-anio-academico-id` (`HEADER_ANIO_ACADEMICO`).

## Cómo se inyecta

- `ClsModule` abre el contexto de la petición.
- `AnioLectivoMiddleware` (`src/common/anio-lectivo/`) lee el header, exige un UUID y lo guarda en CLS con la clave `anioAcademicoId`.
- Los servicios lo leen con `AnioLectivoCls.id()`. Si no hay contexto CLS (una cola, un cron), `id()` devuelve `undefined`.

## Cómo se usa

- Con id: operar ese año (`findById`). Un año `planificado` no se consulta.
- Sin id: el año en curso o reabierto (`findEnCurso`).
- No agregues `anioAcademicoId` a la query de un GET para elegir el año de trabajo. El header ya lo trae.
- CORS ya permite ese header. No lo quites de `allowedHeaders`.
