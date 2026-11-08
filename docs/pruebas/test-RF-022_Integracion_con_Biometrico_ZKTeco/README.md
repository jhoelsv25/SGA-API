# Test de RF-022 — Integración con biométrico ZKTeco

Guía para **configurar y probar** el reloj ZKTeco con el SGA. Los casos formales están en
[`casos/RF-022_Integracion_con_Biometrico_ZKTeco/casos-de-prueba.md`](../casos/RF-022_Integracion_con_Biometrico_ZKTeco/casos-de-prueba.md).

## 1. Cómo funciona

```
Reloj ZKTeco ──(red local, puerto 4370)──▶ SGA Biométrico (PC del colegio, SGA-NET-BIOMETRICO) ──▶ PostgreSQL
                                                                                                      │
                                                    SGA-API convierte marcaciones_biometricas en asistencia
```

- El programa de escritorio **SGA Biométrico** lee el reloj e **inserta cada marca cruda** en `marcaciones_biometricas`
  (serie del reloj, código de usuario, fecha y hora), sin duplicar. No hay API HTTP ni órdenes al reloj.
- SGA-API convierte las marcas pendientes **solo cuando el programa sincroniza** (tarea programada de Windows o botón
  «Sincronizar»): al terminar cada ciclo el programa ejecuta `NOTIFY biometrico_procesar` y SGA-API, que escucha con
  `LISTEN`, las procesa en ese momento. No hay revisión periódica (se apaga con `BIOMETRICO_PROCESADOR_ACTIVO=false`). Las
  convierte en `marcaciones` con las reglas de RF-010: la primera marca
  del día es entrada, la siguiente salida; antirrebote (`biometrico.minutos_antirrebote`) y duplicado entre vías
  (`marcacion.minutos_duplicado_entre_vias`).
- Una marca con código desconocido, de alguien que no es personal vigente o repetida queda **rechazada** con su motivo
  en `marcaciones_biometricas`.
- El programa se identifica con la cuenta de servicio `biometrico` (la crea el seed, sin acceso a pantallas) y el
  administrador aprueba el equipo en **Configuración → Biométrico**.

## 2. Qué se necesita

- Reloj ZKTeco con IP fija en la red del colegio, SDK `zkemkeeper.dll` registrado en el PC.
- Rol de base `biometrico` (ver `docs/rol-postgres.sql` de SGA-NET-BIOMETRICO) y seed corrido.
- Usuario Administrador, Soporte TI o Secretaria para asignar códigos.

## 3. Configurar

1. En el reloj: IP fija, puerto (4370), clave de comunicación y hora correcta; enrolar a cada docente y anotar su ID.
2. En el SGA web: **Docentes → Código biométrico** y escribir el ID que el reloj le asignó.
3. En el programa SGA Biométrico: datos del reloj y de la base, **Iniciar**; aprobar el equipo en el SGA web.

## 4. Probar

- Marcar con el dedo y comprobar que aparece en **Marcaciones de hoy** (origen biométrico).
- Pruebas automáticas: `npx jest test/features/marcaciones test/features/biometrico` y el e2e
  `E2E_BD_REAL=si npm run test:e2e -- marcaciones-vias` (inserta marcas crudas, no usa el reloj).
