import React from 'react';
import { UpdateInfo } from '../types';

interface UpdateDialogProps {
  updateInfo: UpdateInfo;
  onAccept: () => void;
  onDecline: () => void;
}

export const UpdateDialog: React.FC<UpdateDialogProps> = ({
  updateInfo,
  onAccept,
  onDecline,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1e1e28] border border-indigo-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 text-gray-200 animate-in fade-in zoom-in-95 duration-150">
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

        {updateInfo.releaseNotes && (
          <div className="p-3 bg-black/30 rounded-xl border border-white/5 max-h-36 overflow-y-auto text-xs text-gray-300 space-y-1">
            <p className="font-semibold text-gray-400">Co je nového:</p>
            <p className="whitespace-pre-line">{updateInfo.releaseNotes}</p>
          </div>
        )}

        <p className="text-xs text-gray-400">
          Chcete nyní stáhnout a nainstalovat aktualizaci? V případě odložení vám aktualizaci znovu nabídneme za 24 hodin.
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onDecline}
            className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition"
          >
            Připomenout za 24h
          </button>
          <button
            onClick={onAccept}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Aktualizovat nyní
          </button>
        </div>
      </div>
    </div>
  );
};
