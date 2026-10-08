import fs from 'node:fs';
import path from 'node:path';
const directory = 'src-tauri/target/release/bundle/msi';
const installers = fs.readdirSync(directory).filter(name => name.endsWith('.msi'));
if (installers.length !== 1) throw new Error('Se esperaba exactamente un MSI x64');
const filename = installers[0];
const signature = fs.readFileSync(path.join(directory, `${filename}.sig`), 'utf8').trim();
if (!signature || !Buffer.from(signature, 'base64').toString().startsWith('untrusted comment:')) throw new Error('Firma ausente o inválida');
const { version } = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json'));
const manifest = {
  version, notes: `Quality GYM ${version}`, pub_date: new Date().toISOString(),
  platforms: { 'windows-x86_64': {
    signature,
    url: `https://github.com/${process.env.GITHUB_REPOSITORY}/releases/download/v${version}/${encodeURIComponent(filename)}`,
  } },
};
fs.writeFileSync('latest.json', JSON.stringify(manifest, null, 2));
