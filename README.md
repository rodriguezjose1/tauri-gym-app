# Quality GYM

A Tauri-based gym management application.

## Setup

### Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Resend API key:
   ```
   RESEND_API_KEY=your_resend_api_key_here
   ```

3. Get your Resend API key from: https://resend.com/api-keys

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

- API keys are stored in environment variables
- Database is stored locally in the OS app data directory
- Automatic backups are optional and require API key configuration
