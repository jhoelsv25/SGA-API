# Planificación de sesiones: material de referencia (RF-024)

Todo lo usado para definir el catálogo curricular y el modelo de sesión del `RF-024`
(`../requerimientos/RF-024_Planificacion_de_Sesion_de_Aprendizaje/`) y del seed de la base de datos.

## Estructura

| Carpeta | Contenido |
|---|---|
| `fuentes-minedu/` | Documentos originales: Programa Curricular de Educación Secundaria (RM 649-2016), RM 159-2017 (modificatoria), CNEB y listado de competencias del colegio. |
| `modelo-sesion/` | `Modelo_Sesion_Aprendizaje_1ro_EF.docx` (sesión real) y `modelo-sesion-aprendizaje.md` (el modelo estándar, con qué campo llena el sistema, cuál se elige de una lista y cuál escribe el docente). |
| `catalogo/` | `catalogo-cneb.md`: áreas, competencias, capacidades, transversales, enfoques y catálogos del modelo. Se genera desde `src/core/database/seed-catalogo-curricular.data.ts`. |
| `desempenos/` | Un `.md` por área con los desempeños de 1.° a 5.°, y `desempenos.json` (una fila por desempeño: competencia, grado, orden, texto) listo para el seed. |
| `extraidos/` | Textos crudos (OCR y conversiones) y JSON intermedios del parseo. Solo para trazabilidad. |

## Cómo se obtuvo

- Programa Curricular: descargado de <https://repositorio.minedu.gob.pe/handle/20.500.12799/4550>. El PDF es solo imagen (259 págs.), por lo que se aplicó **OCR** (Vision de macOS). Las páginas con dos columnas (1.°/2.° y 3.°/4.°) se leyeron por separado; 5.° grado va a una columna.
- CNEB y modelo: texto extraído directamente.

## Estado y límites (leer antes de usar)

- **1053 desempeños** extraídos de 1.° a 5.°, para 29 de las 31 competencias. Los textos vienen de OCR: **hay que revisarlos contra el PDF** antes de tratarlos como oficiales (P-91).
- **Huecos conocidos:**
  - Competencia 28 (TIC): sin desempeños extraídos (su sección tiene otro formato).
  - Competencia 10 (castellano oral como segunda lengua): falta 5.°.
  - Competencia 11 (lee en castellano como segunda lengua): faltan 1.° y 2.°.
- Faltan las **acciones observables** de cada enfoque transversal (están en el CNEB, no se extrajeron).
- Quechua, Tutoría y Taller no figuran en el CNEB general (P-95).
