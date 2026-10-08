# Pruebas de aceptación — SGA Colegio

Aquí se guarda **todo lo que se prueba** del sistema: los casos de prueba de cada RF, los datos de prueba que se reutilizan y cada ejecución con su resultado y evidencias. Sirve para validar los RF terminados y como **evidencia para la tesis** (capítulo de pruebas).

## Estructura

```
docs/pruebas/
├── README.md                          ← esta guía
├── PLANTILLA-EJECUCION.md             ← copiar para cada ejecución
├── RESUMEN-PRUEBAS.md                 ← estado de las pruebas por RF
├── datos-de-prueba/                   ← datos que se mantienen entre pruebas
│   ├── usuarios.md                    ← cuentas de prueba por rol
│   ├── roles-y-permisos.md            ← roles, permisos y alcances configurados
│   ├── personas.md                    ← docentes, estudiantes y apoderados de prueba
│   └── estructura-academica.md        ← año, bimestres, grados, secciones, horarios, equipos
└── casos/
    └── RF-XXX_Nombre/
        ├── casos-de-prueba.md         ← generado desde los escenarios Gherkin del RF
        ├── ejecuciones/
        │   └── AAAA-MM-DD_<ambiente>_<tester>.md   ← una por cada vez que se prueba
        └── evidencias/
            └── CP-RFXXX-NN_<descripcion>.png        ← capturas, PDF, Excel exportados
```

## Cómo se prueba un RF

1. **Revisar los datos de prueba** en `datos-de-prueba/`. Si falta un usuario o dato, **agregarlo ahí** antes de probar (así queda para las siguientes pruebas).
2. **Copiar** `PLANTILLA-EJECUCION.md` a `casos/RF-XXX_*/ejecuciones/` con el nombre `AAAA-MM-DD_<ambiente>_<tester>.md` (ej. `2026-10-09_local_hlima.md`).
3. **Ejecutar cada caso** de `casos-de-prueba.md` y marcar el resultado: ✅ Pasa · ❌ Falla · ⏸️ Bloqueado · ➖ No aplica.
4. **Guardar evidencia** de cada caso importante (y de todo fallo) en `evidencias/`, con el ID del caso en el nombre: `CP-RF003-05_rango-invertido.png`.
5. **Registrar los fallos** en la tabla de defectos de la ejecución, con pasos para reproducirlos.
6. **Actualizar** `RESUMEN-PRUEBAS.md`. Si el RF pasa completo, queda **Validado**.

## Reglas

- **Los IDs no cambian.** `CP-RF003-05` es siempre el mismo caso. Si el RF pasa a V2, se regenera `casos-de-prueba.md` y los casos nuevos toman números nuevos; las ejecuciones viejas se conservan.
- **Nada se borra.** Una ejecución nueva no reemplaza a la anterior: se agrega otra con su fecha.
- **Datos de prueba ficticios.** Nunca usar DNI, nombres ni correos reales de estudiantes o docentes. Las contraseñas de prueba solo valen en ambientes locales o de pruebas; **nunca** se usan en producción.
- **Un fallo no se "arregla" en el documento.** Si el sistema hace algo distinto al RF, es un defecto o un cambio de RF (V2), nunca se edita el caso para que pase.
- **Avance del backlog.** El porcentaje de `00-Plan-y-Backlog-RF.md` lo actualiza la skill `actualizar-backlog-rf`; un RF solo pasa a **Validado** en `RESUMEN-PRUEBAS.md` cuando todos sus casos aplicables pasan.

## Ambientes

| Ambiente | Uso | URL / Base de datos |
|---|---|---|
| `local` | Pruebas del desarrollador | _(completar)_ |
| `pruebas` | Validación con el colegio | _(completar)_ |
