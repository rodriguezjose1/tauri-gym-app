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

## Testing

```bash
npm run test:run      # Frontend
npm run test:backend  # Person services/repositories with isolated real SQLite files
npm run test:all      # Both suites
```

Backend tests import production Rust files directly and do not require Tauri API keys or access the app database. Rust/Cargo and a C compiler are required. Some tests characterize known inconsistencies; passing them does not mean those issues are fixed. See [backend testing findings](docs/testing/incremento-2-backend.md).

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
