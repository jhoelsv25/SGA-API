# Test de RF-022 — Integración con biométrico ZKTeco

Guía para **programar, configurar y probar** el reloj ZKTeco con el SGA. Los casos formales están en
[`casos/RF-022_Integracion_con_Biometrico_ZKTeco/casos-de-prueba.md`](../casos/RF-022_Integracion_con_Biometrico_ZKTeco/casos-de-prueba.md)
(CP-RF022-01 a 28); esta guía explica **cómo llegar a poder ejecutarlos**.

## 1. Cómo funciona

```
Reloj ZKTeco ──(red local, puerto 4370)──▶ SGA Puente (PC del colegio) ──(internet, HTTPS, clave)──▶ API del SGA
                                                  ▲                                                      │
                                                  └────── configuración y órdenes (Configuración → Reloj Biométrico)
```

- El servidor **nunca** se conecta al reloj. Solo la **app puente** lo hace, desde un PC que esté en la misma red.
- Lo que se configura **en el SGA web** (IP, puerto, clave del reloj, intervalo) la app lo descarga sola.
- Lo único que se escribe en la app puente: **dirección del servidor** y **clave de la app puente**.
- Reglas: la primera marca del día es **entrada**, la siguiente **salida**; el botón entrada/salida del reloj se ignora.
  Una segunda marca dentro de 5 minutos se ignora (antirrebote). La hora válida es la del reloj; la app lo pone en hora
  con la del servidor si se desfasa más de 2 minutos.

## 2. Qué se necesita

| Qué | Detalle |
| --- | --- |
| Reloj | ZKTeco (posible MB20-VL/ID), con **IP fija** en la red del colegio |
| PC del colegio | Siempre encendido, con internet y en la misma red que el reloj (P-38) |
| SGA | API y web funcionando, con las migraciones 0017 y 0018 aplicadas y el seed corrido |
| Usuario | Administrador, Soporte TI o Secretaria |

## 3. Configurar (una sola vez)

### 3.1 En el reloj
1. Menú **Comunicación → Ethernet**: IP fija (ej. `192.168.1.201`), máscara y puerta de enlace de la red del colegio.
2. Anote el **puerto** (por defecto `4370`) y la **clave de comunicación** (`0` si no tiene; menú Comunicación → Clave de comunicación).
3. Verifique que la **hora y fecha** del reloj estén correctas.
4. **Enrole a cada docente** y anote el **ID de usuario** que le asigna el reloj (ej. `152`). Ese ID es su *código biométrico*.

### 3.2 En el SGA web
1. **Equipos → Nuevo equipo**: tipo **Biométrico**, propósito marcación, usuarios *docentes*, **número de serie** (obligatorio).
2. En ese equipo, botón **Clave de la app puente**: se muestra **una sola vez**. Cópiela.
3. **Configuración → Reloj Biométrico**: escriba **IP**, **puerto**, **clave de comunicación** e **intervalo** de lectura (60 s) y pulse *Guardar conexión*.
4. **Plana Docente → Código biométrico** de cada docente: escriba el ID del reloj (solo letras y números, máx. 20; no se puede repetir).
5. Revise en **Configuración → Variables** (módulo asistencia): `biometrico.minutos_antirrebote` (5), `biometrico.desfase_maximo_min` (2), `biometrico.minutos_sin_comunicacion` (10). Valores a confirmar con el colegio (P-42).

### 3.3 En la app puente (PC del colegio)
**Con el .exe** (producción): copie la carpeta `sga-puente` generada por `empaquetado\construir.bat` y abra `iniciar-sga-puente.bat`.
**Desde el código** (desarrollo): ver sección 4.

En la pantalla (http://127.0.0.1:8765) → *Configuración*: **Dirección del servidor** (termina en `/api`) y **Clave de la app puente**. Guardar.
Para que arranque sola: `instalar-inicio-automatico.bat` como administrador.

## 4. Probar SIN el reloj (modo simulado) — en este equipo de desarrollo

```bash
# API (puerto 3000) y web (3001), como siempre
cd SGA-API  && pnpm start:dev
cd SGA-WEB  && bun run dev

# App puente
cd SGA-PUENTE
python -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]"
sga-puente --abrir          # http://127.0.0.1:8765
```

1. Cree en el SGA un equipo biométrico de prueba, genere su clave y póngala en la app puente con la URL `http://localhost:3000/api`.
2. Marque **Modo simulado** y guarde. Aparece el panel *Reloj simulado*.
3. Pulse **Probar conexión con el servidor**: debe decir *El servidor respondió y la clave es válida*.
4. Asigne a un docente de prueba el código `9901` (Plana Docente → Código biométrico).
5. Pruebas con el simulador:

| Acción | Resultado esperado | Caso |
| --- | --- | --- |
| *Simular marcación* con `9901` y *Sincronizar ahora* | Entrada del docente en **Marcaciones de hoy**, origen `biometrico` | 08–12 |
| Segunda marca de `9901` a los pocos segundos | El servidor la **ignora** (antirrebote); en el registro: «1 ignoradas» | 14 |
| Marca con código `7777` | Va a **Marcaciones pendientes** (*Código sin persona*); asignar a un docente la registra con su hora original | 22–23 |
| Descartar una pendiente sin motivo | «Indique el motivo para descartar la marcación.» | 24 |
| Marcar con el servidor apagado, luego encenderlo | Quedan en la cola y se envían al volver, con su hora original | 15–16 |
| Reenviar lo ya enviado | No se duplica | 17 |
| *Desfasar la hora del reloj* 10 min | La app lo pone en hora y se avisa a Soporte TI | 19 |
| *Apagar el reloj* simulado | Alerta «El reloj … no responde a la app puente desde las …» | 21 |
| Cerrar la app puente 10+ min | Alerta «La app puente del reloj … no se comunica desde las …» | 20 |
| Clave incorrecta | La app dice *Clave de la app puente inválida*; queda en la bitácora | 18 |
| Configuración → Reloj Biométrico: **Guardar conexión** | «Configuración del reloj guardada…»; la app la toma en su siguiente aviso | 25–26 |
| Botones **Probar / Ver marcaciones / Sincronizar** | El resultado aparece en la misma pantalla en pocos segundos; sin IP guardada: «Primero guarde la IP del reloj.» | 27–28 |

Pruebas automáticas (sin hardware): `cd SGA-API && pnpm test` (974) y `cd SGA-PUENTE && pytest` (43).

## 5. Probar CON el reloj real (en el colegio)

Hágalo en este orden; si un paso falla, no siga.

1. [ ] **Red:** desde el PC del colegio, `ping 192.168.1.201` responde.
2. [ ] **App puente** abierta, *Modo simulado* **desmarcado**, dirección y clave guardadas. *Probar conexión con el servidor* → OK.
3. [ ] **Configuración → Reloj Biométrico** con la IP/puerto/clave reales guardados. Pulse **Probar conexión con el reloj**: debe mostrar modelo, serie y hora del reloj. (Anote el modelo y la serie: cierra P-37.)
4. [ ] **Ver marcaciones del reloj**: lista las últimas marcas (sin enviarlas).
5. [ ] **Hora:** compare la hora del reloj con la del servidor. Si difiere > 2 min, la app la corrige en el siguiente aviso; verifique que quedó bien.
6. [ ] **Docentes:** que 2 docentes de prueba marquen con su huella. Con *Sincronizar ahora* aparecen en **Marcaciones de hoy** (primera = entrada, segunda tras 5+ min = salida).
7. [ ] **Marca repetida** (el mismo docente 2 veces seguidas): la segunda se ignora.
8. [ ] **ID no asignado:** un usuario enrolado en el reloj sin código en el SGA marca → aparece en **Marcaciones pendientes**.
9. [ ] **Sin internet:** desconecte el PC de internet, marque, reconecte → las marcas llegan con su hora original.
10. [ ] **Reloj apagado/desconectado** unos minutos → alerta en Equipos / Marcaciones de hoy.
11. [ ] **Cambio de reloj similar:** cambie IP/serie del equipo (Equipos → Editar) y la IP en Configuración → Reloj Biométrico; todo debe seguir igual (CP-RF022-06).

Registre cada ejecución con [`PLANTILLA-EJECUCION.md`](../PLANTILLA-EJECUCION.md) en
`casos/RF-022_Integracion_con_Biometrico_ZKTeco/ejecuciones/AAAA-MM-DD_<ambiente>_<tester>.md` y guarde las capturas en `evidencias/`.

## 6. Problemas frecuentes

| Síntoma | Causa probable |
| --- | --- |
| *Probar conexión con el reloj* falla por tiempo de espera | IP incorrecta, el reloj en otra red/VLAN, firewall del PC, o el reloj sin Ethernet activo |
| *Falla de autenticación* / pide clave | La clave de comunicación del SGA no coincide con la del reloj |
| La orden queda «Esperando a la app puente…» y luego falla | La app puente está apagada, sin internet o con otra clave |
| El servidor responde 401 | Clave de la app puente incorrecta, o el reloj está desactivado en Equipos |
| Marca llega a pendientes | El ID del reloj no está asignado como código biométrico de un docente activo, o no hay turno de docentes |
| Marca no aparece | La marca es anterior a la fecha de *Importar desde* (la primera vez solo se importa desde hoy) |
| Hora siempre desfasada | El reloj no acepta el cambio de hora: póngala a mano en el menú del reloj |

## 7. Limpiar datos de prueba

Antes de producción: quitar los códigos de prueba (Plana Docente → Código biométrico → Quitar), eliminar o desactivar los
equipos de prueba, descartar las marcaciones pendientes de prueba y borrar la carpeta `datos/` de la app puente
(configuración y cola locales).

## 8. Pendientes con el colegio

P-36 (alcance), P-37 (**probar el modelo real**), P-38 (qué PC siempre encendido y con IP fija), P-40 (consentimiento de los docentes),
P-42 (valores de las variables). Ver [`PENDIENTES.md`](../../requerimientos/PENDIENTES.md).
