import React, { useState, useEffect } from 'react';
import { UpdateInfo, DownloadProgress } from '../types';

interface UpdateDialogProps {
  updateInfo: UpdateInfo;
  onAccept?: () => void;
  onDecline: () => void;
}

export const UpdateDialog: React.FC<UpdateDialogProps> = ({
  updateInfo,
  onDecline,
}) => {
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState<DownloadProgress>({ percent: 0, transferred: 0, total: 0 });
  const [downloadedPath, setDownloadedPath] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!window.electronAPI?.onUpdateDownloadProgress) return;
    const unsubscribe = window.electronAPI.onUpdateDownloadProgress((p: DownloadProgress) => {
      setProgress(p);
    });
    return () => unsubscribe();
  }, []);

  const handleStartDownload = async () => {
    if (!updateInfo.downloadUrl) {
      setErrorMessage('Není k dispozici platná adresa ke stažení aktualizace.');
      setDownloadState('error');
      return;
    }

    if (!window.electronAPI?.downloadUpdate) {
      window.electronAPI?.openExternal?.(updateInfo.downloadUrl);
      return;
    }

    setDownloadState('downloading');
    setErrorMessage(null);

    try {
      const filePath = await window.electronAPI.downloadUpdate(updateInfo.downloadUrl);
      setDownloadedPath(filePath);
      setDownloadState('completed');
    } catch (err: any) {
      console.error('[UpdateDialog] Download error:', err);
      setErrorMessage(err?.message || 'Nastala neočekávaná chyba při stahování souboru.');
      setDownloadState('error');
    }
  };

  const handleInstallAndRestart = () => {
    if (downloadedPath && window.electronAPI?.installUpdate) {
      window.electronAPI.installUpdate(downloadedPath);
    }
  };

  const handleFallbackBrowser = () => {
    if (updateInfo.downloadUrl && window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(updateInfo.downloadUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1e1e28] border border-indigo-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 text-gray-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header section based on state */}
        {downloadState === 'completed' ? (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-3xl">task_alt</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Aktualizace stažena!</h3>
              <p className="text-xs text-emerald-300">
                Verze <span className="font-mono font-bold text-white">{updateInfo.latestVersion}</span> je připravena
              </p>
            </div>
          </div>
        ) : downloadState === 'downloading' ? (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse">
              <span className="material-symbols-outlined text-3xl">cloud_download</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Stahování aktualizace...</h3>
              <p className="text-xs text-indigo-300">
                Verze <span className="font-mono font-bold text-white">{updateInfo.latestVersion}</span>
              </p>
            </div>
          </div>
        ) : downloadState === 'error' ? (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <span className="material-symbols-outlined text-3xl">error</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Chyba při stahování</h3>
              <p className="text-xs text-rose-300">Nepodařilo se stáhnout novou verzi</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <span className="material-symbols-outlined text-3xl">upgrade</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">K dispozici je nová verze!</h3>
              <p className="text-xs text-indigo-300">
                Verze <span className="font-mono font-bold text-white">{updateInfo.latestVersion}</span> (aktuální: {updateInfo.currentVersion})
              </p>
            </div>
          </div>
        )}

        {/* Content body based on state */}
        {downloadState === 'idle' && (
          <>
            {updateInfo.releaseNotes && (
              <div className="p-3 bg-black/30 rounded-xl border border-white/5 max-h-36 overflow-y-auto text-xs text-gray-300 space-y-1">
                <p className="font-semibold text-gray-400">Co je nového:</p>
                <p className="whitespace-pre-line">{updateInfo.releaseNotes}</p>
              </div>
            )}
            <p className="text-xs text-gray-400">
              Chcete nyní stáhnout a nainstalovat aktualizaci přímo v aplikaci? V případě odložení vám aktualizaci znovu nabídneme za 24 hodin.
            </p>
          </>
        )}

        {downloadState === 'downloading' && (
          <div className="space-y-3 py-2">
            <div className="w-full bg-black/40 h-3.5 rounded-full overflow-hidden border border-white/10 p-0.5">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300 ease-out flex items-center justify-end"
                style={{ width: `${Math.max(5, progress.percent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-mono font-bold text-white">{progress.percent} %</span>
              <span className="text-gray-400 font-mono">
                {progress.total > 0
                  ? `${(progress.transferred / (1024 * 1024)).toFixed(1)} MB / ${(progress.total / (1024 * 1024)).toFixed(1)} MB`
                  : `${(progress.transferred / (1024 * 1024)).toFixed(1)} MB`}
              </span>
            </div>
            <p className="text-xs text-gray-400 text-center">
              Stahování probíhá na pozadí, prosím chvíli vyčkejte...
            </p>
          </div>
        )}

        {downloadState === 'completed' && (
          <div className="space-y-2 py-2">
            <p className="text-xs text-gray-300">
              Nový instalační balíček byl v pořádku stažen do počítače. Pro dokončení aktualizace je potřeba aplikaci restartovat.
            </p>
          </div>
        )}

        {downloadState === 'error' && (
          <div className="space-y-2 py-1">
            <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">
              {errorMessage}
            </p>
            <p className="text-xs text-gray-400">
              Můžete stahování zkusit znovu, nebo soubor stáhnout přímo přes váš webový prohlížeč.
            </p>
          </div>
        )}

        {/* Footer actions based on state */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {downloadState === 'idle' && (
            <>
              <button
                type="button"
                onClick={onDecline}
                className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition"
              >
                Připomenout za 24h
              </button>
              <button
                type="button"
                onClick={handleStartDownload}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Aktualizovat nyní
              </button>
            </>
          )}

          {downloadState === 'downloading' && (
            <button
              type="button"
              onClick={handleFallbackBrowser}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition underline"
            >
              Stáhnout v prohlížeči místo toho
            </button>
          )}

          {downloadState === 'completed' && (
            <button
              type="button"
              onClick={handleInstallAndRestart}
              className="w-full flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/30 transition"
            >
              <span className="material-symbols-outlined text-base">restart_alt</span>
              Restartovat a spustit novou verzi
            </button>
          )}

          {downloadState === 'error' && (
            <>
              <button
                type="button"
                onClick={() => setDownloadState('idle')}
                className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition"
              >
                Zpět
              </button>
              <button
                type="button"
                onClick={handleFallbackBrowser}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-white/10 hover:bg-white/20 rounded-xl transition"
              >
                <span className="material-symbols-outlined text-sm">open_in_browser</span>
                Stáhnout v prohlížeči
              </button>
              <button
                type="button"
                onClick={handleStartDownload}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Zkusit znovu
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

