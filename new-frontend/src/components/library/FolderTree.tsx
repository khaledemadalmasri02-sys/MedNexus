import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, ChevronDown, Folder, FolderOpen, Layers, Stethoscope, FolderPlus,
} from "lucide-react";
import * as api from "../../lib/api";

interface FolderTreeProps {
  type: "deck" | "qbank";
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onMove: (itemId: number, targetFolderId: number | null) => void;
}

type TreeNode = (api.DeckTreeNode | api.QBankTreeNode) & {
  children: TreeNode[];
};

function countDescendants(node: TreeNode): number {
  const direct = node.children.reduce((sum, c) => sum + countDescendants(c), 0);
  const self = "cardCount" in node ? node.cardCount : (node as api.QBankTreeNode).questionCount;
  return self + direct;
}

function FolderTreeItem({
  node,
  depth,
  selectedId,
  onSelect,
  onMove,
  type,
  reload,
}: {
  node: TreeNode;
  depth: number;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onMove: (itemId: number, targetFolderId: number | null) => void;
  type: "deck" | "qbank";
  reload: () => void;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;
  const isFolder = hasChildren;
  const Icon = type === "qbank" ? Stethoscope : (isFolder ? Folder : Layers);
  const IconOpen = type === "qbank" ? Stethoscope : FolderOpen;

  const [expanded, setExpanded] = useState(depth < 1 || isSelected);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    if (isSelected) setExpanded(true);
  }, [isSelected]);

  const handleCreateSubFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;
    try {
      if (type === "deck") {
        await api.decksApi.create({ name: newFolderName, description: "", parentId: node.id });
      } else {
        await api.qbanksApi.create({ name: newFolderName, parentId: node.id });
      }
      setNewFolderName("");
      setShowNewFolder(false);
      setExpanded(true);
      onSelect(node.id);
      reload();
    } catch { /* ignore */ }
  }, [newFolderName, node.id, type, onSelect]);

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer group transition-colors hover:bg-glass-surface"
        style={{
          paddingLeft: `${depth * 16 + 8}px`,
          background: isSelected ? "rgba(6, 182, 212, 0.1)" : undefined,
          border: isSelected ? "1px solid rgba(6, 182, 212, 0.2)" : "1px solid transparent",
        }}
        onClick={() => onSelect(node.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          // Context menu handled by parent
        }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="p-0.5 rounded hover:bg-glass-border transition-colors shrink-0"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-text-muted" />
            )}
          </button>
        ) : (
          <span className="w-4.5 shrink-0" />
        )}
        {expanded && hasChildren ? (
          <IconOpen className="h-4 w-4 text-accent-amber shrink-0" />
        ) : (
          <Icon className="h-4 w-4 shrink-0" style={{ color: isSelected ? "var(--accent-cyan)" : type === "qbank" ? "var(--accent-purple)" : "var(--accent-green)" }} />
        )}
        <span className="text-sm text-text-primary truncate flex-1 min-w-0">{node.name}</span>
        <span className="text-[10px] text-text-muted shrink-0">{countDescendants(node)}</span>
        <button
          title="New subfolder"
          onClick={(e) => { e.stopPropagation(); setShowNewFolder(v => !v); setExpanded(true); }}
          className="p-0.5 rounded hover:bg-glass-border transition-colors shrink-0 opacity-0 group-hover:opacity-100"
        >
          <FolderPlus className="h-3 w-3 text-text-muted" />
        </button>
      </motion.div>

      <AnimatePresence>
        {showNewFolder && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            style={{ marginLeft: `${(depth + 1) * 16 + 24}px`, marginRight: 8 }}
          >
            <div className="space-y-2 mb-2">
              <input
                type="text"
                placeholder="Folder name…"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCreateSubFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
                autoFocus
                className="w-full px-3 py-1.5 rounded-lg text-xs outline-none"
                style={{ background: "var(--glass-input-bg)", border: "1px solid var(--glass-border-light)", color: "var(--text-primary)" }}
              />
              <div className="flex gap-1">
                <button onClick={handleCreateSubFolder} className="px-2 py-1 rounded text-[10px] bg-accent-green text-white font-medium">Create</button>
                <button onClick={() => setShowNewFolder(false)} className="px-2 py-1 rounded text-[10px] text-text-secondary hover:bg-glass-border">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {node.children.map(child => (
              <FolderTreeItem
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedId={selectedId}
                onSelect={onSelect}
                onMove={onMove}
                type={type}
                reload={reload}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FolderTree({ type, selectedId, onSelect, onMove }: FolderTreeProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const loadTree = useCallback(async () => {
    try {
      setLoading(true);
      if (type === "deck") {
        const data = await api.decksApi.tree();
        setTree(data as TreeNode[]);
      } else {
        const data = await api.qbanksApi.tree();
        setTree(data as TreeNode[]);
      }
    } catch (err) {
      console.error("Failed to load tree:", err);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => { loadTree(); }, [loadTree]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      if (type === "deck") {
        await api.decksApi.create({ name: newFolderName, description: "" });
      } else {
        await api.qbanksApi.create({ name: newFolderName });
      }
      setNewFolderName("");
      setShowNewFolder(false);
      await loadTree();
    } catch { /* ignore */ }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <div className="w-5 h-5 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-1">
      {/* Root node */}
      <div
        className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors hover:bg-glass-surface"
        style={{
          background: selectedId === null ? "rgba(6, 182, 212, 0.1)" : undefined,
          border: selectedId === null ? "1px solid rgba(6, 182, 212, 0.2)" : "1px solid transparent",
        }}
        onClick={() => onSelect(null)}
      >
        <span className="w-4.5 shrink-0" />
        {type === "deck" ? (
          <Layers className="h-4 w-4 text-accent-green shrink-0" />
        ) : (
          <Stethoscope className="h-4 w-4 text-accent-purple shrink-0" />
        )}
        <span className="text-sm font-medium text-text-primary flex-1">All {type === "deck" ? "Decks" : "QBanks"}</span>
      </div>

      {/* Tree nodes */}
      {tree.map(node => (
        <FolderTreeItem
          key={node.id}
          node={node}
          depth={0}
          selectedId={selectedId}
          onSelect={onSelect}
          onMove={onMove}
          type={type}
          reload={loadTree}
        />
      ))}

      {/* New Folder */}
      <div className="pt-2 border-t border-glass-border mt-2">
        <AnimatePresence>
          {showNewFolder ? (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2 mb-2">
              <input
                type="text"
                placeholder="Folder name…"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
                autoFocus
                className="w-full px-3 py-1.5 rounded-lg text-xs outline-none"
                style={{ background: "var(--glass-input-bg)", border: "1px solid var(--glass-border-light)", color: "var(--text-primary)" }}
              />
              <div className="flex gap-1">
                <button onClick={handleCreateFolder} className="px-2 py-1 rounded text-[10px] bg-accent-green text-white font-medium">Create</button>
                <button onClick={() => setShowNewFolder(false)} className="px-2 py-1 rounded text-[10px] text-text-secondary hover:bg-glass-border">Cancel</button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowNewFolder(true)}
              className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-xs text-text-muted hover:text-text-secondary hover:bg-glass-surface transition-colors w-full"
            >
              <FolderPlus className="h-3.5 w-3.5" /> New Folder
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
