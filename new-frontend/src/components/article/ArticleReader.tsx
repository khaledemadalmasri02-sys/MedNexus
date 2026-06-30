import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { slugify } from "./ArticleToc";

function toText(nodes: ReactNode): string {
  if (typeof nodes === "string") return nodes;
  if (Array.isArray(nodes)) return nodes.map(toText).join("");
  return "";
}

export interface ArticleMeta {
  title: string;
  abstract?: string;
  isTakeaway: boolean;
  takeawayText?: string;
  markdown: string;
}

// Regex for quiz/self-test heading detection.
const QUIZ_RE = /^(?:##|###)\s*(quiz|self[-\s]?quiz|self[-\s]?test|practice quiz|check your understanding)/i;
function isQuizHeading(line: string): boolean {
  return QUIZ_RE.test(line);
}

type QuizSection = { kind: "md" | "quiz"; heading?: string; body: string };

function splitIntoQuizSections(markdown: string): QuizSection[] {
  const lines = markdown.split("\n");
  const sections: QuizSection[] = [];
  let buf: string[] = [];
  let currentHeading: string | undefined;
  let currentIsQuiz = false;
  const flush = () => {
    if (buf.length === 0 && !currentHeading) return;
    sections.push({
      kind: currentIsQuiz ? "quiz" : "md",
      heading: currentHeading,
      body: buf.join("\n").trim(),
    });
    buf = [];
    currentHeading = undefined;
    currentIsQuiz = false;
  };
  for (const line of lines) {
    const isHeading = /^#{1,3}\s/.test(line);
    if (isHeading) {
      flush();
      currentHeading = line.replace(/^#+\s*/, "").trim();
      currentIsQuiz = isQuizHeading(line);
    } else {
      buf.push(line);
    }
  }
  flush();
  return sections;
}

// Replace inline $...$ math tokens with a placeholder <span class="math">…</span>
// so rehype-raw can render it as inline HTML.
function annotateMath(md: string): string {
  return md.replace(/\$([^$\n]+)\$/g, (_m, expr) => `<span class="math">${expr.trim()}</span>`);
}

interface QuizCardProps {
  heading?: string;
  body: string;
}

function QuizCard({ heading, body }: QuizCardProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-6 rounded-xl overflow-hidden" style={{ background: "var(--glass-card-bg)", border: "1px solid rgba(245, 158, 11, 0.25)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors duration-200 hover:bg-[rgba(245,158,11,0.05)]"
      >
        <span className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(245, 158, 11, 0.12)" }}>
            <Lightbulb className="h-4 w-4 text-[var(--accent-amber, #f59e0b)]" />
          </span>
          <span className="font-semibold text-sm text-[var(--text-primary)]">{heading || "Self-Quiz"}</span>
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-[var(--text-secondary)]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 prose-article">
              <MarkdownBody markdown={body} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MarkdownBody({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        h2: ({ children }) => {
          const id = slugify(toText(children)) || "section";
          return <h2 id={id} className="font-display text-2xl font-bold text-[var(--text-primary)] mt-10 mb-4">{children}</h2>;
        },
        h3: ({ children }) => {
          const id = slugify(toText(children)) || "section";
          return <h3 id={id} className="font-display text-xl font-semibold text-[var(--text-primary)] mt-8 mb-3">{children}</h3>;
        },
        p: ({ children }) => <p className="text-[var(--text-secondary)] leading-relaxed mb-4 text-[1.05rem]">{children}</p>,
        a: ({ href, children }) => (
          <a
            href={href}
            target={href?.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer"
            className="text-[var(--accent-primary)] underline decoration-[var(--accent-primary)]/30 underline-offset-2 hover:decoration-[var(--accent-primary)] transition-colors"
          >
            {children}
          </a>
        ),
        ul: ({ children }) => <ul className="list-disc pl-6 mb-4 text-[var(--text-secondary)] space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 text-[var(--text-secondary)] space-y-1">{children}</ol>,
        li: ({ children }) => <li className="text-[var(--text-secondary)] leading-relaxed">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="my-5 rounded-xl px-5 py-4 italic" style={{ background: "rgba(6, 182, 212, 0.05)", borderLeft: "3px solid var(--accent-cyan, #06b6d4)" }}>
            {children}
          </blockquote>
        ),
        code: ({ className, children }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="px-1.5 py-0.5 rounded text-[0.85em]" style={{ background: "rgba(255,255,255,0.06)", color: "var(--accent-emerald, #10b981)", fontFamily: "var(--font-mono, ui-monospace)" }}>
                {children}
              </code>
            );
          }
          return (
            <code className="block" style={{ fontFamily: "var(--font-mono, ui-monospace)" }}>
              {String(children)}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="my-5 rounded-xl p-4 overflow-x-auto text-sm" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid var(--glass-border)", color: "var(--text-primary)", fontFamily: "var(--font-mono, ui-monospace)" }}>
            {children}
          </pre>
        ),
        hr: () => <hr className="my-8 border-[var(--glass-border)]" />,
        img: ({ src, alt }) => (
          <img src={src} alt={alt} className="my-6 rounded-xl max-w-full" style={{ border: "1px solid var(--glass-border)" }} />
        ),
        table: ({ children }) => (
          <div className="my-5 overflow-x-auto rounded-xl" style={{ border: "1px solid var(--glass-border)" }}>
            <table className="w-full text-sm text-[var(--text-secondary)]">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left font-semibold text-[var(--text-primary)]" style={{ borderBottom: "1px solid var(--glass-border)" }}>{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2" style={{ borderBottom: "1px solid var(--glass-border-light)" }}>{children}</td>
        ),
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}

interface Props {
  meta: ArticleMeta;
}

// Presentational reader: renders header + body markdown with collapsible quizzes.
export default function ArticleReader({ meta }: Props) {
  const processed = annotateMath(meta.markdown);
  const quizSections = splitIntoQuizSections(processed);

  return (
    <article className="prose-article">
      {/* Key Takeaway callout */}
      {meta.isTakeaway && meta.takeawayText && (
        <div className="mb-8 rounded-2xl px-6 py-5" style={{ background: "rgba(16, 185, 129, 0.06)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--accent-emerald, #10b981)] mb-2">Key Takeaway</p>
          <p className="text-[var(--text-primary)] italic leading-relaxed">{meta.takeawayText}</p>
        </div>
      )}

      {/* Abstract blockquote fallback (non-takeaway abstract) */}
      {!meta.isTakeaway && meta.abstract && (
        <blockquote className="mb-8 rounded-2xl px-6 py-5 italic" style={{ background: "rgba(6, 182, 212, 0.05)", borderLeft: "3px solid var(--accent-cyan, #06b6d4)" }}>
          <p className="text-[var(--text-secondary)]">{meta.abstract}</p>
        </blockquote>
      )}

      {/* Render sections: markdown blocks or quizzes */}
      {quizSections.map((s, i) =>
        s.kind === "quiz" ? (
          <QuizCard key={i} heading={s.heading} body={s.body} />
        ) : (
          <MarkdownBody key={i} markdown={annotateMath(s.body)} />
        )
      )}
    </article>
  );
}
