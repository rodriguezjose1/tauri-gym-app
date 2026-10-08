# Validación — Auto Update V1

## Ejecutado en macOS

- `npm run build`: correcto (Vite producción; aviso existente de tamaño de chunk).
- `npx tauri build --no-bundle -- --locked`: correcto, binario nativo release generado. No genera MSI en macOS.
- `cargo check --manifest-path src-tauri/Cargo.toml`: correcto; warnings de código existente sin uso.
- Suite frontend existente: 108 pruebas correctas.
- `src/services/updaterService.test.ts`: 5 pruebas correctas: deduplicación, sin actualización, error de red/manifiesto, rechazo de descarga/firma, operación activa, reutilización de descarga y liberación tras error de instalación. Las APIs oficiales están simuladas; esto no demuestra criptografía real ni instalación MSI.
- `src/components/Updater.test.tsx`: 3 pruebas correctas: demora inicial, posponer, consentimiento y desmontaje previo a comprobación.
- `npm run test:backend`: 64 pruebas correctas, incluidas compatibilidad de base y migraciones con fixtures.
- `rustc --test src-tauri/src/services/updater_service.rs -o /tmp/gym-updater-lifecycle-test` y ejecución: 1 prueba correcta de exclusión entre instalación y operaciones.
- Scripts de release: comprobación de sintaxis Node correcta.
- Capabilities/configuración: aceptadas por compilación Tauri; permisos check/download/install solamente.
- `git diff --check`: correcto.
- ESLint no verifica TS/TSX con la configuración existente (archivos ignorados). No se reporta como validación TypeScript.

## Pendiente antes de distribución

- Configurar claves reales y RESEND_API_KEY en GitHub.
- Ejecutar workflow Windows, verificar artefactos firmados y manifiesto servido por Releases.
- Probar instalación A → B real, UAC/fallo MSI, desconexión durante descarga y firma alterada en un canal de prueba.
- Verificar conservación real de datos/configuración y compatibilidad con el MSI histórico del cliente.
- Revisar la limitación ShellExecuteW del plugin descrita en UPDATE_SERVER_SETUP.md antes de distribuir.

No se accedió a datos reales para pruebas, no se hicieron commits, no se crearon tags ni se publicaron releases.

## Archivos de esta implementación

- `.github/workflows/release-windows.yml`: build, pruebas, firma y publicación.
- `scripts/prepare-release.mjs`, `scripts/update-manifest.mjs`: versión/configuración CI y manifiesto desde artefactos.
- `src/services/updaterService.ts`, `src/services/updaterService.test.ts`: API oficial y pruebas de fallos.
- `src/components/Updater.tsx`, `src/components/Updater.test.tsx`, `src/styles/Updater.css`: aviso, consentimiento, progreso y pruebas.
- `src-tauri/src/services/updater_service.rs`: compuerta nativa y prueba.
- `src-tauri/src/main.rs`: registro de updater/log y guardias de operaciones.
- `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`: endpoint y permisos.
- `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`: dependencias y versión coherente. npm convirtió el lockfile antiguo al formato actual, por eso el diff es grande.
- `.gitignore`: evita versionar configuración generada y archivos de claves.
- `UPDATE_SERVER_SETUP.md`, `docs/AUTO_UPDATE_AUDIT.md`, `docs/AUTO_UPDATE_VALIDATION.md`: operación, auditoría y evidencia.
- `update-server.json`: eliminado; contenía firmas y URLs ficticias.
