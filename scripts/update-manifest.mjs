import fs from 'node:fs';
import path from 'node:path';
const directory = 'src-tauri/target/release/bundle/msi';
const installers = fs.readdirSync(directory).filter(name => name.endsWith('.msi'));
if (installers.length !== 1) throw new Error('Se esperaba exactamente un MSI x64');
const filename = installers[0];
const signature = fs.readFileSync(path.join(directory, `${filename}.sig`), 'utf8').trim();
if (!signature || !Buffer.from(signature, 'base64').toString().startsWith('untrusted comment:')) throw new Error('Firma ausente o inválida');
const { version } = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json'));
// GitHub may rename uploaded assets (for example spaces become dots).
// Read the actual asset names after uploading, while the release is still a draft.
if (!process.argv[2]) throw new Error('Falta el archivo JSON de la release devuelto por GitHub');
const release = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (release.tag_name !== `v${version}`) throw new Error('La release no coincide con la versión local');
const assets = release.assets?.filter(asset => asset.name.endsWith('.msi')) ?? [];
if (assets.length !== 1) throw new Error('La release debe contener exactamente un MSI');
const asset = assets[0];
if (asset.size !== fs.statSync(path.join(directory, filename)).size || asset.state !== 'uploaded') {
  throw new Error('El MSI publicado no coincide con el artefacto local o no terminó de subirse');
}
if (!release.assets.some(item => item.name === `${asset.name}.sig` && item.state === 'uploaded')) {
  throw new Error('Falta la firma publicada del MSI');
}
const downloadPrefix = `https://github.com/${process.env.GITHUB_REPOSITORY}/releases/download/`;
const expectedUrl = `${downloadPrefix}v${version}/${encodeURIComponent(asset.name)}`;
const actualUrl = asset.browser_download_url;
// Draft assets can use an untagged-* URL. The manifest must use the final tag
// with GitHub's actual asset name, never the original local filename.
const draftPrefix = `${downloadPrefix}untagged-`;
if (typeof actualUrl !== 'string' || (actualUrl !== expectedUrl && !(
  release.draft === true && actualUrl.startsWith(draftPrefix) &&
  actualUrl.slice(downloadPrefix.length).split('/').length === 2 &&
  actualUrl.endsWith(`/${encodeURIComponent(asset.name)}`)
))) throw new Error('URL del MSI inesperada');
const url = expectedUrl;
const manifest = {
  version, notes: `Quality GYM ${version}`, pub_date: new Date().toISOString(),
  platforms: { 'windows-x86_64': {
    signature,
    url,
  } },
};
fs.writeFileSync('latest.json', JSON.stringify(manifest, null, 2));
