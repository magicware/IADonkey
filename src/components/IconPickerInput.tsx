import React, { useState } from 'react';
import { IconPickerModal } from './IconPickerModal';

interface IconPickerInputProps {
  value?: string | null;
  onChange: (iconName: string) => void;
  placeholder?: string;
  className?: string;
  accentColorClass?: string;
}

export const IconPickerInput: React.FC<IconPickerInputProps> = ({
  value,
  onChange,
  placeholder = 'Vybrat ikonu...',
  className = '',
  accentColorClass = 'text-indigo-300',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const hasIcon = Boolean(value && value.trim());

  return (
    <>
      <div className={`relative ${className}`}>
        {hasIcon ? (
          /* Vybraná ikona - plný rámeček s náhledem ikony */
          <div
            onClick={() => setIsModalOpen(true)}
            className="w-full h-[38px] bg-black/40 border border-white/15 hover:border-indigo-400/50 rounded-lg px-2.5 flex items-center justify-between gap-2.5 transition cursor-pointer group select-none"
            title="Klikněte pro změnu ikony"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <span className={`material-symbols-outlined text-[18px] leading-none ${accentColorClass}`}>
                  {value}
                </span>
              </div>
              <span className="text-xs font-mono text-white font-medium truncate">
                {value}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-rose-400 hover:bg-white/10 transition cursor-pointer"
                title="Odebrat ikonu"
              >
                <span className="material-symbols-outlined text-[16px] leading-none">close</span>
              </button>
              <span className="material-symbols-outlined text-gray-500 group-hover:text-gray-300 text-sm">
                edit
              </span>
            </div>
          </div>
        ) : (
          /* Není vybrána ikona - dashed outline placeholder se zašedlou ikonou */
          <div
            onClick={() => setIsModalOpen(true)}
            className="w-full h-[38px] border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] hover:border-indigo-400/50 rounded-lg px-3 flex items-center justify-between gap-2 cursor-pointer transition select-none group"
            title="Klikněte pro výběr ikony"
          >
            <div className="flex items-center gap-2 text-gray-500 group-hover:text-gray-400 min-w-0 transition-colors">
              <span className="material-symbols-outlined text-lg leading-none shrink-0">
                interests
              </span>
              <span className="text-xs font-medium truncate">
                {placeholder}
              </span>
            </div>
            <span className="material-symbols-outlined text-gray-500 group-hover:text-gray-300 text-sm shrink-0 transition-colors">
              add
            </span>
          </div>
        )}
      </div>

      <IconPickerModal
        isOpen={isModalOpen}
        selectedIcon={value || ''}
        onSelect={(newIcon) => onChange(newIcon)}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
