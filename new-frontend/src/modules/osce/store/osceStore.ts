import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type {
  OsceState,
  OsceStation,
  OsceFilters,
  OsceFeedback,
  OsceProgress,
  ConversationMessage,
  OsceAttempt,
  VoiceState,
} from "../types";

interface OsceStore extends OsceState {
  setStation: (station: OsceStation | null) => void;
  startStation: (station: OsceStation) => void;
  stopStation: () => void;
  addMessage: (message: Omit<ConversationMessage, "id" | "timestamp">) => void;
  clearConversation: () => void;
  updateTimer: (seconds: number) => void;
  setVoiceState: (state: VoiceState) => void;
  setProcessing: (isProcessing: boolean) => void;
  setSpeaking: (isSpeaking: boolean) => void;
  setListening: (isListening: boolean) => void;
  completeStation: (feedback: OsceFeedback) => void;
  updateProgress: (progress: Partial<OsceProgress>) => void;
  setFilters: (filters: Partial<OsceFilters>) => void;
  setAvailableStations: (stations: OsceStation[]) => void;
  loadProgress: () => void;
  resetState: () => void;
}

const createInitialState = (): OsceState => ({
  currentStation: null,
  conversation: [],
  timer: 0,
  isRunning: false,
  isProcessing: false,
  isSpeaking: false,
  isListening: false,
  status: "idle",
  assessment: null,
  progress: {
    totalStationsCompleted: 0,
    averageScore: 0,
    weakAreas: [],
    recentAttempts: [],
    skillMastery: {},
  },
  selectedFilters: {
    specialty: "all",
    type: "all",
    difficulty: "all",
    searchQuery: "",
  },
  availableStations: [],
});

export const useOsceStore = create<OsceStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...createInitialState(),

        setStation: (station) => set({ currentStation: station }),

        startStation: (station) => {
          const duration = station.durationMinutes * 60;
          set({
            currentStation: station,
            timer: duration,
            isRunning: true,
            status: "running",
            conversation: [],
            assessment: null,
          });
        },

        stopStation: () => {
          set({
            currentStation: null,
            timer: 0,
            isRunning: false,
            status: "idle",
            conversation: [],
            assessment: null,
          });
        },

        addMessage: (message) => {
          const newMessage: ConversationMessage = {
            id: crypto.randomUUID(),
            role: message.role,
            content: message.content,
            timestamp: Date.now(),
            audioUrl: message.audioUrl,
          };
          set((state) => ({
            conversation: [...state.conversation, newMessage],
          }));
        },

        clearConversation: () => set({ conversation: [] }),

        updateTimer: (seconds) => set({ timer: seconds }),

        setVoiceState: (voiceState) => {
          set({
            isListening: voiceState === "listening",
            isProcessing: voiceState === "processing",
            isSpeaking: voiceState === "speaking",
            status: voiceState === "listening" ? "listening" : 
                   voiceState === "processing" ? "processing" :
                   voiceState === "speaking" ? "speaking" : get().status,
          });
        },

        setProcessing: (isProcessing) => set({ isProcessing, status: isProcessing ? "processing" : get().status }),

        setSpeaking: (isSpeaking) => set({ isSpeaking, status: isSpeaking ? "speaking" : get().status }),

        setListening: (isListening) => set({ isListening, status: isListening ? "listening" : get().status }),

        completeStation: (feedback) => {
          const { currentStation, progress } = get();
          if (!currentStation) return;

          const newAttempt: OsceAttempt = {
            id: crypto.randomUUID(),
            stationId: currentStation.id,
            stationTitle: currentStation.title,
            score: feedback.overallScore,
            completedAt: new Date().toISOString(),
            durationSeconds: currentStation.durationMinutes * 60 - get().timer,
          };

          const updatedAttempts = [newAttempt, ...progress.recentAttempts].slice(0, 10);
          const newAverage = updatedAttempts.reduce((sum, a) => sum + a.score, 0) / updatedAttempts.length;
          const newWeakAreas = identifyWeakAreas(feedback.competencies);

          set({
            assessment: feedback,
            status: "completed",
            isRunning: false,
            progress: {
              ...progress,
              totalStationsCompleted: progress.totalStationsCompleted + 1,
              averageScore: Math.round(newAverage),
              weakAreas: newWeakAreas,
              recentAttempts: updatedAttempts,
              skillMastery: updateSkillMastery(progress.skillMastery, feedback.competencies),
            },
          });
        },

        updateProgress: (updates) =>
          set((state) => ({
            progress: { ...state.progress, ...updates },
          })),

        setFilters: (filters) =>
          set((state) => ({
            selectedFilters: { ...state.selectedFilters, ...filters },
          })),

        setAvailableStations: (stations) => set({ availableStations: stations }),

        loadProgress: () => {
          const stored = localStorage.getItem("osce-progress");
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              set({ progress: parsed });
            } catch {
              // ignore parse errors
            }
          }
        },

        resetState: () => set(createInitialState()),
      }),
      {
        name: "osce-storage",
        partialize: (state) => ({
          progress: state.progress,
          availableStations: state.availableStations,
          selectedFilters: state.selectedFilters,
        }),
      }
    )
  )
);

function identifyWeakAreas(competencies: OsceFeedback["competencies"]): string[] {
  return competencies
    .filter((c) => c.score / c.maxScore < 0.7)
    .map((c) => c.name);
}

function updateSkillMastery(current: Record<string, number>, competencies: OsceFeedback["competencies"]): Record<string, number> {
  const updated = { ...current };
  competencies.forEach((c) => {
    const currentScore = updated[c.name] || 0;
    const newScore = c.score / c.maxScore;
    updated[c.name] = Math.round((currentScore + newScore) / 2 * 100);
  });
  return updated;
}