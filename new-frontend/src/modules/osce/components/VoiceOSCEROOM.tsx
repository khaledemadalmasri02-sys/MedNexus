import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Volume2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useOsceStore } from "../store/osceStore";
import type { OsceStation } from "../types";

interface VoiceConfiguration {
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

interface VoiceSession {
  sessionId: string;
  attemptId: number;
  conversation: Array<{ speaker: "student" | "patient"; text: string; timestamp: number; audio?: string }>;
  isSpeaking: boolean;
  lastActivity: number;
}

interface VoiceState {
  state: "idle" | "listening" | "processing" | "speaking";
  transcript: string;
  response: string;
  audioPlaying: boolean;
  emotion: string;
  voiceConfig: VoiceConfiguration | null;
  session: VoiceSession | null;
}


function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

interface VoiceOSCEROOMProps {
  station: OsceStation;
  sessionData: {
    sessionId: string;
    instructions: string;
    patientProfile: {
      age?: number;
      gender?: string;
      personality?: string;
      emotionalState?: string;
    };
  };
  onComplete: (feedback: { overallScore: number; status: "Pass" | "Fail" }) => void;
  onCancel?: () => void;
}

export function VoiceOSCEROOM({ station, sessionData, onComplete, onCancel }: VoiceOSCEROOMProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>({
    state: "idle",
    transcript: "",
    response: "",
    audioPlaying: false,
    emotion: "neutral",
    voiceConfig: null,
    session: null,
  });

  const [timer, setTimer] = useState(station.durationMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const { conversation, addMessage, setProcessing, setSpeaking, setListening } = useOsceStore();

  const loadVoiceConfig = useCallback(async () => {
    try {
      const response = await fetch("/api/voice-config", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("auth_token")}` },
      });
      if (response.ok) {
        const config = await response.json();
        setVoiceState(prev => ({ ...prev, voiceConfig: config }));
      }
    } catch (error) {
      console.error("Failed to load voice config:", error);
    }
  }, []);

  useEffect(() => {
    loadVoiceConfig();
  }, [loadVoiceConfig]);

  useEffect(() => {
    if (isRunning && timer > 0) {
      timerRef.current = setTimeout(() => {
        setTimer(prev => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timer, isRunning]);

  const initializeSession = useCallback(async () => {
    try {
      const response = await fetch("/api/voice-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          attemptId: 0,
          patientProfileId: 1,
          stationInstructions: sessionData.instructions,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setVoiceState(prev => ({
          ...prev,
          session: data.sessionId ? {
            sessionId: data.sessionId,
            attemptId: 0,
            conversation: [],
            isSpeaking: false,
            lastActivity: Date.now(),
          } : null,
        }));
      }
    } catch (error) {
      console.error("Failed to initialize voice session:", error);
    }
  }, [sessionData.instructions]);

  useEffect(() => {
    initializeSession();
    setIsRunning(true);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [initializeSession]);

  const startListening = useCallback(async () => {
    if (voiceState.state !== "idle") return;

    setVoiceState(prev => ({ ...prev, state: "listening", transcript: "" }));
    setListening(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioBuffer = await audioBlob.arrayBuffer();
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

        await processAudio(base64Audio);
      };

      mediaRecorderRef.current.start(1000);

      silenceTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
          stream.getTracks().forEach(track => track.stop());
        }
      }, 700);
    } catch (error) {
      console.error("Microphone access denied:", error);
      setVoiceState(prev => ({ ...prev, state: "idle" }));
      setListening(false);
    }
  }, [voiceState.state]);

  const stopListening = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      const stream = mediaRecorderRef.current.stream;
      stream.getTracks().forEach(track => track.stop());
    }
  }, []);

  const processAudio = useCallback(async (audioBase64: string) => {
    if (!voiceState.session?.sessionId) return;

    setVoiceState(prev => ({ ...prev, state: "processing" }));
    setProcessing(true);

    try {
      const response = await fetch("/api/voice-session/" + voiceState.session.sessionId + "/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({ audio: audioBase64 }),
      });

      if (response.ok) {
        const data = await response.json();

        setVoiceState(prev => ({
          ...prev,
          state: "speaking",
          response: data.response,
          emotion: data.emotion || "neutral",
        }));

        setSpeaking(true);
        addMessage({ role: "student", content: data.response });

        if (audioRef.current) {
          audioRef.current.src = "data:audio/wav;base64," + data.audio;
          audioRef.current.play();
        }
      }
    } catch (error) {
      console.error("Failed to process audio:", error);
    } finally {
      setVoiceState(prev => ({ ...prev, state: "idle" }));
      setProcessing(false);
      setSpeaking(false);
    }
  }, [voiceState.session?.sessionId, addMessage, setProcessing, setSpeaking]);

  const handleAudioEnd = useCallback(() => {
    setVoiceState(prev => ({ ...prev, state: "idle", audioPlaying: false }));
    setSpeaking(false);
  }, []);

  const handleComplete = useCallback(() => {
    setIsRunning(false);
    onComplete({
      overallScore: 85,
      status: "Pass",
    });
  }, [onComplete]);

  const handleCancel = useCallback(() => {
    setIsRunning(false);
    if (onCancel) onCancel();
  }, [onCancel]);

  const getEmotionDisplay = (emotion: string) => {
    const emotions: Record<string, { label: string; emoji: string; color: string }> = {
      neutral: { label: "Neutral", emoji: "😐", color: "bg-gray-500" },
      happy: { label: "Happy", emoji: "😊", color: "bg-green-500" },
      concerned: { label: "Concerned", emoji: "😟", color: "bg-blue-500" },
      worried: { label: "Worried", emoji: "😰", color: "bg-yellow-500" },
      anxious: { label: "Anxious", emoji: "😰", color: "bg-orange-500" },
      frustrated: { label: "Frustrated", emoji: "😠", color: "bg-red-500" },
      cooperative: { label: "Cooperative", emoji: "🙂", color: "bg-emerald-500" },
    };
    return emotions[emotion] || emotions.neutral;
  };

  const statusDisplay = () => {
    switch (voiceState.state) {
      case "listening":
        return (
          <div className="flex items-center gap-2 text-red-500">
            <Mic className="w-5 h-5 animate-pulse" />
            <span>Listening...</span>
          </div>
        );
      case "processing":
        return (
          <div className="flex items-center gap-2 text-yellow-500">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Processing...</span>
          </div>
        );
      case "speaking":
        return (
          <div className="flex items-center gap-2 text-blue-500">
            <Volume2 className="w-5 h-5" />
            <span>Patient speaking...</span>
          </div>
        );
      default:
        return null;
    }
  };

  const elapsedTime = station.durationMinutes * 60 - timer;
  const isExpired = timer <= 0;

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{station.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{station.specialty} • Voice OSCE</p>
          </div>
          
          <div className="flex items-center gap-4">
            {statusDisplay()}
            
            {isExpired && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="hidden md:flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg"
              >
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">Time expired</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getEmotionDisplay(voiceState.emotion).color} text-white text-2xl`}>
            {getEmotionDisplay(voiceState.emotion).emoji}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              Patient: {getEmotionDisplay(voiceState.emotion).label}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Age: {sessionData.patientProfile.age || "N/A"} • {sessionData.patientProfile.gender || "N/A"}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatDuration(timer)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {elapsedTime} elapsed
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {conversation.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="mb-4">
                <Volume2 className="w-12 h-12 text-gray-400 mx-auto" />
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
                Hello Doctor, what can I help you with?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {sessionData.instructions}
              </p>
            </motion.div>
          )}

          {conversation.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {msg.role === "student" ? "S" : "P"}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <div className={`rounded-lg px-4 py-3 ${
                  msg.role === "student"
                    ? "bg-blue-100 dark:bg-blue-900/20 ml-auto max-w-[80%]"
                    : "bg-gray-100 dark:bg-gray-800 mr-auto max-w-[80%]"
                }`}>
                  <p className="text-gray-900 dark:text-white">{msg.content}</p>
                </div>
                <span className="text-xs text-gray-400 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </motion.div>
          ))}

          {voiceState.transcript && voiceState.state === "listening" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center"
            >
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3 max-w-[80%]">
                <p className="text-gray-600 dark:text-gray-400 text-sm">{voiceState.transcript}</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {voiceState.state === "listening" 
              ? "Speak clearly into the microphone" 
              : "Hold to speak your response"
            }
          </div>
          {voiceState.emotion !== "neutral" && (
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
              <span className="text-xs text-gray-600 dark:text-gray-400">Emotion:</span>
              <span className="text-xs font-medium text-gray-900 dark:text-white">{voiceState.emotion}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={voiceState.state === "listening" ? stopListening : startListening}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all ${
              voiceState.state === "listening"
                ? "bg-red-500 animate-pulse"
                : voiceState.state === "processing"
                  ? "bg-yellow-500"
                  : voiceState.state === "speaking"
                    ? "bg-blue-500"
                    : "bg-green-500 hover:shadow-lg"
            }`}
          >
            {voiceState.state === "listening" ? (
              <MicOff className="w-6 h-6" />
            ) : voiceState.state === "processing" ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>

          <div className="flex-1">
            <audio
              ref={audioRef}
              onEnded={handleAudioEnd}
              className="hidden"
            />
          </div>

          <button
            onClick={handleComplete}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <CheckCircle className="w-5 h-5 inline mr-1" />
            Complete
          </button>

          {onCancel && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="mt-3 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Voice conversation mode • Hold mic to speak
          </p>
        </div>
      </div>
    </div>
  );
}