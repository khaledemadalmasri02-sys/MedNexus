import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Timer, Send } from "lucide-react";
import { useOSCESessionStore } from "./store";

interface OSCEStationProps {
  attemptId: number;
  stationId: number;
  onStationComplete: () => void;
}

export function OSCEStation({ attemptId, stationId, onStationComplete }: OSCEStationProps) {
  const [messages, setMessages] = useState<Array<{ role: string; content: string; timestamp: number }>>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emotion, setEmotion] = useState("neutral");
  const [trustLevel, setTrustLevel] = useState(50);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { elapsedTime, timerRunning, startTimer, pauseTimer } = useOSCESessionStore();

  useEffect(() => {
    initializeSession();
  }, []);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initializeSession = async () => {
    try {
      const response = await fetch("/api/conversation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, stationId }),
      });

      if (!response.ok) {
        throw new Error("Failed to start session");
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      setMessages([{ role: "patient", content: "Hello, I'm here to see you. Please start asking me questions.", timestamp: Date.now() }]);

      startTimer();
    } catch (error) {
      console.error("Failed to initialize session:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const newMessage = { role: "user", content: inputValue, timestamp: Date.now() };
    setMessages(prev => [...prev, newMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/conversation/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: inputValue }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      const patientMessage = {
        role: "patient",
        content: data.response,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, patientMessage]);
      setEmotion(data.emotion || "neutral");
      setTrustLevel(data.trustLevel || 50);
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages(prev => [...prev, {
        role: "system",
        content: "Sorry, I'm having trouble connecting. Please try again.",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEndStation = async () => {
    if (sessionId) {
      await fetch(`/api/conversation/evaluate/${sessionId}`, { method: "POST" });
      onStationComplete();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getEmotionColor = (emotion: string) => {
    switch (emotion) {
      case "happy": return "bg-green-500";
      case "cooperative": return "bg-blue-500";
      case "frustrated": return "bg-red-500";
      case "anxious": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center justify-between p-4 bg-white border-b shadow-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">OSCE Station</h2>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Timer className="w-4 h-4" />
            <span className="font-mono">{formatTime(elapsedTime)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500">Emotion:</div>
            <div className={`w-3 h-3 rounded-full ${getEmotionColor(emotion)}`} title={emotion} />
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500">Trust:</div>
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${trustLevel}%` }}
              />
            </div>
            <span className="text-xs font-mono">{trustLevel}%</span>
          </div>

          <button
            onClick={timerRunning ? pauseTimer : startTimer}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title={timerRunning ? "Pause" : "Resume"}
          >
            {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={handleEndStation}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            End Station
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              message.role === "user"
                ? "bg-blue-500 text-white"
                : message.role === "system"
                  ? "bg-gray-100 text-gray-600"
                  : "bg-gray-100 text-gray-800"
            }`}>
              <p className="text-sm">{message.content}</p>
              <div className="text-xs opacity-50 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={conversationEndRef} />
      </div>

      <div className="p-4 bg-white border-t">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your response..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}