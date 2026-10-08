# Datos de prueba — Roles, permisos y alcances

Configuración de roles con la que se prueba (`RF-002`). Si se cambia un permiso o un alcance para una prueba, **anotarlo** y dejarlo como estaba al terminar, o registrar la nueva configuración aquí.

## Roles

| Rol | Rol del sistema | Descripción |
|---|---|---|
| Administrador | Sí | Acceso total |
| Director | Sí | Seguimiento docente, supervisión y reportes |
| Subdirector | Sí | Panel de sesiones y registro de ausencias |
| Soporte TI | Sí | Equipos autorizados, cuentas y soporte |
| Secretaria | Sí | Matrícula, estudiantes y apoderados |
| Docente | Sí | Sesiones, libretas y aula virtual |
| Estudiante | Sí | Aula virtual, libretas y asistencia propias |
| Apoderado | Sí | Libretas, asistencia y comunicados de sus hijos |

## Permisos con alcance (configuración de prueba)

Alcances: `propio` · `tutoria` · `mis_secciones` · `colegio`

| Permiso | Administrador | Director | Subdirector | Soporte TI | Secretaria | Docente | Estudiante | Apoderado |
|---|---|---|---|---|---|---|---|---|
| `usuarios.gestionar` | colegio | | | colegio | | | | |
| `auditoria.consultar` | colegio | | | | | | | |
| `equipos.gestionar` | colegio | | | colegio | | | | |
| `calendario.registrar` | colegio | colegio | | | | | | |
| `sesiones.registrar` | | | | | | propio | | |
| `ausencias.registrar` | | colegio | colegio | | | | | |
| `libretas.programar` | | colegio | colegio | | | | | |
| `libretas.subir` | | | colegio | | colegio | mis_secciones | | |
| `conducta.registrar` | | colegio | colegio | | | mis_secciones | | |
| `comunicados.publicar` | | colegio | colegio | | colegio | tutoria | | |
| `indicadores.medir` | | colegio | | | | | | |

> Completar con los códigos de permiso reales que defina el backend.

## Historial de cambios

| Fecha | Cambio | Motivo | Quién |
|---|---|---|---|
| | Configuración inicial | | |
