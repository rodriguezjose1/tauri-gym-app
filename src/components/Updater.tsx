import { useEffect, useRef, useState } from 'react';
import type { Update } from '@tauri-apps/plugin-updater';
import { checkForUpdate, installUpdate } from '../services/updaterService';
import '../styles/Updater.css';

export default function Updater() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [status, setStatus] = useState('');
  const installing = useRef(false);
  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(() => {
      void checkForUpdate().then(result => { if (mounted) setUpdate(result); });
    }, 5000);
    return () => { mounted = false; window.clearTimeout(timer); };
  }, []);

  useEffect(() => {
    const content = document.querySelectorAll<HTMLElement>('.app-container > nav, .app-content');
    content.forEach(element => { element.inert = busy; });
    return () => { content.forEach(element => { element.inert = false; }); };
  }, [busy]);

  async function install() {
    if (!update || installing.current) return;
    installing.current = true;
    setBusy(true);
    setStatus('Descargando actualización…');
    let received = 0;
    let total = 0;
    try {
      await installUpdate(update, event => {
        if (event.event === 'Started') total = event.data.contentLength ?? 0;
        if (event.event === 'Progress') {
          received += event.data.chunkLength;
          setStatus(total ? `Descargando: ${Math.min(100, Math.round(received / total * 100))}%` : 'Descargando actualización…');
        }
        if (event.event === 'Finished') setStatus('Preparando instalación…');
      });
    } catch {
      setStatus('No se pudo actualizar. Si hay una operación en curso, esperá a que termine y volvé a intentar. Podés seguir trabajando.');
    } finally {
      installing.current = false;
      setBusy(false);
      setConfirm(false);
    }
  }

  if (!update) return null;
  return <div className={busy ? 'updater-overlay' : 'updater-container'}>
    <section className="updater-card" role={busy || confirm ? 'dialog' : 'status'} aria-label="Actualización disponible" aria-modal={busy || undefined}>
      <strong>Actualización {update.version} disponible</strong>
      <p>{confirm ? 'Guardá los cambios antes de continuar. La aplicación se cerrará para instalar la actualización; volvé a abrirla cuando termine el instalador.' : 'Podés instalarla cuando termines de trabajar.'}</p>
      {status && <p aria-live="polite">{status}</p>}
      {!busy && <div className="updater-actions">
        <button onClick={() => { setUpdate(null); setConfirm(false); }}>Más tarde</button>
        <button onClick={() => confirm ? void install() : setConfirm(true)}>{confirm ? 'Instalar y cerrar' : 'Actualizar'}</button>
      </div>}
    </section>
  </div>;
}
