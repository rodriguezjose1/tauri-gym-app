import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-updater', () => ({ check: vi.fn() }));
import { invoke } from '@tauri-apps/api/core';
import { check } from '@tauri-apps/plugin-updater';
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); vi.mocked(invoke).mockResolvedValue(true); });
it('checks once across concurrent mounts and handles no update', async () => {
  vi.mocked(check).mockResolvedValue(null);
  const service = await import('./updaterService');
  expect(await Promise.all([service.checkForUpdate(), service.checkForUpdate()])).toEqual([null, null]);
  expect(check).toHaveBeenCalledTimes(1);
});
it('isolates network or manifest errors without retry', async () => {
  vi.mocked(check).mockRejectedValue(new Error('offline'));
  const service = await import('./updaterService');
  expect(await service.checkForUpdate()).toBeNull();
  expect(await service.checkForUpdate()).toBeNull();
  expect(check).toHaveBeenCalledTimes(1);
  expect(invoke).toHaveBeenCalledWith('log_update_error', { message: 'Error: offline' });
});
it('does not install when signature verification/download fails', async () => {
  const service = await import('./updaterService');
  const update = { download: vi.fn().mockRejectedValue(new Error('signature')), install: vi.fn() };
  await expect(service.installUpdate(update as never, vi.fn())).rejects.toThrow('signature');
  expect(update.install).not.toHaveBeenCalled();
  expect(invoke).not.toHaveBeenCalledWith('prepare_update');
});
it('reuses verified download when native operations are busy', async () => {
  const service = await import('./updaterService');
  const update = { download: vi.fn().mockResolvedValue(undefined), install: vi.fn().mockResolvedValue(undefined) };
  vi.mocked(invoke).mockImplementation(async command => { if (command === 'prepare_update') throw new Error('busy'); return undefined; });
  await expect(service.installUpdate(update as never, vi.fn())).rejects.toThrow('busy');
  expect(update.install).not.toHaveBeenCalled();
  vi.mocked(invoke).mockResolvedValue(undefined);
  await service.installUpdate(update as never, vi.fn());
  expect(update.download).toHaveBeenCalledTimes(1);
  expect(update.install).toHaveBeenCalledTimes(1);
  expect(invoke).toHaveBeenCalledWith('cancel_update');
});
it('unblocks operations after installer launch failure', async () => {
  const service = await import('./updaterService');
  const update = { download: vi.fn(), install: vi.fn().mockRejectedValue(new Error('installer')) };
  await expect(service.installUpdate(update as never, vi.fn())).rejects.toThrow('installer');
  expect(invoke).toHaveBeenCalledWith('cancel_update');
});
