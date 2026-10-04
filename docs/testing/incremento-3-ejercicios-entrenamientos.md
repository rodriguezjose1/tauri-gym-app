# Incremento 3 — ejercicios y entrenamientos

Fecha: 2026-10-04. Este incremento amplía el paquete SQLite aislado de `src-tauri/tests/backend`. Importa los modelos, repositorios y servicios productivos; cada prueba crea su propia base temporal y no accede a los datos del gimnasio.

## Contratos cubiertos

El incremento agrega 22 pruebas: 14 contratos esperados y 8 diagnósticos del comportamiento actual.

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

## Inconsistencias reproducidas

Estas pruebas pasan porque documentan el comportamiento observado. No significan que el comportamiento sea correcto.

| ID | Comportamiento observado | Riesgo |
| --- | --- | --- |
| EX-01 | El catálogo acepta nombre y código vacíos o formados por espacios. | Se pueden crear ejercicios que no pueden identificarse correctamente en la interfaz. |
| EX-02 | Editar, eliminar o restaurar un ejercicio inexistente devuelve éxito. | La interfaz puede informar una operación que no modificó ninguna fila. |
| EX-03 | Los errores de lectura del catálogo se convierten en lista vacía o conteo cero. | Un fallo de SQLite parece un catálogo legítimamente vacío. |
| EX-04 | Página 0 y tamaño negativo son aceptados. | La respuesta de paginación puede ser incoherente o el límite solicitado puede ignorarse. |
| WO-01 | Fechas con formato correcto pero imposibles, como `2026-02-31`, son aceptadas. | Los entrenamientos pueden quedar asociados a días inexistentes. |
| WO-02 | `create_batch` acepta elementos de distintas personas y fechas, mientras `create_workout_session` lo rechaza. | Dos entradas equivalentes tienen reglas diferentes según el comando usado. |
| WO-04 | Editar u ordenar IDs inexistentes devuelve éxito. | El llamador no puede distinguir una actualización real de una operación sin efecto. |
| WO-05 | Los errores de lectura de entrenamientos se convierten en `None` o listas vacías. | Un fallo de base puede ocultar sesiones existentes y provocar decisiones con estado incompleto. |

EX-03 y WO-05 repiten el problema de propagación que ya se corrigió para personas, pero los repositorios de ejercicios y entrenamientos todavía conservan el contrato anterior.

## Ejecución

```sh
npm run test:backend
npm run test:all
```

Para ejecutar únicamente este incremento:

```sh
cargo test --manifest-path src-tauri/tests/backend/Cargo.toml --locked exercises_workouts
```

Este incremento no modifica las reglas productivas encontradas como inconsistentes. Las migraciones y compatibilidad con esquemas anteriores pertenecen al incremento 5 de la planificación general.
