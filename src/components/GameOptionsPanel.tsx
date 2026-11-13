import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { FreePlaySettings, DEFAULT_FREE_PLAY_SETTINGS } from '../types/game';

interface GameOptionsPanelProps {
  settings: FreePlaySettings;
  onChange: (next: FreePlaySettings) => void;
  compact?: boolean;
  showTimer?: boolean;
}

export const GameOptionsPanel: React.FC<GameOptionsPanelProps> = ({
  settings,
  onChange,
  compact = false,
  showTimer = true,
}) => {
  const isRelaxed =
    settings.dropSpeed === 100 &&
    settings.tileRadius === 34 &&
    settings.ceilingHeight === 50 &&
    settings.wallWidthPct === 100 &&
    settings.speedIncreaseEnabled === false;

  const isJustRight =
    settings.dropSpeed === DEFAULT_FREE_PLAY_SETTINGS.dropSpeed &&
    settings.tileRadius === DEFAULT_FREE_PLAY_SETTINGS.tileRadius &&
    settings.ceilingHeight === DEFAULT_FREE_PLAY_SETTINGS.ceilingHeight &&
    settings.wallWidthPct === DEFAULT_FREE_PLAY_SETTINGS.wallWidthPct &&
    settings.speedIncreaseEnabled === DEFAULT_FREE_PLAY_SETTINGS.speedIncreaseEnabled;

  const isChallenge =
    settings.dropSpeed === 240 &&
    settings.tileRadius === 28 &&
    settings.ceilingHeight === 120 &&
    settings.wallWidthPct === 100 &&
    settings.speedIncreaseEnabled === true &&
    settings.speedIncreaseRate === 10;

  const isCustom = !isRelaxed && !isJustRight && !isChallenge;

  const handleApplyPreset = (preset: 'relaxed' | 'just_right' | 'challenge') => {
    if (preset === 'relaxed') {
      onChange({
        ...settings,
        dropSpeed: 100,
        tileRadius: 34,
        ceilingHeight: 50,
        wallWidthPct: 100,
        speedIncreaseEnabled: false,
      });
    } else if (preset === 'just_right') {
      onChange({
        ...settings,
        dropSpeed: DEFAULT_FREE_PLAY_SETTINGS.dropSpeed,
        tileRadius: DEFAULT_FREE_PLAY_SETTINGS.tileRadius,
        ceilingHeight: DEFAULT_FREE_PLAY_SETTINGS.ceilingHeight,
        wallWidthPct: DEFAULT_FREE_PLAY_SETTINGS.wallWidthPct,
        speedIncreaseEnabled: DEFAULT_FREE_PLAY_SETTINGS.speedIncreaseEnabled,
      });
    } else if (preset === 'challenge') {
      onChange({
        ...settings,
        dropSpeed: 240,
        tileRadius: 28,
        ceilingHeight: 120,
        wallWidthPct: 100,
        speedIncreaseEnabled: true,
        speedIncreaseRate: 10,
      });
    }
  };

  return (
    <div className={`w-full space-y-5 text-slate-800 ${compact ? 'py-1' : 'py-3'}`}>
      {/* 3 Speed & Size Presets */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-base font-display font-extrabold text-slate-800">
            Board Feel
          </label>
          {isCustom && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-sm font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Custom mix
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => handleApplyPreset('relaxed')}
            className={`min-h-[56px] p-3 rounded-2xl border-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400 ${
              isRelaxed
                ? 'bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-300'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-1.5 text-base font-display font-black text-emerald-800">
              <span>Relaxed</span>
              {isRelaxed && <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />}
            </div>
            <p className="text-sm text-slate-600 font-medium mt-0.5 leading-tight">
              Slow tiles, big hexes, lots of room
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('just_right')}
            className={`min-h-[56px] p-3 rounded-2xl border-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 ${
              isJustRight
                ? 'bg-amber-50 border-amber-500 shadow-md ring-2 ring-amber-300'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-1.5 text-base font-display font-black text-amber-900">
              <span>Just right</span>
              {isJustRight && <Check className="w-4 h-4 text-amber-700 stroke-[3]" />}
            </div>
            <p className="text-sm text-slate-600 font-medium mt-0.5 leading-tight">
              Balanced pace and board size
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('challenge')}
            className={`min-h-[56px] p-3 rounded-2xl border-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-400 ${
              isChallenge
                ? 'bg-rose-50 border-rose-500 shadow-md ring-2 ring-rose-300'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-1.5 text-base font-display font-black text-rose-800">
              <span>Challenge</span>
              {isChallenge && <Check className="w-4 h-4 text-rose-700 stroke-[3]" />}
            </div>
            <p className="text-sm text-slate-600 font-medium mt-0.5 leading-tight">
              Faster tiles that accelerate
            </p>
          </button>
        </div>
      </div>

      {/* Control 1: Falling speed */}
      <div>
        <label className="block text-base font-bold text-slate-800 mb-1.5">
          Falling speed
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Slow', val: 100 },
            { label: 'Normal', val: 170 },
            { label: 'Fast', val: 240 },
            { label: 'Super fast', val: 320 },
          ].map((item) => {
            const active = settings.dropSpeed === item.val;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onChange({ ...settings, dropSpeed: item.val })}
                className={`min-h-[52px] px-3 py-2 rounded-2xl border-4 font-bold text-base flex items-center justify-center gap-1.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 ${
                  active
                    ? 'bg-amber-400 border-amber-500 text-amber-950 shadow-md'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {active && <Check className="w-4 h-4 text-amber-950 stroke-[3]" />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control 2: Tile size */}
      <div>
        <label className="block text-base font-bold text-slate-800 mb-1.5">
          Tile size
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Small', val: 26 },
            { label: 'Medium', val: 31 },
            { label: 'Big', val: 34 },
          ].map((item) => {
            const active = settings.tileRadius === item.val;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onChange({ ...settings, tileRadius: item.val })}
                className={`min-h-[52px] px-3 py-2 rounded-2xl border-4 font-bold text-base flex items-center justify-center gap-1.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 ${
                  active
                    ? 'bg-amber-400 border-amber-500 text-amber-950 shadow-md'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {active && <Check className="w-4 h-4 text-amber-950 stroke-[3]" />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control 3: Play area */}
      <div>
        <label className="block text-base font-bold text-slate-800 mb-1.5">
          Play area
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Narrow', val: 60 },
            { label: 'Medium', val: 80 },
            { label: 'Wide', val: 100 },
          ].map((item) => {
            const active = settings.wallWidthPct === item.val;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onChange({ ...settings, wallWidthPct: item.val })}
                className={`min-h-[52px] px-3 py-2 rounded-2xl border-4 font-bold text-base flex items-center justify-center gap-1.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 ${
                  active
                    ? 'bg-amber-400 border-amber-500 text-amber-950 shadow-md'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {active && <Check className="w-4 h-4 text-amber-950 stroke-[3]" />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control 4: Room before the line */}
      <div>
        <label className="block text-base font-bold text-slate-800 mb-1.5">
          Room before the line
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Lots', val: 50 },
            { label: 'Some', val: 85 },
            { label: 'Not much', val: 150 },
          ].map((item) => {
            const active = settings.ceilingHeight === item.val;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onChange({ ...settings, ceilingHeight: item.val })}
                className={`min-h-[52px] px-3 py-2 rounded-2xl border-4 font-bold text-base flex items-center justify-center gap-1.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 ${
                  active
                    ? 'bg-amber-400 border-amber-500 text-amber-950 shadow-md'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {active && <Check className="w-4 h-4 text-amber-950 stroke-[3]" />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control 5: Speed up after each equation */}
      <div>
        <label className="block text-base font-bold text-slate-800 mb-1.5">
          Get faster after each equation
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Off', enabled: false, rate: 5 },
            { label: 'A little', enabled: true, rate: 5 },
            { label: 'Medium', enabled: true, rate: 10 },
            { label: 'A lot', enabled: true, rate: 20 },
          ].map((item) => {
            const active =
              !item.enabled
                ? !settings.speedIncreaseEnabled
                : settings.speedIncreaseEnabled && settings.speedIncreaseRate === item.rate;

            return (
              <button
                key={item.label}
                type="button"
                onClick={() =>
                  onChange({
                    ...settings,
                    speedIncreaseEnabled: item.enabled,
                    speedIncreaseRate: item.rate,
                  })
                }
                className={`min-h-[52px] px-3 py-2 rounded-2xl border-4 font-bold text-base flex items-center justify-center gap-1.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 ${
                  active
                    ? 'bg-amber-400 border-amber-500 text-amber-950 shadow-md'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {active && <Check className="w-4 h-4 text-amber-950 stroke-[3]" />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control 6: Timer & Untimed Practice */}
      {showTimer && (
        <div>
          <label className="block text-base font-bold text-slate-800 mb-1.5">
            Timer
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { label: 'Practice', sec: 0, isPractice: true },
              { label: '1:00', sec: 60, isPractice: false },
              { label: '2:00', sec: 120, isPractice: false },
              { label: '3:00', sec: 180, isPractice: false },
              { label: '5:00', sec: 300, isPractice: false },
            ].map((item) => {
              const active = item.isPractice
                ? settings.isPractice || settings.timeLimit === 0
                : !settings.isPractice && settings.timeLimit === item.sec;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...settings,
                      timeLimit: item.sec,
                      isPractice: item.isPractice,
                    })
                  }
                  className={`min-h-[52px] px-2.5 py-2 rounded-2xl border-4 font-bold text-sm flex items-center justify-center gap-1 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 ${
                    active
                      ? 'bg-amber-400 border-amber-500 text-amber-950 shadow-md'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {active && <Check className="w-4 h-4 text-amber-950 stroke-[3]" />}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
