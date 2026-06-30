/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Volume2, SkipForward, HelpCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import * as api from "../lib/api";

interface Card {
  id: number;
  front: string;
  back: string;
}

export default function VoiceStudyPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState<api.VoiceCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [questionSpoken, setQuestionSpoken] = useState(false);
  const recognitionRef = useRef<any>(null);

  const loadCards = useCallback(async () => {
    try {
      const result = await api.agentsApi.smartReview(undefined, 10);
      setCards(result.cards);
    } catch {
      setCards([]);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const speakQuestion = useCallback(() => {
    if (cards.length === 0) return;
    const card = cards[currentIndex];
    if (!card) return;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(card.front);
      utterance.rate = 0.9;
      utterance.onend = () => setQuestionSpoken(true);
      window.speechSynthesis.speak(utterance);
    }
  }, [cards, currentIndex]);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join("");
      setTranscript(transcript);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setTranscript("");
    setFeedback(null);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setListening(false);
  }, []);

  const checkAnswer = async () => {
    if (!transcript.trim() || cards.length === 0) return;
    setChecking(true);
    try {
      const card = cards[currentIndex];
      const res = await api.agentsApi.voiceCheck(card.front, card.back, transcript);
      setFeedback(res);
    } catch { /* ignore */ }
    setChecking(false);
  };

  const nextCard = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setTranscript("");
      setFeedback(null);
      setQuestionSpoken(false);
    }
  };

  const handleCommand = (cmd: string) => {
    const lower = cmd.toLowerCase();
    if (lower.includes("repeat") || lower.includes("again")) {
      speakQuestion();
    } else if (lower.includes("next") || lower.includes("skip")) {
      nextCard();
    } else if (lower.includes("explain") || lower.includes("answer") || lower.includes("don't know") || lower.includes("i don't know")) {
      if (cards[currentIndex]) {
        setFeedback({ correct: false, feedback: `The answer is: ${cards[currentIndex].back}`, keyPoints: [], score: 0 });
      }
    } else {
      checkAnswer();
    }
  };

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Mic className="w-12 h-12 text-text-secondary mb-4" />
        <p className="text-text-secondary">No cards available for voice study</p>
        <button onClick={loadCards} className="mt-4 px-4 py-2 rounded-xl text-sm text-accent-purple">Retry</button>
      </div>
    );
  }

  const card = cards[currentIndex];
  if (!card) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #14B8A6, #0D9488)" }}>
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-primary">Voice Tutor</h1>
              <p className="text-xs text-text-secondary">Card {currentIndex + 1} of {cards.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!questionSpoken && (
              <button onClick={speakQuestion} className="p-2 rounded-lg text-accent-cyan hover:bg-accent-cyan/10 transition-colors">
                <Volume2 className="w-5 h-5" />
              </button>
            )}
            <button onClick={nextCard} disabled={currentIndex >= cards.length - 1} className="p-2 rounded-lg text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors">
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>

        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-8 rounded-2xl mb-8 text-center min-h-[200px] flex flex-col items-center justify-center"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
        >
          <p className="text-xl text-text-primary font-medium leading-relaxed">{card.front}</p>
        </motion.div>

        <div className="flex flex-col items-center gap-4 mb-8">
          <motion.button
            onClick={listening ? stopListening : startListening}
            className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg ${listening ? "animate-pulse" : ""}`}
            style={{ background: listening ? "linear-gradient(135deg, #EF4444, #DC2626)" : "linear-gradient(135deg, #14B8A6, #0D9488)" }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {listening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </motion.button>
          <p className="text-sm text-text-secondary">
            {listening ? "Listening... Speak your answer" : "Tap to speak your answer"}
          </p>
        </div>

        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl mb-4"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
          >
            <p className="text-xs text-text-secondary mb-1">Your answer:</p>
            <p className="text-sm text-text-primary">{transcript}</p>
            {!feedback && (
              <button
                onClick={() => handleCommand(transcript)}
                disabled={checking}
                className="mt-3 px-4 py-2 rounded-lg text-white text-sm font-medium inline-flex items-center gap-2"
                style={{ background: "linear-gradient(135deg, #14B8A6, #0D9488)" }}
              >
                {checking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Check Answer
              </button>
            )}
          </motion.div>
        )}

        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl mb-4"
            style={{
              background: feedback.correct ? "rgba(34, 197, 94, 0.05)" : "rgba(239, 68, 68, 0.05)",
              border: `1px solid ${feedback.correct ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              {feedback.correct ? (
                <CheckCircle2 className="w-5 h-5 text-accent-green" />
              ) : (
                <HelpCircle className="w-5 h-5 text-amber-400" />
              )}
              <span className={`font-semibold ${feedback.correct ? "text-accent-green" : "text-amber-400"}`}>
                {feedback.correct ? "Correct!" : "Not quite"}
              </span>
              <span className="text-xs text-text-secondary ml-auto">Score: {feedback.score}/100</span>
            </div>
            <p className="text-sm text-text-secondary mb-3">{feedback.feedback}</p>
            {feedback.keyPoints.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-text-secondary font-medium">Key Points:</p>
                {feedback.keyPoints.map((kp, i) => (
                  <p key={i} className="text-sm text-text-secondary">• {kp}</p>
                ))}
              </div>
            )}
          </motion.div>
        )}

        <div className="text-center">
          <p className="text-xs text-text-secondary">
            Voice commands: "Next", "Repeat", "Explain", "I don't know"
          </p>
        </div>
      </motion.div>
    </div>
  );
}
