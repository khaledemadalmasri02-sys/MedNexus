import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Folder as FolderIcon, Check, Loader2, Plus, X } from "lucide-react";
import * as api from "../../lib/api";

interface DeckNode {
  id: number;
  name: string;
  kind: string;
  parentId: number | null;
  cardCount: number;
  depth: number;
  children: DeckNode[];
}

interface DeckSelectorProps {
  value: number | null;
  onChange: (parentId: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DeckSelector({ value, onChange, placeholder = "Add to folder...", disabled }: DeckSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rawTree, setRawTree] = useState<api.DeckTreeNode[]>([]);

  const fetchDecks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.decksApi.tree();
      setRawTree(data);
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

  const addDepth = useCallback((nodes: api.DeckTreeNode[], depth = 0): DeckNode[] => {
    return nodes.map(node => ({
      ...node,
      depth,
      children: addDepth(node.children || [], depth + 1),
    }));
  }, []);

  const flatDecks = useCallback((nodes: DeckNode[]): DeckNode[] => {
    const result: DeckNode[] = [];
    const traverse = (items: DeckNode[]) => {
      for (const item of items) {
        result.push(item);
        if (item.children.length > 0) {
          traverse(item.children as DeckNode[]);
        }
      }
    };
    traverse(nodes);
    return result;
  }, []);

  const deckTree = addDepth(rawTree);
  const allDecks = flatDecks(deckTree);
  const filteredDecks = search
    ? allDecks.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
    : allDecks;

  const selectedDeck = allDecks.find(d => d.id === value);

  const handleSelect = (deckId: number | null) => {
    onChange(deckId);
    setOpen(false);
    setSearch("");
  };

  const displayLabel = selectedDeck?.name || (value ? "Selected" : placeholder);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => !loading && setOpen(!open)}
        className="w-full px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2"
        style={{
          background: "var(--glass-input-bg)",
          border: "1px solid var(--glass-border-light)",
          color: "var(--text-primary)",
          cursor: disabled || loading ? "not-allowed" : "pointer",
        }}
      >
        <span className="flex items-center gap-2">
          <FolderIcon className="h-4 w-4 text-text-secondary" />
          <span className="truncate">{displayLabel}</span>
        </span>
        <div className="flex items-center gap-1.5">
          {open ? <X className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 rounded-xl p-3 max-h-80 overflow-y-auto"
            style={{
              background: "var(--glass-card-bg)",
              border: "1px solid var(--glass-border)",
              backdropFilter: "blur(20px)",
            }}
          >
            {search && (
              <div className="mb-2">
                <input
                  type="text"
                  placeholder="Search decks..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full px-2 py-1.5 rounded text-sm"
                  style={{
                    background: "var(--glass-input-bg)",
                    border: "1px solid var(--glass-border-light)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            )}

            {error && (
              <div className="p-2 text-sm text-red-400">
                {error}
              </div>
            )}

            {filteredDecks.length === 0 && !loading ? (
              <div className="p-3 text-center text-text-secondary text-sm">
                No decks found
              </div>
            ) : (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleSelect(null)}
                  className="w-full px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-glass-surface transition-colors text-left"
                  style={{ color: "var(--text-primary)" }}
                >
                  <FolderIcon className="h-4 w-4 text-text-secondary" />
                  <span>Create in root folder</span>
                </button>

                {filteredDecks.map(deck => (
                  <button
                    key={deck.id}
                    type="button"
                    onClick={() => handleSelect(deck.parentId)}
                    className="w-full px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-glass-surface transition-colors text-left"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <div 
                      className="w-0.5 h-3 rounded-full" 
                      style={{ 
                        background: deck.kind === "qbank" ? "var(--accent-purple)" : "var(--accent-green)",
                        marginLeft: deck.depth * 8,
                      }}
                    />
                    <span className="truncate flex-1 text-left">
                      {deck.name}
                      {deck.kind === "qbank" && (
                        <span className="text-xs text-text-muted ml-1">(QBank)</span>
                      )}
                    </span>
                    {value === deck.parentId && (
                      <Check className="h-4 w-4 text-accent-green shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="p-3 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-accent-green" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface NewDeckModalProps {
  onClose: () => void;
  parentId: number | null;
  onCreated: (deckId: number) => void;
}

export function NewDeckModal({ onClose, parentId, onCreated }: NewDeckModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const deck = await api.decksApi.create({ name, parentId: parentId ?? undefined });
      onCreated(deck.id);
      onClose();
      setName("");
    } catch (err) {
      setError((err as Error).message || "Failed to create deck");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="rounded-2xl p-6 w-full max-w-md"
        style={{
          background: "var(--glass-card-bg)",
          border: "1px solid var(--glass-border)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-text-primary">
            Create New Deck
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-glass-surface">
            <X className="h-4 w-4 text-text-secondary" />
          </button>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Deck name..."
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: "var(--glass-input-bg)",
              border: "1px solid var(--glass-border-light)",
              color: "var(--text-primary)",
            }}
          />

          {error && (
            <div className="p-3 rounded-lg text-sm" style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#ef4444",
            }}>
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-glass-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || !name.trim()}
              className="px-4 py-2 rounded-lg text-sm text-white font-semibold flex items-center gap-2 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}