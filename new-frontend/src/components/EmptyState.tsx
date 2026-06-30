import { motion } from "framer-motion";
import { type ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  cta?: ReactNode;
  hint?: string;
  illustration?: "default" | "library" | "study" | "history" | "search";
}

function EmptyIllustration({ type }: { type: string }) {
  const illustrations: Record<string, ReactNode> = {
    library: (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mx-auto">
        <rect x="10" y="20" width="20" height="24" rx="3" stroke="var(--accent-green)" strokeWidth="1.5" opacity="0.4" />
        <rect x="14" y="26" width="12" height="2" rx="1" fill="var(--accent-green)" opacity="0.3" />
        <rect x="14" y="30" width="8" height="2" rx="1" fill="var(--accent-green)" opacity="0.2" />
        <rect x="14" y="34" width="10" height="2" rx="1" fill="var(--accent-green)" opacity="0.15" />
        <rect x="35" y="16" width="20" height="24" rx="3" stroke="var(--accent-blue)" strokeWidth="1.5" opacity="0.4" />
        <rect x="39" y="22" width="12" height="2" rx="1" fill="var(--accent-blue)" opacity="0.3" />
        <rect x="39" y="26" width="8" height="2" rx="1" fill="var(--accent-blue)" opacity="0.2" />
        <rect x="39" y="30" width="10" height="2" rx="1" fill="var(--accent-blue)" opacity="0.15" />
        <rect x="22" y="48" width="20" height="24" rx="3" stroke="var(--accent-purple)" strokeWidth="1.5" opacity="0.4" />
        <rect x="26" y="54" width="12" height="2" rx="1" fill="var(--accent-purple)" opacity="0.3" />
        <rect x="26" y="58" width="8" height="2" rx="1" fill="var(--accent-purple)" opacity="0.2" />
        <rect x="26" y="62" width="10" height="2" rx="1" fill="var(--accent-purple)" opacity="0.15" />
        <circle cx="62" cy="52" r="12" stroke="var(--accent-amber)" strokeWidth="1.5" opacity="0.3" />
        <path d="M58 52l3 3 6-6" stroke="var(--accent-amber)" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    study: (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mx-auto">
        <rect x="15" y="15" width="50" height="50" rx="8" stroke="var(--accent-green)" strokeWidth="1.5" opacity="0.3" />
        <rect x="22" y="22" width="36" height="4" rx="2" fill="var(--accent-green)" opacity="0.2" />
        <rect x="22" y="30" width="28" height="4" rx="2" fill="var(--accent-green)" opacity="0.15" />
        <rect x="22" y="38" width="32" height="4" rx="2" fill="var(--accent-green)" opacity="0.1" />
        <circle cx="40" cy="52" r="6" stroke="var(--accent-green)" strokeWidth="1.5" opacity="0.4" />
        <path d="M37 52l2 2 4-4" stroke="var(--accent-green)" strokeWidth="1.5" opacity="0.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    history: (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mx-auto">
        <circle cx="40" cy="40" r="22" stroke="var(--accent-blue)" strokeWidth="1.5" opacity="0.3" />
        <path d="M40 25v15l10 10" stroke="var(--accent-blue)" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
        <circle cx="40" cy="40" r="3" fill="var(--accent-blue)" opacity="0.3" />
      </svg>
    ),
    search: (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mx-auto">
        <circle cx="36" cy="36" r="16" stroke="var(--accent-purple)" strokeWidth="1.5" opacity="0.4" />
        <path d="M48 48l12 12" stroke="var(--accent-purple)" strokeWidth="2" opacity="0.5" strokeLinecap="round" />
        <circle cx="36" cy="36" r="4" stroke="var(--accent-purple)" strokeWidth="1" opacity="0.2" />
      </svg>
    ),
    default: null,
  };

  return illustrations[type] || null;
}

export function EmptyState({ icon, title, description, cta, hint, illustration = "default" }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="text-center py-16 px-8 rounded-2xl"
      style={{ border: "2px dashed var(--glass-border-light)", background: "var(--glass-surface-faint)" }}
    >
      {illustration !== "default" ? (
        <div className="mb-5">
          <EmptyIllustration type={illustration} />
        </div>
      ) : (
        <div className="relative inline-block mb-5">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: "var(--glass-surface)", border: "1px solid var(--glass-border)" }}
          >
            {icon}
          </div>
          <motion.div
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "var(--accent-green)", boxShadow: "0 0 12px rgba(34, 197, 94, 0.3)" }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="text-white text-xs">+</span>
          </motion.div>
        </div>
      )}
      <h3 className="font-display text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary max-w-sm mx-auto mb-4">{description}</p>
      {hint && (
        <p className="text-xs text-text-muted mb-6 flex items-center justify-center gap-1.5">
          <span className="inline-block w-1 h-1 rounded-full" style={{ background: "var(--accent-green)" }} />
          {hint}
        </p>
      )}
      {cta && <div className="flex justify-center gap-3">{cta}</div>}
    </motion.div>
  );
}
