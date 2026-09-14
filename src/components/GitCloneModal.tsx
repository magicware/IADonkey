import React, { useState, useEffect, useRef } from 'react';

interface GitCloneModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  repoName: string;
  repoUrl?: string;
  defaultTargetDir?: string;
  initialRecursive?: boolean;
  isStandaloneWindow?: boolean;
  isInstanceMode?: boolean;
  adminUrl?: string;
  vscodeEnabled?: boolean;
}

interface SectionRepoItem {
  sectionId: number;
  manifestPath: string;
  repoUrl: string;
  version?: string;
  targetSubdir: string;
}

export const GitCloneModal: React.FC<GitCloneModalProps> = ({
  isOpen = true,
  onClose = () => window.close(),
  repoName,
  repoUrl = '',
  defaultTargetDir = '',
  initialRecursive = false,
  isStandaloneWindow = false,
  isInstanceMode = false,
  adminUrl = '',
  vscodeEnabled = false,
}) => {
  const [targetDir, setTargetDir] = useState(defaultTargetDir);
  const [recursive, setRecursive] = useState(initialRecursive);
  const [status, setStatus] = useState<'idle' | 'cloning' | 'success' | 'error'>('idle');
  const [clonedPath, setClonedPath] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Instance-specific state
  const [instanceRepos, setInstanceRepos] = useState<SectionRepoItem[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [loadReposError, setLoadReposError] = useState<string | null>(null);
  const [cloneProgress, setCloneProgress] = useState<{ current: number; total: number; repoName: string } | null>(null);
  const [cloneLogs, setCloneLogs] = useState<string[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const validInstanceRepos = instanceRepos.filter((r) => r.repoUrl && r.repoUrl.trim());

  // Sync state when modal opens or initial props change
  useEffect(() => {
    if (isOpen) {
      setTargetDir(defaultTargetDir);
      setRecursive(initialRecursive);
      setStatus('idle');
      setClonedPath('');
      setErrorMessage('');
      setCopiedUrl(false);
      setCloneLogs([]);
      setCloneProgress(null);
    }
  }, [isOpen, defaultTargetDir, initialRecursive]);

  // Load instance section repos if in instance mode
  const loadInstanceRepos = async () => {
    if (!isInstanceMode || !adminUrl) return;

    setIsLoadingRepos(true);
    setLoadReposError(null);

    try {
      if (window.electronAPI?.fetchInstanceRepos) {
        const res = await window.electronAPI.fetchInstanceRepos(adminUrl);
        if (res.ok) {
          setInstanceRepos(res.repos || []);
        } else {
          setLoadReposError(res.error || 'Nepodařilo se načíst seznam repozitářů sekcí.');
        }
      }
    } catch (err: any) {
      setLoadReposError(err?.message || 'Chyba při komunikaci s API instance.');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  useEffect(() => {
    if (isOpen && isInstanceMode && adminUrl) {
      loadInstanceRepos();
    }
  }, [isOpen, isInstanceMode, adminUrl]);

  // Subscribe to multi-repo clone progress events
  useEffect(() => {
    if (window.electronAPI?.onMagicGateCloneProgress) {
      const unsubscribe = window.electronAPI.onMagicGateCloneProgress((data) => {
        setCloneProgress({
          current: data.current,
          total: data.total,
          repoName: data.repoName,
        });
        if (data.log) {
          setCloneLogs((prev) => [...prev, data.log]);
        }
      });
      return () => unsubscribe();
    }
  }, []);

  // Auto-scroll terminal log box
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [cloneLogs]);

  // Handle Escape and Enter keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && status !== 'cloning') {
        onClose();
      } else if (e.key === 'Enter' && isOpen) {
        const isBlocked =
          status === 'cloning' ||
          status === 'success' ||
          !targetDir.trim() ||
          (isInstanceMode && (isLoadingRepos || validInstanceRepos.length === 0));

        if (!isBlocked) {
          e.preventDefault();
          handleStartClone();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, status, targetDir, isInstanceMode, isLoadingRepos, validInstanceRepos.length, onClose]);

  if (!isOpen) return null;

  const handleSelectFolder = async () => {
    try {
      if (window.electronAPI?.selectDirectory) {
        const selected = await window.electronAPI.selectDirectory();
        if (selected) {
          if (isInstanceMode) {
            setTargetDir(selected);
          } else {
            setTargetDir(selected);
          }
        }
      }
    } catch (err) {
      console.error('Failed to select directory:', err);
    }
  };

  const handleCopyUrl = (urlToCopy: string) => {
    if (!urlToCopy) return;
    navigator.clipboard.writeText(urlToCopy);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 1800);
  };

  const handleStartClone = async () => {
    if (!targetDir.trim() || status === 'cloning') return;

    if (isInstanceMode) {
      const validRepos = instanceRepos.filter((r) => r.repoUrl && r.repoUrl.trim());
      if (validRepos.length === 0) {
        setStatus('error');
        setErrorMessage('Nebyly nalezeny žádné repozitáře sekcí ke stažení.');
        return;
      }

      setStatus('cloning');
      setErrorMessage('');
      setClonedPath('');
      setCloneLogs([]);

      try {
        if (!window.electronAPI?.runMultiRepoClone) {
          setStatus('error');
          setErrorMessage('Funkce klonování repozitářů instance není k dispozici.');
          return;
        }

        const res = await window.electronAPI.runMultiRepoClone({
          repos: instanceRepos,
          targetDir: targetDir.trim(),
          recursive,
        });

        if (res.success) {
          setStatus('success');
          setClonedPath(res.targetPath);
        } else {
          setStatus('error');
          setErrorMessage(res.error || 'Při klonování repozitářů instance došlo k chybě.');
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err?.message || 'Chyba při komunikaci s procesem klonování.');
      }
      return;
    }

    // Single GitHub repository clone mode
    if (!repoUrl?.trim()) return;

    setStatus('cloning');
    setErrorMessage('');
    setClonedPath('');

    try {
      if (!window.electronAPI?.runGitClone) {
        setStatus('error');
        setErrorMessage('Funkce klonování není v tomto prostředí k dispozici.');
        return;
      }

      const res = await window.electronAPI.runGitClone({
        repoUrl: repoUrl.trim(),
        targetDir: targetDir.trim(),
        recursive,
      });

      if (res.success) {
        setStatus('success');
        setClonedPath(res.targetPath);
      } else {
        setStatus('error');
        setErrorMessage(res.error || 'Nastala neznámá chyba při spouštění git clone.');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err?.message || 'Chyba při komunikaci s procesem klonování.');
    }
  };

  const handleOpenInExplorer = () => {
    const pathToOpen = clonedPath || targetDir;
    if (pathToOpen && window.electronAPI?.openPath) {
      window.electronAPI.openPath(pathToOpen);
    }
  };

  const handleOpenInVscode = async () => {
    const pathToOpen = clonedPath || targetDir;
    if (pathToOpen && window.electronAPI?.openInVscode) {
      await window.electronAPI.openInVscode(pathToOpen);
      onClose();
    }
  };

  const content = (
    <>
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-[#1e1f29] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <span className="material-symbols-outlined text-2xl">
              {isInstanceMode ? 'cloud_download' : 'download'}
            </span>
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              {isInstanceMode ? `Klonovat repozitáře instance` : 'Klonovat repozitář'}
            </h3>
            <p className="text-xs text-gray-400">
              {isInstanceMode
                ? `Stažení všech sekcí pro instanci ${repoName}`
                : 'Stažení repozitáře z GitHubu do lokální složky'}
            </p>
          </div>
        </div>
        {!isStandaloneWindow && status !== 'cloning' && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Zavřít (Esc)"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-5 space-y-4 text-sm flex-1 overflow-y-auto">
        {/* Repository / Instance info */}
        {isInstanceMode ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Instance & Repozitáře sekcí
              </label>
              {validInstanceRepos.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-medium">
                  {validInstanceRepos.length} {validInstanceRepos.length === 1 ? 'sekce' : validInstanceRepos.length < 5 ? 'sekce' : 'sekcí'}
                </span>
              )}
            </div>

            {/* Loading state for repos */}
            {isLoadingRepos && (
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center gap-3 text-xs text-purple-300">
                <span className="material-symbols-outlined text-lg animate-spin text-purple-400">progress_activity</span>
                <span>Zjišťuji repozitáře sekcí z administrace instance...</span>
              </div>
            )}

            {/* Error loading repos */}
            {loadReposError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start justify-between gap-3 text-rose-300 text-xs">
                <div className="flex items-start gap-2 min-w-0">
                  <span className="material-symbols-outlined text-base mt-0.5 shrink-0">error</span>
                  <span className="leading-relaxed">{loadReposError}</span>
                </div>
                <button
                  type="button"
                  onClick={loadInstanceRepos}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/15 text-white rounded-lg transition shrink-0 cursor-pointer text-xs"
                >
                  Zkusit znovu
                </button>
              </div>
            )}

            {/* Loaded repos list */}
            {!isLoadingRepos && !loadReposError && (
              validInstanceRepos.length === 0 ? (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2.5 text-amber-300 text-xs">
                  <span className="material-symbols-outlined text-base shrink-0">info</span>
                  <span>Tato instance nemá evidované žádné Git repozitáře sekcí ke stažení.</span>
                </div>
              ) : (
                <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5">
                <div className="px-3.5 py-2.5 bg-white/[0.02] flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-2 font-medium text-white">
                    <span className="material-symbols-outlined text-base text-purple-400">dns</span>
                    <span>{repoName}</span>
                  </div>
                  <span className="font-mono text-[11px] text-gray-400 truncate max-w-[280px]" title={adminUrl}>
                    {adminUrl}
                  </span>
                </div>

                <div className="max-h-40 overflow-y-auto divide-y divide-white/5">
                  {instanceRepos.map((r) => (
                    <div key={r.sectionId || r.manifestPath} className="px-3.5 py-2 flex items-center justify-between gap-3 text-xs hover:bg-white/[0.02]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-base text-gray-500 shrink-0">folder</span>
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate flex items-center gap-1.5">
                            <span>{r.targetSubdir}</span>
                            {r.version && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-gray-300 font-mono">
                                {r.version}
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[11px] text-gray-400 truncate" title={r.repoUrl}>
                            {r.repoUrl || '(bez repozitáře)'}
                          </div>
                        </div>
                      </div>
                      {r.repoUrl && (
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(r.repoUrl)}
                          className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition shrink-0 cursor-pointer"
                          title="Zkopírovat URL repozitáře"
                        >
                          <span className="material-symbols-outlined text-sm">content_copy</span>
                        </button>
                      )}
                    </div>
                  ))}
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Repozitář
            </label>
            <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-xl px-3 py-2">
              <div className="min-w-0 pr-2">
                <div className="font-semibold text-white truncate text-[13px]">{repoName}</div>
                <div className="font-mono text-xs text-gray-400 truncate">{repoUrl}</div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyUrl(repoUrl)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition shrink-0 cursor-pointer"
                title={copiedUrl ? 'Zkopírováno!' : 'Zkopírovat URL'}
              >
                <span className={`material-symbols-outlined text-base ${copiedUrl ? 'text-emerald-400' : ''}`}>
                  {copiedUrl ? 'check' : 'content_copy'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Target Directory */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              {isInstanceMode ? 'Kořenová složka pro stažení instance' : 'Cílová složka pro stažení'} <span className="text-rose-400">*</span>
            </label>
            {isInstanceMode && (
              <span className="text-[11px] text-gray-400">
                Název podsložky můžete libovolně upravit
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              disabled={status === 'cloning'}
              value={targetDir}
              onChange={(e) => setTargetDir(e.target.value)}
              placeholder={isInstanceMode ? 'C:\\development\\InstanceName' : 'Vyberte cílovou složku...'}
              className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500/60 disabled:opacity-50"
            />
            <button
              type="button"
              disabled={status === 'cloning'}
              onClick={handleSelectFolder}
              className="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-white border border-purple-500/30 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0 disabled:opacity-50"
              title="Vybrat složku"
            >
              <span className="material-symbols-outlined text-base">folder_open</span>
              <span>Procházet...</span>
            </button>
          </div>
          {!targetDir.trim() && (
            <p className="text-[11px] text-amber-400/90">
              Vyberte složku, do které budou repozitáře naklonovány.
            </p>
          )}
        </div>

        {/* Recursive checkbox */}
        <div className="pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-gray-300 hover:text-white">
            <input
              type="checkbox"
              disabled={status === 'cloning'}
              checked={recursive}
              onChange={(e) => setRecursive(e.target.checked)}
              className="w-4 h-4 rounded bg-white/10 border-white/20 text-purple-600 focus:ring-0 focus:ring-offset-0 cursor-pointer disabled:opacity-50"
            />
            <span>Rekurzivní klonování včetně submodulů (<code className="font-mono text-[11px] bg-white/10 px-1 rounded">--recursive</code>)</span>
          </label>
        </div>

        {/* Status states */}
        {status === 'cloning' && (
          <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-2 text-purple-300 text-xs">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl animate-spin text-purple-400">progress_activity</span>
              <div>
                <div className="font-semibold text-white">
                  {isInstanceMode && cloneProgress
                    ? `Klonuji [${cloneProgress.current}/${cloneProgress.total}]: ${cloneProgress.repoName}...`
                    : 'Stahuji repozitář...'}
                </div>
                <div className="text-[11px] text-purple-300/80 mt-0.5">
                  Spouštím <code>git clone {recursive ? '--recursive ' : ''}...</code> Může to chvíli trvat.
                </div>
              </div>
            </div>

            {/* Live terminal output if available */}
            {cloneLogs.length > 0 && (
              <div
                ref={logContainerRef}
                className="mt-2 font-mono text-[11px] text-gray-300 bg-black/60 border border-white/10 rounded-lg p-2.5 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text"
              >
                {cloneLogs.join('')}
              </div>
            )}
          </div>
        )}

        {status === 'success' && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2 text-emerald-300 text-xs animate-in fade-in">
            <div className="flex items-center gap-2 font-semibold">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              <span>
                {isInstanceMode
                  ? `Všechny repozitáře sekcí instance (${validInstanceRepos.length}) byly úspěšně staženy!`
                  : 'Repozitář byl úspěšně naklonován!'}
              </span>
            </div>
            <div className="font-mono text-[11px] text-emerald-200/90 break-all bg-black/30 p-2 rounded-lg border border-emerald-500/20">
              {clonedPath}
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2 text-rose-300 text-xs animate-in fade-in">
            <div className="flex items-center gap-2 font-semibold">
              <span className="material-symbols-outlined text-lg">error</span>
              <span>Klonování se nezdařilo</span>
            </div>
            <p className="text-[11px] text-rose-200/80 whitespace-pre-wrap font-mono break-all max-h-36 overflow-y-auto bg-black/30 p-2 rounded-lg border border-rose-500/20">
              {errorMessage}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 bg-[#1e1f29] flex items-center justify-between gap-3 shrink-0">
        {status === 'success' ? (
          <>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenInExplorer}
                className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/40 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">folder</span>
                <span>Otevřít složku v Průzkumníku</span>
              </button>
              {vscodeEnabled && (
                <button
                  type="button"
                  onClick={handleOpenInVscode}
                  className="px-4 py-2 bg-cyan-700/40 hover:bg-cyan-700/60 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">code</span>
                  <span>Otevřít ve VS Code</span>
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-medium transition cursor-pointer"
            >
              Zavřít
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={status === 'cloning'}
              onClick={onClose}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-medium transition cursor-pointer disabled:opacity-50"
            >
              Zrušit
            </button>

            {(() => {
              const isCloning = status === 'cloning';
              const isBlocked =
                !targetDir.trim() ||
                (isInstanceMode && (isLoadingRepos || validInstanceRepos.length === 0));

              return (
                <button
                  type="button"
                  disabled={isCloning || isBlocked}
                  onClick={() => handleStartClone()}
                  className={`px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition select-none ${
                    isCloning
                      ? 'bg-purple-600 text-white cursor-wait opacity-95'
                      : isBlocked
                      ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer'
                  }`}
                >
                  {isCloning ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin text-white">
                        progress_activity
                      </span>
                      <span className="text-white font-semibold">
                        {isInstanceMode ? 'Klonuji sekce...' : 'Klonuji...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">
                        {isInstanceMode ? 'cloud_download' : 'download'}
                      </span>
                      <span>
                        {status === 'error'
                          ? 'Zkusit znovu'
                          : isInstanceMode
                          ? `Klonovat repozitáře (${validInstanceRepos.length})`
                          : 'Klonovat repozitář'}
                      </span>
                      {!isBlocked && (
                        <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-sans font-medium bg-black/20 text-purple-200 rounded border border-purple-400/30">
                          ↵ Enter
                        </kbd>
                      )}
                    </>
                  )}
                </button>
              );
            })()}
          </>
        )}
      </div>
    </>
  );

  if (isStandaloneWindow) {
    return (
      <main className="w-full h-screen bg-[#181920] text-gray-200 flex flex-col justify-between select-none overflow-hidden">
        {content}
      </main>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="bg-[#181920] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-gray-200 flex flex-col">
        {content}
      </div>
    </div>
  );
};
