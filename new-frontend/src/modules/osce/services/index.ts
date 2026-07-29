import { apiFetch } from "../../../lib/api";
import type {
  OsceStation,
  OsceFeedback,
  OsceProgress,
  ConversationMessage,
} from "../types";

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionApi;
    webkitSpeechRecognition: new () => SpeechRecognitionApi;
  }
}

interface SpeechRecognitionApi {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  error?: string;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export const osceApi = {
  getStations: (filters?: Partial<{
    specialty: string;
    type: string;
    difficulty: string;
    searchQuery: string;
  }>) => {
    const params = new URLSearchParams();
    if (filters?.specialty && filters.specialty !== "all") params.append("specialty", filters.specialty);
    if (filters?.type && filters.type !== "all") params.append("type", filters.type);
    if (filters?.difficulty && filters.difficulty !== "all") params.append("difficulty", filters.difficulty);
    if (filters?.searchQuery) params.append("search", filters.searchQuery);
    
    return apiFetch<OsceStation[]>(`/osce/stations?${params.toString()}`);
  },

  getStation: (id: string) => apiFetch<OsceStation>(`/osce/stations/${id}`),

  getProgress: () => apiFetch<OsceProgress>("/osce/progress"),

  startExamination: (stationId: string) =>
    apiFetch<{ sessionId: string }>("/osce/exam/start", {
      method: "POST",
      body: JSON.stringify({ stationId }),
    }),

  submitStudentInput: (sessionId: string, input: { text: string; audioUrl?: string }) =>
    apiFetch<{ response: string; audioUrl?: string }>("/osce/exam/input", {
      method: "POST",
      body: JSON.stringify({ sessionId, ...input }),
    }),

  endExamination: (sessionId: string) =>
    apiFetch<OsceFeedback>("/osce/exam/end", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    }),

  generateFeedback: (sessionId: string) =>
    apiFetch<OsceFeedback>(`/osce/exam/${sessionId}/feedback`),

  getRecommendations: () => apiFetch<OsceProgress["weakAreas"]>("/osce/recommendations"),
};

export class VoiceService {
  private recognition: SpeechRecognitionApi | null = null;
  private synthesis: SpeechSynthesis;
  private onTranscript: ((text: string, isFinal: boolean) => void) | null = null;
  private onError: ((error: Error) => void) | null = null;
  private isContinuous: boolean = false;
  private isListening: boolean = false;

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initializeRecognition();
  }

  private initializeRecognition(): void {
    const SpeechRecognitionAPI = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      this.recognition = new SpeechRecognitionAPI();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult) {
          const text = lastResult[0].transcript.trim();
          const isFinal = lastResult.isFinal;
          if (this.onTranscript) {
            this.onTranscript(text, isFinal);
          }
          if (isFinal && this.isContinuous) {
            this.restartRecognition();
          }
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const error = new Error(`Speech recognition error: ${event.error}`);
        if (this.onError) this.onError(error);
        if (this.isListening) this.stopListening();
      };

      this.recognition.onend = () => {
        if (this.isListening && this.isContinuous) {
          this.restartRecognition();
        }
      };
    }
  }

  private restartRecognition(): void {
    if (this.isListening && this.recognition) {
      try {
        this.recognition.start();
      } catch {
        // Recognition might already be started
      }
    }
  }

  startListening(onTranscript: (text: string, isFinal: boolean) => void, options?: { continuous?: boolean }): void {
    if (!this.recognition || this.isListening) return;

    this.onTranscript = onTranscript;
    this.isListening = true;
    this.isContinuous = options?.continuous ?? false;

    if (this.recognition) {
      this.recognition.continuous = this.isContinuous;
      this.recognition.start();
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.isContinuous = false;
    }
  }

  speak(text: string, options?: { voice?: string; rate?: number; pitch?: number; volume?: number }): void {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    const voices = this.synthesis.getVoices();
    if (options?.voice) {
      const selectedVoice = voices.find(v => v.name.includes(options!.voice!) || v.lang.includes(options!.voice!));
      if (selectedVoice) utterance.voice = selectedVoice;
    }
    
    utterance.rate = options?.rate ?? 1;
    utterance.pitch = options?.pitch ?? 1;
    utterance.volume = options?.volume ?? 1;

    this.synthesis.speak(utterance);
  }

  isSupported(): boolean {
    return "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.synthesis.getVoices();
  }

  cancelSpeaking(): void {
    this.synthesis.cancel();
  }
}

export class TimerService {
  private intervalId: number | null = null;
  private startTime: number = 0;
  private duration: number = 0;
  private onTick: ((remaining: number) => void) | null = null;
  private onExpire: (() => void) | null = null;
  private warningThreshold: number = 120;
  private hasWarned: boolean = false;

  start(durationSeconds: number, onTick: (remaining: number) => void, onExpire: () => void, warningSeconds: number = 120): void {
    this.stop();
    
    this.duration = durationSeconds;
    this.startTime = Date.now();
    this.onTick = onTick;
    this.onExpire = onExpire;
    this.warningThreshold = warningSeconds;
    this.hasWarned = false;

    const initialTick = () => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const remaining = Math.max(0, this.duration - elapsed);
      if (this.onTick) this.onTick(remaining);
    };

    initialTick();

    this.intervalId = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const remaining = Math.max(0, this.duration - elapsed);

      if (this.onTick) this.onTick(remaining);

      if (remaining <= 0) {
        this.stop();
        if (this.onExpire) this.onExpire();
      } else if (remaining <= this.warningThreshold && !this.hasWarned) {
        this.hasWarned = true;
      }
    }, 1000);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  pause(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  resume(): void {
    if (!this.intervalId) {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const remaining = Math.max(0, this.duration - elapsed);
      if (remaining > 0 && this.onTick) {
        this.onTick(remaining);
        this.start(remaining, this.onTick!, this.onExpire!);
      }
    }
  }

  getRemaining(): number {
    if (!this.intervalId) return 0;
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    return Math.max(0, this.duration - elapsed);
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
}

export class ConversationService {
  private sessionId: string | null = null;
  private messages: ConversationMessage[] = [];
  private onConversationUpdate: ((messages: ConversationMessage[]) => void) | null = null;

  async startSession(stationId: string): Promise<string> {
    const response = await osceApi.startExamination(stationId);
    this.sessionId = response.sessionId;
    this.messages = [];
    return this.sessionId;
  }

  async submitInput(text: string, audioUrl?: string): Promise<string> {
    if (!this.sessionId) throw new Error("No active session");

    const response = await osceApi.submitStudentInput(this.sessionId, { text, audioUrl });
    
    const studentMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: "student",
      content: text,
      timestamp: Date.now(),
      audioUrl,
    };

    const patientMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: "patient",
      content: response.response,
      timestamp: Date.now(),
      audioUrl: response.audioUrl,
    };

    this.messages = [...this.messages, studentMessage, patientMessage];
    
    if (this.onConversationUpdate) {
      this.onConversationUpdate(this.messages);
    }

    return response.response;
  }

  async endSession(): Promise<OsceFeedback> {
    if (!this.sessionId) throw new Error("No active session");
    
    const feedback = await osceApi.endExamination(this.sessionId);
    this.sessionId = null;
    return feedback;
  }

  setConversationListener(listener: (messages: ConversationMessage[]) => void): void {
    this.onConversationUpdate = listener;
  }

  getMessages(): ConversationMessage[] {
    return [...this.messages];
  }

  clearSession(): void {
    this.sessionId = null;
    this.messages = [];
  }
}

export const voiceService = new VoiceService();
export const timerService = new TimerService();
export const conversationService = new ConversationService();