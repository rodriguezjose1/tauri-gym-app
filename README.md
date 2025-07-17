# Quality GYM

A Tauri-based gym management application.

## Setup

### API Key Configuration

The app uses Resend for automatic email backups. To configure the API key:

1. Copy the example API keys file:
   ```bash
   cp src-tauri/src/config/api_keys.example.rs src-tauri/src/config/api_keys.rs
   ```

2. Edit `src-tauri/src/config/api_keys.rs` and add your actual Resend API key:
   ```rust
   pub const RESEND_API_KEY: &str = "your_actual_resend_api_key_here";
   ```

3. Get your Resend API key from: https://resend.com/api-keys

**Note:** The `api_keys.rs` file is ignored by Git to keep your API key private. Each developer needs to create their own local copy.

### Development

```bash
npm install
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

## Features

- Person management
- Exercise tracking
- Workout routines
- Automatic database backups via email
- Cross-platform desktop app

## Security

- API keys are embedded in the build for production use
- Database is stored locally in the OS app data directory
- Automatic backups are optional and require API key configuration
