import React, { useEffect, useRef, useState } from 'react';
import { GameEngine, GameTelemetry } from '../game/GameEngine';
import { GameHUD } from './GameHUD';
import { TrackSelectModal } from './TrackSelectModal';
import { CustomSpeedSliderModal } from './CustomSpeedSliderModal';
import { TrackId } from '../game/types';

interface GrandPrixGameProps {
  initialSecretCheat: boolean;
  onExit: () => void;
  speedSliderRequested?: boolean;
}

export const GrandPrixGame: React.FC<GrandPrixGameProps> = ({
  initialSecretCheat,
  onExit,
  speedSliderRequested = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [telemetry, setTelemetry] = useState<GameTelemetry | null>(null);
  const [trackSelectOpen, setTrackSelectOpen] = useState(false);
  const [speedSliderOpen, setSpeedSliderOpen] = useState(speedSliderRequested);
  const [currentTrackId, setCurrentTrackId] = useState<TrackId>('monza');

  useEffect(() => {
    if (speedSliderRequested) {
      setSpeedSliderOpen(true);
    }
  }, [speedSliderRequested]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(
      canvas,
      (t) => {
        setTelemetry({ ...t });
      },
      () => {
        // Triggered by typing 2-4-1-1
        setSpeedSliderOpen(true);
      }
    );

    if (initialSecretCheat) {
      engine.setSecretCheat(true);
    }

    engine.start();
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [initialSecretCheat]);

  const handleRestart = () => {
    engineRef.current?.resetLap();
  };

  const handleToggleCamera = () => {
    engineRef.current?.toggleCamera();
  };

  const handleToggleGhost = () => {
    engineRef.current?.toggleGhost();
  };

  const handleTogglePause = () => {
    engineRef.current?.togglePause();
  };

  const handleToggleAI = () => {
    engineRef.current?.toggleAI();
  };

  const handleSelectTrack = (trackId: TrackId) => {
    setCurrentTrackId(trackId);
    engineRef.current?.switchTrack(trackId);
  };

  const handleApplySpeed = (speedKmh: number) => {
    engineRef.current?.setCustomTopSpeed(speedKmh);
  };

  const handleResetSpeed = () => {
    engineRef.current?.setCustomTopSpeed(null);
  };

  const handleTouchControl = (action: 'up' | 'down' | 'left' | 'right', active: boolean) => {
    engineRef.current?.setControlState(action, active);
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden select-none z-30">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block touch-none" />

      <GameHUD
        telemetry={telemetry}
        onRestart={handleRestart}
        onToggleCamera={handleToggleCamera}
        onToggleGhost={handleToggleGhost}
        onTogglePause={handleTogglePause}
        onToggleAI={handleToggleAI}
        onOpenTrackSelect={() => setTrackSelectOpen(true)}
        onOpenSpeedSlider={() => setSpeedSliderOpen(true)}
        onExitGame={onExit}
        onTouchControl={handleTouchControl}
      />

      <TrackSelectModal
        isOpen={trackSelectOpen}
        currentTrackId={currentTrackId}
        onSelectTrack={handleSelectTrack}
        onClose={() => setTrackSelectOpen(false)}
      />

      <CustomSpeedSliderModal
        isOpen={speedSliderOpen}
        currentTopSpeed={telemetry?.customTopSpeed ?? (initialSecretCheat ? 130 : 120)}
        onApplySpeed={handleApplySpeed}
        onResetDefault={handleResetSpeed}
        onClose={() => setSpeedSliderOpen(false)}
      />
    </div>
  );
};
