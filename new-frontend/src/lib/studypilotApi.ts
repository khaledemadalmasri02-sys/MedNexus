// Typed client for StudyPilot endpoints. Reuses the existing apiFetch transport
// (auth, CSRF, retries) from ./api so errors share the same ApiError shape.
import { apiFetch } from "./api";

const BASE = "/studypilot";

export interface StudyPilotModule {
  deckId: number;
  name: string;
  cardCount: number;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
}

export interface StudyPilotIngestModule {
  name: string;
  difficulty: "easy" | "medium" | "hard";
  cardCount: number;
  topics: string[];
}

export interface StudyPilotIngestResult {
  deckIds: number[];
  moduleCount: number;
  cardCount: number;
  usedAi?: boolean;
  partial?: boolean;
  modules: StudyPilotIngestModule[];
}

export interface ScheduleDay {
  dayIndex: number;
  date: string;
  minutes: number;
  cardCount: number;
  moduleNames: string[];
  modules: Array<{ name: string; cardCount: number }>;
}

export interface StudyPilotSchedule {
  dailyMinutes: number;
  deadline: string;
  totalCards: number;
  modules: Array<{ name: string; difficulty: string; cardCount: number; topics: string[] }>;
  days: ScheduleDay[];
}

export interface StudyPilotPlan {
  id: number;
  title: string;
  dailyMinutes: number;
  deadline: string;
  generatedAt: string;
  schedule: StudyPilotSchedule;
  moduleDeckIds: number[];
}

export interface StudyPilotDueCard {
  id: number;
  deckId: number;
  front: string;
  back: string;
  tags?: string | null;
  cardType: string;
  progress: {
    easeFactor: number;
    intervalDays: number;
    repetitions: number;
    nextReviewDate: string;
    knownCount: number;
    unknownCount: number;
  } | null;
}

export interface StudyPilotPlanModule {
  deckId: number;
  name: string;
  difficulty: "easy" | "medium" | "hard";
  cardCount: number;
  cards: Array<{
    id: number;
    front: string;
    back: string;
    tags?: string | null;
    cardType: string;
    aiFront?: string | null;
    aiBack?: string | null;
    aiExplanation?: string | null;
    source?: "ai" | "heuristic" | null;
  }>;
}

export interface StudyPilotPlanCardsResult {
  planTitle: string;
  modules: StudyPilotPlanModule[];
  totalCards: number;
}

export interface StudyPilotDueResult {
  cards: StudyPilotDueCard[];
  total: number;
  dueCount: number;
  newCount: number;
}

export interface StudyPilotProgressResult {
  nextReviewDate: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  masteryPct: number;
}

export interface LibraryDeck {
  id: number;
  name: string;
  description: string | null;
  category: string;
  tags: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  cardCount: number;
}

export interface LibraryCard {
  id: number;
  front: string;
  back: string;
  tags: string | null;
  cardType: string;
  difficulty: "easy" | "medium" | "hard" | null;
  aiFront?: string | null;
  aiBack?: string | null;
  aiExplanation?: string | null;
  source: string;
}

export interface LibraryDeckDetail {
  deck: LibraryDeck;
  cards: LibraryCard[];
}

export interface LibraryListResult {
  decks: LibraryDeck[];
  categories: string[];
}

export interface LibraryCloneResult {
  deckId: number;
  cardCount: number;
}

export const studypilotApi = {
  ingest: (data: { source: "text" | "pdf" | "image"; text: string; title?: string }) =>
    apiFetch<StudyPilotIngestResult>(`${BASE}/ingest`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  plan: (data: { dailyMinutes: number; deadline: string; deckIds?: number[]; title?: string }) =>
    apiFetch<StudyPilotPlan>(`${BASE}/plan`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getPlan: (planId?: number) =>
    apiFetch<{ plan: StudyPilotPlan | null }>(`${BASE}/plan${planId ? `?planId=${planId}` : ""}`),

  getModules: () => apiFetch<{ modules: StudyPilotModule[] }>(`${BASE}/modules`),

  getPlanCards: (planId: number) =>
    apiFetch<StudyPilotPlanCardsResult>(`${BASE}/plan/${planId}/cards`),

  getDue: (planId?: number) =>
    apiFetch<StudyPilotDueResult>(`${BASE}/due${planId ? `?planId=${planId}` : ""}`),

  progress: (cardId: number, quality: number) =>
    apiFetch<StudyPilotProgressResult>(`${BASE}/progress`, {
      method: "POST",
      body: JSON.stringify({ cardId, quality }),
    }),

  getExplanation: (cardId: number) =>
    apiFetch<{ explanation: string; source: "ai" | "heuristic" }>(`${BASE}/explain`, {
      method: "POST",
      body: JSON.stringify({ cardId }),
    }),

  getLibrary: (params?: { category?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set("category", params.category);
    if (params?.q) qs.set("q", params.q);
    const q = qs.toString();
    return apiFetch<LibraryListResult>(`${BASE}/library${q ? `?${q}` : ""}`);
  },

  getLibraryDeck: (id: number) =>
    apiFetch<LibraryDeckDetail>(`${BASE}/library/${id}`),

  cloneLibraryDeck: (id: number) =>
    apiFetch<LibraryCloneResult>(`${BASE}/library/${id}/clone`, {
      method: "POST",
    }),
};
