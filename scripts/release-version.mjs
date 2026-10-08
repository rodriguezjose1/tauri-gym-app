import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const files = ['package.json', 'package-lock.json', 'src-tauri/tauri.conf.json', 'src-tauri/Cargo.toml', 'src-tauri/Cargo.lock'];

function validateVersion(version) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error('Usá una versión estable X.Y.Z, sin prefijo v (ejemplo: 0.2.0).');
  }
  const [major, minor, patch] = version.split('.').map(Number);
  if (major > 255 || minor > 255 || patch > 65535) {
    throw new Error('MSI admite como máximo 255.255.65535.');
  }
}

function readVersions(root) {
  const sources = files.map(file => fs.readFileSync(path.join(root, file), 'utf8'));
  const [pkg, lock, config] = sources.slice(0, 3).map(source => JSON.parse(source));
  const cargoSection = sources[3].match(/^\[package\]\s*\r?\n[\s\S]*?(?=^\[|(?![\s\S]))/m)?.[0];
  const cargoName = cargoSection?.match(/^name\s*=\s*"([^"]+)"/m)?.[1];
  const cargoVersion = cargoSection?.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
  const lockSections = sources[4].split(/(?=^\[\[package\]\])/m).filter(section =>
    section.match(/^name\s*=\s*"([^"]+)"/m)?.[1] === cargoName && !/^source\s*=/m.test(section));
  const lockSection = lockSections.length === 1 ? lockSections[0] : undefined;
  const lockVersion = lockSection?.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
  const versions = [pkg.version, lock.version, lock.packages?.['']?.version, config.version, cargoVersion, lockVersion];
  if (versions.some(version => typeof version !== 'string')) {
    throw new Error('No se encontraron todas las versiones esperadas. No se modificó ningún archivo.');
  }
  return { sources, pkg, lock, config, cargoSection, lockSection, versions };
}

export function checkVersions(root = projectRoot) {
  const { versions } = readVersions(root);
  validateVersion(versions[0]);
  if (versions.some(version => version !== versions[0])) {
    throw new Error('Las versiones de package.json, package-lock.json, Cargo.toml, Cargo.lock y tauri.conf.json no coinciden. Ejecutá npm run release:version -- X.Y.Z.');
  }
  return versions[0];
}

export function setVersion(version, root = projectRoot) {
  validateVersion(version);
  const { sources, pkg, lock, config, cargoSection, lockSection } = readVersions(root);
  pkg.version = lock.version = lock.packages[''].version = config.version = version;
  const replaceVersion = section => section.replace(/^(version\s*=\s*")[^"]+(".*)$/m, (_, prefix, suffix) => `${prefix}${version}${suffix}`);
  const updated = [
    ...[pkg, lock, config].map(value => `${JSON.stringify(value, null, 2)}\n`),
    sources[3].replace(cargoSection, () => replaceVersion(cargoSection)),
    sources[4].replace(lockSection, () => replaceVersion(lockSection)),
  ];
  // Parse/validate everything before writing; restore originals on a write failure.
  try {
    files.forEach((file, index) => fs.writeFileSync(path.join(root, file), updated[index]));
    checkVersions(root);
  } catch (error) {
    files.forEach((file, index) => fs.writeFileSync(path.join(root, file), sources[index]));
    throw error;
  }
  return version;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 1) throw new Error('Uso: npm run release:version -- X.Y.Z (o --check).');
    const version = args[0] === '--check' ? checkVersions() : setVersion(args[0]);
    console.log(`Versión ${version}: los cinco archivos coinciden.`);
    if (args[0] !== '--check') console.log('No se crearon commits, tags ni releases. Revisá el diff antes de publicar.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
