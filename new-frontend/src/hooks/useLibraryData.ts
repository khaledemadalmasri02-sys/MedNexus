import { useState, useEffect, useCallback } from "react";
import * as api from "../lib/api";
import type { Deck, QBank } from "../lib/api";

export function useDecks() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDecks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.decksApi.list();
      setDecks(data);
    } catch (err) {
      setError("Failed to load decks");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  const deleteDeck = useCallback(async (id: number) => {
    const previousDecks = [...decks];
    setDecks((prev) => prev.filter((d) => d.id !== id));
    try {
      await api.decksApi.delete(id);
    } catch (err) {
      setDecks(previousDecks);
      setError("Failed to delete deck");
      console.error(err);
      throw err;
    }
  }, [decks]);

  return { decks, loading, error, setError, deleteDeck, refreshDecks: fetchDecks };
}

export function useQbanks() {
  const [qbanks, setQbanks] = useState<QBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQbanks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.qbanksApi.list();
      setQbanks(data);
    } catch (err) {
      setError("Failed to load question banks");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQbanks();
  }, [fetchQbanks]);

  const deleteQBank = useCallback(async (id: number) => {
    const previousQbanks = [...qbanks];
    setQbanks((prev) => prev.filter((qb) => qb.id !== id));
    try {
      await api.qbanksApi.delete(id);
    } catch (err) {
      setQbanks(previousQbanks);
      setError("Failed to delete question bank");
      console.error(err);
      throw err;
    }
  }, [qbanks]);

  return { qbanks, loading, error, setError, deleteQBank, refreshQbanks: fetchQbanks };
}
