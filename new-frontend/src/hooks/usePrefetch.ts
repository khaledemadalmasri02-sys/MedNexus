/* eslint-disable react-hooks/refs */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from "react";
import * as api from "../lib/api";

type QueryFn = () => Promise<any>;

interface CacheEntry {
  data: any;
  timestamp: number;
  promise?: Promise<any>;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 30000;

function getCached(key: string): any {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  return null;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

export function usePrefetch(key: string, fn: QueryFn, enabled = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return;
    const cached = getCached(key);
    if (cached !== null) return;

    const existing = cache.get(key);
    if (existing?.promise) return;

    const promise = fnRef.current().then((data: any) => {
      setCache(key, data);
      return data;
    });
    cache.set(key, { data: null, timestamp: Date.now(), promise });
  }, [key, enabled]);
}

export function prefetchDashboard() {
  const keys = ["decks", "generations", "dashboard-state", "streak", "heatmap", "queue", "achievements", "due-count"];
  const fns: Record<string, QueryFn> = {
    decks: () => api.decksApi.list(),
    generations: () => api.generationsApi.list(5),
    "dashboard-state": () => api.dashboardExtendedApi.getState(),
    streak: () => api.dashboardExtendedApi.getStreak(),
    heatmap: () => api.dashboardExtendedApi.getHeatmap(),
    queue: () => api.dashboardExtendedApi.getQueue(),
    achievements: () => api.dashboardExtendedApi.getAchievements(),
    "due-count": () => api.cardProgressApi.getDueCount(),
  };

  keys.forEach((key) => {
    if (!cache.has(key)) {
      const promise = fns[key]().then((data: any) => {
        setCache(key, data);
        return data;
      }).catch(() => {});
      cache.set(key, { data: null, timestamp: Date.now(), promise });
    }
  });
}

export function prefetchDeck(deckId: number) {
  const key = `deck-${deckId}`;
  if (!getCached(key)) {
    Promise.all([
      api.decksApi.get(deckId),
      api.decksApi.getCards(deckId),
    ]).then(([deck, cards]) => {
      setCache(key, { deck, cards });
    }).catch(() => {});
  }
}

export function prefetchStudyQueue() {
  const key = "study-queue";
  if (!getCached(key)) {
    (api.cardProgressApi as any).getDueCards().then((data: any) => {
      setCache(key, data);
    }).catch(() => {});
  }
}

export function getPrefetchedData(key: string): any {
  return getCached(key);
}

export function clearPrefetchCache() {
  cache.clear();
}
