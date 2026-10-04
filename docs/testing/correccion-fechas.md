# Corrección del punto 2: contrato de fechas

Fecha: 2026-10-04. Resuelve FECHA-01 y FECHA-02 del diagnóstico inicial.

## Contrato

- `formatDateForDB` devuelve el día local en `YYYY-MM-DD`; lanza `RangeError` si recibe un Date inválido o un año fuera de 0001–9999. Los años se completan a cuatro cifras.
- `formatDateStringForDB` acepta `YYYY-MM-DD` y timestamps `YYYY-MM-DD[T o espacio]HH:mm[:ss[.SSS]][Z o +/-HH:mm]`. Una fecha sin hora conserva su día; un timestamp se convierte a la zona local.
- Se valida el calendario, incluidas las reglas de años bisiestos y siglos, antes de construir Date. Se rechazan horas fuera de rango, incluido `24:00`, para evitar normalizaciones silenciosas a otro día.
- Cadenas vacías, valores no string, fechas imposibles y formatos regionales ambiguos producen `RangeError`. Ya no se devuelve una cadena inválida como si hubiera sido formateada correctamente. No se detectaron consumidores que requirieran formatos regionales; el modelo Rust documenta `YYYY-MM-DD`.
- `isSameDay` devuelve false si cualquiera de sus entradas es inválida; `isToday` hereda ese comportamiento.
- `tryFormatDateStringForDB` es el límite tolerante para lectura/renderizado: devuelve null ante una fecha rechazada, sin reparar ni mutar el dato.

## Consumidores adaptados

- `useWorkoutData` y el hook compartido anterior `useDashboardData` omiten entradas con fecha inválida al filtrar por día, sin eliminarlas de sus datos en memoria.
- `WeeklyCalendar` y `CalendarGrid` calculan las fechas una vez por entrada/render y excluyen las inválidas de las celdas. Muestran un aviso accesible con la cantidad de entradas que no pueden ubicar. No escriben ni eliminan registros.
- `CalendarGrid` deja de interpretar una fecha sin hora como UTC; así `2024-01-15` se muestra el 15 y no el 14 en UTC-3.
- `useWeeklyCalendar` utiliza las utilidades compartidas en lugar de sus copias locales. Los días generados internamente y consumidos por `DayCell` continúan siendo Date válidos.

## Pruebas

`npm run test:dates` ejecuta 57 casos: 54 de utilidades, uno del hook de entrenamientos y dos de los calendarios reales. Pasan todos.

Se comprueban medianoche local, cruce de año, 29 de febrero válido/inválido, año 1900/2000, días/meses/horas/offsets fuera de rango, Invalid Date, ausencia de datos y fechas sin hora. Los tests de calendario verifican ubicación en la celda correcta, aviso ante datos inválidos, continuidad del renderizado y ausencia de mutación de los datos originales.

Validación completa: `npm run test:coverage` ejecutó 106 tests, **94 pasan y los mismos 12 tests anteriores del Dashboard fallan** (salida 1). El reporte incluye archivos no ejecutados; la cobertura global de líneas del frontend es 27,07 %. `npm run build` pasó con la advertencia de tamaño de bundle. ESLint de los tests modificados/agregados y `git diff --check` pasaron.

## Límites

No se modifican SQLite ni sus validaciones Rust, no se reparan registros existentes y no se amplía el alcance a todos los formularios o usos de `new Date` ajenos a estas utilidades. Las pruebas de pantalla son en jsdom; no se ejecutó la aplicación nativa. El aviso permite advertir datos inválidos, pero su reparación requiere revisar el registro y definir la fecha correcta.

Los tests obsoletos del Dashboard continúan pendientes del punto 3; no se deshabilitan para presentar una suite verde.
