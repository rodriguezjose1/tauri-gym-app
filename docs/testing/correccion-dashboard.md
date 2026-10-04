# Punto 3: saneamiento de pruebas del Dashboard

Fecha: 2026-10-04.

## Resultado

- `npm run test:coverage`: **102/102 tests pasan**, en 7 archivos; código de salida 0.
- Sin advertencias de `act(...)` ni errores asíncronos sin manejar en esa ejecución. Los errores intencionalmente inyectados siguen visibles en consola: no se silencian globalmente.
- Cobertura global del frontend: **32,14 % de líneas/sentencias, 38,83 % de funciones y 70,52 % de ramas**. Incluye archivos no ejecutados; no incluye Rust.
- `npm run build`: exitoso, con la advertencia de tamaño del bundle.
- ESLint de setup, helper y suites reescritas, y `git diff --check`: exitosos.

## Qué se corrigió en los tests

Las dos suites anteriores tenían 17 tests, de los cuales 12 fallaban. Ahora tienen 13 escenarios: se consolidaron duplicados y se reemplazaron comprobaciones ficticias. La suite total pasa de 106 a 102 casos por esa consolidación, no por deshabilitar tests. No se utilizaron `skip`, `todo` ni fallos esperados.

| Escenarios anteriores | Verificación actual |
| --- | --- |
| Renderizado repetido | Dashboard visible, búsqueda disponible y carga de personas/rutinas |
| Recuperación de selección desde localStorage, repetida en ambas suites | Restauración desde sessionStorage y datos visibles en calendario; recuperación al desmontar y montar |
| Guardado simulado mediante rerender | Buscar y seleccionar una persona desde la UI; verificar sessionStorage y entrenamientos |
| Supuesta limpieza con “Cambiar” | “Cambiar” abre búsqueda; “Cancelar” conserva la persona. Elegir otra cambia selección y entrenamientos. La limpieza real mediante el setter sigue cubierta por `usePeopleData.test.js` |
| Carga automática de ejercicios al montar, repetida | No cargar catálogo al montar; abrir formulario con menú contextual, escribir y verificar búsqueda paginada real |
| Mostrar y “actualizar” entrenamientos usando solo carga inicial | Ubicación en el día correcto; eliminación desde UI, llamadas de eliminación/renumeración y resultado visible tras recarga |
| Fallos que no llegaban a ejecutar el comando esperado | Inyectar rechazo en los comandos actuales y comprobar aviso visible y reintento exitoso |
| “Manejo correcto” de localStorage que esperaba un crash | Lectura y escritura bloqueadas permiten continuar, muestran aviso y mantienen el tema aplicado |

`src/test/helpers/dashboard.jsx` centraliza proveedores, reloj fijo, fixtures y renderizado asíncrono. Solo simula la frontera `invoke` de Tauri, conservando componentes, hooks y servicios reales. Un comando no previsto produce error y una aserción al finalizar para evitar que el catch del servicio lo oculte. Las respuestas paginadas tienen la forma correspondiente.

El setup reinicia las implementaciones de mocks además de su historial y limpia sessionStorage entre casos. Los tests esperan resultados observables y completan efectos asíncronos mediante `act`; no usan pausas arbitrarias.

## Defectos productivos reproducidos y corregidos

Antes de corregir producción, las pruebas nuevas reprodujeron fallos de lectura y escritura de configuración y ausencia de avisos ante errores de entrenamientos/búsqueda.

1. **Configuración:** `ConfigProvider` dejaba escapar errores de localStorage. Ahora mantiene la configuración en memoria, aplica el tema y expone un aviso al Dashboard. La primera escritura espera a que termine la lectura; una lectura fallida no sobrescribe automáticamente los datos que no pudo recuperar. Una modificación explícita de configuración habilita un nuevo intento de guardado.
2. **Carga de datos del Dashboard:** el estado de error existía pero no se mostraba. Ahora aparece un aviso accesible que permite distinguir un fallo de carga de un calendario vacío. La prueba verifica recuperación al seleccionar nuevamente.
3. **Búsqueda de ejercicios:** un error se presentaba como falta de resultados. Ahora se muestra un aviso accesible de búsqueda fallida, y escribir otra consulta permite reintentar.

También se verifica restauración de preferencias guardadas sin escribir primero los valores predeterminados ni confundir configuración con selección de persona.

## Reproducción y límites

```sh
npm run test:dashboard
npm run test:coverage
npm run build
```

El estado verde se refiere a la suite actual de frontend. Las pruebas usan jsdom y Tauri simulado; no certifican SQLite, migraciones, la aplicación nativa ni todos los flujos de negocio. La cobertura todavía es parcial. No se implementó la funcionalidad de pagos ni se avanzó a las etapas de backend.
