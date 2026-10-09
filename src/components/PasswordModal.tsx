import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';

interface PasswordModalProps {
  isOpen: boolean;
  onUnlock: (secretSpeedActive: boolean) => void;
  onClose: () => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({ isOpen, onUnlock, onClose }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = password.trim();

    if (clean.toLowerCase() === 'joeisabitchwasd') {
      // Secret 5% speed bonus unlocked!
      setError(false);
      onUnlock(true);
      setPassword('');
    } else if (clean.toLowerCase() === 'joeisabitch') {
      // Standard unlock
      setError(false);
      onUnlock(false);
      setPassword('');
    } else {
      setError(true);
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className={`relative w-full max-w-md bg-zinc-950/95 border border-white/20 rounded-2xl p-8 shadow-2xl text-center text-white ${
          shaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <Lock className="w-6 h-6 text-white" />
        </div>

        <small className="block text-xs uppercase tracking-[0.25em] text-zinc-400 mb-2">
          Private Access
        </small>
        <h2 className="text-xl font-bold mb-6 font-racing tracking-wide">
          Enter Password to Unlock
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(false);
            }}
            placeholder="Enter password"
            autoFocus
            className="w-full h-12 px-4 rounded-xl border border-white/20 bg-black/50 text-white text-center text-lg tracking-wider outline-none focus:border-white focus:ring-2 focus:ring-white/20 transition-all placeholder:text-zinc-600"
          />

          {error && (
            <p className="text-xs text-red-400 font-medium tracking-wide">
              Incorrect password
            </p>
          )}

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-white/20 hover:bg-white/10 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold text-sm transition-colors"
            >
              Unlock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
