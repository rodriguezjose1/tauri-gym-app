# Incremento 3 — ejercicios y entrenamientos

Fecha: 2026-10-04. Este incremento amplía el paquete SQLite aislado de `src-tauri/tests/backend`. Importa los modelos, repositorios y servicios productivos; cada prueba crea su propia base temporal y no accede a los datos del gimnasio.

## Contratos cubiertos

El incremento agrega 22 pruebas: 14 contratos iniciales y 8 contratos de regresión surgidos de los diagnósticos.

Los contratos verifican:

- Catálogo de ejercicios: alta, código único, listado, búsqueda, paginación, edición, eliminación lógica y restauración.
- Entrenamientos: creación, datos asociados de persona y ejercicio, edición, eliminación, orden y grupos.
- Validación de identificadores, formato de fecha, series, repeticiones y peso.
- Sesiones formadas por una sola persona y fecha, con grupos consecutivos.
- Aislamiento entre personas, fechas y bases temporales.
- Reemplazo completo y granular de sesiones sin afectar otros días o personas.
- Rechazo de referencias a personas o ejercicios inexistentes.
- Atomicidad ante fallos de inserción, edición, orden y eliminación: la transacción revierte y conserva el estado anterior.
- Renumeración de grupos limitada a la persona y fecha solicitadas.

## Inconsistencias corregidas

Los ocho diagnósticos fueron corregidos y convertidos en contratos de regresión.

| ID | Contrato final |
| --- | --- |
| EX-01 | Crear o editar rechaza nombres y códigos vacíos o formados por espacios. |
| EX-02 | Editar, eliminar o restaurar exige una fila existente en el estado correspondiente. |
| EX-03 | Las lecturas del catálogo propagan los errores de SQLite hasta Tauri y la interfaz conserva los datos anteriores. |
| EX-04 | La página debe ser mayor o igual a 1 y el tamaño debe estar entre 1 y 100. |
| WO-01 | La fecha debe existir en el calendario gregoriano, incluidos los años bisiestos. |
| WO-02 | Los lotes, igual que las sesiones, solo aceptan una persona y una fecha. |
| WO-04 | Editar u ordenar exige que todos los IDs de entrenamiento existan; el cambio de orden se revierte por completo ante un ID ausente. |
| WO-05 | Las lecturas de entrenamientos propagan errores y los hooks conservan la información cargada. |

Los repositorios, servicios y comandos Tauri usan `Result` para las lecturas de ejercicios y entrenamientos. Los fallos ya no se representan como ausencia de datos.

## Ejecución

```sh
npm run test:backend
npm run test:all
```

Para ejecutar únicamente este incremento:

```sh
cargo test --manifest-path src-tauri/tests/backend/Cargo.toml --locked exercises_workouts
```

Las migraciones y compatibilidad con esquemas anteriores pertenecen al incremento 5 de la planificación general.
