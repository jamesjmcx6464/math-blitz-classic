import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  Home,
  Volume2,
  VolumeX,
  Sliders,
  BookOpen,
  SkipForward,
  Flag,
  HelpCircle,
} from 'lucide-react';
import {
  ViewMode,
  FreePlaySettings,
  EquationEntry,
  DEFAULT_FREE_PLAY_SETTINGS,
  ClassroomMatchState,
} from '../types/game';
import { GameOptionsPanel } from './GameOptionsPanel';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onQuitToMenu: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  viewMode: ViewMode;
  freePlaySettings?: FreePlaySettings;
  onUpdateFreePlaySettings?: (settings: FreePlaySettings) => void;
  onResetFreePlaySettings?: () => void;
  equationEntries?: EquationEntry[];
  classroomMatch?: ClassroomMatchState | null;
  onPassTurn?: () => void;
  onFinishMatchEarly?: () => void;
  onOpenHowToPlay?: () => void;
}

type PauseTab = 'menu' | 'options' | 'equations';

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onQuitToMenu,
  soundEnabled,
  onToggleSound,
  viewMode: _viewMode,
  freePlaySettings = DEFAULT_FREE_PLAY_SETTINGS,
  onUpdateFreePlaySettings,
  equationEntries = [],
  classroomMatch,
  onPassTurn,
  onFinishMatchEarly,
  onOpenHowToPlay,
}) => {
  const [activeTab, setActiveTab] = useState<PauseTab>('menu');
  const [localSettings, setLocalSettings] = useState<FreePlaySettings>(freePlaySettings);
  const [confirmingAction, setConfirmingAction] = useState<'restart' | 'quit' | null>(null);

  const handleSettingsChange = (next: FreePlaySettings) => {
    setLocalSettings(next);
    onUpdateFreePlaySettings?.(next);
  };

  const activeTeam = classroomMatch
    ? classroomMatch.config.teams[classroomMatch.currentTeamIndex]
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm select-none animate-fade-in">
      <div className="w-full max-w-lg max-h-[92vh] bg-white border-4 border-amber-300 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-800">
        {/* Header with Navigation Tabs */}
        <div className="p-4 sm:p-5 border-b-2 border-amber-200 bg-amber-50/70 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-2xl font-display font-black text-slate-900 leading-tight">
                {activeTab === 'menu'
                  ? 'Paused'
                  : activeTab === 'options'
                  ? 'Game Options'
                  : 'My Equations'}
              </h2>
              {activeTeam && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mt-0.5">
                  <span>{activeTeam.emoji}</span>
                  <span className="font-extrabold text-slate-900">{activeTeam.name}&apos;s Turn</span>
                  <span>
                    · Round {classroomMatch?.currentRound}/{classroomMatch?.config.totalRounds}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('menu');
                setConfirmingAction(null);
              }}
              className={`flex-1 min-h-[48px] px-3 rounded-2xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'menu'
                  ? 'bg-amber-400 text-amber-950 shadow-md font-black'
                  : 'bg-white text-slate-700 border-2 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Game</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('options');
                setConfirmingAction(null);
              }}
              className={`flex-1 min-h-[48px] px-3 rounded-2xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'options'
                  ? 'bg-amber-400 text-amber-950 shadow-md font-black'
                  : 'bg-white text-slate-700 border-2 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Options</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('equations');
                setConfirmingAction(null);
              }}
              className={`flex-1 min-h-[48px] px-3 rounded-2xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'equations'
                  ? 'bg-amber-400 text-amber-950 shadow-md font-black'
                  : 'bg-white text-slate-700 border-2 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Equations ({equationEntries.length})</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Pause Menu */}
        {activeTab === 'menu' && (
          <div className="p-4 sm:p-5 flex flex-col gap-3 overflow-y-auto">
            <button
              type="button"
              onClick={onResume}
              className="w-full min-h-[72px] px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-display font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-amber-400/25 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500"
            >
              <Play className="w-6 h-6 fill-current" />
              <span>Keep Playing</span>
            </button>

            {classroomMatch && (
              <div className="grid grid-cols-2 gap-2">
                {onPassTurn && (
                  <button
                    type="button"
                    onClick={() => {
                      onResume();
                      onPassTurn();
                    }}
                    className="min-h-[52px] px-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-300 text-indigo-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <SkipForward className="w-4 h-4 text-indigo-600" />
                    <span>Pass Turn</span>
                  </button>
                )}

                {onFinishMatchEarly && (
                  <button
                    type="button"
                    onClick={() => {
                      onResume();
                      onFinishMatchEarly();
                    }}
                    className="min-h-[52px] px-3 rounded-2xl bg-purple-50 hover:bg-purple-100 border-2 border-purple-300 text-purple-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Flag className="w-4 h-4 text-purple-600" />
                    <span>Finish Match</span>
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={onToggleSound}
              className="w-full min-h-[56px] px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 font-bold text-base text-slate-800 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-amber-600" />
                ) : (
                  <VolumeX className="w-5 h-5 text-slate-500" />
                )}
                <span>Sound effects</span>
              </div>
              <span className="font-extrabold">{soundEnabled ? 'On' : 'Off'}</span>
            </button>

            {onOpenHowToPlay && (
              <button
                type="button"
                onClick={onOpenHowToPlay}
                className="w-full min-h-[52px] px-5 rounded-2xl bg-sky-50 hover:bg-sky-100 border-2 border-sky-200 font-bold text-base text-sky-900 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-5 h-5 text-sky-600" />
                <span>How to Play &amp; Scoring Rules</span>
              </button>
            )}

            {confirmingAction ? (
              <div className="p-4 rounded-2xl bg-amber-100 border-2 border-amber-300 space-y-3 text-center">
                <p className="text-base font-bold text-amber-950">
                  Leave this game? Current progress will be lost.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingAction(null)}
                    className="min-h-[48px] rounded-xl bg-white text-slate-800 font-bold text-sm border-2 border-slate-300 cursor-pointer"
                  >
                    Keep playing
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirmingAction === 'restart') {
                        onRestart();
                      } else {
                        onQuitToMenu();
                      }
                    }}
                    className="min-h-[48px] rounded-xl bg-rose-500 text-white font-bold text-sm cursor-pointer hover:bg-rose-600"
                  >
                    Leave
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmingAction('restart')}
                  className="min-h-[56px] px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 border-2 border-slate-300 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Start over</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmingAction('quit')}
                  className="min-h-[56px] px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 border-2 border-slate-300 transition-colors cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  <span>Go home</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Options */}
        {activeTab === 'options' && (
          <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 text-left">
            <GameOptionsPanel
              settings={localSettings}
              onChange={handleSettingsChange}
              showTimer={!classroomMatch}
            />

            <button
              type="button"
              onClick={onResume}
              className="w-full min-h-[56px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-display font-black text-base shadow-md cursor-pointer transition-all mt-4"
            >
              Apply &amp; Keep Playing
            </button>
          </div>
        )}

        {/* Tab 3: Equations Log */}
        {activeTab === 'equations' && (
          <div className="p-4 sm:p-5 flex-1 overflow-y-auto text-left space-y-3">
            <div className="flex items-center justify-between pb-2 border-b-2 border-slate-200">
              <span className="font-display font-black text-base text-slate-800">
                Equations solved ({equationEntries.length})
              </span>
              <span className="font-mono font-black text-sm text-emerald-700">
                Total: +{equationEntries.reduce((s, e) => s + e.score, 0).toLocaleString()} points
              </span>
            </div>

            {equationEntries.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl p-6">
                <BookOpen className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-50" />
                <p className="text-base font-bold text-slate-700">No equations solved yet</p>
                <p className="text-sm text-slate-500 mt-1">
                  Tap tiles and press Enter to score equations.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
                {[...equationEntries].reverse().map((entry, idx) => (
                  <div
                    key={entry.id || idx}
                    className="p-3 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-between gap-2"
                  >
                    <span className="font-mono font-black text-base text-slate-900">
                      {entry.equation} = {entry.target}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-xl bg-emerald-100 text-emerald-900 font-bold text-sm font-mono">
                      +{entry.score.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={onResume}
              className="w-full min-h-[56px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-display font-black text-base shadow-md cursor-pointer transition-all mt-4"
            >
              Keep Playing
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
