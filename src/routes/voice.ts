import { Hono } from "hono";
import type { AppEnv } from "../types";
import { getUserId, unauthorized } from "../lib/helpers";
import { createAIService } from "../lib/ai";
import type { Bindings } from "../types";

const voiceRoutes = new Hono<AppEnv>();

interface SpeechToTextResult {
  text: string;
  confidence: number;
  language: string;
}

interface VoiceSession {
  sessionId: string;
  attemptId: number;
  conversation: Array<{ speaker: "student" | "patient"; text: string; timestamp: number }>;
  patientState?: any;
  currentQuestion?: string;
  isSpeaking: boolean;
  lastActivity: number;
}

const voiceSessions = new Map<string, VoiceSession>();

const MEDICAL_SPEECH_CORRECTIONS: Record<string, string> = {
  "myocardial infection": "myocardial infarction",
  "heart attack": "myocardial infarction",
  "angina": "stable angina",
  "chest tightness": "chest pain",
  "pain in my chest": "chest pain",
  "left arm pain": "radiation to left arm",
  "shortness of breath": "dyspnea",
  "difficulty breathing": "dyspnea",
  "high blood pressure": "hypertension",
  "high BP": "hypertension",
  "cholesterol high": "hypercholesterolemia",
  "diabetes type 2": "type 2 diabetes mellitus",
  "diabetes type 1": "type 1 diabetes mellitus",
  "diabetic": "diabetes mellitus",
  "blood sugar high": "hyperglycemia",
  "blood pressure low": "hypotension",
  "pulse slow": "bradycardia",
  "pulse fast": "tachycardia",
  "irregular heartbeat": "arrhythmia",
  "stroke": "cerebrovascular accident",
  "CVA": "cerebrovascular accident",
  "TIA": "transient ischemic attack",
  "mini stroke": "transient ischemic attack",
  "DVT": "deep vein thrombosis",
  "PE": "pulmonary embolism",
  "blood clot": "thrombus",
  "bleeding": "hemorrhage",
  "swelling": "edema",
  "inflamed": "inflammation",
  "cancer": "malignancy",
  "tumor": "mass",
  "fever": "febrile",
  "infection": "sepsis",
};

function correctMedicalSpeech(text: string): string {
  let corrected = text;
  for (const [wrong, correct] of Object.entries(MEDICAL_SPEECH_CORRECTIONS)) {
    const regex = new RegExp(`\\b${wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "gi");
    corrected = corrected.replace(regex, correct);
  }
  return corrected;
}

async function mockWhisperTranscribe(audioBase64: string): Promise<SpeechToTextResult> {
  return {
    text: "",
    confidence: 0.95,
    language: "en",
  };
}

async function mockPiperTts(text: string, voiceConfig?: any): Promise<Blob> {
  const audioBuffer = new ArrayBuffer(44 + text.length * 100);
  return new Blob([audioBuffer], { type: "audio/wav" });
}

voiceRoutes.post("/speech-to-text", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  
  const body = await c.req.json<{ audio: string; sessionId?: string }>();
  const { audio, sessionId } = body;
  
  if (!audio) {
    return c.json({ error: { code: "INVALID_INPUT", message: "Audio data is required" } }, 400);
  }
  
  try {
    let transcript: SpeechToTextResult;
    
    if (sessionId && voiceSessions.has(sessionId)) {
      transcript = await mockWhisperTranscribe(audio);
    } else {
      transcript = await mockWhisperTranscribe(audio);
    }
    
    const correctedText = correctMedicalSpeech(transcript.text);
    
    return c.json({
      text: correctedText,
      originalText: transcript.text,
      confidence: transcript.confidence,
      language: transcript.language,
      corrected: correctedText !== transcript.text,
    });
  } catch (error) {
    return c.json({ 
      error: { 
        code: "TRANSCRIPTION_FAILED", 
        message: error instanceof Error ? error.message : "Speech transcription failed" 
      } 
    }, 500);
  }
});

voiceRoutes.post("/text-to-speech", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  
  const body = await c.req.json<{ text: string; voice?: any; emotion?: string; speed?: number }>();
  const { text, voice, emotion, speed = 1.0 } = body;
  
  if (!text) {
    return c.json({ error: { code: "INVALID_INPUT", message: "Text is required" } }, 400);
  }
  
  try {
    const audioBlob = await mockPiperTts(text, { voice, emotion, speed });
    const audioArray = new Uint8Array(await audioBlob.arrayBuffer());
    const audioBase64 = btoa(String.fromCharCode(...audioArray));
    
    return c.json({
      audio: audioBase64,
      format: "wav",
      duration: text.split(" ").length / 15,
    });
  } catch (error) {
    return c.json({ 
      error: { 
        code: "TTS_FAILED", 
        message: error instanceof Error ? error.message : "Text-to-speech failed" 
      } 
    }, 500);
  }
});

voiceRoutes.post("/voice-session", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  
  const body = await c.req.json<{ attemptId: number; patientProfileId: number; stationInstructions: string }>();
  const { attemptId, patientProfileId, stationInstructions } = body;
  
  if (!attemptId) {
    return c.json({ error: { code: "INVALID_INPUT", message: "attemptId is required" } }, 400);
  }
  
  const sessionId = `voice_${crypto.randomUUID().slice(0, 8)}`;
  
  const session: VoiceSession = {
    sessionId,
    attemptId,
    conversation: [],
    isSpeaking: false,
    lastActivity: Date.now(),
  };
  
  voiceSessions.set(sessionId, session);
  
  return c.json({
    sessionId,
    status: "initialized",
    instructions: stationInstructions,
  });
});

voiceRoutes.post("/voice-session/:sessionId/process", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  
  const sessionId = c.req.param("sessionId");
  const session = voiceSessions.get(sessionId);
  
  if (!session) {
    return c.json({ error: { code: "NOT_FOUND", message: "Voice session not found" } }, 404);
  }
  
  const body = await c.req.json<{ transcript: string; audio?: string }>();
  const { transcript } = body;
  
  session.lastActivity = Date.now();
  session.conversation.push({
    speaker: "student",
    text: transcript,
    timestamp: Date.now(),
  });
  
  try {
    const ai = createAIService(c.env);
    
    const conversationHistory = session.conversation
      .slice(-10)
      .map(msg => ({ role: msg.speaker, content: msg.text }));
    
    const systemPrompt = `You are a standardized patient in a medical OSCE examination.

Your role:
Act as a real patient with realistic emotions and behavior.

Rules:
- Never volunteer diagnosis or hidden medical information
- Only answer questions asked directly
- Do not provide medical explanations
- Maintain consistent history throughout the session
- Show realistic emotions (anxious, worried, frustrated if not treated well)
- Be cooperative if student shows empathy
- Be short/cold if student is rude

Current conversation:
${conversationHistory.map(m => `${m.role}: ${m.content}`).join("\n")}

Respond ONLY as the patient would - in natural, conversational language. Do not explain your reasoning or mention being an AI.`;
    
    const response = await ai.complete([
      { role: "system", content: systemPrompt },
      { role: "user", content: transcript },
    ], { temperature: 0.7, maxTokens: 200 });
    
    const patientResponse = response.trim();
    
    session.conversation.push({
      speaker: "patient",
      text: patientResponse,
      timestamp: Date.now(),
    });
    
    let emotion = "neutral";
    const lowerTranscript = transcript.toLowerCase();
    if (lowerTranscript.includes("sorry") || lowerTranscript.includes("please") || lowerTranscript.includes("thank")) {
      emotion = "cooperative";
    } else if (lowerTranscript.includes("hurry") || lowerTranscript.includes("time") || lowerTranscript.includes("slow")) {
      emotion = "frustrated";
    } else if (lowerTranscript.includes("empathy") || lowerTranscript.includes("understand") || lowerTranscript.includes("concern")) {
      emotion = "cooperative";
    }
    
    session.isSpeaking = true;
    
    const audioResponse = await mockPiperTts(patientResponse, { emotion, speed: 1.0 });
    const audioArray = new Uint8Array(await audioResponse.arrayBuffer());
    const audioBase64 = btoa(String.fromCharCode(...audioArray));
    
    session.isSpeaking = false;
    session.lastActivity = Date.now();
    
    return c.json({
      response: patientResponse,
      audio: audioBase64,
      format: "wav",
      conversation: session.conversation,
      emotion,
    });
  } catch (error) {
    return c.json({ 
      error: { 
        code: "PROCESSING_FAILED", 
        message: error instanceof Error ? error.message : "Failed to process voice input" 
      } 
    }, 500);
  }
});

voiceRoutes.get("/voice-session/:sessionId", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  
  const sessionId = c.req.param("sessionId");
  const session = voiceSessions.get(sessionId);
  
  if (!session) {
    return c.json({ error: { code: "NOT_FOUND", message: "Voice session not found" } }, 404);
  }
  
  return c.json({
    sessionId: session.sessionId,
    conversation: session.conversation,
    isSpeaking: session.isSpeaking,
    lastActivity: session.lastActivity,
    conversationLength: session.conversation.length,
  });
});

voiceRoutes.delete("/voice-session/:sessionId", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  
  const sessionId = c.req.param("sessionId");
  voiceSessions.delete(sessionId);
  
  return c.json({ success: true, message: "Session ended" });
});

voiceRoutes.post("/voice-session/:sessionId/interrupt", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  
  const sessionId = c.req.param("sessionId");
  const session = voiceSessions.get(sessionId);
  
  if (!session) {
    return c.json({ error: { code: "NOT_FOUND", message: "Voice session not found" } }, 404);
  }
  
  session.isSpeaking = false;
  
  return c.json({ success: true, message: "Interrupted" });
});

voiceRoutes.get("/voice-session/:sessionId/audio-history", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  
  const sessionId = c.req.param("sessionId");
  const session = voiceSessions.get(sessionId);
  
  if (!session) {
    return c.json({ error: { code: "NOT_FOUND", message: "Voice session not found" } }, 404);
  }
  
  const audioHistory: Array<{
    speaker: "student" | "patient";
    text: string;
    timestamp: number;
  }> = [];
  
  for (const msg of session.conversation) {
    audioHistory.push({
      speaker: msg.speaker,
      text: msg.text,
      timestamp: msg.timestamp,
    });
  }
  
  return c.json({ audioHistory });
});

voiceRoutes.get("/voice-config", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  
  return c.json({
    whisper: {
      model: "faster-whisper-small",
      language: "en",
      sampleRate: 16000,
    },
    tts: {
      engine: "piper",
      voices: [
        { id: "en_US-amy-low", name: "Amy (Female, Low)", language: "en", gender: "female", age: null },
        { id: "en_US-hienne-medium", name: "Hienne (Female, Medium)", language: "en", gender: "female", age: null },
        { id: "en_US-jason-high", name: "Jason (Male, High)", language: "en", gender: "male", age: null },
        { id: "en_US-karen-medium", name: "Karen (Female, Medium)", language: "en", gender: "female", age: null },
      ],
    },
    vad: {
      silenceThreshold: 0.01,
      silenceDurationMs: 700,
      speechSensitivity: 0.5,
    },
    streaming: {
      chunkSizeMs: 100,
      maxDelayMs: 200,
    },
  });
});

export { voiceRoutes };