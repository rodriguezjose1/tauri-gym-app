use crate::config::api_keys::RESEND_API_KEY;
use crate::config::db::get_database_path;
use base64::{engine::general_purpose, Engine as _};
use chrono::{Local, Utc};
use flate2::write::GzEncoder;
use flate2::Compression;
use reqwest;
use serde_json;
use std::env;
use std::fs;
use std::io::Write;
use std::path::Path;

pub struct BackupService {
    status_path: String,
    db_path: String,
}

impl BackupService {
    const fn email_delivery_enabled() -> bool {
        !cfg!(debug_assertions)
    }

    pub fn new() -> Self {
        // Use the same path logic as the database
        let db_path = get_database_path();
        let data_dir = db_path.parent().unwrap_or(&db_path).to_path_buf();

        Self {
            status_path: data_dir
                .join("backup_status.json")
                .to_string_lossy()
                .to_string(),
            db_path: db_path.to_string_lossy().to_string(),
        }
    }

    // Load backup status
    fn load_status(&self) -> BackupStatus {
        if let Ok(status_data) = fs::read_to_string(&self.status_path) {
            if let Ok(status) = serde_json::from_str::<BackupStatus>(&status_data) {
                return status;
            }
        }
        BackupStatus::default()
    }

    // Save backup status
    fn save_status(&self, status: &BackupStatus) -> Result<(), String> {
        let status_json = serde_json::to_string_pretty(status)
            .map_err(|e| format!("Failed to serialize status: {}", e))?;

        fs::write(&self.status_path, status_json)
            .map_err(|e| format!("Failed to write status file: {}", e))?;

        Ok(())
    }

    // Check if backup should run (only if day changed)
    fn should_run_backup(&self) -> bool {
        let status = self.load_status();
        let now = Utc::now();

        if let Some(last_backup) = status.last_backup_date {
            // Check if it's a different day
            let last_backup_local = last_backup.with_timezone(&Local);
            let now_local = now.with_timezone(&Local);

            last_backup_local.date_naive() != now_local.date_naive()
        } else {
            // No previous backup, so run it
            true
        }
    }

    // Check internet connectivity
    async fn check_internet_connectivity(&self) -> bool {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build();

        if let Ok(client) = client {
            // Try to reach Google's DNS
            if let Ok(response) = client.get("https://8.8.8.8").send().await {
                return response.status().is_success();
            }

            // Fallback: try to reach a reliable service
            if let Ok(response) = client.get("https://httpbin.org/status/200").send().await {
                return response.status().is_success();
            }
        }

        false
    }

    // Create backup file
    fn create_backup(&self) -> Result<(Vec<u8>, BackupMetadata), String> {
        // Check if database exists
        if !Path::new(&self.db_path).exists() {
            return Err("Database file not found".to_string());
        }

        // VACUUM INTO produces a consistent SQLite snapshot even while WAL is in use.
        let snapshot_path = format!(
            "{}.snapshot-{}",
            self.db_path,
            Utc::now().timestamp_millis()
        );
        let connection = rusqlite::Connection::open(&self.db_path)
            .map_err(|e| format!("Failed to open database for backup: {e}"))?;
        connection
            .execute("VACUUM INTO ?1", [&snapshot_path])
            .map_err(|e| format!("Failed to create consistent database snapshot: {e}"))?;
        drop(connection);
        let db_data =
            fs::read(&snapshot_path).map_err(|e| format!("Failed to read database snapshot: {e}"));
        let _ = fs::remove_file(&snapshot_path);
        let db_data = db_data?;

        // Get database size
        let db_size = db_data.len() as u64;

        // Create metadata
        let metadata = BackupMetadata {
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            backup_date: Utc::now(),
            database_size_bytes: db_size,
            total_records: 0,
            checksum: format!("{:x}", md5::compute(&db_data)),
        };

        // Always compress to reduce size
        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder
            .write_all(&db_data)
            .map_err(|e| format!("Failed to compress data: {}", e))?;
        let backup_data = encoder
            .finish()
            .map_err(|e| format!("Failed to finish compression: {}", e))?;

        println!(
            "Backup created: {} bytes -> {} bytes (compressed)",
            db_size,
            backup_data.len()
        );

        Ok((backup_data, metadata))
    }

    // Send backup via email
    async fn send_backup_email(
        &self,
        backup_data: Vec<u8>,
        metadata: BackupMetadata,
    ) -> Result<(), String> {
        // Defense in depth: even a direct/internal call must never deliver email
        // from a development build.
        if !Self::email_delivery_enabled() {
            return Err("Backup email delivery is disabled outside production".to_string());
        }

        // Use the embedded API key
        let api_key = RESEND_API_KEY;

        let recipient = "rodriguezjosee8@gmail.com";
        // Use a development-friendly sender email
        let from_email = "onboarding@resend.dev";

        let client = reqwest::Client::new();

        // Check if backup data is too large
        let data_size_mb = backup_data.len() as f64 / 1024.0 / 1024.0;
        println!("📊 Backup size: {:.2} MB", data_size_mb);

        if data_size_mb > 100.0 {
            // If backup is too large, send without attachment
            let email_data = serde_json::json!({
                "from": from_email,
                "to": [recipient],
                "subject": format!("Quality GYM - Backup automático del {}", metadata.backup_date.format("%Y-%m-%d %H:%M UTC")),
                "text": format!("Backup de Quality GYM del {}\n\nVersión: {}\nTamaño: {:.2} MB\nRegistros: {}\nChecksum: {}\n\nEste es un backup automático de la base de datos de Quality GYM.\n\nNOTA: El archivo de backup ({:.2} MB) es demasiado grande para enviarse por email.",
                    metadata.backup_date.format("%Y-%m-%d %H:%M UTC"),
                    metadata.app_version,
                    metadata.database_size_bytes as f64 / 1024.0 / 1024.0,
                    metadata.total_records,
                    metadata.checksum,
                    data_size_mb
                )
            });

            println!("📧 Sending email without attachment...");
            let response = client
                .post("https://api.resend.com/emails")
                .header("Authorization", format!("Bearer {}", api_key))
                .header("Content-Type", "application/json")
                .json(&email_data)
                .send()
                .await
                .map_err(|e| format!("Failed to send email: {}", e))?;

            let status = response.status();
            println!("📨 Response status: {}", status);
            let response_text = response
                .text()
                .await
                .unwrap_or_else(|_| "No response body".to_string());
            println!("📨 Response body: {}", response_text);

            if status.is_success() {
                println!("✅ Email sent successfully via Resend (without attachment due to size)!");
                Ok(())
            } else {
                Err(format!(
                    "Resend returned error: {}, {}",
                    status, response_text
                ))
            }
        } else {
            // Try with attachment for smaller files
            let filename = format!(
                "gym_backup_{}.db.gz",
                metadata.backup_date.format("%Y%m%d_%H%M%S")
            );

            let email_data = serde_json::json!({
                "from": from_email,
                "to": [recipient],
                "subject": format!("Quality GYM - Backup automático del {}", metadata.backup_date.format("%Y-%m-%d %H:%M UTC")),
                "text": format!("Backup de Quality GYM del {}\n\nTamaño original: {:.2} MB\nTamaño comprimido: {:.2} MB\nRegistros: {}\nChecksum: {}\n\nEste es un backup automático de la base de datos de Quality GYM.",
                    metadata.backup_date.format("%Y-%m-%d %H:%M UTC"),
                    metadata.database_size_bytes as f64 / 1024.0 / 1024.0,
                    data_size_mb,
                    metadata.total_records,
                    metadata.checksum
                ),
                "attachments": [{
                    "content": general_purpose::STANDARD.encode(&backup_data),
                    "filename": filename,
                    "content_type": "application/gzip"
                }]
            });

            let response = client
                .post("https://api.resend.com/emails")
                .header("Authorization", format!("Bearer {}", api_key))
                .header("Content-Type", "application/json")
                .json(&email_data)
                .send()
                .await
                .map_err(|e| format!("Failed to send email: {}", e))?;

            let status = response.status();
            let response_text = response
                .text()
                .await
                .unwrap_or_else(|_| "No response body".to_string());
            println!("📨 Response status: {}", status);
            println!("📨 Response body: {}", response_text);

            if status.is_success() {
                println!("✅ Email sent successfully via Resend with attachment!");
                Ok(())
            } else {
                // If attachment fails, try without it
                let email_data_no_attachment = serde_json::json!({
                    "from": from_email,
                    "to": [recipient],
                    "subject": format!("Quality GYM - Backup automático del {}", metadata.backup_date.format("%Y-%m-%d %H:%M UTC")),
                    "text": format!("Backup de Quality GYM del {}\n\nTamaño original: {:.2} MB\nTamaño comprimido: {:.2} MB\nRegistros: {}\nChecksum: {}\n\nEste es un backup automático de la base de datos de Quality GYM.\n\nNOTA: El archivo de backup no se pudo adjuntar debido a restricciones del servicio de email.",
                        metadata.backup_date.format("%Y-%m-%d %H:%M UTC"),
                        metadata.database_size_bytes as f64 / 1024.0 / 1024.0,
                        data_size_mb,
                        metadata.total_records,
                        metadata.checksum
                    )
                });

                let response_no_attachment = client
                    .post("https://api.resend.com/emails")
                    .header("Authorization", format!("Bearer {}", api_key))
                    .header("Content-Type", "application/json")
                    .json(&email_data_no_attachment)
                    .send()
                    .await
                    .map_err(|e| format!("Failed to send email: {}", e))?;

                let status_no_attachment = response_no_attachment.status();
                let response_text_no_attachment = response_no_attachment
                    .text()
                    .await
                    .unwrap_or_else(|_| "No response body".to_string());
                println!("📨 No-attachment response status: {}", status_no_attachment);
                println!(
                    "📨 No-attachment response body: {}",
                    response_text_no_attachment
                );

                if status_no_attachment.is_success() {
                    println!("✅ Email sent successfully via Resend (without attachment)!");
                    Ok(())
                } else {
                    Err(format!(
                        "Resend returned error: {}, {}",
                        status_no_attachment, response_text_no_attachment
                    ))
                }
            }
        }
    }

    // Main backup execution function - runs automatically on startup
    pub async fn execute_backup(&self) -> Result<(), String> {
        if !Self::email_delivery_enabled() {
            println!("Automatic email backup skipped: non-production build");
            return Ok(());
        }

        println!("🔍 Starting backup check...");
        let mut status = self.load_status();
        println!("📊 Current status: {:?}", status);

        // Check if backup should run (only if day changed)
        if !self.should_run_backup() {
            println!("⏭️ Backup not needed today");
            return Ok(());
        }

        println!("🚀 Starting automatic backup...");

        // Check internet connectivity
        println!("🌐 Checking internet connectivity...");
        if !self.check_internet_connectivity().await {
            let error_msg = "No internet connection available for backup".to_string();
            println!("❌ {}", error_msg);
            status.last_error = Some(error_msg.clone());
            status.last_backup_success = false;
            self.save_status(&status)?;
            return Err(error_msg);
        }
        println!("✅ Internet connectivity OK");

        // Create backup
        println!("📦 Creating backup...");
        let (backup_data, metadata) = self.create_backup()?;
        println!("✅ Backup created successfully");

        // Send backup via email
        println!("📧 Sending backup via email...");
        match self.send_backup_email(backup_data, metadata).await {
            Ok(()) => {
                println!("✅ Backup completed successfully!");
                status.last_backup_date = Some(Utc::now());
                status.last_backup_success = true;
                status.last_error = None;
                status.backup_count += 1;

                self.save_status(&status)?;
                println!("✅ Automatic backup completed successfully!");
                Ok(())
            }
            Err(e) => {
                println!("❌ Backup failed: {}", e);
                status.last_backup_success = false;
                status.last_error = Some(e.clone());

                self.save_status(&status)?;
                println!("❌ Automatic backup failed: {}", e);
                Err(e)
            }
        }
    }
}

// Simple status struct
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct BackupStatus {
    last_backup_date: Option<chrono::DateTime<chrono::Utc>>,
    last_backup_success: bool,
    last_error: Option<String>,
    backup_count: u32,
}

impl Default for BackupStatus {
    fn default() -> Self {
        Self {
            last_backup_date: None,
            last_backup_success: false,
            last_error: None,
            backup_count: 0,
        }
    }
}

// Simple metadata struct
#[derive(Debug, Clone)]
struct BackupMetadata {
    app_version: String,
    backup_date: chrono::DateTime<chrono::Utc>,
    database_size_bytes: u64,
    total_records: u32,
    checksum: String,
}

#[cfg(test)]
mod tests {
    use super::BackupService;

    #[test]
    fn development_build_disables_email_delivery() {
        assert_eq!(
            BackupService::email_delivery_enabled(),
            !cfg!(debug_assertions)
        );
    }
}
