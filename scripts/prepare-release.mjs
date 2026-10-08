import fs from 'node:fs';
const config = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json'));
const pkg = JSON.parse(fs.readFileSync('package.json'));
const cargo = fs.readFileSync('src-tauri/Cargo.toml', 'utf8').match(/^version = "([^"]+)"/m)?.[1];
const version = config.version;
if (!/^\d+\.\d+\.\d+$/.test(version) || process.env.GITHUB_REF_NAME !== `v${version}` || pkg.version !== version || cargo !== version) {
  throw new Error('El tag, package.json, Cargo.toml y tauri.conf.json deben tener la misma versión estable.');
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
