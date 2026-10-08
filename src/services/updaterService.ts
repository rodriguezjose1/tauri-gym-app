import { invoke } from '@tauri-apps/api/core';
import { check, type Update, type DownloadEvent } from '@tauri-apps/plugin-updater';

let checkPromise: Promise<Update | null> | undefined;
let busy = false;
let downloaded = false;

export async function logUpdateError(error: unknown) {
  console.warn('Updater:', error);
  await invoke('log_update_error', { message: String(error) }).catch(() => {});
}

// One request per process, including React StrictMode remounts. No automatic retries.
export function checkForUpdate(): Promise<Update | null> {
  checkPromise ??= (async () => {
    try {
      if (!await invoke<boolean>('updater_enabled')) return null;
      return await check({ timeout: 15000 });
    } catch (error) {
      await logUpdateError(error);
      return null;
    }
  })();
  return checkPromise;
}

export async function installUpdate(update: Update, onProgress: (event: DownloadEvent) => void) {
  if (busy) return;
  busy = true;
  let prepared = false;
  try {
    if (!downloaded) {
      await update.download(onProgress, { timeout: 120000 });
      downloaded = true;
    }
    // Atomically reject installation if any native command/backup is still active.
    await invoke('prepare_update');
    prepared = true;
    await update.install(); // Windows exits after launching the MSI installer.
  } catch (error) {
    await logUpdateError(error);
    throw error;
  } finally {
    if (prepared) await invoke('cancel_update').catch(logUpdateError);
    busy = false;
  }
}
