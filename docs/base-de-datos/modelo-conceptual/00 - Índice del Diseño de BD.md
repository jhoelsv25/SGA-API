---
tags: [tesis, sga, base-de-datos, indice]
actualizado: 2026-09-25
---

# Diseño de Base de Datos · SGA I.E. Nuestra Señora del Carmen

Proyecto de tesis: *"Implementación de sistema web para mejorar la gestión académica en la I.E. Nuestra Señora del Carmen, Lircay – 2025"* (UNH). Stack: Angular + NestJS + **PostgreSQL**.

Flujo seguido: **Requisitos → Diagrama E-R → Modelo relacional + Normalización → Diseño físico → Implementación**.

| Fase | Nombre en proyecto real | Entregable | Estado |
|---|---|---|---|
| 1 | Levantamiento de requerimientos | Documento de requerimientos y reglas de negocio | ⏳ Se hará al final (acordado) |
| 2 | Modelado conceptual | [[02 - Modelo Conceptual (Diagrama E-R)\|Diagrama E-R (A3)]] | 🟡 v1.0 en revisión |
| 3 | Modelado lógico + normalización | Modelo relacional + diccionario de datos | ⏳ Pendiente |
| 4 | Modelado físico | Script DDL PostgreSQL, índices y restricciones | ⏳ Fuera del alcance actual |
| 5 | Implementación | Migraciones, datos semilla y pruebas | ⏳ Fuera del alcance actual |

## Archivos
- Diagrama para imprimir: [[adjuntos/02-modelo-conceptual-A3.pdf]]
- Imagen: [[adjuntos/02-modelo-conceptual.png]] · vector editable: `adjuntos/02-modelo-conceptual.svg`
- Fuente reproducible del diagrama: `adjuntos/fuente-diagrama/` (`model.py` = entidades y relaciones, `build.ps1` = regenerar)
