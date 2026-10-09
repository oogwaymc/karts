import React from 'react';
import { TrackId } from '../game/types';
import { TRACK_CONFIGS } from '../game/tracks';
import { Trophy, Flag, Timer, ChevronRight, X } from 'lucide-react';

interface TrackSelectModalProps {
  isOpen: boolean;
  currentTrackId: TrackId;
  onSelectTrack: (trackId: TrackId) => void;
  onClose: () => void;
}

export const TrackSelectModal: React.FC<TrackSelectModalProps> = ({
  isOpen,
  currentTrackId,
  onSelectTrack,
  onClose,
}) => {
  if (!isOpen) return null;

  const tracks = Object.values(TRACK_CONFIGS);

  const getBestTimeFormatted = (trackId: TrackId) => {
    try {
      const raw = localStorage.getItem(`fatkart_best_${trackId}`);
      if (raw) {
        const t = parseFloat(raw);
        if (!isNaN(t) && t > 0) {
          const m = Math.floor(t / 60);
          const s = t - m * 60;
          return `${m}:${s < 10 ? '0' : ''}${t.toFixed(3)}`;
        }
      }
    } catch (_) {}
    return '--:--.---';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-zinc-950/95 border border-white/20 rounded-2xl p-6 sm:p-8 shadow-2xl text-white">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <Flag className="w-6 h-6 text-red-500" />
          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider font-racing">
            Select Grand Prix Circuit
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-zinc-400 mb-6">
          5 legendary F1 tracks calibrated for Jac's Fatkart (avg lap target: 35–40s).
        </p>

        <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {tracks.map((t) => {
            const isSelected = t.id === currentTrackId;
            const bestTime = getBestTimeFormatted(t.id);

            return (
              <button
                key={t.id}
                onClick={() => {
                  onSelectTrack(t.id);
                  onClose();
                }}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/30 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400/50'
                    : 'border-white/10 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-white/30'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl select-none pt-0.5">{t.flag}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base sm:text-lg group-hover:text-cyan-300 transition-colors">
                        {t.name}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-500 text-black">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">{t.location} · {t.turns} turns · {t.lengthMeters}m</div>
                    <div className="text-xs text-zinc-500 mt-1 line-clamp-1 italic">{t.description}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 pl-3 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 flex items-center justify-end gap-1 uppercase tracking-wider">
                      <Trophy className="w-3 h-3 text-amber-400" /> Best
                    </span>
                    <span className="text-sm font-mono font-bold tracking-tight text-amber-200">
                      {bestTime}
                    </span>
                  </div>
                  <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isSelected ? 'text-cyan-400' : 'text-zinc-500'}`} />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-cyan-400" />
            <span>Ghost lap recorded automatically on fastest time</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white hover:text-black font-medium text-xs text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
