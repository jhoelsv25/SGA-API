---
name: estandar-reportes-excel
description: Modelo único para todo reporte Excel (.xlsx) del SGA. Úsala al crear o modificar cualquier exportación a Excel (padrón, listas, consolidados, libros) para que tenga el mismo formato, hojas y nombre de archivo.
---

# Estándar de reportes Excel — SGA

Todo reporte Excel se genera **en el backend** con `exceljs`, usando el constructor común `src/common/excel/reporte-excel.builder.ts` (`generarReporteExcel`). No se exporta desde el frontend con `xlsx` sobre las filas cargadas en pantalla: así el reporte trae **todas** las filas que cumplen los filtros, no solo la página visible.

## Modelo

1. **Hoja «Reporte»** (primera, la que abre Excel)
   - La tabla empieza en la **fila 1** (sin títulos ni filas combinadas encima): fácil de filtrar, ordenar y reimportar.
   - Encabezado fijo (`frozen`), autofiltro, color de plantilla de importación: oscuro `FF1E293B` en columnas obligatorias, gris `FF64748B` en las opcionales/informativas; texto blanco, negrita, centrado.
   - Anchos definidos por columna. Fechas como **fecha real** (`dd/mm/yyyy`), nunca texto. Documentos, códigos y teléfonos como **texto** (`@`) para no perder ceros. Sin dato → celda vacía (no «-» ni «N/A»).
2. **Hoja «Información»**: institución, título del reporte, año académico, filtros aplicados (o «Sin filtros»), generado por, fecha y hora, total de filas.
3. **Archivo**: `sga_<modulo>_<AAAA-MM-DD>.xlsx` (módulo en minúsculas, sin tildes).

## Columnas

- Reportes del **padrón** (personas, estudiantes, docentes, apoderados): primero las **mismas columnas, nombres y orden de la plantilla de importación** (`PLANTILLAS` en `src/features/importacion/constants/plantillas.constants.ts`), luego las columnas propias del reporte (estado, cargo vigente, usuario del sistema, etc.). Los valores se escriben igual que las listas desplegables de la plantilla (p. ej. `dni`, `M`/`F`, `SI`/`NO`).
- Otros reportes (consolidados, indicadores, libros): sus propias columnas, mismo estilo y hoja «Información».

## Cómo crear un reporte nuevo

1. En el servicio del módulo, obtén **todas** las filas con los mismos filtros de la pantalla, recorriendo las páginas por cursor (el `limit` máximo es 100) con un tope de seguridad.
2. Define `columnas: ColumnaReporte[]` (`header`, `key`, `ancho`, `tipo`: `texto|fecha|numero`, `requerido`).
3. Llama a `generarReporteExcel({ titulo, modulo, columnas, filas, filtros, generadoPor, institucion, anioAcademico })` → `Buffer` (en `ExportacionService.generar`). Usa `obtenerTodasLasFilas` para recorrer las páginas.
4. En `src/features/exportacion/` (servicio + controlador): método `<modulo>Excel(query, user)` y `GET /exportacion/<modulo>` con los mismos query params del listado, `@Roles` igual al del listado, y respuesta `StreamableFile` con `Content-Type` xlsx y `Content-Disposition: attachment; filename="..."` (nombre que devuelve `nombreArchivoReporte`).
5. En el frontend: el botón «Exportar Excel» llama al endpoint con los filtros actuales y descarga el blob. No usar `useExportExcel` sobre filas cargadas.
6. Pruebas: una prueba por reporte que verifique hojas, encabezados, fecha real, texto en documento y hoja «Información».

## Reportes con varias hojas

Usa `hojasExtra` (desglose, detalle crudo) para hojas adicionales con el mismo estilo; quedan entre «Reporte» e «Información». `datosInstitucion` suma datos (UGEL, DRE…) a «Información». Ejemplos: indicadores, libro de notas, consolidado docente, credenciales emitidas.

## No hacer

- Títulos o logos arriba de la tabla en la hoja «Reporte».
- Fechas como texto, ceros iniciales perdidos, valores «-».
- Exportar solo lo visible en pantalla.
- Datos sensibles (contraseñas, PIN) en reportes de padrón.

Ver también `excel-pdf-reports` (recetas generales de `exceljs`/`pdfkit`).
