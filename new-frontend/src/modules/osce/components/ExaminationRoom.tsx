import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, Volume2, CheckCircle, AlertCircle } from "lucide-react";
import { useOsceStore } from "../store/osceStore";
import type { OsceStation, OsceFeedback } from "../types";

interface ExaminationRoomProps {
  station: OsceStation;
  onComplete: (feedback: OsceFeedback) => void;
}

function TimerDisplay({ remaining, shouldWarn }: { remaining: number; shouldWarn: boolean }) {
  
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <motion.div 
          className={`w-16 h-16 rounded-full flex items-center justify-center ${
            shouldWarn ? "bg-red-500 animate-pulse" : "bg-[var(--accent-primary)]"
          }`}
          animate={{ scale: remaining <= 30 ? 1.1 : 1 }}
        >
          <span className="text-white font-bold text-lg">
            {Math.floor(remaining / 60)}:{String(Math.floor(remaining % 60)).padStart(2, "0")}
          </span>
        </motion.div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
          <CheckCircle className="w-3 h-3 text-white" />
        </div>
      </div>
      
      {shouldWarn && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden md:flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg"
        >
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm font-medium text-red-700 dark:text-red-300">Time remaining</span>
        </motion.div>
      )}
    </div>
  );
}

function PatientAvatar({ isSpeaking, emotion = "neutral" }: { isSpeaking?: boolean; emotion?: string }) {
  const expressions = {
    neutral: "😐",
    happy: "😊",
    concerned: "😟",
    pained: "😣",
    anxious: "😰",
  };

  return (
    <div className="relative inline-block">
      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center border-4 border-white shadow-lg">
        <span className="text-4xl">{expressions[emotion as keyof typeof expressions]}</span>
      </div>
      
      {isSpeaking && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="absolute -bottom-2 -left-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center"
        >
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="text-white text-xs"
          >
            🔊
          </motion.span>
        </motion.div>
      )}
    </div>
  );
}

function ConversationMessage({ message }: { message: { role: "student" | "patient"; content: string; timestamp: number } }) {
  const isStudent = message.role === "student";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 mb-4"
    >
      <div className="flex-shrink-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isStudent 
            ? "bg-[var(--accent-primary)]" 
            : "bg-blue-100 dark:bg-blue-900/30"
        }`}>
          <span className="text-xs font-bold text-white">
            {isStudent ? "S" : "P"}
          </span>
        </div>
      </div>
      
      <div className="flex-1">
        <div className={`rounded-lg px-4 py-3 ${
          isStudent
            ? "bg-[var(--accent-primary)]/10 ml-auto max-w-[80%]"
            : "bg-gray-100 dark:bg-gray-800 mr-auto max-w-[80%]"
        }`}>
          <p className="text-[var(--text-primary)]">{message.content}</p>
        </div>
        <span className="text-xs text-gray-400 mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </motion.div>
  );
}

function VoiceButton({ 
  isListening, 
  isProcessing, 
  isSpeaking, 
  onClick 
}: { 
  isListening: boolean; 
  isProcessing: boolean; 
  isSpeaking: boolean; 
  onClick: () => void; 
}) {
  
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
        isListening 
          ? "bg-red-500 animate-pulse" 
          : isProcessing 
            ? "bg-yellow-500" 
            : isSpeaking 
              ? "bg-blue-500" 
              : "bg-[var(--accent-primary)] hover:shadow-lg"
      }`}
    >
      {isListening ? (
        <motion.span 
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-white text-2xl"
        >
          ⏹
        </motion.span>
      ) : isProcessing ? (
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : isSpeaking ? (
        <Volume2 className="w-6 h-6 text-white" />
      ) : (
        <Mic className="w-6 h-6 text-white" />
      )}
    </motion.button>
  );
}

export function ExaminationRoom({ station, onComplete }: ExaminationRoomProps) {
  const {
    conversation,
    timer,
    isProcessing,
    isSpeaking,
    isListening,
    addMessage,
    updateTimer,
    setProcessing,
    setSpeaking,
    setListening,
  } = useOsceStore();
  
  const [inputText, setInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);

  const shouldWarn = timer <= 120 && timer > 0;

  useEffect(() => {
    if (timer > 0 && !timerRef.current) {
      timerRef.current = window.setInterval(() => {
        updateTimer(Math.max(0, timer - 1));
      }, 1000);
    } else if (timer <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      handleComplete();
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timer, updateTimer]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const handleVoiceInput = useCallback(() => {
    if (isListening) {
      setListening(false);
      return;
    }
    
    setListening(true);
    setTimeout(() => {
      const mockInput = "I would like to examine your chest and ask about your symptoms.";
      handleSend(mockInput);
    }, 1000);
  }, [isListening, setListening]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    setListening(false);
    setProcessing(true);

    addMessage({ role: "student", content: text });
    setInputText("");

    await new Promise(resolve => setTimeout(resolve, 500));

    const responses: Record<string, string> = {
      "what brought you here": "I've been having chest pain for the past 3 days.",
      "examine": "Heart sounds are normal. No murmurs or gallops. Lungs are clear.",
      "ecg": "Here's your ECG. What do you notice?",
      "medication": "I take aspirin daily for prevention.",
    };

    const lowerText = text.toLowerCase();
    let response = "Can you tell me more about your symptoms?";
    
    for (const [key, value] of Object.entries(responses)) {
      if (lowerText.includes(key)) {
        response = value;
        break;
      }
    }

    setSpeaking(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    addMessage({ role: "patient", content: response });
    setSpeaking(false);
    setProcessing(false);
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSend(inputText);
  };

  const handleComplete = async () => {
    const mockFeedback: OsceFeedback = {
      overallScore: 82,
      status: "Pass",
      competencies: [],
      missedPoints: [],
      modelAnswer: ["Complete history and examination performed"],
      recommendations: [],
    };
    onComplete(mockFeedback);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{station.title}</h2>
          <p className="text-sm text-[var(--text-secondary)]">{station.specialty} • {station.type}</p>
        </div>
        
        <TimerDisplay remaining={timer} shouldWarn={shouldWarn} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-6">
            <PatientAvatar isSpeaking={isSpeaking} />
          </div>

          <AnimatePresence>
            {conversation.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <p className="text-lg text-gray-500 dark:text-gray-400 mb-4">
                  Hello doctor, what can I help you with?
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
          
          {conversation.map((message, index) => (
            <ConversationMessage key={index} message={message} />
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <VoiceButton
            isListening={isListening}
            isProcessing={isProcessing}
            isSpeaking={isSpeaking}
            onClick={handleVoiceInput}
          />
          
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your response or hold the mic..."
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent bg-white dark:bg-gray-900"
              disabled={isProcessing || isSpeaking}
            />
          </div>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!inputText.trim() || isProcessing || isSpeaking}
            className="px-6 py-3 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
        
        <div className="mt-2 text-xs text-gray-400 text-center">
          Hold mic to speak • Voice input disabled in this preview
        </div>
      </form>
    </div>
  );
}