# Auditoría previa — Auto Update V1

- Entrada desktop real: `src-tauri/src/main.rs`; `lib.rs` es otro builder sin los servicios de negocio. React monta `Updater` en `App.jsx`.
- Lock inicial: Tauri 2.5.1, build 2.2.0, dialog 2.2.2, log 2.4.0. JS API ^2.6.0. Versiones iniciales: Cargo/config 0.1.0 y npm 0.0.0.
- Identidad preservada: `com.gymtracker.app`, producto `Quality GYM`. Bundle `all`, sin configuración WiX personalizada ni workflows.
- Updater previo consulta repositorio ficticio, compara desigualdad de strings y abre navegador; manifiesto raíz contiene ejemplos no utilizables.
- Producción Windows: `%APPDATA%/QualityGym/gym_app.db`; respaldo/status al lado. No son recursos del bundle. Se conserva resolución de rutas, incluidos fallbacks históricos relativos si falta APPDATA o cwd no está disponible; verificar ruta real en la instalación de prueba.
- Repositorios abren conexiones por operación; no hay pool ni escrituras diferidas. Comandos de negocio síncronos; backup asíncrono iniciado desde efecto de App. Migración central antes de crear servicios: transacción, quick_check, user_version, copia previa y rechazo de esquemas futuros.
- Logging disponible: log + plugin-log, pero el builder desktop no lo registra. Servicios usan println/eprintln; frontend console. Se habilitará el plugin existente en desktop para diagnóstico del updater.
- Backup depende de archivo ignorado api_keys.rs. CI necesitará RESEND_API_KEY para mantenerlo; no se cambiará su comportamiento.
- No hay clave pública real. Se inyectará mediante configuración de build desde variable de GitHub; builds locales sin ella omitirán la comprobación. CI rechazará configuración incompleta.
- Cierre seguro: compuerta nativa para todos los comandos de negocio y backup; instalación rechazada mientras estén activos. Sin cambiar SQL, migraciones ni ubicación de datos.
