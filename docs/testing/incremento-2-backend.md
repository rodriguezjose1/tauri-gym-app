# Incremento 2 solicitado — base de pruebas Rust y personas

Fecha: 2026-10-04. Este nombre sigue la última solicitud: corresponde a la etapa de backend/personas, originalmente numerada como incremento 3. El saneamiento del Dashboard ya estaba completado.

## Alcance implementado

Se agregó un paquete de pruebas independiente en `src-tauri/tests/backend`. Importa con `#[path]` los archivos productivos del modelo `Person`, la interfaz `PersonRepository`, `SqlitePersonRepository` y `PersonService`. No copia ni reimplementa la lógica. Los alias de módulos reproducen sus rutas de importación.

No se modificó código productivo, ni el manifiesto o lockfile de la aplicación Tauri. El paquete evita compilar/iniciar Tauri, cargar claves, backups o `config::db::setup_services`. Por tanto, valida el dominio importado, no la compilación ni el puente IPC de la aplicación completa.

Las dependencias principales se fijaron a las versiones del lockfile de la aplicación: rusqlite 0.32.1 con SQLite bundled y serde 1.0.219. Tempfile 3.20.0 crea y limpia un directorio único por prueba; las versiones transitivas se conservaron desde el lockfile original al generar el lockfile del paquete de pruebas. Si se actualizan esas dependencias en la app, debe alinearse también este paquete.

Cada prueba usa un archivo SQLite real, no `:memory:`, ya que los repositorios abren conexiones independientes por operación. No se abre la base del gimnasio ni se consulta su ruta. Los fixtures se pueden ejecutar en paralelo; se verifica aislamiento y eliminación del directorio temporal.

## Escenarios

**14 pruebas de comportamiento esperado:**

- Crear, asignar ID y recuperar datos.
- Rechazar nombre, apellido y teléfono vacíos o con espacios al crear, sin escribir registros.
- Editar todos los campos de una persona sin alterar a otra.
- Buscar por nombre/apellido, coincidencia parcial y mayúsculas ASCII; ordenar resultados.
- Tratar comillas e intentos de SQL como datos.
- Paginar sin omisiones, con totales y páginas correctos; páginas sin resultados.
- Paginar búsquedas contando solo coincidencias.
- Eliminar lógicamente, excluir de listados/búsquedas activos, listar eliminados y restaurar manteniendo identidad y datos.
- Cerrar servicios/repositorios, reabrir la base y recuperar el estado persistido.
- Aislar y limpiar fixtures.
- Leer un ID inexistente como ausencia.
- Rechazar una ruta de base que no puede abrirse.
- Propagar fallos de inserción, edición, eliminación y restauración sin alterar los datos anteriores. Se usan triggers SQLite `RAISE(ABORT, ...)` sobre la base temporal para provocar errores deterministas, sin mocks del repositorio ni cambios de permisos del sistema.

**5 pruebas de diagnóstico:** reproducen los hallazgos siguientes. Que pasen confirma el comportamiento observado, no que los problemas estén corregidos o aceptados. Sus nombres incluyen `diagnostics` y el identificador correspondiente; no hay pruebas ignoradas ni fallos ocultos.

## Hallazgos pendientes de decisión/corrección

| ID | Observación comprobada | Impacto | Corrección propuesta, no aplicada |
| --- | --- | --- | --- |
| PER-01 | Crear rechaza campos obligatorios vacíos, pero editar los acepta y los guarda | Se pueden degradar datos válidos mediante edición; además contradice la validación de persona recuperada en frontend | Aplicar las mismas validaciones al crear y editar, manteniendo el registro anterior si falla |
| PER-02 | Editar con ID inexistente o sin ID, eliminar y restaurar un ID inexistente devuelven éxito sin cambiar filas | El llamador puede mostrar éxito de una operación que no ocurrió | Rechazar edición sin ID y revisar cantidad de filas afectadas. Acordar si borrar/restaurar deben ser idempotentes o informar inexistencia |
| PER-03 | Un error real de lectura se devuelve como lista vacía, conteo cero o None | No permite distinguir un fallo de base de datos de ausencia de personas | Propagar `Result` desde repositorio a servicio/comandos y mostrar el error; requiere revisar consumidores |
| PER-04 | Tamaño de página -1 devuelve todos los registros pero informa cero páginas; página 0 equivale a la primera | Respuestas inconsistentes y pérdida del límite solicitado | Validar página >= 1 y tamaño positivo con límite; comprobar operaciones aritméticas antes de consultar |
| PER-05 | Búsqueda en blanco devuelve todas las personas en la variante no paginada, pero ninguna en las variantes paginadas | Comportamiento diferente según método | Acordar si blanco significa listar o no buscar; alinear contratos o documentar explícitamente la diferencia |

PER-03 se reproduce renombrando temporalmente la tabla dentro de la base aislada; al restaurar el nombre, los registros vuelven a leerse. No se borran datos reales. La prueba demuestra que el error se oculta, no pérdida física de datos.

PER-01 y PER-03 son prioritarios antes de ampliar el dominio o incorporar pagos. PER-02/PER-04 también requieren una política explícita; PER-05 puede ser intencional y debe decidirse con el comportamiento deseado del buscador.

## Comandos y límites

```sh
npm run test:backend
npm run test:all
```

El primer comando usa `cargo test --locked` con el manifiesto aislado. Requiere Rust/Cargo y un compilador C para SQLite bundled; la primera ejecución puede necesitar descargar las dependencias. Esta implementación se compiló con Rust/Cargo 1.87.0, usando dependencias ya disponibles y sin acceso a red.

Para ejecutar solo comportamientos esperados o reproducir hallazgos:

```sh
cargo test --manifest-path src-tauri/tests/backend/Cargo.toml --locked contracts
cargo test --manifest-path src-tauri/tests/backend/Cargo.toml --locked diagnostics
```

La primera validación del backend pasó: **19/19 pruebas**, 14 de comportamiento esperado y 5 de diagnóstico. No se midió porcentaje de cobertura Rust. No se cubrieron rutinas, ejercicios, entrenamientos, migraciones históricas, acceso concurrente, fallos de disco completo, Unicode completo, aplicación nativa ni pagos.

La validación final con `npm run test:all` pasó con código de salida 0: **102/102 tests de frontend y 19/19 de backend**, sin advertencias de `act(...)`. También pasaron `rustfmt --check` para el paquete de pruebas y `git diff --check`. Los archivos productivos y sus manifiestos/lockfile no tienen cambios en este incremento.

**Estado:** implementación de pruebas y diagnóstico entregable; el dominio no debe considerarse libre de inconsistencias ni listo para pagos. Los hallazgos siguen sin corregir, respetando el alcance acordado de validar primero y separar las correcciones.
