import { useEffect } from 'react';

interface KeyboardShortcuts {
  F1?: () => void;
  F2?: () => void;
  F4?: () => void;
  F8?: () => void;
  Escape?: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key !== 'Escape') return;
      }

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          shortcuts.F1?.();
          break;
        case 'F2':
          e.preventDefault();
          shortcuts.F2?.();
          break;
        case 'F4':
          e.preventDefault();
          shortcuts.F4?.();
          break;
        case 'F8':
          e.preventDefault();
          shortcuts.F8?.();
          break;
        case 'Escape':
          e.preventDefault();
          shortcuts.Escape?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
