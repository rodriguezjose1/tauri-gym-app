# Incremento 1 — Fechas, selección persistida y cobertura

Fecha: 2026-10-04. Alcance: pruebas y herramientas; sin cambios de código productivo.

**Actualización posterior:** SESION-01, SESION-02 y SESION-03 fueron corregidos en el flujo activo del Dashboard; FECHA-01 y FECHA-02 también fueron corregidos. Ver [corrección de persistencia](correccion-persistencia.md) y [corrección de fechas](correccion-fechas.md). Los resultados y diagnósticos que siguen son la línea base histórica del incremento 1; las pruebas ahora verifican los contratos corregidos, no los defectos anteriores.

**Punto 3 completado:** las suites obsoletas fueron saneadas y la suite completa pasa (102/102). Ver [corrección del Dashboard](correccion-dashboard.md) para el mapeo de escenarios y los defectos productivos corregidos. Las referencias a 12 fallos pendientes en los informes anteriores son históricas.

## Qué se cambió

- Se reemplazaron los cinco tests de una copia de `formatDateForDB` por pruebas que importan las cinco funciones reales de `src/shared/utils/dateUtils.ts`.
- Se reemplazaron las dos suites idénticas de almacenamiento (20 tests de una clase ficticia) por pruebas del hook activo `usePeopleData` y su conexión con `useDashboardDataComposer`.
- Las pruebas nuevas están junto al código que verifican. Solo se simula Tauri; el hook, los servicios y el almacenamiento de sesión de jsdom son reales. Los errores de almacenamiento se inyectan mediante spies restaurados entre tests.
- La zona horaria de tests se fija a `America/Argentina/Cordoba` antes de iniciar los workers. Las pruebas de “hoy” controlan el reloj y lo restauran al finalizar.
- Se agrega cobertura V8 de los archivos JS/TS de `src`, incluidos los no importados. Se excluyen únicamente pruebas, infraestructura de tests y declaraciones `.d.ts`. CSS, recursos y Rust no forman parte de esta medición.
- Los reportes se generan incluso con tests fallidos, sin ocultar el código de salida de error. No se fija aún un umbral mínimo.
- Los archivos `Dashboard.test.jsx`, `Dashboard.integration.test.jsx` y el setup global existente se conservan sin modificaciones para el incremento 2.
- Se fijan Vitest y `@vitest/coverage-v8` en 3.2.4, la versión de Vitest ya registrada en el lockfile original. La instalación local previa usaba 3.1.4. Se conserva el formato v1 del lockfile; npm actualizó también dependencias transitivas al incorporar coverage.

## Resultado de la validación

| Ejecución | Resultado |
| --- | --- |
| `npm run test:increment1` | 29/29 pasan: 18 de fechas y 11 de persistencia/conexión con el compositor |
| `npm run test:coverage` | 46 tests: 34 pasan, 12 fallan; código de salida 1 |
| Suites anteriores del Dashboard | 3/12 y 2/5 pasan; se mantienen los mismos 12 fallos observados antes del incremento |
| ESLint de los dos archivos nuevos de tests y `vitest.config.js` | Sin errores |

De los 29 tests nuevos, 20 cubren escenarios normales y 9 caracterizan entradas inválidas o errores existentes. No se deben interpretar esos 9 como errores resueltos.

Cobertura medida sobre la **suite completa**, incluidos los tests que fallan:

| Alcance | Líneas | Sentencias | Funciones | Ramas |
| --- | --- | --- | --- | --- |
| Frontend, 121 archivos del reporte | 23,62 % (2069/8758) | 23,62 % | 26,86 % | 52,99 % |
| `src/shared/utils/dateUtils.ts` | 100 % | 100 % | 100 % | 100 % |
| `src/domains/person/hooks/usePeopleData.ts` | 95,83 % | 95,83 % | 100 % | 90,90 % |

La rama de error al cargar personas queda fuera del alcance específico de persistencia. Un 100 % de cobertura no demuestra que todos los valores de entrada sean correctos: los hallazgos de fechas ilustran esa diferencia. Los archivos no ejecutados (por ejemplo `App.jsx` y el hook compartido anterior) permanecen en el reporte con cobertura cero. Esta es una línea base diagnóstica, no una certificación de regresión ni una métrica del backend Rust.

Los fallos anteriores siguen vinculados a expectativas de `localStorage`, carga automática de ejercicios y flujos que dependen de esos supuestos. También permanecen sus advertencias de `act(...)`; las suites nuevas no las emiten. El incremento 2 debe revisar esos escenarios sin dar por correcta toda expectativa previa.

## Cómo ejecutar

```sh
npm ci
npm run test:increment1
npm run test:coverage
```

`test:increment1` ejecuta solo las dos suites de este incremento. Que pase no implica que la suite completa pase.

`test:coverage` ejecuta toda la suite y escribe `coverage/index.html` y `coverage/coverage-summary.json`. Los reportes generados están ignorados por Git. La medición de un subconjunto no debe compararse con la medición de la suite completa.

Las pruebas agrupadas bajo **diagnóstico** son pruebas de caracterización: afirman el resultado actual para reproducir un hallazgo. Que pasen confirma su reproducción, no que ese comportamiento sea correcto. No utilizan `skip`, `todo` ni fallos esperados para ocultar problemas. Cuando se acuerde y corrija un comportamiento, su prueba debe expresar el nuevo contrato.

## Hallazgos reproducibles — no corregidos

### SESION-01 — JSON corrupto impide restaurar la selección

- Reproducción: guardar `{invalid` en `sessionStorage['dashboard-selectedPerson']` y montar `usePeopleData`.
- Observado: `JSON.parse` lanza `SyntaxError`; el hook no completa el montaje.
- Impacto: una entrada dañada puede impedir montar el Dashboard que consume ese hook.
- Comportamiento propuesto, pendiente de aprobación: descartar la selección inválida y permitir elegir otra persona.
- Alternativa de solución: lectura protegida, validación del valor y limpieza segura. Debe decidirse si corresponde informar al usuario.

### SESION-02 — Errores de almacenamiento se propagan desde el hook

- Reproducción: simular `SecurityError` al leer o borrar, y `QuotaExceededError` al guardar.
- Observado: la lectura falla durante el montaje; escritura y borrado fallan desde el efecto de persistencia. Al fallar el borrado permanece el valor anterior en storage.
- Impacto: el fallo no queda contenido en la persistencia y la selección anterior puede reaparecer al volver a montar.
- Comportamiento propuesto, pendiente de aprobación: conservar una selección operativa en memoria y comunicar que no pudo persistirse; definir cómo tratar un borrado fallido.
- Alternativa de solución: manejar lectura y efectos de escritura por separado, con una política explícita para recuperación. Estas pruebas no validan la interfaz final de error ni un navegador nativo.

### SESION-03 — Se acepta JSON que no representa una persona

- Reproducción: persistir `{"unexpected":true}` y montar el hook.
- Observado: se acepta como `selectedPerson`, sin comprobar su estructura.
- Impacto: los consumidores esperan propiedades como `id`, `name` y `last_name`; el hook no garantiza ese contrato. La prueba reproduce la aceptación, no un crash de toda la interfaz.
- Comportamiento propuesto, pendiente de aprobación: rechazar estructuras inválidas. También debe definirse qué hacer si una persona válida fue eliminada o cambió desde la última selección.
- Alternativa de solución: validación de estructura al recuperar y, si corresponde, verificación contra datos vigentes.

### FECHA-01 — Una fecha imposible con formato correcto se acepta

- Reproducción: `formatDateStringForDB('2024-02-30')`.
- Observado: devuelve `2024-02-30` porque la expresión regular comprueba el formato, no la validez del calendario.
- Impacto: esta utilidad no sirve como validador de fechas. No se ha demostrado aquí que la UI permita guardar ese valor en SQLite.
- Decisión pendiente: ¿la función solo formatea entradas ya validadas o debe rechazarlas? Según esa decisión, documentar precondiciones o añadir validación en un cambio productivo separado.

### FECHA-02 — Objetos Date inválidos generan resultados engañosos

- Reproducción: formatear `new Date('invalid')` y comparar dos fechas inválidas con `isSameDay`.
- Observado: el formato es `NaN-NaN-NaN`; la comparación devuelve `true`.
- Impacto: dos errores de fecha pueden interpretarse como el mismo día. No se ha demostrado su alcance desde la UI.
- Decisión pendiente: definir retorno o error para entradas inválidas y comprobar validez antes de comparar.

La devolución de una cadena no parseable sin cambios y con `console.error` también se documenta mediante tests. Es un comportamiento explícito del código existente; debe revisarse junto al contrato de entradas inválidas.

## Límites y siguientes pasos

- La persistencia activa está en `usePeopleData`. `src/shared/hooks/useDashboardData.ts` conserva una implementación anterior duplicada; este incremento no la elimina ni refactoriza.
- El almacenamiento de jsdom no prueba persistencia entre procesos nativos ni el puente real con Rust.
- Mantener visibles los fallos de las suites anteriores y abordarlos en el incremento 2. No modificar código productivo para obtener una ejecución verde sin discutir primero los hallazgos.
- Backend, SQLite, migraciones y pruebas nativas pertenecen a incrementos posteriores.

Referencia de configuración: [cobertura de Vitest 3](https://v3.vitest.dev/config/#coverage), en particular inclusión de archivos no ejecutados y `reportOnFailure`.
