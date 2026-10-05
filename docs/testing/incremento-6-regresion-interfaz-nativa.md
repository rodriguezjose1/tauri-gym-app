# Incremento 6 — regresión de interfaz y aplicación nativa

Fecha: 2026-10-04.

## Cobertura incorporada

- Contrato automático entre los comandos usados por el frontend y el `generate_handler!` de Tauri.
- Verificación de los argumentos críticos enviados por personas, ejercicios, rutinas y sesiones.
- Recorrido de interfaz completo: seleccionar persona, abrir una fecha, seleccionar una rutina, cargar sus ejercicios, guardar la sesión, recargar los datos y verla en el calendario.
- Ciclo nativo con SQLite real: crear persona, ejercicio, entrenamiento y rutina; destruir servicios; reabrir la misma base; comprobar IDs, relaciones y registros.
- Migración y segundo arranque sobre la misma base temporal.
- Compilación del frontend y del ejecutable Tauri.

## Limpieza realizada

Se eliminaron dos nombres de comandos frontend que no se invocaban y no tenían un comando Tauri correspondiente: `get_routine_options` y `create_workout_session` dentro de los registros privados de servicios. Las funciones productivas continúan usando los comandos existentes.

## Límites prácticos

Las pruebas automatizadas cubren la UI React completa hasta el límite `invoke`, y desde ese límite cubren servicios, repositorios y SQLite real. La apertura visual de una ventana instalada depende del sistema operativo y queda como comprobación manual del artefacto final; la lógica, persistencia y contrato que utiliza esa ventana están automatizados.

## Ejecución

```sh
npm run test:native-contract
npm run test:all
npm run build
cargo check --manifest-path src-tauri/Cargo.toml --locked
cargo tauri build --debug --no-bundle
```
