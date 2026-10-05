# Incremento 5 — compatibilidad de bases existentes

Fecha: 2026-10-04.

## Problema corregido

El arranque anterior ejecutaba migraciones parciales desde cada repositorio. Si una migración fallaba, la aplicación continuaba con repositorios dummy y podía mostrar una base real como si estuviera vacía. La migración de entrenamientos también aplicaba un solo cambio por arranque y podía reconstruir una tabla antigua eliminando una columna agregada previamente.

## Contrato implementado

- La misma base `gym_app.db` se conserva entre versiones.
- El esquema se identifica mediante `PRAGMA user_version`.
- Una base existente en una versión anterior recibe un respaldo local antes de cualquier cambio: `gym_app.db.pre-migration-v<VERSION>.bak`.
- La migración completa se ejecuta dentro de una transacción.
- Se crean tablas ausentes y se agregan todas las columnas históricas pendientes en un solo arranque.
- Se conservan IDs, relaciones, fechas y registros existentes.
- Las nuevas columnas reciben valores compatibles: `is_active = 1`, `order_index = 0` y `group_number = 1`.
- Se valida la integridad, el esquema requerido y las claves foráneas.
- Reabrir una base actualizada no repite la migración ni reemplaza el respaldo.
- Una base creada por una versión futura se rechaza sin modificaciones.
- Un esquema incompatible revierte la migración completa.
- El arranque falla con el error real si no puede migrar o inicializar un repositorio; ya no sustituye silenciosamente la base por datos vacíos.

## Cobertura incorporada

Se agregaron seis pruebas aisladas:

1. Instalación nueva y esquema completo.
2. Migración de un esquema histórico con personas, ejercicios, entrenamiento y rutina.
3. Conservación de IDs, datos y valores predeterminados.
4. Segundo arranque idempotente y conservación del respaldo original.
5. Rollback ante un esquema parcial incompatible.
6. Rechazo de una versión futura sin modificar sus datos.

## Validación

```sh
npm run test:all
cargo check --manifest-path src-tauri/Cargo.toml --locked
npm run build
```

Resultado: 105 pruebas de frontend y 63 de backend aprobadas; compilación web y nativa correctas.
