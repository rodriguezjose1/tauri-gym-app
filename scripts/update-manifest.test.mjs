import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const script = fileURLToPath(new URL('./update-manifest.mjs', import.meta.url));

test('uses GitHub asset URL after renaming and rejects incomplete or mismatched releases', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-manifest-'));
  try {
    const directory = path.join(root, 'src-tauri/target/release/bundle/msi');
    fs.mkdirSync(directory, { recursive: true });
    const filename = 'Quality GYM_0.2.1_x64_en-US.msi';
    fs.writeFileSync(path.join(directory, filename), 'test installer');
    const signature = Buffer.from('untrusted comment: test fixture').toString('base64');
    fs.writeFileSync(path.join(directory, `${filename}.sig`), signature);
    fs.writeFileSync(path.join(root, 'src-tauri/tauri.conf.json'), JSON.stringify({ version: '0.2.1' }));
    const url = 'https://github.com/rodriguezjose1/tauri-gym-app/releases/download/v0.2.1/Quality.GYM_0.2.1_x64_en-US.msi';
    const release = { tag_name: 'v0.2.1', assets: [
      { name: filename.replace(' ', '.'), browser_download_url: url, state: 'uploaded', size: 14 },
      { name: `${filename.replace(' ', '.')}.sig`, state: 'uploaded' },
    ] };
    function run(data) {
      fs.writeFileSync(path.join(root, 'release.json'), JSON.stringify(data));
      return spawnSync(process.execPath, [script, 'release.json'], {
        cwd: root, encoding: 'utf8', env: { ...process.env, GITHUB_REPOSITORY: 'rodriguezjose1/tauri-gym-app' },
      });
    }
    const result = run(release);
    assert.equal(result.status, 0, result.stderr);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'latest.json')));
    assert.equal(manifest.platforms['windows-x86_64'].url, url);
    assert.equal(manifest.platforms['windows-x86_64'].signature, signature);
    const draft = { ...release, draft: true, assets: [
      { ...release.assets[0], browser_download_url: url.replace('/v0.2.1/', '/untagged-0de55971ca80c2a4f03e/') },
      release.assets[1],
    ] };
    const draftResult = run(draft);
    assert.equal(draftResult.status, 0, draftResult.stderr);
    assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'latest.json'))).platforms['windows-x86_64'].url, url);
    for (const bad of [
      { ...draft, draft: false },
      { ...release, tag_name: 'v0.2.0' },
      { ...release, assets: [] },
      { ...release, assets: [release.assets[0]] },
      { ...release, assets: [{ ...release.assets[0], size: 1 }, release.assets[1]] },
      { ...release, assets: [{ ...release.assets[0], browser_download_url: 'https://example.com/file.msi' }, release.assets[1]] },
    ]) {
      assert.notEqual(run(bad).status, 0);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
