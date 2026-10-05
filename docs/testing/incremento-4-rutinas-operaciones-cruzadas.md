# Incremento 4 — rutinas y operaciones cruzadas

Fecha: 2026-10-04. El incremento incorpora pruebas SQLite aisladas para rutinas y corrige las inconsistencias encontradas. El flujo vigente de cargar una rutina en el formulario y guardar la sesión se conserva sin cambios.

## Cobertura incorporada

Se agregaron 16 pruebas de backend: nueve fijan los contratos funcionales y siete verifican las correcciones de consistencia.

Los contratos verifican:

- Creación, normalización, búsqueda y edición de rutinas.
- Rechazo de campos vacíos y códigos duplicados.
- Asociación, consulta, edición, orden y eliminación de ejercicios.
- Rechazo de ejercicios duplicados y grupos no consecutivos.
- Eliminación lógica y restauración conservando identidad y ejercicios.
- Reemplazo transaccional de ejercicios sin afectar otras rutinas.
- Creación de una rutina desde un entrenamiento, conservando valores y orden.
- Renumeración de grupos aislada por rutina.
- Bases temporales independientes y eliminación automática del fixture.

## Inconsistencias corregidas

| ID | Corrección | Resultado |
| --- | --- | --- |
| RT-01 | Se comprueban las filas afectadas al editar, eliminar y restaurar. | Una rutina inexistente o en estado incorrecto devuelve error. |
| RT-02 | Las lecturas devuelven `Result` desde SQLite hasta Tauri. | Los fallos ya no se confunden con resultados vacíos. |
| RT-03 | Se validan orden, series, repeticiones y peso antes de escribir. | Los valores inválidos se rechazan sin alterar datos. |
| RT-04 | Se comprueban las relaciones afectadas al editar, quitar y reordenar. | Las relaciones inexistentes o ajenas devuelven error. |
| RT-05 | El reemplazo exige que todos los elementos pertenezcan a la rutina objetivo. | No se pueden mover ejercicios accidentalmente entre rutinas. |
| RT-06 | La creación de rutina y sus ejercicios se ejecuta en una sola transacción. | Un fallo revierte toda la operación. |
| RT-08 | Las consultas directas filtran rutinas eliminadas. | Una rutina eliminada no puede cargarse en una sesión. |

El flujo incompleto de “aplicar rutina a una fecha” (RT-07 y RT-09) se eliminó por completo porque no estaba accesible desde la interfaz y duplicaba el flujo real. La operación soportada continúa siendo: abrir una sesión, cargar los ejercicios de una rutina y guardar la sesión.

## Ejecución

```sh
npm run test:all
cargo test --manifest-path src-tauri/tests/backend/Cargo.toml --locked routines
npm run build
```

Las migraciones de bases históricas permanecen fuera de este alcance y corresponden al incremento 5.
