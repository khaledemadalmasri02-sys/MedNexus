export type Specialty = 
  | "Internal Medicine"
  | "Surgery"
  | "Pediatrics"
  | "Obstetrics"
  | "Psychiatry"
  | "Emergency Medicine"
  | "Cardiology"
  | "Neurology"
  | "Gastroenterology"
  | "Endocrinology"
  | "Respiratory Medicine"
  | "Oncology"
  | "Rheumatology"
  | "Infectious Disease"
  | "Geriatrics"
  | "Ophthalmology"
  | "ENT"
  | "Orthopedics"
  | "Urology"
  | "Nephrology";

export type StationType = 
  | "History"
  | "Examination"
  | "Counseling"
  | "Communication"
  | "Interpretation"
  | "Emergency";

export type Difficulty = "Beginner" | "Intermediate" | "Advanced" | "Residency level";

export interface OsceStation {
  id: string | number;
  title: string;
  specialty: Specialty;
  subspecialty?: string;
  type: StationType;
  difficulty: Difficulty;
  difficultyLevel: number;
  durationMinutes: number;
  skills: string[];
  description?: string;
  tags?: string[];
  status?: "draft" | "published" | "archived";
  isPublic?: boolean;
}

export interface DifficultyFactorsInput {
  patientComplexity: number;
  communicationDifficulty: number;
  timePressure: number;
  clinicalReasoning: number;
}

export interface StationGenerationRequest {
  topic: string;
  studentLevel: "beginner" | "intermediate" | "advanced" | "residency";
  stationType: "history" | "examination" | "counseling" | "communication" | "interpretation" | "emergency";
  specialtyId: number;
  subspecialty?: string;
}

export interface ConversationMessage {
  id: string;
  role: "student" | "patient";
  content: string;
  timestamp: number;
  audioUrl?: string;
}

export interface AssessmentItem {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  feedback: string;
  missed: boolean;
}

export interface ExaminationAction {
  id: string;
  type: "ask" | "examine" | "investigate" | "request";
  description: string;
  response?: string;
  timestamp: number;
}

export interface OsceFeedback {
  overallScore: number;
  status: "Pass" | "Fail";
  competencies: AssessmentItem[];
  missedPoints: string[];
  modelAnswer: string[];
  recommendations: OsceRecommendation[];
}

export interface OsceRecommendation {
  stationId: string;
  stationTitle: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

export interface OsceProgress {
  totalStationsCompleted: number;
  averageScore: number;
  weakAreas: string[];
  recentAttempts: OsceAttempt[];
  skillMastery: Record<string, number>;
}

export interface OsceAttempt {
  id: string;
  stationId: string | number;
  stationTitle: string;
  score: number;
  completedAt: string;
  durationSeconds: number;
}

export interface OsceState {
  currentStation: OsceStation | null;
  conversation: ConversationMessage[];
  timer: number;
  isRunning: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  status: "idle" | "preparing" | "running" | "processing" | "speaking" | "completed" | "listening";
  assessment: OsceFeedback | null;
  progress: OsceProgress;
  selectedFilters: OsceFilters;
  availableStations: OsceStation[];
}

export interface OsceFilters {
  specialty: Specialty | "all";
  type: StationType | "all";
  difficulty: Difficulty | "all";
  searchQuery: string;
}

export type VoiceState = "idle" | "listening" | "processing" | "speaking";

export interface VoiceTranscription {
  text: string;
  isFinal: boolean;
  confidence?: number;
}

export interface PatientResponse {
  text: string;
  audioUrl?: string;
  shouldSpeak: boolean;
}

export interface TimerWarning {
  time: number;
  shouldWarn: boolean;
  isExpired: boolean;
}

export interface StationCardProps {
  station: OsceStation;
  onStart: (station: OsceStation) => void;
}

export interface ExaminationRoomProps {
  station: OsceStation;
  onStationComplete: (feedback: OsceFeedback) => void;
}

export interface StationLibraryProps {
  stations: OsceStation[];
  filters: OsceFilters;
  onFilterChange: (filters: OsceFilters) => void;
  onSelectStation: (station: OsceStation) => void;
}

export interface DashboardProps {
  progress: OsceProgress;
  onContinuePractice: (station: OsceStation) => void;
  onNavigate: (path: string) => void;
}

export interface FeedbackDashboardProps {
  feedback: OsceFeedback;
  station: OsceStation;
}

export interface PerformanceDashboardProps {
  progress: OsceProgress;
}

export interface PatientAvatarProps {
  emotion?: "neutral" | "happy" | "concerned" | "pained" | "anxious";
  isSpeaking?: boolean;
  isListening?: boolean;
  size?: "small" | "medium" | "large";
  style?: "2d" | "3d";
}

export interface TimerDisplayProps {
  remainingSeconds: number;
  totalSeconds: number;
  showWarning?: boolean;
}

export interface VoiceConfiguration {
  whisper: {
    model: string;
    language: string;
    sampleRate: number;
  };
  tts: {
    engine: string;
    voices: Array<{
      id: string;
      name: string;
      language: string;
      gender: string | null;
      age: number | null;
    }>;
  };
  vad: {
    silenceThreshold: number;
    silenceDurationMs: number;
    speechSensitivity: number;
  };
  streaming: {
    chunkSizeMs: number;
    maxDelayMs: number;
  };
}

export interface VoiceSession {
  sessionId: string;
  attemptId: number;
  conversation: Array<{ speaker: "student" | "patient"; text: string; timestamp: number; audio?: string }>;
  isSpeaking: boolean;
  lastActivity: number;
}

export interface VoiceTranscriptionResult {
  text: string;
  confidence: number;
  language: string;
}

export interface VoiceTtsResult {
  audio: string;
  format: string;
  duration: number;
}

export interface SpeechToTextResponse {
  text: string;
  originalText: string;
  confidence: number;
  language: string;
  corrected: boolean;
}

export interface TextToSpeechRequest {
  text: string;
  voice?: any;
  emotion?: string;
  speed?: number;
}

export interface VoiceSessionResponse {
  sessionId: string;
  status: string;
  instructions: string;
}

export interface VoiceProcessResponse {
  response: string;
  audio: string;
  format: string;
  conversation: Array<{ speaker: "student" | "patient"; text: string; timestamp: number }>;
  emotion: string;
}

export interface EmotionVoiceParams {
  speed: number;
  pitch: number;
  volume: number;
}