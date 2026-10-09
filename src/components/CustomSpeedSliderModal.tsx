import React, { useState } from 'react';
import { Gauge, X, Zap, RotateCcw } from 'lucide-react';

interface CustomSpeedSliderModalProps {
  isOpen: boolean;
  currentTopSpeed: number;
  onApplySpeed: (speedKmh: number) => void;
  onResetDefault: () => void;
  onClose: () => void;
}

export const CustomSpeedSliderModal: React.FC<CustomSpeedSliderModalProps> = ({
  isOpen,
  currentTopSpeed,
  onApplySpeed,
  onResetDefault,
  onClose,
}) => {
  const [speed, setSpeed] = useState<number>(currentTopSpeed);

  if (!isOpen) return null;

  const presets = [100, 120, 130, 160, 200, 240];

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setSpeed(val);
    onApplySpeed(val);
  };

  const handlePreset = (val: number) => {
    setSpeed(val);
    onApplySpeed(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-racing">
      <div className="relative w-full max-w-lg bg-zinc-950/95 border border-cyan-400/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-950/50 text-white">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center">
            <Gauge className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-[0.25em] text-cyan-400 block font-sans">
              Secret Override (2-4-1-1)
            </span>
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-white">
              Custom Engine Top Speed
            </h2>
          </div>
        </div>

        <p className="text-xs text-zinc-400 font-sans mb-8">
          Adjust the peak velocity of Jac's Fatkart in real-time. Changes take effect immediately.
        </p>

        {/* Big Speed Value Display */}
        <div className="flex flex-col items-center justify-center py-6 px-4 rounded-2xl bg-black/60 border border-white/10 mb-6">
          <div className="flex items-baseline gap-2">
            <span className="text-6xl sm:text-7xl font-black text-cyan-300 font-mono-num drop-shadow-[0_0_25px_rgba(0,212,255,0.4)]">
              {speed}
            </span>
            <span className="text-lg font-bold uppercase tracking-widest text-zinc-400 font-sans">
              KM/H
            </span>
          </div>
          <span className="text-xs text-zinc-500 font-sans mt-1">
            {speed === 120 ? 'Standard Spec' : speed === 130 ? 'Joeisabitchwasd Cheat Spec' : speed > 200 ? 'Rocket Hyperkart Spec' : 'Custom Dyno Tuning'}
          </span>
        </div>

        {/* Speed Slider */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-xs text-zinc-400 font-sans font-medium">
            <span>60 KM/H</span>
            <span className="text-cyan-400 font-bold">120 Base</span>
            <span className="text-amber-400 font-bold">130 Cheat</span>
            <span>260 KM/H</span>
          </div>
          <input
            type="range"
            min={60}
            max={260}
            step={2}
            value={speed}
            onChange={handleSliderChange}
            className="w-full h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 transition-all"
          />
        </div>

        {/* Quick Presets */}
        <div className="space-y-2 mb-8">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-sans block">
            Quick Dyno Presets
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => handlePreset(p)}
                className={`py-2 px-1 rounded-xl text-xs font-bold font-mono transition-all border ${
                  speed === p
                    ? 'bg-cyan-500 text-black border-cyan-400 font-black'
                    : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 border-white/10'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              onResetDefault();
              setSpeed(120);
            }}
            className="flex-1 h-11 rounded-xl border border-white/20 hover:bg-white/10 flex items-center justify-center gap-2 text-xs font-sans font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to 120
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black flex items-center justify-center gap-2 text-xs font-sans font-bold transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
