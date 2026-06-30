
import { Sparkles, Wrench, Bug } from "lucide-react";
import { Modal } from "../components/ui";

interface ChangelogEntry {
  version: string;
  date: string;
  features: string[];
  improvements: string[];
  fixes: string[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2.0.0",
    date: "June 2026",
    features: [
      "Global search with Cmd+K command palette",
      "Breadcrumb navigation across all pages",
      "Today's Focus widget on dashboard",
      "Quick Stats cards with animated counters",
      "Recent Activity feed",
      "Upcoming Exams countdown widget",
      "Study Timer with Pomodoro mode",
      "5-level card difficulty rating",
      "Study mode selector (Normal, Quiz, Type, Speed, Voice)",
      "Keyboard shortcuts overlay (press ?)",
      "Card flagging and notes",
      "Deck statistics dashboard",
      "Achievements page with 10 badges",
      "Profile page with account stats",
      "Help page with FAQ and shortcuts",
      "Onboarding tour for new users",
      "Feedback widget",
    ],
    improvements: [
      "Enhanced toast notifications with max 3 visible",
      "Loading skeletons for all pages",
      "Improved empty states with illustrations",
      "Enhanced error boundaries with recovery",
      "Better mobile navigation experience",
    ],
    fixes: [
      "Fixed card flip animation timing",
      "Improved study session accuracy tracking",
    ],
  },
];

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="What's New">
      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
        {CHANGELOG.map((entry) => (
          <div key={entry.version}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-text-primary">v{entry.version}</span>
              <span className="text-[10px] text-text-muted px-2 py-0.5 rounded-md" style={{ background: "var(--bg-elevated)" }}>
                {entry.date}
              </span>
            </div>

            {entry.features.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="h-3 w-3 text-accent-green" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">New Features</span>
                </div>
                <ul className="space-y-1">
                  {entry.features.map((f, i) => (
                    <li key={i} className="text-xs text-text-secondary flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: "var(--accent-green)" }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {entry.improvements.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Wrench className="h-3 w-3 text-accent-blue" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Improvements</span>
                </div>
                <ul className="space-y-1">
                  {entry.improvements.map((imp, i) => (
                    <li key={i} className="text-xs text-text-secondary flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: "var(--accent-blue)" }} />
                      {imp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {entry.fixes.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Bug className="h-3 w-3 text-accent-rose" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Bug Fixes</span>
                </div>
                <ul className="space-y-1">
                  {entry.fixes.map((fix, i) => (
                    <li key={i} className="text-xs text-text-secondary flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: "var(--accent-rose)" }} />
                      {fix}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
