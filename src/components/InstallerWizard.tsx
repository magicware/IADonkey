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
    window.electronAPI?.closeWindow?.() || window.close();
  };

  const STEPS = [
    { num: 1, label: 'Úvod', desc: 'Vítejte v instalátoru' },
    { num: 2, label: 'Nastavení', desc: 'Umístění a předvolby' },
    { num: 3, label: 'Instalace', desc: 'Průběh kopírování' },
    { num: 4, label: 'Dokončeno', desc: 'Shrnutí a spuštění' },
  ] as const;

  return (
    <div className="w-screen h-screen bg-[#141520] text-gray-200 flex select-none overflow-hidden font-sans border border-white/10 rounded-2xl shadow-2xl">
      {/* LEFT SIDEBAR: Branding and Steps */}
      <div className="w-64 bg-[#12131c] border-r border-white/10 flex flex-col justify-between p-6 flex-shrink-0">
        {/* Top Header in Sidebar */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/30 rounded-xl blur-md" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                <span className="material-symbols-outlined text-2xl">rocket_launch</span>
              </div>
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                IADonkey
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.2 rounded-md">
                  v{CURRENT_APP_VERSION}
                </span>
              </div>
              <p className="text-[11px] text-gray-400">Instalátor aplikace</p>
            </div>
          </div>
        </div>

        {/* Vertical Steps List */}
        <div className="space-y-5 my-auto py-4">
          {STEPS.map((s, idx) => {
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;
            const isPending = step < s.num;

            return (
              <div key={s.num} className="relative flex items-center gap-3.5">
                {/* Connecting Line between step circles */}
                {idx < STEPS.length - 1 && (
                  <div
                    className={`absolute left-[13px] top-[30px] w-0.5 h-6 transition-colors duration-300 ${
                      step > s.num ? 'bg-emerald-500/60' : 'bg-white/10'
                    }`}
                  />
                )}

                {/* Step Circle Indicator */}
                <div
                  className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-500/30'
                      : isCurrent
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 ring-4 ring-indigo-500/25 scale-105'
                      : 'bg-white/5 text-gray-500 border border-white/10'
                  }`}
                >
                  {isCompleted ? (
                    <span className="material-symbols-outlined text-sm font-bold">check</span>
                  ) : (
                    s.num
                  )}
                </div>

                {/* Step Text Label */}
                <div className="flex flex-col">
                  <span
                    className={`text-xs font-bold transition-colors ${
                      isCurrent
                        ? 'text-white'
                        : isCompleted
                        ? 'text-gray-300'
                        : 'text-gray-500'
                    }`}
                  >
                    {s.label}
                  </span>
                  <span className="text-[11px] text-gray-500 leading-tight">{s.desc}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom indicator */}
        <div className="pt-4 border-t border-white/5 text-[11px] text-gray-500 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-indigo-400">verified_user</span>
          <span>Instalace bez UAC práv</span>
        </div>
      </div>

      {/* RIGHT MAIN CONTENT AREA */}
      <div className="flex-1 bg-[#181926] flex flex-col justify-between overflow-hidden">
        {/* Custom Draggable Window Titlebar */}
        <div
          className="h-11 bg-[#161722]/90 border-b border-white/10 flex items-center justify-between px-6 flex-shrink-0"
          style={{ WebkitAppRegion: 'drag' } as any}
        >
          <span className="text-xs font-medium text-gray-400 tracking-wide">
            IADonkey – Průvodce instalací
          </span>

          {/* Window control buttons */}
          <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <button
              type="button"
              onClick={handleMinimize}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
              title="Minimalizovat"
            >
              <span className="material-symbols-outlined text-sm">remove</span>
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-600 text-gray-400 hover:text-white transition cursor-pointer"
              title="Zavřít"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body (Fixed between header and footer) */}
        <div className="flex-1 p-8 overflow-y-auto space-y-6">
          {/* STEP 1: ÚVOD / VÍTEJTE */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="space-y-1.5">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Vítejte v instalátoru <span className="text-indigo-400">IADonkey</span>
                </h1>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Váš rychlý AI asistent, inteligentní vyhledávač a rozcestník pro každodenní práci na projektech.
                </p>
              </div>

              {/* Informative feature card */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                <p className="text-xs font-semibold text-gray-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-400 text-base">auto_awesome</span>
                  Co vám IADonkey přináší:
                </p>
                <div className="grid grid-cols-1 gap-2.5 text-xs text-gray-400">
                  <div className="flex items-center gap-2.5 p-2 bg-white/[0.02] rounded-xl border border-white/5">
                    <span className="material-symbols-outlined text-emerald-400 text-base">search</span>
                    <span>Bleskové vyhledávání souborů, repozitářů, požadavků a nástrojů klávesou Ctrl+Alt+Space</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2 bg-white/[0.02] rounded-xl border border-white/5">
                    <span className="material-symbols-outlined text-indigo-400 text-base">integration_instructions</span>
                    <span>Přímá integrace s VS Code, Android Studio, GitHubem a helpdeskem MLog</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2 bg-white/[0.02] rounded-xl border border-white/5">
                    <span className="material-symbols-outlined text-purple-400 text-base">bolt</span>
                    <span>Bleskové In-App aktualizace na pozadí bez zdržujících instalačních oken</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300">
                <span className="material-symbols-outlined text-base text-indigo-400">info</span>
                <span>Instalace se provádí do vašeho uživatelského profilu bez nutnosti administrátorských práv.</span>
              </div>
            </div>
          )}

          {/* STEP 2: NASTAVENÍ A UMÍSTĚNÍ */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-white">Nastavení instalace</h2>
                <p className="text-xs text-gray-400">
                  Zvolte cílové umístění na disku a možnosti pro integraci do systému Windows.
                </p>
              </div>

              {/* Folder Picker Section */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-indigo-400">folder_open</span>
                  Cílová složka instalace
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
                    className="px-4 py-2.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition cursor-pointer flex items-center gap-1.5 flex-shrink-0"
                  >
                    <span className="material-symbols-outlined text-sm">drive_file_move</span>
                    Procházet...
                  </button>
                </div>
              </div>

              {/* Checkboxes List */}
              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <p className="text-xs font-semibold text-gray-300">Zástupci a spouštění:</p>

                <label className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={desktopShortcut}
                    onChange={(e) => setDesktopShortcut(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-700 text-indigo-600 focus:ring-indigo-500 bg-black/40 cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-white">Vytvořit zástupce na Ploše</span>
                    <span className="text-[11px] text-gray-500">Rychlý přístup přímo z vaší pracovní plochy</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={startMenuShortcut}
                    onChange={(e) => setStartMenuShortcut(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-700 text-indigo-600 focus:ring-indigo-500 bg-black/40 cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-white">Vytvořit zástupce v nabídce Start</span>
                    <span className="text-[11px] text-gray-500">Snadné spuštění přes vyhledávání v systému Windows</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={autoStart}
                    onChange={(e) => setAutoStart(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-700 text-indigo-600 focus:ring-indigo-500 bg-black/40 cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-white">Spouštět automaticky při startu Windows</span>
                    <span className="text-[11px] text-gray-500">IADonkey bude ihned k dispozici na klávesovou zkratku</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 3: PRŮBĚH INSTALACE */}
          {step === 3 && (
            <div className="space-y-6 my-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-white">Probíhá instalace IADonkey</h2>
                <p className="text-xs text-indigo-300 font-medium">
                  {installProgress.phase}
                </p>
              </div>

              {/* Progress Bar Container */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
                <div className="w-full bg-black/50 h-3.5 rounded-full overflow-hidden border border-white/10 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 rounded-full transition-all duration-300 ease-out flex items-center justify-end"
                    style={{ width: `${Math.max(5, installProgress.percent)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="font-mono font-bold text-white text-sm">{installProgress.percent} %</span>
                  <span className="truncate max-w-[320px] text-right font-mono text-[11px] text-gray-500">
                    {installProgress.detail || 'Zpracovávám součásti...'}
                  </span>
                </div>
              </div>

              {installError ? (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-400">error</span>
                  <span>{installError}</span>
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center">
                  Instalátor připravuje aplikaci, vytváří systémové zástupce a konfiguruje prostředí...
                </p>
              )}
            </div>
          )}

          {/* STEP 4: DOKONČENO */}
          {step === 4 && (
            <div className="space-y-6 my-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-lg" />
                  <div className="relative w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl">
                    <span className="material-symbols-outlined text-3xl font-bold">task_alt</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-white">Instalace byla úspěšně dokončena!</h2>
                  <p className="text-xs text-gray-400">
                    Aplikace IADonkey byla v pořádku nainstalována a je připravena k použití.
                  </p>
                </div>
              </div>

              {/* Run Application Checkbox Card */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={runOnFinish}
                    onChange={(e) => setRunOnFinish(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-700 text-indigo-600 focus:ring-indigo-500 bg-black/40 cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">
                      Spustit aplikaci IADonkey nyní
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Otevře vyhledávací okno a umístí ikonu do systémové lišty
                    </span>
                  </div>
                </label>
              </div>

              <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl text-xs text-gray-400 flex items-center gap-2.5">
                <span className="material-symbols-outlined text-indigo-400 text-base">keyboard</span>
                <span>Aplikaci můžete kdykoliv vyvolat klávesovou zkratkou <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/10 rounded font-mono text-white text-[11px]">Ctrl+Alt+Space</kbd></span>
              </div>
            </div>
          )}
        </div>

        {/* FIXED BOTTOM ACTION FOOTER (Never scrolls, always visible) */}
        <div className="h-16 px-8 border-t border-white/10 bg-[#141520]/95 backdrop-blur-md flex items-center justify-between flex-shrink-0">
          {/* Left Action Button (Zrušit or Zpět) */}
          <div>
            {step === 1 && (
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 text-xs font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition cursor-pointer"
              >
                Zrušit
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Zpět
              </button>
            )}
          </div>

          {/* Right Action Button */}
          <div className="flex items-center gap-3">
            {step === 1 && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center gap-1.5"
              >
                Další krok
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={handleStartInstallation}
                className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">install_desktop</span>
                Instalovat
              </button>
            )}

            {step === 3 && (
              <>
                {installError ? (
                  <button
                    type="button"
                    onClick={handleStartInstallation}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    Zkusit znovu
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="px-6 py-2.5 text-xs font-semibold text-gray-400 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2 cursor-not-allowed"
                  >
                    <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    Instaluji...
                  </button>
                )}
              </>
            )}

            {step === 4 && (
              <button
                type="button"
                onClick={handleFinish}
                className="px-7 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center gap-2"
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
