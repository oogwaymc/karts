import React, { useState, useEffect } from 'react';
import { HeroScene } from './components/HeroScene';
import { GrandPrixGame } from './components/GrandPrixGame';
import { PasswordModal } from './components/PasswordModal';

export default function App() {
  const [inGame, setInGame] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [secretCheatActive, setSecretCheatActive] = useState(false);
  const [speedSliderRequested, setSpeedSliderRequested] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('jj_game_unlocked');
      if (stored === 'true') {
        setUnlocked(true);
      }
      const cheatStored = sessionStorage.getItem('jj_secret_speed');
      if (cheatStored === 'true') {
        setSecretCheatActive(true);
      }
    } catch (_) {}

    const checkHash = () => {
      const isPortfolio = window.location.hash === '#portfolio';
      if (isPortfolio) {
        const isSessionUnlocked = sessionStorage.getItem('jj_game_unlocked') === 'true';
        if (isSessionUnlocked || unlocked) {
          setInGame(true);
        } else {
          setPasswordModalOpen(true);
        }
      } else {
        setInGame(false);
      }
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, [unlocked]);

  const handleOpenPortfolio = () => {
    if (unlocked) {
      window.location.hash = '#portfolio';
      setInGame(true);
    } else {
      setPasswordModalOpen(true);
    }
  };

  const handleTriggerSpeedSlider = () => {
    // 2-4-1-1 secret sequence clicked!
    setUnlocked(true);
    try {
      sessionStorage.setItem('jj_game_unlocked', 'true');
    } catch (_) {}
    setSpeedSliderRequested(true);
    window.location.hash = '#portfolio';
    setInGame(true);
  };

  const handleUnlock = (cheatActive: boolean) => {
    setUnlocked(true);
    if (cheatActive) {
      setSecretCheatActive(true);
    }
    try {
      sessionStorage.setItem('jj_game_unlocked', 'true');
      if (cheatActive) {
        sessionStorage.setItem('jj_secret_speed', 'true');
      }
    } catch (_) {}

    setPasswordModalOpen(false);
    window.location.hash = '#portfolio';
    setInGame(true);
  };

  const handleExitGame = () => {
    setInGame(false);
    setSpeedSliderRequested(false);
    if (window.location.hash === '#portfolio') {
      history.replaceState('', document.title, window.location.pathname + window.location.search);
    }
  };

  return (
    <div className="w-full min-h-screen bg-black text-white relative overflow-hidden">
      {/* 3D Rotatable Glass Cube Hero Scene with Live Laugh Larp */}
      <HeroScene
        onOpenPortfolio={handleOpenPortfolio}
        onTriggerSpeedSlider={handleTriggerSpeedSlider}
      />

      {/* Password Gate Modal */}
      <PasswordModal
        isOpen={passwordModalOpen}
        onUnlock={handleUnlock}
        onClose={() => setPasswordModalOpen(false)}
      />

      {/* Full-screen Grand Prix Racing Game with AI and Speed Slider */}
      {inGame && (
        <GrandPrixGame
          initialSecretCheat={secretCheatActive}
          onExit={handleExitGame}
          speedSliderRequested={speedSliderRequested}
        />
      )}
    </div>
  );
}
