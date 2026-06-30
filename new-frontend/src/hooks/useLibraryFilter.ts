import { useState, useMemo } from "react";
import type { Deck, QBank } from "../lib/api";
import { useDebounce } from "./useDebounce";

export type SortOption = "name" | "created" | "cards" | "mastery";

function calculateMastery(createdAt: string): number {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  return Math.min(100, Math.max(10, days * 5 + 20));
}

export function useLibraryFilter(decks: Deck[], qbanks: QBank[]) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    decks.forEach(d => { if (d.description) d.description.split(",").forEach(t => tagSet.add(t.trim())); });
    qbanks.forEach(qb => { if (qb.name) tagSet.add(qb.name.split(" ")[0]); });
    return Array.from(tagSet).filter(Boolean).slice(0, 10);
  }, [decks, qbanks]);

  const filteredDecks = useMemo(() => {
    let result = [...decks];
    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(s) || (d.description || "").toLowerCase().includes(s));
    }
    if (selectedTag) result = result.filter(d => d.description?.includes(selectedTag));
    switch (sortBy) {
      case "name": result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "created": result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case "cards": result.sort((a, b) => (b.cardCount || 0) - (a.cardCount || 0)); break;
      case "mastery": result.sort((a, b) => calculateMastery(b.createdAt) - calculateMastery(a.createdAt)); break;
    }
    return result;
  }, [decks, debouncedSearch, sortBy, selectedTag]);

  const filteredQbanks = useMemo(() => {
    let result = [...qbanks];
    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase();
      result = result.filter(qb => qb.name.toLowerCase().includes(s));
    }
    switch (sortBy) {
      case "name": result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "created": result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case "cards": result.sort((a, b) => (b.questionCount || 0) - (a.questionCount || 0)); break;
      default: break;
    }
    return result;
  }, [qbanks, debouncedSearch, sortBy]);

  return { search, setSearch, debouncedSearch, sortBy, setSortBy, selectedTag, setSelectedTag, filteredDecks, filteredQbanks, allTags };
}
