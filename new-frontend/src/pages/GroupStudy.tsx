/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Plus, LogIn, Loader2, Play, Crown, Copy, Check } from "lucide-react";
import * as api from "../lib/api";

type RoomMode = "lobby" | "waiting" | "active" | "summary";

export default function GroupStudyPage() {
  const [mode, setMode] = useState<RoomMode>("lobby");
  const [roomId, setRoomId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState<api.GroupStudyRoom | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const createRoom = async () => {
    setLoading(true);
    try {
      const decks = await (api.decksApi as any).getDecks();
      const deckIds = decks.map((d: any) => d.id).slice(0, 3);
      const res = await api.agentsApi.createGroupRoom(deckIds);
      setRoom(res.room);
      setRoomId(res.room.id);
      setMode("waiting");
    } catch (err: any) {
      console.error(err);
    }
    setLoading(false);
  };

  const joinRoom = async () => {
    if (!joinCode.trim()) return;
    setLoading(true);
    try {
      const res = await api.agentsApi.joinGroupRoom(joinCode.trim());
      setRoom(res.room);
      setRoomId(res.room.id);
      setMode(res.room.status === "active" ? "active" : "waiting");
    } catch (err: any) {
      console.error(err);
    }
    setLoading(false);
  };

  const startSession = async () => {
    if (!room) return;
    setLoading(true);
    try {
      await api.agentsApi.generateGroupQuestion(roomId);
      const updated = await api.agentsApi.getGroupRoom(roomId);
      setRoom(updated.room);
      setMode("active");
    } catch (err: any) {
      console.error(err);
    }
    setLoading(false);
  };

  const nextQuestion = async () => {
    if (!room) return;
    setLoading(true);
    setCurrentAnswer(null);
    try {
      await api.agentsApi.generateGroupQuestion(roomId);
      const updated = await api.agentsApi.getGroupRoom(roomId);
      setRoom(updated.room);
    } catch (err: any) {
      console.error(err);
    }
    setLoading(false);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentQuestion = room?.questions ? JSON.parse(room.questions)[room.currentQuestionIndex] : null;
  const participants = room?.participants ? JSON.parse(room.participants) : [];

  if (mode === "lobby") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366F1, #4F46E5)" }}>
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Collaborative Study</h1>
              <p className="text-text-secondary">AI-mediated group study sessions</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
              <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-accent-green" /> Create Room
              </h3>
              <p className="text-sm text-text-secondary mb-4">Start a new group study session and share the code with friends.</p>
              <motion.button
                onClick={createRoom}
                disabled={loading}
                className="w-full py-3 rounded-xl text-white font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #6366F1, #4F46E5)" }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Create Study Room
              </motion.button>
            </div>

            <div className="p-6 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
              <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                <LogIn className="w-5 h-5 text-accent-blue" /> Join Room
              </h3>
              <div className="flex gap-2">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter room code..."
                  className="flex-1 px-4 py-3 rounded-xl text-sm focus:outline-none"
                  style={{ background: "var(--bg-base)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
                />
                <motion.button
                  onClick={joinRoom}
                  disabled={loading || !joinCode.trim()}
                  className="px-6 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Join"}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (mode === "waiting" && room) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-text-primary mb-2">Room Created!</h2>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
              <span className="text-sm text-text-secondary">Room Code:</span>
              <span className="text-lg font-mono font-bold text-accent-indigo">{room.id}</span>
              <button onClick={copyRoomCode} className="p-1 rounded text-text-secondary hover:text-text-primary">
                {copied ? <Check className="w-4 h-4 text-accent-green" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-6 rounded-2xl mb-6" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
            <h3 className="font-semibold text-text-primary mb-4">Participants ({participants.length})</h3>
            <div className="space-y-2">
              {participants.map((_p: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "var(--bg-base)" }}>
                  <Crown className={`w-4 h-4 ${i === 0 ? "text-amber-400" : "text-text-secondary"}`} />
                  <span className="text-sm text-text-primary">{i === 0 ? "Host" : `Participant ${i + 1}`}</span>
                </div>
              ))}
            </div>
          </div>

          <motion.button
            onClick={startSession}
            disabled={loading}
            className="w-full py-4 rounded-xl text-white font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #22C55E, #10B981)" }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            Start Session
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (mode === "active" && room && currentQuestion) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-text-secondary">
              Question <strong className="text-text-primary">{room.currentQuestionIndex + 1}</strong>
            </div>
            <div className="text-xs text-text-secondary font-mono">{room.id}</div>
          </div>

          <div className="p-6 rounded-2xl mb-6" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
            <p className="text-text-primary leading-relaxed">{currentQuestion.front}</p>
          </div>

          <div className="space-y-3 mb-6">
            {currentQuestion.choices.map((choice: string, ci: number) => (
              <motion.button
                key={ci}
                onClick={() => setCurrentAnswer(ci)}
                className={`w-full text-left p-4 rounded-xl text-sm transition-all ${currentAnswer === ci ? "text-white" : "text-text-primary"}`}
                style={currentAnswer === ci ? { background: "linear-gradient(135deg, #6366F1, #4F46E5)" } : { background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <span className="font-semibold mr-2">{String.fromCharCode(65 + ci)}.</span>
                {choice.replace(/^[A-D]\.\s*/, "")}
              </motion.button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-text-secondary">
              {participants.length} participants
            </div>
            <motion.button
              onClick={nextQuestion}
              disabled={loading || currentAnswer === null}
              className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #6366F1, #4F46E5)" }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Next Question"}
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
