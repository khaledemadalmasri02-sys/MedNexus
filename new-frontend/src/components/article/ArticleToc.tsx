import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";

export interface TocEntry {
  id: string;
  level: 2 | 3;
  text: string;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

export function parseToc(markdown: string): TocEntry[] {
  const lines = markdown.split("\n");
  const entries: TocEntry[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const m2 = /^##\s+(.+)$/.exec(line);
    const m3 = /^###\s+(.+)$/.exec(line);
    if (m2) {
      const text = m2[1].trim();
      let id = slugify(text);
      let n = 2;
      while (seen.has(id)) id = `${slugify(text)}-${n++}`;
      seen.add(id);
      entries.push({ id, level: 2, text });
    } else if (m3) {
      const text = m3[1].trim();
      let id = slugify(text);
      let n = 2;
      while (seen.has(id)) id = `${slugify(text)}-${n++}`;
      seen.add(id);
      entries.push({ id, level: 3, text });
    }
  }
  return entries;
}

interface Props {
  entries: TocEntry[];
  onNavigate?: (id: string) => void;
}

// Sticky left TOC with scroll-spy active highlight.
export default function ArticleToc({ entries, onNavigate }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const clickedRef = useRef(false);

  // Scroll-spy via IntersectionObserver.
  useEffect(() => {
    if (entries.length === 0) return;
    const targets = entries
      .map((e) => document.getElementById(e.id))
      .filter(Boolean) as HTMLElement[];
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (obs) => {
        if (clickedRef.current) return;
        const visible = obs
          .filter((o) => o.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <nav aria-label="Table of contents" className="sticky top-24 hidden lg:block w-56 shrink-0 self-start">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">On this page</p>
      <ul className="space-y-1 border-l border-[var(--glass-border)]">
        {entries.map((e) => {
          const isActive = activeId === e.id;
          return (
            <li key={e.id}>
              <button
                onClick={() => {
                  clickedRef.current = true;
                  setActiveId(e.id);
                  onNavigate?.(e.id);
                  setTimeout(() => {
                    clickedRef.current = false;
                  }, 800);
                }}
                className={`group flex w-full items-center gap-1.5 py-1.5 text-left text-sm transition-colors duration-200 ${
                  e.level === 3 ? "pl-7" : "pl-4"
                } ${isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
              >
                <span
                  className={`block h-4 w-0.5 rounded-full transition-colors duration-200 ${
                    isActive ? "bg-[var(--accent-primary)]" : "bg-transparent group-hover:bg-[var(--glass-border-light)]"
                  }`}
                  style={{ marginLeft: -1 }}
                />
                <span className="truncate">{e.text}</span>
                {isActive && <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
