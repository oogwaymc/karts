import React, { useState } from 'react';
import { GameTelemetry } from '../game/GameEngine';
import { RotateCcw, Camera, Ghost, MapPin, Home, Pause, Users, Gauge, ShieldAlert } from 'lucide-react';

interface GameHUDProps {
  telemetry: GameTelemetry | null;
  onRestart: () => void;
  onToggleCamera: () => void;
  onToggleGhost: () => void;
  onTogglePause: () => void;
  onToggleAI: () => void;
  onOpenTrackSelect: () => void;
  onOpenSpeedSlider: () => void;
  onExitGame: () => void;
  onTouchControl: (action: 'up' | 'down' | 'left' | 'right', active: boolean) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  telemetry,
  onRestart,
  onToggleCamera,
  onToggleGhost,
  onTogglePause,
  onToggleAI,
  onOpenTrackSelect,
  onOpenSpeedSlider,
  onExitGame,
  onTouchControl,
}) => {
  const [clickSeq, setClickSeq] = useState('');

  if (!telemetry) return null;

  const registerDigit = (d: string) => {
    const next = (clickSeq + d).slice(-4);
    setClickSeq(next);
    if (next === '2411') {
      onOpenSpeedSlider();
    }
  };

  const formatTime = (t: number | null) => {
    if (t === null) return '-:--.---';
    const m = Math.floor(t / 60);
    const s = t - m * 60;
    return `${m}:${s < 10 ? '0' : ''}${s.toFixed(3)}`;
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none text-white z-10 flex flex-col justify-between p-4 sm:p-6 font-racing">
      {/* Top Header Bar */}
      <div className="flex items-start justify-between gap-4">
        {/* Brand, Track Select & Race Position */}
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={onExitGame}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-white hover:text-black border border-white/20 backdrop-blur-md text-xs tracking-wider transition-colors"
            title="Return to Home (Esc)"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-sans">Home</span>
          </button>

          <button
            onClick={onOpenTrackSelect}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-zinc-900 border border-white/20 backdrop-blur-md text-xs tracking-wider transition-all group"
            title="Change Circuit"
          >
            <span className="text-base select-none">{telemetry.trackFlag}</span>
            <span className="font-bold text-white group-hover:text-cyan-400 transition-colors uppercase">
              {telemetry.trackName}
            </span>
            <MapPin className="w-3.5 h-3.5 text-cyan-400 ml-1" />
          </button>

          {/* AI Race Position Badge */}
          {telemetry.aiEnabled && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/70 border border-white/20 backdrop-blur-md text-xs font-bold font-mono">
              <span className="text-amber-400 text-sm font-black">
                P{telemetry.racePosition}
              </span>
              <span className="text-zinc-500 text-[10px]">/ {telemetry.totalRacers}</span>
            </div>
          )}
        </div>

        {/* Center: Lap Timer & Ghost Delta */}
        <div className="flex flex-col items-center">
          <div className="px-5 py-2.5 rounded-2xl bg-black/75 border border-white/20 backdrop-blur-md shadow-2xl flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-400 font-sans font-medium">
              Lap Time
            </span>
            <div className="text-3xl sm:text-5xl font-black tracking-tight font-mono-num text-white">
              {formatTime(telemetry.lapTime)}
            </div>

            {/* Split Stats with clickable digit triggers */}
            <div className="flex items-center gap-4 sm:gap-6 mt-1 text-xs">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase tracking-wider block">Best</span>
                <span className="font-bold font-mono-num text-amber-300">
                  {formatTime(telemetry.bestLapTime)}
                </span>
              </div>
              <div className="w-px h-6 bg-white/20" />
              <button
                type="button"
                onClick={() => registerDigit('1')}
                className="pointer-events-auto hover:text-cyan-300 transition-colors"
                title="Click for 1"
              >
                <span className="text-zinc-500 text-[10px] uppercase tracking-wider block">Lap</span>
                <span className="font-bold font-mono-num text-white">
                  {telemetry.currentLap}
                </span>
              </button>
              <div className="w-px h-6 bg-white/20" />
              <button
                type="button"
                onClick={() => registerDigit('1')}
                className="pointer-events-auto hover:text-cyan-300 transition-colors"
                title="Click for 1"
              >
                <span className="text-zinc-500 text-[10px] uppercase tracking-wider block">Sector</span>
                <span className="font-bold font-mono-num text-cyan-300">
                  {telemetry.checkpointText}
                </span>
              </button>
            </div>

            {/* Live Ghost Delta */}
            {telemetry.deltaText && (
              <div
                className="mt-2 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono border backdrop-blur-sm animate-pulse"
                style={{
                  backgroundColor: telemetry.deltaPositive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                  borderColor: telemetry.deltaPositive ? 'rgba(239, 68, 68, 0.5)' : 'rgba(34, 197, 94, 0.5)',
                  color: telemetry.deltaPositive ? '#f87171' : '#4ade80'
                }}
              >
                <Ghost className="w-3 h-3" />
                <span>GHOST Δ {telemetry.deltaText}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Driver Jac Badge & Quick Controls */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          {/* Driver Jac badge with clickable 2-4 digits */}
          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/20 backdrop-blur-md flex items-center gap-2">
            <div className="flex gap-0.5">
              <button
                type="button"
                onClick={() => registerDigit('2')}
                className="w-5 h-6 rounded-l bg-gradient-to-tr from-zinc-800 to-zinc-600 border border-cyan-400 flex items-center justify-center text-[10px] font-black text-cyan-300 hover:bg-cyan-500 hover:text-black transition-colors"
                title="2"
              >
                2
              </button>
              <button
                type="button"
                onClick={() => registerDigit('4')}
                className="w-5 h-6 rounded-r bg-gradient-to-tr from-zinc-800 to-zinc-600 border border-cyan-400 flex items-center justify-center text-[10px] font-black text-cyan-300 hover:bg-cyan-500 hover:text-black transition-colors"
                title="4"
              >
                4
              </button>
            </div>
            <div className="text-right leading-tight">
              <span className="text-xs font-bold uppercase text-white tracking-wider block">
                {telemetry.driverName}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-cyan-400 font-sans block">
                Fatkart 125cc
              </span>
            </div>
          </div>

          {/* Quick HUD Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onRestart}
              className="p-2 rounded-lg bg-black/60 hover:bg-white hover:text-black border border-white/20 backdrop-blur-md transition-colors"
              title="Restart Lap (R)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleCamera}
              className="p-2 rounded-lg bg-black/60 hover:bg-white hover:text-black border border-white/20 backdrop-blur-md transition-colors uppercase text-xs font-bold"
              title="Toggle Camera (C)"
            >
              <Camera className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleGhost}
              className={`p-2 rounded-lg border backdrop-blur-md transition-colors ${
                telemetry.ghostVisible && telemetry.hasGhost
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  : 'bg-black/60 border-white/20 text-zinc-400 hover:text-white'
              }`}
              title="Toggle Ghost (G)"
            >
              <Ghost className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleAI}
              className={`p-2 rounded-lg border backdrop-blur-md transition-colors ${
                telemetry.aiEnabled
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-black/60 border-white/20 text-zinc-400 hover:text-white'
              }`}
              title="Toggle AI Drivers"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenSpeedSlider}
              className="p-2 rounded-lg bg-black/60 hover:bg-cyan-400 hover:text-black border border-white/20 backdrop-blur-md transition-colors"
              title="Custom Speed Dyno (2-4-1-1)"
            >
              <Gauge className="w-4 h-4" />
            </button>
            <button
              onClick={onTogglePause}
              className="p-2 rounded-lg bg-black/60 hover:bg-white hover:text-black border border-white/20 backdrop-blur-md transition-colors"
              title="Pause (Space)"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Middle Banner Notification / Wrong Way Warning */}
      <div className="flex flex-col items-center justify-center">
        {telemetry.wrongWay && (
          <div className="mb-2 px-5 py-2 rounded-xl bg-red-600/90 border-2 border-white text-white text-base sm:text-xl font-bold uppercase tracking-widest animate-bounce flex items-center gap-2 shadow-2xl">
            <ShieldAlert className="w-6 h-6" />
            WRONG WAY TURN AROUND
          </div>
        )}

        {telemetry.bannerMessage && (
          <div className="px-6 py-2 rounded-2xl bg-black/85 border border-cyan-400/40 text-cyan-200 text-lg sm:text-2xl font-bold uppercase tracking-wider backdrop-blur-md shadow-2xl animate-fade-in">
            {telemetry.bannerMessage}
          </div>
        )}
      </div>

      {/* Bottom Telemetry Bar */}
      <div className="flex items-end justify-between">
        {/* Speedometer */}
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="text-6xl sm:text-8xl font-black tracking-tight text-white font-mono-num drop-shadow-md">
              {telemetry.speedKmh}
            </span>
            <span className="text-sm sm:text-base uppercase tracking-widest text-zinc-400 font-sans">
              KM/H
            </span>
          </div>

          <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-sans mt-0.5 flex items-center gap-2">
            <span>Fatkarts Top: {telemetry.customTopSpeed} km/h</span>
            <span>·</span>
            <span>{telemetry.offTrack ? 'Off Track' : 'Tarmac Grip'}</span>
          </div>
        </div>

        {/* Keyboard Hints & Camera Mode */}
        <div className="hidden md:flex flex-col items-end gap-1 text-[11px] text-zinc-400 font-sans bg-black/60 px-3.5 py-2.5 rounded-xl border border-white/10 backdrop-blur-md pointer-events-auto">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white font-mono">W</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white font-mono">A</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white font-mono">S</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white font-mono">D</kbd>
            <span>drive</span>
            <span>·</span>
            <button onClick={onOpenSpeedSlider} className="text-cyan-400 hover:underline">
              2-4-1-1 Dyno
            </button>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-zinc-400">
            <span><strong className="text-white">R</strong> Restart</span>
            <span>·</span>
            <span><strong className="text-white">C</strong> Cam ({telemetry.cameraMode})</span>
            <span>·</span>
            <span><strong className="text-white">G</strong> Ghost</span>
            <span>·</span>
            <span><strong className="text-white">Esc</strong> Home</span>
          </div>
        </div>
      </div>

      {/* Onscreen Touch Controls for mobile/tablet */}
      <div className="pointer-events-auto md:hidden flex justify-between items-end pt-4">
        <div className="flex gap-2">
          <button
            onPointerDown={(e) => { e.preventDefault(); onTouchControl('left', true); }}
            onPointerUp={(e) => { e.preventDefault(); onTouchControl('left', false); }}
            onPointerCancel={() => onTouchControl('left', false)}
            className="w-16 h-16 rounded-full bg-black/60 active:bg-white active:text-black border-2 border-white/40 flex items-center justify-center text-xl font-bold select-none touch-none backdrop-blur-md"
          >
            ◀
          </button>
          <button
            onPointerDown={(e) => { e.preventDefault(); onTouchControl('right', true); }}
            onPointerUp={(e) => { e.preventDefault(); onTouchControl('right', false); }}
            onPointerCancel={() => onTouchControl('right', false)}
            className="w-16 h-16 rounded-full bg-black/60 active:bg-white active:text-black border-2 border-white/40 flex items-center justify-center text-xl font-bold select-none touch-none backdrop-blur-md"
          >
            ▶
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onPointerDown={(e) => { e.preventDefault(); onTouchControl('down', true); }}
            onPointerUp={(e) => { e.preventDefault(); onTouchControl('down', false); }}
            onPointerCancel={() => onTouchControl('down', false)}
            className="w-16 h-16 rounded-full bg-red-950/60 active:bg-red-500 active:text-white border-2 border-red-400/50 flex items-center justify-center text-xl font-bold select-none touch-none backdrop-blur-md"
          >
            ■
          </button>
          <button
            onPointerDown={(e) => { e.preventDefault(); onTouchControl('up', true); }}
            onPointerUp={(e) => { e.preventDefault(); onTouchControl('up', false); }}
            onPointerCancel={() => onTouchControl('up', false)}
            className="w-16 h-16 rounded-full bg-cyan-950/60 active:bg-cyan-400 active:text-black border-2 border-cyan-400/50 flex items-center justify-center text-xl font-bold select-none touch-none backdrop-blur-md"
          >
            ▲
          </button>
        </div>
      </div>
    </div>
  );
};
