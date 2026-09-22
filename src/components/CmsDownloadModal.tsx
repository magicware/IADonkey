import React, { useState, useEffect, useRef } from 'react';

interface CmsDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceName: string;
  adminUrl: string;
  targetDir: string;
  vscodeEnabled?: boolean;
}

type DownloadStatus = 'downloading' | 'purging' | 'extracting' | 'success' | 'error';

export const CmsDownloadModal: React.FC<CmsDownloadModalProps> = ({
  isOpen,
  onClose,
  instanceName,
  adminUrl,
  targetDir,
  vscodeEnabled = false,
}) => {
  const [status, setStatus] = useState<DownloadStatus>('downloading');
  const [currentStep, setCurrentStep] = useState<string>('Připojování k instanci...');
  const [percent, setPercent] = useState<number | undefined>(undefined);
  const [loadedBytes, setLoadedBytes] = useState<number | undefined>(undefined);
  const [totalBytes, setTotalBytes] = useState<number | undefined>(undefined);
  const [fileCount, setFileCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const hasStartedRef = useRef(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const startDownload = async () => {
    if (!adminUrl || !targetDir) {
      setStatus('error');
      setErrorMessage('Chybí adresa administrace instance nebo cílová složka.');
      return;
    }

    setStatus('downloading');
    setErrorMessage('');
    setPercent(undefined);
    setLoadedBytes(undefined);
    setTotalBytes(undefined);
    setCurrentStep('Zahajuji stahování...');
    setLogs(['[Start] Zahájení stahování CMSinFS zdrojových kódů...']);

    try {
      if (!window.electronAPI?.downloadInstanceCmsContent) {
        setStatus('error');
        setErrorMessage('Rozhraní ElectronAPI není k dispozici.');
        return;
      }

      const res = await window.electronAPI.downloadInstanceCmsContent({
        instanceName,
        adminUrl,
        targetDir,
      });

      if (res.success) {
        setStatus('success');
        setFileCount(res.fileCount ?? 0);
        setCurrentStep('Dokončeno!');
        setLogs((prev) => [...prev, `[Úspěch] Rozbaleno ${res.fileCount ?? 0} souborů do ${res.targetPath || targetDir}`]);
      } else {
        setStatus('error');
        setErrorMessage(res.error || 'Nastala neznámá chyba při stahování zdrojových kódů.');
        setLogs((prev) => [...prev, `[Chyba] ${res.error || 'Neznámá chyba'}`]);
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err?.message || 'Chyba při komunikaci se serverem.');
      setLogs((prev) => [...prev, `[Chyba] ${err?.message || 'Chyba spojení'}`]);
    }
  };

  // Subscribe to real-time progress events
  useEffect(() => {
    if (window.electronAPI?.onCmsDownloadProgress) {
      const unsubscribe = window.electronAPI.onCmsDownloadProgress((data) => {
        if (data.step === 'connecting') {
          setCurrentStep('Připojování k instanci...');
        } else if (data.step === 'downloading') {
          setCurrentStep('Stahování webového archivu ze serveru...');
          if (typeof data.percent === 'number') setPercent(data.percent);
          if (typeof data.loadedBytes === 'number') setLoadedBytes(data.loadedBytes);
          if (typeof data.totalBytes === 'number') setTotalBytes(data.totalBytes);
        } else if (data.step === 'purging') {
          setStatus('purging');
          setCurrentStep('Čištění cílové složky instance...');
        } else if (data.step === 'extracting') {
          setStatus('extracting');
          setCurrentStep('Rozbalování souborů do cílové složky...');
        } else if (data.step === 'done') {
          setCurrentStep('Dokončeno!');
        }
        if (data.log) {
          setLogs((prev) => [...prev, data.log!]);
        }
      });
      return () => unsubscribe();
    }
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Auto-start download on first open
  useEffect(() => {
    if (isOpen && adminUrl && targetDir && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startDownload();
    }
  }, [isOpen, adminUrl, targetDir]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && status === 'success') {
        handleOpenInExplorer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, onClose]);

  const handleOpenInExplorer = () => {
    if (targetDir && window.electronAPI?.openPath) {
      window.electronAPI.openPath(targetDir);
    }
  };

  const handleOpenInVscode = async () => {
    if (targetDir && window.electronAPI?.openInVscode) {
      await window.electronAPI.openInVscode(targetDir);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <main className="w-full h-screen bg-[#141520] border border-white/10 flex flex-col justify-between text-gray-200 select-none overflow-hidden font-sans">
      {/* Header */}
      <div className="p-3.5 border-b border-white/10 bg-[#181926] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <span className="material-symbols-outlined text-xl">folder_zip</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-white text-base">Stažení CMSinFS zdrojáků</h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                CMSinFS
              </span>
            </div>
            <p className="text-xs text-gray-400 truncate max-w-[380px]">
              Instance: <span className="font-semibold text-gray-300">{instanceName || 'Neznámá instance'}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          title="Zavřít"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      {/* Body Content - no window scrollbar, perfectly fitting */}
      <div className="flex-1 p-4 flex flex-col justify-between gap-3 overflow-hidden min-h-0">
        {/* Target directory info card */}
        <div className="bg-black/30 border border-white/10 rounded-xl p-3 space-y-1 shrink-0">
          <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
            <span className="flex items-center gap-1.5 text-gray-300">
              <span className="material-symbols-outlined text-[15px] text-purple-400">folder_open</span>
              Cílová složka instance:
            </span>
            <span className="text-[11px] text-gray-400">Čistý přepis složky</span>
          </div>
          <div className="font-mono text-[12px] text-purple-200 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/5 break-all select-all">
            {targetDir || 'Není zadána cílová složka'}
          </div>
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5 pt-0.5">
            <span className="material-symbols-outlined text-[13px] text-emerald-400">info</span>
            <span>Před rozbalením se složka instance kompletně vyčistí – nezůstanou v ní staré soubory.</span>
          </div>
        </div>

        {/* Status / Progress view */}
        {(status === 'downloading' || status === 'purging' || status === 'extracting') && (
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3 text-center shrink-0">
            {/* Centered spinner with STATIC upright icon (only outer ring spins) */}
            <div className="relative w-11 h-11 flex items-center justify-center mx-auto">
              <div className="absolute inset-0 rounded-full border-2 border-purple-500/20 border-t-purple-400 animate-spin" />
              <span className="material-symbols-outlined text-xl text-purple-400">download</span>
            </div>

            <div>
              <h3 className="font-medium text-white text-sm">{currentStep}</h3>
              {loadedBytes !== undefined && (
                <p className="text-xs font-mono text-gray-400 mt-0.5">
                  {totalBytes
                    ? `${(loadedBytes / 1024 / 1024).toFixed(1)} MB / ${(totalBytes / 1024 / 1024).toFixed(1)} MB`
                    : `${(loadedBytes / 1024 / 1024).toFixed(1)} MB staženo`}
                </p>
              )}
            </div>

            {/* Progress bar */}
            {percent !== undefined ? (
              <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-200 rounded-full"
                  style={{ width: `${percent}%` }}
                />
              </div>
            ) : (
              <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden border border-white/10">
                <div className="h-full w-1/3 bg-purple-400/80 rounded-full animate-[indeterminate_1.5s_infinite_linear]" />
              </div>
            )}

            {/* Steps indicator */}
            <div className="grid grid-cols-3 gap-2 pt-0.5 text-[11px]">
              <div className={`p-1.5 rounded-lg border text-center font-medium ${status === 'downloading' ? 'bg-purple-500/15 border-purple-500/40 text-purple-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                1. Stažení ZIP
              </div>
              <div className={`p-1.5 rounded-lg border text-center font-medium ${status === 'purging' ? 'bg-purple-500/15 border-purple-500/40 text-purple-300' : status === 'extracting' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/5 text-gray-500'}`}>
                2. Čištění složky
              </div>
              <div className={`p-1.5 rounded-lg border text-center font-medium ${status === 'extracting' ? 'bg-purple-500/15 border-purple-500/40 text-purple-300' : 'bg-white/5 border-white/5 text-gray-500'}`}>
                3. Rozbalení
              </div>
            </div>
          </div>
        )}

        {/* Success View */}
        {status === 'success' && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center space-y-2.5 shrink-0">
            <div className="w-11 h-11 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl">check_circle</span>
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">CMSinFS zdrojáky úspěšně staženy!</h3>
              <p className="text-xs text-gray-300 mt-1">
                V cílové složce bylo úspěšně rozbaleno celkem <strong className="text-emerald-300 font-mono">{fileCount} souborů</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Error View */}
        {status === 'error' && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3.5 text-center space-y-2 shrink-0">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl">error</span>
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Chyba při stahování</h3>
              <p className="text-xs text-rose-300 mt-1 leading-relaxed break-words font-mono">
                {errorMessage}
              </p>
            </div>
          </div>
        )}

        {/* Console / Log box - takes remaining height, scrolls internally */}
        <div className="flex-1 flex flex-col min-h-0 space-y-1">
          <div className="text-[11px] font-medium text-gray-400">Protokol operace:</div>
          <div
            ref={logContainerRef}
            className="flex-1 min-h-[60px] max-h-[85px] overflow-y-auto bg-black/40 border border-white/10 rounded-lg p-2 font-mono text-[11px] text-gray-300 space-y-0.5 leading-tight select-text"
          >
            {logs.map((log, idx) => (
              <div key={idx} className="whitespace-pre-wrap">{log}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3.5 border-t border-white/10 bg-[#181926] flex items-center justify-between shrink-0">
        <div className="text-xs text-gray-400">
          {status === 'success' && (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="material-symbols-outlined text-sm">check</span>
              Připraveno k práci
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {status === 'error' && (
            <button
              type="button"
              onClick={startDownload}
              className="px-4 py-2 rounded-lg bg-purple-600/25 hover:bg-purple-600/35 text-purple-300 border border-purple-500/40 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Zkusit znovu
            </button>
          )}

          {status === 'success' && (
            <>
              {vscodeEnabled && (
                <button
                  type="button"
                  onClick={handleOpenInVscode}
                  className="px-3.5 py-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">code</span>
                  Otevřít ve VS Code
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenInExplorer}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-purple-900/30"
              >
                <span className="material-symbols-outlined text-sm">folder_open</span>
                Otevřít složku
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition cursor-pointer"
          >
            {status === 'success' ? 'Hotovo' : 'Zavřít'}
          </button>
        </div>
      </div>
    </main>
  );
};
