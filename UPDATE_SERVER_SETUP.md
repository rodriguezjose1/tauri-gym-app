# Actualizaciones Windows — Tauri v2

Estado: implementación preparada para configurar y validar. No se ejecutó una actualización real en Windows ni se publicó una release desde esta implementación.

## Configuración única

1. Instalar dependencias con `npm ci`.
2. Generar las claves fuera del repositorio: `npm run tauri -- signer generate -w ~/.tauri/quality-gym.key`. Elegir contraseña y guardar una copia segura de la clave y contraseña. No regenerarlas entre versiones.
3. En GitHub → Settings → Secrets and variables → Actions, crear:
   - Secret `TAURI_SIGNING_PRIVATE_KEY`: contenido completo del archivo privado.
   - Secret `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: contraseña elegida (vacío solamente si la clave no tiene contraseña).
   - Variable `TAURI_UPDATER_PUBLIC_KEY`: contenido completo del archivo `.pub`.
   - Secret `RESEND_API_KEY`: credencial del respaldo existente. CI genera el archivo Rust ignorado; no modifica el servicio de backup. Como ya sucede con el instalador actual, esta credencial queda incorporada al binario distribuido.
4. Permitir escritura de contenido al workflow. `GITHUB_TOKEN` lo proporciona GitHub, no hace falta un token personal.

La clave pública está vacía intencionalmente en la configuración base: no se encontró una clave real. CI exige la variable y la integra en `tauri.release.conf.json`; también activa `createUpdaterArtifacts: true` y MSI. Un build local sin esa configuración no consulta actualizaciones. No se omite la verificación de firma. La firma del updater no es un certificado Authenticode; Windows puede mostrar SmartScreen/UAC.

## Publicar

Ejecutar `npm run release:version -- X.Y.Z` (por ejemplo, `npm run release:version -- 0.2.0`). El comando actualiza `package.json`, ambas entradas de versión de `package-lock.json`, `src-tauri/Cargo.toml`, solamente la entrada de la aplicación en `src-tauri/Cargo.lock` y `src-tauri/tauri.conf.json`. Valida el formato estable y los límites de versión MSI antes de escribir; no cambia versiones de dependencias ni crea commits, tags o releases.

Para comprobar sin modificar: `npm run release:version -- --check`. CI también verifica los cinco archivos antes de compilar.

Usar siempre una versión superior a la publicada. Revisar el diff y las pruebas; luego, por decisión del mantenedor, crear/pushear el tag `vX.Y.Z`.

El workflow `.github/workflows/release-windows.yml` valida las versiones, ejecuta pruebas, compila en Windows x64 con lockfile, genera MSI y `.msi.sig`, construye `latest.json`, sube todo a una release draft y la publica cuando las subidas finalizan. No editar ni sustituir MSI después de firmarlo. Si una subida falla, queda un draft: revisar/eliminar ese draft antes de repetir el workflow. Publicar tags en orden creciente, porque cada ejecución marca su release como latest.

Endpoint: `https://github.com/rodriguezjose1/tauri-gym-app/releases/latest/download/latest.json`. El manifiesto usa `windows-x86_64`, firma completa y URL del MSI de ese tag. Tauri v2 con `createUpdaterArtifacts: true` firma el MSI directamente; no se usa el antiguo ZIP de compatibilidad v1. El manifiesto lo genera `scripts/update-manifest.mjs release-assets.json` después de subir el MSI y su firma al draft, consultando la release por ID y usando el nombre real del asset de GitHub para su URL final con el tag (GitHub puede cambiar espacios por puntos y usar URLs temporales `untagged-*` en borradores); el viejo manifiesto de ejemplo ya no debe usarse.

## Primera instalación

Distribuir manualmente el MSI generado por este workflow una vez. La versión antigua solo abría un navegador, por lo que no puede incorporar sola el updater nuevo. Cerrar la app, respaldar sus datos y ejecutar el nuevo MSI sobre la instalación existente. Conservar producto, identificador `com.gymtracker.app` y configuración WiX; no desinstalar ni borrar datos. Comprobar en Windows que actualiza la instalación existente sin duplicarla, especialmente si el MSI histórico se generó con otra configuración local no versionada.

## Comportamiento y datos

Cinco segundos después del montaje se comprueba una vez por proceso. Solo Windows y con clave pública configurada. No hay reintentos automáticos ni errores técnicos visibles para una comprobación fallida. `Más tarde` descarta el aviso hasta el próximo inicio. La descarga empieza tras dos pasos de consentimiento; durante ella la UI de negocio queda inerte. El servicio conserva la descarga verificada para reintentar la instalación sin volver a descargarla. Una descarga fallida puede reintentarse explícitamente.

Antes de instalar, una compuerta nativa verifica que no haya comandos de negocio ni backup activos y rechaza nuevos comandos hasta instalar o liberar la compuerta por error. Las conexiones SQLite son locales a cada operación y se cierran antes de liberar su guardia. No hay pool ni escrituras pendientes diferidas. No se modifica ubicación ni esquema. Las migraciones existentes se ejecutan en el siguiente inicio.

Los datos siguen en `%APPDATA%\QualityGym\gym_app.db`, junto a status y respaldos. La app conserva también los fallbacks históricos de resolución de rutas: verificar la ruta efectiva antes de instalar. Los logs del updater usan el plugin-log existente (directorio de logs de Tauri); los errores del frontend también van a consola. No se registra contenido de la base.

## Prueba real requerida

Usar una VM Windows x64 y datos ficticios; nunca empezar con la base real del cliente.

1. Publicar A con la clave definitiva e instalar su MSI manualmente. Crear personas, rutinas e historial. Guardar copia de la carpeta `%APPDATA%\QualityGym`, configuración local y recuentos SQL. Verificar `PRAGMA quick_check` y `user_version`.
2. Abrir A cuando A es latest: no debe mostrar actualización. Probar sin red y con GitHub bloqueado: las funciones normales deben seguir disponibles.
3. Publicar B (mayor que A) con la misma clave. Revisar MSI, firma y `latest.json`: versión B, clave windows-x86_64, URL descargable y firma correspondiente.
4. En A, esperar aviso, posponer y seguir editando. Reiniciar y confirmar instalación cuando no haya trabajo sin guardar. Observar progreso, MSI/UAC y reapertura. Confirmar versión B y que ya no se ofrece B.
5. Comparar datos, historial, configuración, respaldos y recuentos. Ejecutar quick_check. Si hubo cambio de esquema, comprobar el respaldo previo y migración; verificar que no apareció una segunda instalación.
6. En un entorno de prueba separado, usar manifiesto malformado, firma alterada y descarga interrumpida; nunca reemplazar assets de producción. Comprobar log, ausencia de instalación y UI operativa. Probar cierre durante comprobación y reinicio posterior.
7. Mantener una operación/backup activo al confirmar: debe rechazar la instalación sin cerrar. Probar fallo de instalación/UAC y verificar que A puede abrirse conservando sus datos.

Limitación del plugin 2.7.1: Windows lanza el instalador y termina el proceso; los fallos posteriores del MSI se diagnostican en el instalador/Windows, no pueden comunicarse a una app ya cerrada. Esta versión además no comprueba el retorno de ShellExecuteW. Por eso el ensayo de permisos/UAC/instalación es obligatorio antes de habilitar el canal para clientes. No hay rollback automático. V1 solo publica Windows x64; macOS sigue siendo entorno de desarrollo.

## Validación local

Consultar `docs/AUTO_UPDATE_VALIDATION.md` para resultados ejecutados. La auditoría previa está en `docs/AUTO_UPDATE_AUDIT.md`.

Fuentes oficiales: [Updater Tauri v2](https://v2.tauri.app/plugin/updater/) y [API JS](https://v2.tauri.app/reference/javascript/updater/). La compatibilidad específica se verificó contra los fuentes descargados de tauri-plugin-updater 2.7.1 y su API JS instalada, conservando Tauri 2.5.1.

## Caché de Rust en Windows

`Prepare Windows Rust cache` se ejecuta con los pushes a la rama por defecto (también permite ejecución manual desde Actions). Compila sin empaquetar ni publicar, usando la configuración de ejemplo del backup. Guarda el registro Cargo y las dependencias compiladas de `src-tauri/target` y `src-tauri/tests/backend/target` mediante `Swatinem/rust-cache@v2`. No guarda los crates propios de la aplicación.

`Release Windows` restaura esa misma caché; no guarda cachés aisladas por tag. GitHub permite recuperar la caché de la rama por defecto, pero no la de un tag diferente. Para aprovecharla en la primera release con este cambio, esperar que termine `Prepare Windows Rust cache` antes de pushear el tag. Si no existe caché, el build compila normalmente. Los cambios de toolchain o dependencias pueden requerir recompilación; no se garantiza una duración fija.

Referencias: [rust-cache](https://github.com/Swatinem/rust-cache) y [alcance de cachés en GitHub Actions](https://docs.github.com/en/actions/reference/dependency-caching).
