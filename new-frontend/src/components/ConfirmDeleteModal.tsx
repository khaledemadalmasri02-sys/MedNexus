import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./ui";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  loading?: boolean;
  itemPreview?: {
    front?: string;
    back?: string;
    name?: string;
    count?: number;
  } | null;
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete this item?",
  message = "This action cannot be undone.",
  confirmLabel = "Delete",
  loading = false,
  itemPreview = null,
}: ConfirmDeleteModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.15)" }}>
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-text-secondary">{message}</p>
        </div>

        {itemPreview && (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-subtle)" }}>
            {itemPreview.name && (
              <div className="px-4 py-2.5" style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)" }}>
                <div className="text-xs font-medium text-text-muted mb-0.5">Name</div>
                <div className="text-sm text-text-primary">{itemPreview.name}</div>
              </div>
            )}
            {itemPreview.count !== undefined && (
              <div className="px-4 py-2.5" style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)" }}>
                <div className="text-xs font-medium text-text-muted mb-0.5">Items affected</div>
                <div className="text-sm text-accent-rose font-semibold">{itemPreview.count} cards</div>
              </div>
            )}
            {itemPreview.front && (
              <div className="px-4 py-2.5" style={{ borderBottom: itemPreview.back ? "1px solid var(--border-subtle)" : "none" }}>
                <div className="text-xs font-medium text-text-muted mb-0.5">Front</div>
                <div className="text-sm text-text-primary line-clamp-2">{itemPreview.front}</div>
              </div>
            )}
            {itemPreview.back && (
              <div className="px-4 py-2.5">
                <div className="text-xs font-medium text-text-muted mb-0.5">Back</div>
                <div className="text-sm text-text-secondary line-clamp-2">{itemPreview.back}</div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-glass-border transition-colors"
          >
            Cancel
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm bg-red-500/90 text-white hover:bg-red-600 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {confirmLabel}
          </motion.button>
        </div>
      </div>
    </Modal>
  );
}
