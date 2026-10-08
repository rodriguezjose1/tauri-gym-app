import fs from 'node:fs';
import { checkVersions } from './release-version.mjs';
const version = checkVersions();
if (process.env.GITHUB_REF_NAME !== `v${version}`) {
  throw new Error('El tag debe coincidir con la versión de la aplicación: v' + version);
}
for (const name of ['TAURI_UPDATER_PUBLIC_KEY', 'TAURI_SIGNING_PRIVATE_KEY', 'RESEND_API_KEY']) {
  if (!process.env[name]?.trim()) throw new Error(`Falta ${name}`);
}
fs.writeFileSync('src-tauri/tauri.release.conf.json', JSON.stringify({
  bundle: { targets: ['msi'], createUpdaterArtifacts: true },
  plugins: { updater: { pubkey: process.env.TAURI_UPDATER_PUBLIC_KEY.trim() } },
}));
// JSON string syntax is also valid for this Rust string literal.
fs.writeFileSync('src-tauri/src/config/api_keys.rs', `pub const RESEND_API_KEY: &str = ${JSON.stringify(process.env.RESEND_API_KEY)};\n`);
