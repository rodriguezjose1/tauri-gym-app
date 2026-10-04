# Corrección del punto 1: selección persistida

Fecha: 2026-10-04.

## Cambios

- `usePeopleData` contiene errores de acceso a `sessionStorage`, incluido su getter, y recupera sin selección cuando no puede leer.
- Solo restaura objetos con id entero positivo seguro, nombre y apellido no vacíos y teléfono de tipo cadena. No comprueba existencia o vigencia contra SQLite; esa validación no forma parte de este cambio.
- JSON corrupto y estructuras inválidas se descartan. Su clave se elimina desde un efecto, sin escrituras durante el renderizado ni modificación de otras claves.
- Una selección válida restaurada no se vuelve a escribir innecesariamente. Una lectura bloqueada no provoca un borrado automático de datos que no se pudieron leer.
- Los errores de guardado o borrado no interrumpen la selección en memoria. Se conserva el contrato del setter, incluidas actualizaciones funcionales.
- El Dashboard muestra un aviso accesible (`role="alert"`) para fallos de recuperación, guardado o borrado. El aviso desaparece cuando una operación posterior de persistencia tiene éxito; recargar personas no lo oculta.
- Se mantienen sin cambios las utilidades de fechas y las dos suites anteriores del Dashboard.

## Límite explícito

Si el almacenamiento rechaza el borrado, el dato anterior permanece. Se limpia la selección en la pantalla y se avisa que podría reaparecer al volver a abrir el calendario. No se introduce una caché global que simule una persistencia exitosa ni reintentos automáticos. Una selección o limpieza posterior vuelve a intentar la operación.

## Validación

- 28 pruebas del hook y su conexión con el compositor, más 4 pruebas del Dashboard renderizado: todas pasan en la ejecución completa.
- Las pruebas de pantalla comprueban búsqueda y selección después de JSON corrupto, estructura inválida, lectura bloqueada y cuota de escritura agotada. No simulan componentes, hooks ni servicios; solo el puente Tauri y fallos del almacenamiento. El fallo de borrado y su aviso se verifican en el hook.
- Suite completa con coverage: **67 tests, 55 pasan y 12 fallan**. Los 12 fallos siguen siendo los de las dos suites anteriores del Dashboard. No se deshabilitaron ni corrigieron dentro de este alcance.
- Cobertura de `usePeopleData.ts`: **97,67 % de líneas, 100 % de funciones y 97,56 % de ramas**. Queda sin ejercitar el manejo de error de carga de personas, independiente de persistencia.
- Compilación Vite exitosa. Advierte sobre el tamaño del bundle; no bloquea la compilación.
- ESLint de las dos suites modificadas/agregadas: sin errores.
- Validación en jsdom; no se ejecutó la aplicación nativa ni SQLite.

Comandos:

```sh
npm run test:persistence
npm run test:coverage
npm run build
```

El hook compartido anterior `src/shared/hooks/useDashboardData.ts` conserva la implementación antigua y no es el camino utilizado por el Dashboard actual. No se modificó ni se activó en este cambio. Sigue pendiente decidir su eliminación para evitar reutilizar lógica obsoleta.
