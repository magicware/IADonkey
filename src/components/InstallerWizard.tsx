import React, { useState, useEffect } from 'react';
import { CURRENT_APP_VERSION } from '../changelog';

interface InstallProgress {
  percent: number;
  phase: string;
  detail?: string;
}

export const InstallerWizard: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [targetDir, setTargetDir] = useState<string>('');
  const [desktopShortcut, setDesktopShortcut] = useState<boolean>(true);
  const [startMenuShortcut, setStartMenuShortcut] = useState<boolean>(true);
  const [autoStart, setAutoStart] = useState<boolean>(false);
  const [runOnFinish, setRunOnFinish] = useState<boolean>(true);

  const [installProgress, setInstallProgress] = useState<InstallProgress>({
    percent: 0,
    phase: 'Příprava instalace',
    detail: '',
  });
  const [installError, setInstallError] = useState<string | null>(null);

  useEffect(() => {
    // Load default install path from electron main process
    if (window.electronAPI?.installerGetDefaultPath) {
      window.electronAPI.installerGetDefaultPath().then((defaultPath: string) => {
        if (defaultPath) setTargetDir(defaultPath);
      });
    }

    if (window.electronAPI?.onInstallerProgress) {
      const unsubscribe = window.electronAPI.onInstallerProgress((p: InstallProgress) => {
        setInstallProgress(p);
      });
      return () => unsubscribe();
    }
  }, []);

  const handleBrowseFolder = async () => {
    if (!window.electronAPI?.installerBrowseFolder) return;
    const selected = await window.electronAPI.installerBrowseFolder(targetDir);
    if (selected) {
      setTargetDir(selected);
    }
  };

  const handleStartInstallation = async () => {
    setStep(3);
    setInstallError(null);
    setInstallProgress({ percent: 5, phase: 'Zahajuji instalaci...', detail: 'Příprava složek' });

    try {
      if (window.electronAPI?.installerPerformInstall) {
        await window.electronAPI.installerPerformInstall({
          targetDir,
          createDesktopShortcut: desktopShortcut,
          createStartMenuShortcut: startMenuShortcut,
          autoStartWithWindows: autoStart,
        });
      } else {
        // Fallback simulation for dev mode preview
        for (let i = 10; i <= 100; i += 15) {
          await new Promise((r) => setTimeout(r, 200));
          setInstallProgress({
            percent: i,
            phase: i < 80 ? 'Kopírování souborů' : 'Vytváření zástupců',
            detail: `Součást ${i}%`,
          });
        }
      }
      setStep(4);
    } catch (err: any) {
      console.error('[Installer] Installation error:', err);
      setInstallError(err?.message || 'Nastala neočekávaná chyba při instalaci.');
    }
  };

  const handleFinish = () => {
    if (window.electronAPI?.installerLaunchAndFinish) {
      window.electronAPI.installerLaunchAndFinish(targetDir, runOnFinish);
    } else {
      window.close();
    }
  };

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow?.();
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow?.();
  };

  return (
    <div className="w-screen h-screen bg-[#14141e] text-gray-200 flex flex-col select-none overflow-hidden font-sans border border-white/10 rounded-2xl shadow-2xl">
      {/* Draggable Custom Titlebar */}
      <div className="h-10 bg-[#181926]/90 border-b border-white/10 flex items-center justify-between px-4" style={{ WebkitAppRegion: 'drag' } as any}>
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center">
            <span className="material-symbols-outlined text-sm text-indigo-400">rocket_launch</span>
          </div>
          <span className="text-xs font-semibold text-gray-300 tracking-wide">IADonkey – Průvodce instalací</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 font-mono">v{CURRENT_APP_VERSION}</span>
        </div>

        {/* Window controls (non-draggable) */}
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button
            type="button"
            onClick={handleMinimize}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition"
            title="Minimalizovat"
          >
            <span className="material-symbols-outlined text-sm">remove</span>
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-600 text-gray-400 hover:text-white transition"
            title="Zavřít"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      </div>

      {/* Steps Progress Indicator */}
      <div className="px-8 pt-5 pb-3 border-b border-white/5 bg-[#161722]/50 flex items-center justify-between">
        {[
          { num: 1, label: 'Vítejte' },
          { num: 2, label: 'Nastavení' },
          { num: 3, label: 'Instalace' },
          { num: 4, label: 'Hotovo' },
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  step === s.num
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-110'
                    : step > s.num
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-white/5 text-gray-500 border border-white/10'
                }`}
              >
                {step > s.num ? (
                  <span className="material-symbols-outlined text-sm font-bold">check</span>
                ) : (
                  s.num
                )}
              </div>
              <span
                className={`text-xs font-medium transition-colors ${
                  step === s.num
                    ? 'text-white font-bold'
                    : step > s.num
                    ? 'text-gray-300'
                    : 'text-gray-500'
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < 3 && <div className="w-8 h-px bg-white/10 mx-1" />}
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 flex flex-col justify-between overflow-y-auto">
        {/* Step 1: Vítejte */}
        {step === 1 && (
          <div className="flex flex-col items-center justify-center text-center my-auto space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 rounded-3xl blur-xl" />
              <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 shadow-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-6xl text-indigo-400">rocket_launch</span>
              </div>
            </div>

            <div className="space-y-2 max-w-md">
              <h1 className="text-2xl font-black text-white tracking-tight">
                Vítejte v instalátoru <span className="text-indigo-400">IADonkey</span>
              </h1>
              <p className="text-xs text-gray-400 leading-relaxed">
                Váš rychlý asistent, inteligentní vyhledávač a rozcestník pro každodenní práci na projektech.
                Průvodce vás v několika jednoduchých krocích provede instalací aplikace do vašeho počítače.
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 max-w-md w-full text-left flex items-center gap-3">
              <span className="material-symbols-outlined text-indigo-400 text-lg">verified_user</span>
              <div className="text-xs">
                <p className="font-semibold text-gray-300">Uživatelská instalace bez administrátorských práv</p>
                <p className="text-gray-500 text-[11px]">Aplikace se instaluje do vašeho uživatelského profilu.</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Nastavení a umístění */}
        {step === 2 && (
          <div className="space-y-6 my-auto animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h2 className="text-lg font-bold text-white">Kam chcete aplikaci nainstalovat?</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Vyberte cílovou složku na disku, do které budou soubory programu umístěny.
              </p>
            </div>

            {/* Folder selection input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-indigo-400">folder_open</span>
                Cílová složka
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={targetDir}
                  onChange={(e) => setTargetDir(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={handleBrowseFolder}
                  className="px-4 py-2.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">drive_file_move</span>
                  Procházet...
                </button>
              </div>
            </div>

            {/* Options Checkboxes */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              <p className="text-xs font-semibold text-gray-300">Možnosti a zástupci</p>

              <label className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={desktopShortcut}
                  onChange={(e) => setDesktopShortcut(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 text-indigo-600 focus:ring-indigo-500 bg-black/40"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-white">Vytvořit zástupce na Ploše</span>
                  <span className="text-[11px] text-gray-500">Rychlý přístup z pracovní plochy</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={startMenuShortcut}
                  onChange={(e) => setStartMenuShortcut(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 text-indigo-600 focus:ring-indigo-500 bg-black/40"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-white">Vytvořit zástupce v nabídce Start</span>
                  <span className="text-[11px] text-gray-500">Dostupnost přes vyhledávání Windows</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={autoStart}
                  onChange={(e) => setAutoStart(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 text-indigo-600 focus:ring-indigo-500 bg-black/40"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-white">Spouštět automaticky při startu Windows</span>
                  <span className="text-[11px] text-gray-500">IADonkey bude připraven v systémové liště</span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Step 3: Průběh instalace */}
        {step === 3 && (
          <div className="flex flex-col justify-center my-auto space-y-6 max-w-lg mx-auto w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="inline-flex w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 items-center justify-center text-indigo-400 mb-2 animate-pulse">
                <span className="material-symbols-outlined text-3xl">downloading</span>
              </div>
              <h2 className="text-lg font-bold text-white">Instalace aplikace IADonkey...</h2>
              <p className="text-xs text-gray-400">
                {installProgress.phase}
              </p>
            </div>

            {/* Modern Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-black/50 h-3 rounded-full overflow-hidden border border-white/10 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300 ease-out flex items-center justify-end"
                  style={{ width: `${Math.max(5, installProgress.percent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="font-mono font-bold text-white">{installProgress.percent} %</span>
                <span className="truncate max-w-[280px] text-right font-mono text-[11px] text-gray-500">
                  {installProgress.detail || 'Zpracovávám...'}
                </span>
              </div>
            </div>

            {installError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {installError}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Dokončeno */}
        {step === 4 && (
          <div className="flex flex-col items-center justify-center text-center my-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-3xl blur-xl" />
              <div className="relative w-20 h-20 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 shadow-xl flex items-center justify-center text-emerald-400">
                <span className="material-symbols-outlined text-5xl">task_alt</span>
              </div>
            </div>

            <div className="space-y-2 max-w-md">
              <h2 className="text-2xl font-black text-white">Instalace byla dokončena!</h2>
              <p className="text-xs text-gray-400">
                Aplikace IADonkey byla úspěšně nainstalována do vašeho počítače a je připravena k použití.
              </p>
            </div>

            <div className="w-full max-w-md bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={runOnFinish}
                  onChange={(e) => setRunOnFinish(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 text-indigo-600 focus:ring-indigo-500 bg-black/40"
                />
                <span className="text-xs font-semibold text-white">
                  Spustit aplikaci IADonkey nyní
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
          <div>
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Zpět
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step === 1 && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
              >
                Začít instalaci
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={handleStartInstallation}
                className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">install_desktop</span>
                Instalovat
              </button>
            )}

            {step === 3 && installError && (
              <button
                type="button"
                onClick={handleStartInstallation}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition"
              >
                Zkusit znovu
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                onClick={handleFinish}
                className="px-7 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Dokončit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
