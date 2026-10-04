# Incremento 2 — contratos de personas y SQLite

Fecha: 2026-10-04. Este incremento prepara el dominio de personas antes de incorporar pagos. Las pruebas usan un archivo SQLite temporal por caso e importan el modelo, repositorio y servicio productivos. No acceden a la base real del gimnasio.

## Cobertura incorporada

El paquete aislado `src-tauri/tests/backend` cubre 19 escenarios sobre creación, consulta, edición, búsqueda, paginación, eliminación lógica, restauración, persistencia, aislamiento y propagación de errores. Usa rusqlite 0.32.1 con SQLite bundled y tempfile 3.20.0.

Los cinco diagnósticos encontrados durante la primera ejecución se convirtieron en contratos de regresión y quedaron corregidos:

| ID | Contrato final |
| --- | --- |
| PER-01 | Crear y editar rechazan nombre, apellido o teléfono vacíos; una edición inválida conserva el registro anterior. |
| PER-02 | Editar exige un ID válido. Editar, eliminar o restaurar sin una fila en el estado esperado devuelve error. |
| PER-03 | Las lecturas propagan errores de conexión, consulta y conversión mediante `Result`; la interfaz muestra el fallo y conserva los datos cargados. |
| PER-04 | La página debe ser mayor o igual a 1 y el tamaño debe estar entre 1 y 100. |
| PER-05 | Una búsqueda vacía tiene el mismo significado en todas las variantes: listar personas activas. |

La decisión para eliminación y restauración es estricta: repetir una operación sobre una persona que ya no está en el estado requerido informa error. Esto evita presentar como exitosa una mutación que no cambió ninguna fila.

## Integración

Los comandos Tauri de lectura de personas ahora devuelven `Result`, por lo que el error de SQLite llega al servicio TypeScript. `PersonCrud` presenta un mensaje visible para fallos de carga, búsqueda, guardado, eliminación y restauración. Las operaciones fallidas no reemplazan listas ni contadores existentes con valores vacíos.

Se añadió una prueba de interfaz que verifica que un error de lectura se presenta como error y no queda representado únicamente como una lista vacía.

## Ejecución

```sh
npm run test:backend
npm run test:all
```

Para ejecutar solo los contratos corregidos:

```sh
cargo test --manifest-path src-tauri/tests/backend/Cargo.toml --locked corrected_contracts
```

Este incremento no mide porcentaje de cobertura Rust y todavía no cubre rutinas, ejercicios, entrenamientos, migraciones históricas, concurrencia, fallos de disco, aplicación nativa completa ni pagos.
