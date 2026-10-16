# Auditoría Dashboard V1

## Arquitectura existente

- Frontend React + TypeScript, React Router y componentes compartidos (`Card`, `Title`, `ErrorMessage`, selectores, paginación y encabezados). Los dominios agrupan páginas, componentes, hooks y servicios. La comunicación nativa usa `invoke` de Tauri.
- Backend Rust/Tauri con comandos en `main.rs`, servicios de dominio y repositorios SQLite. Billing usa consultas SQL dentro de `BillingService`; los importes se guardan como centavos (`i64`).
- Las pruebas frontend usan Vitest y Testing Library. Las pruebas backend importan los archivos de producción en un crate aislado y usan bases SQLite temporales.

## Datos y reglas disponibles

- Personas: `people.is_active` y borrado lógico. La actividad histórica se registra por rangos mensuales en `person_activity_periods(active_from, inactive_from)`. Crear/restaurar abre un rango y eliminar lo cierra.
- Planes: modalidad mensual o particular, estado activo y precio actual; `plan_price_history` conserva precios por período.
- Obligaciones: una por persona/período, con plan, importe y exclusión opcional. Se considera pagada si tiene un pago no revertido.
- Pagos: `paid_at` es la fecha efectiva local del cobro; `period` es el mes de la obligación mensual y puede diferir de `paid_at`. Los pagos particulares no tienen período ni obligación. `reversed_at` invalida económicamente un pago sin eliminar el historial.
- Estado de pago actual: `no_plan` si nunca hubo pago mensual vigente; `overdue` si existe una obligación impaga y no excluida cuyo vencimiento (día 10, corrido por fin de semana) pasó; `pending` si hay obligación impaga no vencida; `current` en otro caso. La pantalla Personas ya filtra esos estados.
- Entrenamientos/clases: `workout_entries` almacena ejercicios guardados efectivamente en el calendario por persona y fecha. Las plantillas o ejercicios meramente asignados permanecen en `routine_exercises` y no crean filas allí. Esto no permite afirmar asistencia ni “clases realizadas”, pero sí contar con precisión sesiones registradas como pares únicos persona-fecha.

## Decisiones del incremento

- No se agregan migraciones ni modelos persistidos. Las métricas se calculan en consultas de solo lectura.
- Alumnos activos por mes usa exclusivamente `person_activity_periods`, nunca pagos. En bases migradas a esquema 3, el rango inicial fue reconstruido desde el primer período mensual disponible o la fecha de baja; esa porción histórica puede ser menos precisa que los cambios registrados desde la migración.
- Recaudación usa `paid_at` y excluye pagos revertidos. Se completa con cero cada mes sin cobros.
- Pagos pendientes cuenta alumnos activos con obligación del período, impaga y no excluida; no confunde pendiente con vencido.
- Distribución por plan resuelve primero la obligación del período y luego el último pago mensual previo, solo si el plan continúa activo. Las personas sin relación vigente quedan en “Sin plan asignado”.
- Sesiones registradas cuenta pares únicos persona-fecha en `workout_entries`; varios ejercicios del mismo día forman una sola sesión y una rutina no guardada no cuenta.
- La detección de inactividad usa la última fecha válida de `workout_entries` por persona, hasta la fecha local actual. Es independiente del período mensual, excluye personas inactivas/eliminadas, personas sin ninguna sesión y sesiones futuras; varios ejercicios del mismo día no alteran el resultado.
- El umbral de inactividad admite únicamente 7, 10, 14, 21 o 30 días. El listado y sus totales se calculan en consultas agregadas paginadas, sin consultas por alumno.
- El ranking mensual de asistencias reutiliza esa misma definición de sesión: agrupa `workout_entries` por persona y fecha válida, cuenta los días únicos dentro del mes y, para el mes actual, ignora fechas posteriores a hoy. Incluye actividad histórica aunque la persona esté actualmente inactiva o eliminada lógicamente; no depende de planes ni pagos.
- Seleccionar una fila del ranking abre el calendario semanal con esa persona preseleccionada mediante `personId`; la pantalla resuelve los datos completos de la persona y conserva la selección con el mecanismo existente del calendario.
- No hay autenticación/autorización en los comandos existentes; los nuevos comandos mantienen el mismo límite de confianza local y el mismo `OperationGuard`.
