/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef } from "react";
import * as api from "../lib/api";

export type ChatMode = "brief" | "academic";

export interface ChatMsg {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  streaming?: boolean;
  mode?: ChatMode;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>(() => {
    try {
      return (localStorage.getItem("chat_mode") as ChatMode) || "academic";
    } catch {
      return "academic";
    }
  });
  const abortRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const sid = sessionIdRef.current;
      if (!sid) { setHistoryLoading(false); return; }
      const result = await api.agentsApi.getChatHistory();
      const history = result.messages.map((m: any, i: number) => ({
        id: `hist-${i}`,
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
      setMessages(history);
    } catch { /* ignore */ }
    setHistoryLoading(false);
  }, []);

  const sendMessage = useCallback(async (content: string, deckId?: number) => {
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", content };
    const assistantId = `a-${Date.now()}`;
    const assistantMsg: ChatMsg = { id: assistantId, role: "assistant", content: "", streaming: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setLoading(true);
    abortRef.current = false;

    await api.agentsApi.chat(
      content,
      deckId,
      (chunk) => {
        if (abortRef.current) return;
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
        );
      },
      () => {
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, streaming: false, mode } : m)
        );
        setLoading(false);
      },
      () => {
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, streaming: false, content: m.content || "Sorry, something went wrong." } : m)
        );
        setLoading(false);
      }
    );
  }, [mode]);

  const clearHistory = useCallback(async () => {
    try {
      await api.agentsApi.clearChatHistory();
      setMessages([]);
      sessionIdRef.current = null;
    } catch { /* ignore */ }
  }, []);

  const changeMode = useCallback((newMode: ChatMode) => {
    setMode(newMode);
    try { localStorage.setItem("chat_mode", newMode); } catch { /* ignore */ }
  }, []);

  return { messages, loading, historyLoading, mode, sendMessage, loadHistory, clearHistory, changeMode };
}
