import React, { useState } from 'react';
import { X, Check, RotateCw, Sliders } from 'lucide-react';
import { FreePlaySettings, DEFAULT_FREE_PLAY_SETTINGS } from '../types/game';
import { GameOptionsPanel } from './GameOptionsPanel';

interface FreePlaySettingsModalProps {
  settings: FreePlaySettings;
  onUpdateSettings: (newSettings: FreePlaySettings) => void;
  onResetSettings: () => void;
  onClose: () => void;
  isBeforePlay?: boolean;
}

export const FreePlaySettingsModal: React.FC<FreePlaySettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onResetSettings: _onResetSettings,
  onClose,
}) => {
  const [localSettings, setLocalSettings] = useState<FreePlaySettings>({ ...settings });
  const [resetFeedback, setResetFeedback] = useState<boolean>(false);

  const handleSettingsChange = (next: FreePlaySettings) => {
    setLocalSettings(next);
    onUpdateSettings(next);
  };

  const handleResetOptionsOnly = () => {
    const updated: FreePlaySettings = {
      ...localSettings,
      dropSpeed: DEFAULT_FREE_PLAY_SETTINGS.dropSpeed,
      tileRadius: DEFAULT_FREE_PLAY_SETTINGS.tileRadius,
      ceilingHeight: DEFAULT_FREE_PLAY_SETTINGS.ceilingHeight,
      wallWidthPct: DEFAULT_FREE_PLAY_SETTINGS.wallWidthPct,
      speedIncreaseEnabled: DEFAULT_FREE_PLAY_SETTINGS.speedIncreaseEnabled,
      speedIncreaseRate: DEFAULT_FREE_PLAY_SETTINGS.speedIncreaseRate,
      timeLimit: DEFAULT_FREE_PLAY_SETTINGS.timeLimit,
      spawnDelayMs: DEFAULT_FREE_PLAY_SETTINGS.spawnDelayMs,
      isPractice: DEFAULT_FREE_PLAY_SETTINGS.isPractice,
    };
    setLocalSettings(updated);
    onUpdateSettings(updated);
    setResetFeedback(true);
    setTimeout(() => setResetFeedback(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-white border-4 border-amber-300 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in text-slate-800">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b-2 border-amber-200 flex items-center justify-between shrink-0 bg-amber-50/70">
          <div>
            <h2 className="font-display font-black text-2xl text-slate-900 flex items-center gap-2">
              <Sliders className="w-6 h-6 text-amber-500" />
              <span>Game Options</span>
            </h2>
            <p className="text-sm font-medium text-slate-600">
              Adjust board speed, size, and timer
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-2xl bg-white hover:bg-slate-100 border-2 border-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
            aria-label="Close game options"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-left">
          <GameOptionsPanel
            settings={localSettings}
            onChange={handleSettingsChange}
            showTimer={true}
          />
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t-2 border-slate-200 flex items-center justify-between gap-3 shrink-0 bg-slate-50">
          <button
            type="button"
            onClick={handleResetOptionsOnly}
            className="min-h-[56px] px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 border-2 border-slate-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
          >
            <RotateCw className="w-4 h-4" />
            <span>{resetFeedback ? 'Reset!' : 'Reset options'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[56px] px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-display font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
