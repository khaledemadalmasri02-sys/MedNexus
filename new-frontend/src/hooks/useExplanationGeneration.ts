import { useState, useEffect, useCallback, useRef } from "react";
import * as api from "../lib/api";
import type { Deck, ExplanationProgress, ExplanationStats } from "../lib/api";

export function useExplanationGeneration(decks: Deck[], onComplete: () => void) {
  const [generatingDecks, setGeneratingDecks] = useState<Set<number>>(new Set());
  const [explanationProgress, setExplanationProgress] = useState<Record<number, ExplanationProgress>>({});
  const [explanationStats, setExplanationStats] = useState<Record<number, ExplanationStats>>({});
  const intervalsRef = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());
  const statsFailedRef = useRef(false);

  const fetchStats = useCallback(async (deckId: number) => {
    try {
      const stats = await api.explanationsApi.getStats(deckId);
      setExplanationStats(prev => ({ ...prev, [deckId]: stats }));
    } catch {
      // Silently fail for decks without explanations
    }
  }, []);

  const fetchAllStats = useCallback(async () => {
    // Only attempt once per session — if it fails, don't retry on every deck change
    if (statsFailedRef.current) return;

    try {
      // Test with the first deck to see if the endpoint is reachable
      if (decks.length > 0) {
        await api.explanationsApi.getStats(decks[0].id);
      }
      // If successful, fetch for all decks in parallel
      await Promise.all(decks.map(d => fetchStats(d.id)));
    } catch {
      // Endpoint unavailable — mark as failed and stop retrying
      statsFailedRef.current = true;
    }
  }, [decks, fetchStats]);

  useEffect(() => {
    if (decks.length > 0) {
      fetchAllStats();
    }
  }, [decks, fetchAllStats]);

  const stopPolling = useCallback((deckId: number) => {
    const interval = intervalsRef.current.get(deckId);
    if (interval) {
      clearInterval(interval);
      intervalsRef.current.delete(deckId);
    }
  }, []);

  const startGeneration = useCallback(async (deckId: number) => {
    await api.explanationsApi.generate(deckId);
    setGeneratingDecks(prev => new Set(prev).add(deckId));

    const interval = setInterval(async () => {
      try {
        const { progress } = await api.explanationsApi.getProgress(deckId);
        setExplanationProgress(prev => ({ ...prev, [deckId]: progress }));

        if (progress.status === "completed" || progress.status === "failed") {
          stopPolling(deckId);
          setGeneratingDecks(prev => {
            const next = new Set(prev);
            next.delete(deckId);
            return next;
          });
          await fetchStats(deckId);
          onComplete();
        }
      } catch (err) {
        console.error(`Failed to fetch progress for deck ${deckId}:`, err);
      }
    }, 2000);

    intervalsRef.current.set(deckId, interval);
  }, [stopPolling, fetchStats, onComplete]);

  useEffect(() => {
    const intervals = intervalsRef.current;
    return () => {
      intervals.forEach(interval => clearInterval(interval));
    };
  }, []);

  return { generatingDecks, explanationProgress, explanationStats, startGeneration };
}
