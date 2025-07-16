use std::fs;
use std::path::Path;
use std::env;
use reqwest;
use base64::{Engine as _, engine::general_purpose};
use chrono::{Utc, Local};
use serde_json;
use flate2::write::GzEncoder;
use flate2::Compression;
use std::io::Write;

pub struct BackupService {
    status_path: String,
    db_path: String,
}

impl BackupService {
    pub fn new() -> Self {
        // Get current directory safely
        let current_dir = match env::current_dir() {
            Ok(dir) => dir,
            Err(_) => {
                // Fallback to a default path if we can't get current directory
                eprintln!("Warning: Failed to get current directory, using fallback");
                return Self {
                    status_path: "backup_status.json".to_string(),
                    db_path: "gym_app.db".to_string(),
                };
            }
        };
        
        // Check if we're in src-tauri directory (development mode)
        let data_dir = if let Some(file_name) = current_dir.file_name() {
            if file_name == "src-tauri" {
                // We're in src-tauri, go up one level to project root
                if let Some(parent) = current_dir.parent() {
                    parent.join("data")
                } else {
                    current_dir.join("data")
                }
            } else {
                // We're in project root
                current_dir.join("data")
            }
        } else {
            // Fallback
            current_dir.join("data")
        };
        
        // Ensure data directory exists (ignore errors)
        if let Err(e) = std::fs::create_dir_all(&data_dir) {
            eprintln!("Warning: Failed to create data directory: {}", e);
        }
        
        Self {
            status_path: data_dir.join("backup_status.json").to_string_lossy().to_string(),
            db_path: data_dir.join("gym_app.db").to_string_lossy().to_string(),
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

        // Read database file
        let db_data = fs::read(&self.db_path)
            .map_err(|e| format!("Failed to read database: {}", e))?;

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
        encoder.write_all(&db_data)
            .map_err(|e| format!("Failed to compress data: {}", e))?;
        let backup_data = encoder.finish()
            .map_err(|e| format!("Failed to finish compression: {}", e))?;

        println!("Backup created: {} bytes -> {} bytes (compressed)", 
            db_size, backup_data.len());

        Ok((backup_data, metadata))
    }

    // Send backup via email
    async fn send_backup_email(&self, backup_data: Vec<u8>, metadata: BackupMetadata) -> Result<(), String> {
        // Hardcoded configuration
        let api_key = "re_K5miuiW8_7kV2dBQiC32vhkkjP1Ympmff";
        let recipient = "rodriguezjosee8@gmail.com";
        let from_email = "onboarding@resend.dev";
        
        let client = reqwest::Client::new();
        
        // Check if backup data is too large
        let data_size_mb = backup_data.len() as f64 / 1024.0 / 1024.0;
        if data_size_mb > 10.0 {
            // If backup is too large, send without attachment
            let email_data = serde_json::json!({
                "from": from_email,
                "to": [recipient],
                "subject": format!("Quality GYM - Backup automático del {}", metadata.backup_date.format("%Y-%m-%d %H:%M UTC")),
                "text": format!("Backup de Quality GYM del {}\n\nTamaño: {:.2} MB\nRegistros: {}\nChecksum: {}\n\nEste es un backup automático de la base de datos de Quality GYM.\n\nNOTA: El archivo de backup ({:.2} MB) es demasiado grande para enviarse por email.", 
                    metadata.backup_date.format("%Y-%m-%d %H:%M UTC"),
                    metadata.database_size_bytes as f64 / 1024.0 / 1024.0,
                    metadata.total_records,
                    metadata.checksum,
                    data_size_mb
                )
            });
            
            let response = client
                .post("https://api.resend.com/emails")
                .header("Authorization", format!("Bearer {}", api_key))
                .header("Content-Type", "application/json")
                .json(&email_data)
                .send()
                .await
                .map_err(|e| format!("Failed to send email: {}", e))?;

            if response.status().is_success() {
                println!("✅ Email sent successfully via Resend (without attachment due to size)!");
                Ok(())
            } else {
                Err(format!("Resend returned error: {}", response.status()))
            }
        } else {
            // Try with attachment for smaller files
            let filename = format!("gym_backup_{}.db.gz", metadata.backup_date.format("%Y%m%d_%H%M%S"));
            
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

            if response.status().is_success() {
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

                if response_no_attachment.status().is_success() {
                    println!("✅ Email sent successfully via Resend (without attachment)!");
                    Ok(())
                } else {
                    Err(format!("Resend returned error: {}", response_no_attachment.status()))
                }
            }
        }
    }

    // Main backup execution function - runs automatically on startup
    pub async fn execute_backup(&self) -> Result<(), String> {
        let mut status = self.load_status();
        
        // Check if backup should run (only if day changed)
        if !self.should_run_backup() {
            println!("Backup not needed today");
            return Ok(());
        }

        println!("Starting automatic backup...");

        // Check internet connectivity
        if !self.check_internet_connectivity().await {
            let error_msg = "No internet connection available for backup".to_string();
            status.last_error = Some(error_msg.clone());
            status.last_backup_success = false;
            self.save_status(&status)?;
            return Err(error_msg);
        }

        // Create backup
        let (backup_data, metadata) = self.create_backup()?;

        // Send backup via email
        match self.send_backup_email(backup_data, metadata).await {
            Ok(()) => {
                status.last_backup_date = Some(Utc::now());
                status.last_backup_success = true;
                status.last_error = None;
                status.backup_count += 1;
                
                self.save_status(&status)?;
                println!("✅ Automatic backup completed successfully!");
                Ok(())
            },
            Err(e) => {
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