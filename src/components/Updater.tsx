import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface UpdateInfo {
  version: string;
  notes: string;
  download_url: string;
  pub_date: string;
}

const Updater: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  useEffect(() => {
    let unlistenUpdateAvailable: (() => void) | undefined;
    let unlistenUpdateDownloadStarted: (() => void) | undefined;
    let isMounted = true;

    (async () => {
      unlistenUpdateAvailable = await listen('update-available', (event) => {
        if (!isMounted) return;
        setUpdateAvailable(event.payload as UpdateInfo);
        setUpdateError(null);
      });

      unlistenUpdateDownloadStarted = await listen('update-download-started', (event) => {
        if (!isMounted) return;
        console.log('Download started:', event.payload);
      });
    })();

    checkForUpdates();

    return () => {
      isMounted = false;
      if (unlistenUpdateAvailable) unlistenUpdateAvailable();
      if (unlistenUpdateDownloadStarted) unlistenUpdateDownloadStarted();
    };
  }, []);

  const checkForUpdates = async () => {
    try {
      setIsChecking(true);
      setUpdateError(null);
      const result = await invoke('check_for_updates');
      
      if (result) {
        setUpdateAvailable(result as UpdateInfo);
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      setUpdateError('Error checking for updates');
    } finally {
      setIsChecking(false);
    }
  };

  const downloadUpdate = async (downloadUrl: string) => {
    try {
      await invoke('download_update', { downloadUrl });
      setUpdateAvailable(null);
    } catch (error) {
      console.error('Failed to download update:', error);
      setUpdateError('Error downloading update');
    }
  };

  const dismissUpdate = () => {
    setUpdateAvailable(null);
    setUpdateError(null);
  };

  if (updateError) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg max-w-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Update Error</h3>
            <p className="text-sm">{updateError}</p>
          </div>
          <button
            onClick={() => setUpdateError(null)}
            className="text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  if (updateAvailable) {
    return (
      <div className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg max-w-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Update Available</h3>
            <p className="text-sm">Version {updateAvailable.version}</p>
            <p className="text-xs mt-1 opacity-90">{updateAvailable.notes}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => downloadUpdate(updateAvailable.download_url)}
              className="bg-white text-blue-500 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
            >
              Download
            </button>
            <button
              onClick={dismissUpdate}
              className="text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isChecking) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-500 text-white p-4 rounded-lg shadow-lg max-w-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Checking for updates...</h3>
          </div>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  return null;
};

export default Updater; 