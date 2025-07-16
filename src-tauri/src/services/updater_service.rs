use tauri::{AppHandle, Emitter};
use serde::{Deserialize, Serialize};
use reqwest;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub version: String,
    pub notes: String,
    pub download_url: String,
    pub pub_date: String,
}

pub struct UpdaterService {
    app_handle: AppHandle,
}

impl UpdaterService {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
        }
    }

    pub async fn check_for_updates(&self) -> Result<Option<UpdateInfo>, String> {
        // URL del servidor de actualizaciones
        let update_url = "https://api.github.com/repos/tu-usuario/quality-gym-releases/releases/latest";
        
        let client = reqwest::Client::new();
        let response = client.get(update_url)
            .header("User-Agent", "Quality-GYM-Updater")
            .send()
            .await;

        // Si no hay respuesta o hay error, no mostrar actualización
        let response = match response {
            Ok(resp) => resp,
            Err(_) => return Ok(None),
        };

        if !response.status().is_success() {
            // Si el repositorio no existe o hay error 404, no mostrar actualización
            if response.status().as_u16() == 404 {
                return Ok(None);
            }
            return Err(format!("Server error: {}", response.status()));
        }

        let github_release: serde_json::Value = match response.json().await {
            Ok(release) => release,
            Err(_) => return Ok(None),
        };

        // Extraer información de la release de GitHub
        let version = github_release["tag_name"]
            .as_str()
            .unwrap_or("")
            .trim_start_matches('v')
            .to_string();

        let notes = github_release["body"]
            .as_str()
            .unwrap_or("")
            .to_string();

        let download_url = github_release["html_url"]
            .as_str()
            .unwrap_or("")
            .to_string();

        let pub_date = github_release["published_at"]
            .as_str()
            .unwrap_or("")
            .to_string();

        // Verificar si hay una nueva versión
        let current_version = env!("CARGO_PKG_VERSION");
        
        if version != current_version && !version.is_empty() {
            let update_info = UpdateInfo {
                version,
                notes,
                download_url,
                pub_date,
            };

            // Emitir evento al frontend
            self.app_handle.emit("update-available", &update_info)
                .map_err(|e| format!("Failed to emit event: {}", e))?;

            Ok(Some(update_info))
        } else {
            Ok(None)
        }
    }

    pub async fn download_update(&self, download_url: String) -> Result<(), String> {
        // Abrir el navegador para descargar la actualización
        let _ = webbrowser::open(&download_url);
        
        // Emitir evento de descarga iniciada
        self.app_handle.emit("update-download-started", download_url)
            .map_err(|e| format!("Failed to emit event: {}", e))?;

        Ok(())
    }
} 