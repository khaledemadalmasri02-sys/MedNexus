import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer, Copy, Check, AlertTriangle, Loader2, Clock, FileText, Layers, Tag, Stethoscope } from "lucide-react";
import type { ArticleJob } from "../lib/api";
import ArticleReader, { type ArticleMeta } from "../components/article/ArticleReader";
import ArticleToc, { parseToc } from "../components/article/ArticleToc";
import { smoothTransition } from "../components/ui/constants";
import { motion } from "framer-motion";

interface Props {
  PageLoader?: React.ComponentType;
}

const API_BASE = import.meta.env.VITE_API_URL || "/api";

// Derive title / abstract / takeaway from markdown body.
function parseMeta(raw: string, topic: string): ArticleMeta {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  let title = topic || "Untitled Article";
  let abstract: string | undefined;
  let isTakeaway = false;
  let takeawayText: string | undefined;

  const headingIdx = lines.findIndex((l) => /^#\s+/.test(l));
  if (headingIdx >= 0) {
    title = lines[headingIdx].replace(/^#\s+/, "").trim();
  }

  const bodyStart = headingIdx >= 0 ? headingIdx + 1 : 0;

  // Detect "Key Takeaway:" / "Takeaway:" indicator line in body.
  let takeawayLineIdx = -1;
  for (let i = bodyStart; i < lines.length; i++) {
    const m = /^(key\s+takeaway|takeaway)\s*[:\-]?\s*(.+)$/i.exec(lines[i].trim());
    if (m) {
      isTakeaway = true;
      takeawayText = m[2].trim();
      takeawayLineIdx = i;
      break;
    }
  }

  if (!takeawayText) {
    for (let i = bodyStart; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || /^#{1,3}\s/.test(line) || /^[-*_]{3,}$/.test(line)) continue;
      abstract = line;
      break;
    }
  }

  // Build body markdown: title H1 + body lines without the takeaway marker.
  const rawBody = lines.slice(bodyStart);
  const cleaned =
    takeawayLineIdx >= 0 ? rawBody.filter((_, j) => j !== takeawayLineIdx - bodyStart) : rawBody;
  const markdown = `# ${title}\n\n${cleaned.join("\n")}`.trim();

  return { title, abstract, isTakeaway, takeawayText, markdown };
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function readTime(text: string): string {
  const wpm = 200;
  const minutes = Math.max(1, Math.round(wordCount(text) / wpm));
  return `${minutes} min read`;
}

function Chip({ icon: Icon, label, color }: { icon: typeof Tag; label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium" style={{ background: `${color}1a`, border: `1px solid ${color}33`, color }}>
      <Icon className="h-3 w-3" />
      <span className="truncate max-w-[160px]">{label}</span>
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function jobStatusLabel(status: ArticleJob["status"]): {
  label: string;
  color: string;
  pulse?: boolean;
} {
  switch (status) {
    case "completed":
      return { label: "Completed", color: "var(--accent-emerald, #10b981)" };
    case "running":
      return { label: "Running", color: "var(--accent-blue, #3b82f6)", pulse: true };
    case "pending":
      return { label: "Pending", color: "var(--text-muted)" };
    case "failed":
      return { label: "Failed", color: "var(--text-error, #ef4444)" };
    default:
      return { label: status, color: "var(--text-muted)" };
  }
}

const JOB_ENDPOINT = "/article-jobs/";

function DefaultPageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function ArticleRead({ PageLoader: PageLoaderProp }: Props) {
  const PageLoader = PageLoaderProp ?? DefaultPageLoader;
  const params = useParams<{ jobId?: string; id?: string }>();
  const jobId = params.jobId ?? params.id;
  const navigate = useNavigate();
  const [job, setJob] = useState<ArticleJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<string>("");

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}${JOB_ENDPOINT}${encodeURIComponent(jobId)}`, { headers: { Accept: "application/json" } })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load (${r.status})`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setJob(data);
        contentRef.current = data.content || data.contentMarkdown || "";
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [ jobId ]);

  const meta = useMemo(() => {
    if (!job) return null;
    const raw = job.content || (job as { contentMarkdown?: string }).contentMarkdown || "";
    return parseMeta(raw, job.topic);
  }, [ job ]);

  const tocMemo = useMemo(() => (meta ? parseToc(meta.markdown) : []), [ meta ]);

  const handleNavigate = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleCopyMarkdown = async () => {
    if (!job) return;
    const raw = job.content || (job as { contentMarkdown?: string }).contentMarkdown || "";
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may be unavailable in insecure contexts.
    }
  };

  const handlePrint = () => window.print();

  // Keyboard shortcuts.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handlePrint();
      } else if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        handleCopyMarkdown();
      } else if (e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        navigate("/articles");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={smoothTransition} className="min-h-[60vh]">
        <PageLoader />
      </motion.div>
    );
  }

  if (error || !job || !meta) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={smoothTransition}
        className="flex flex-col items-center justify-center py-20 px-4"
      >
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
          <AlertTriangle className="h-7 w-7 text-[var(--text-error, #ef4444)]" />
        </div>
        <h2 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">Could not load article</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-5 text-center max-w-md">{error || "This article job could not be found."}</p>
        <button onClick={() => navigate("/articles")} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-[var(--text-on-accent)]" style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}>
          <ArrowLeft className="h-4 w-4" /> Back to articles
        </button>
      </motion.div>
    );
  }

  const status = jobStatusLabel(job.status);
  const rawContent = job.content || (job as { contentMarkdown?: string }).contentMarkdown || "";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={smoothTransition}>
      {/* Top action bar */}
      <div className="print:hidden sticky top-0 z-40 mb-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3" style={{ background: "rgba(var(--bg-surface-rgb, 15,23,42), 0.7)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--glass-border)" }}>
        <button
          onClick={() => navigate("/articles")}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors duration-200"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border-light)", color: "var(--text-secondary)" }}
        >
          <ArrowLeft className="h-4 w-4" /> Back to articles
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors duration-200"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border-light)", color: "var(--text-secondary)" }}
            title="Copy markdown (Alt+C)"
          >
            {copied ? <Check className="h-4 w-4 text-[var(--accent-emerald,#10b981)]" /> : <Copy className="h-4 w-4" />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy markdown"}</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors duration-200"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border-light)", color: "var(--text-secondary)" }}
            title="Print (Alt+P)"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="mb-8 print:mb-4">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Chip icon={Layers} label={job.topic} color="var(--accent-cyan, #06b6d4)" />
          <Chip icon={Tag} label={job.deckId != null ? `Deck #${job.deckId}` : "General"} color="var(--accent-violet, #a78bfa)" />
        </div>
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] leading-tight mb-4 tracking-tight">
          {meta.title}
        </h1>
        {(meta.abstract || meta.takeawayText) && (
          <p className="text-[var(--text-muted)] text-base max-w-3xl leading-relaxed">
            {meta.isTakeaway ? meta.takeawayText : meta.abstract}
          </p>
        )}
      </div>

      {/* 3-col reader layout */}
      <div className="flex gap-8">
        {/* Left TOC */}
        <ArticleToc entries={tocMemo} onNavigate={handleNavigate} />

        {/* Center article */}
        <div className="flex-1 min-w-0 max-w-3xl">
          <ArticleReader meta={meta} />
        </div>

        {/* Right meta rail */}
        <aside className="hidden xl:block w-60 shrink-0 print:hidden">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-2xl p-4" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">Details</p>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-[var(--text-muted)] text-xs mb-0.5">Topic</dt>
                  <dd className="text-[var(--text-primary)] font-medium">{job.topic}</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)] text-xs mb-0.5">Deck</dt>
                  <dd className="text-[var(--text-primary)] font-medium">#{job.deckId}</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)] text-xs mb-0.5">Created</dt>
                  <dd className="text-[var(--text-primary)] font-medium">{formatDate(job.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)] text-xs mb-0.5">Status</dt>
                  <dd className="flex items-center gap-1.5 font-medium" style={{ color: status.color }}>
                    {status.pulse && <span className="inline-block h-2 w-2 rounded-full animate-pulse" style={{ background: status.color }} />}
                    {status.label}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl p-4" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">Reading</p>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  <span className="text-[var(--text-primary)] font-medium">{wordCount(rawContent).toLocaleString()} words</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  <span className="text-[var(--text-primary)] font-medium">{readTime(rawContent)}</span>
                </div>
              </dl>
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}
