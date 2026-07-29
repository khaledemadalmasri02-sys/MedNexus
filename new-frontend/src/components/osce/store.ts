import { create } from "zustand";

interface OSCESessionState {
  duration: number;
  startTime: number;
  elapsedTime: number;
  timerRunning: boolean;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  setDuration: (duration: number) => void;
  tick: () => void;
}

export const useOSCESessionStore = create<OSCESessionState>((set, get) => ({
  duration: 480,
  startTime: 0,
  elapsedTime: 0,
  timerRunning: false,

  startTimer: () => {
    const { startTime, timerRunning } = get();
    if (!timerRunning) {
      set({
        timerRunning: true,
        startTime: startTime || Date.now(),
      });
    }
  },

  pauseTimer: () => {
    const { startTime, elapsedTime } = get();
    if (startTime > 0) {
      set({
        timerRunning: false,
        elapsedTime: elapsedTime + Math.floor((Date.now() - startTime) / 1000),
      });
    }
  },

  resetTimer: () => {
    set({
      startTime: 0,
      elapsedTime: 0,
      timerRunning: false,
    });
  },

  setDuration: (duration: number) => {
    set({ duration });
  },

  tick: () => {
    const { timerRunning, startTime, elapsedTime } = get();
    if (timerRunning && startTime > 0) {
      const newElapsed = elapsedTime + Math.floor((Date.now() - startTime) / 1000);
      set({ elapsedTime: newElapsed });
    }
  },
}));