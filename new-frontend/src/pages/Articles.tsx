import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, GraduationCap, Loader2, Layers, FileText } from "lucide-react";
import * as api from "../lib/api";
import { useToast } from "../components/Toast";
import { Modal } from "../components/ui";
import { TopicCard } from "../components/articles/TopicCard";
import { ArticleJobCard } from "../components/articles/ArticleJobCard";
import { EmptyScanState } from "../components/articles/EmptyScanState";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const glassStyle = {
  background: "var(--glass-card-bg)",
  border: "1px solid var(--glass-border)",
  backdropFilter: "blur(20px)",
} as const;

export default function Articles() {
  const { toast } = useToast();

  const [decks, setDecks] = useState<api.Deck[]>([]);
  const [decksLoading, setDecksLoading] = useState(true);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);

  const [topics, setTopics] = useState<api.ArticleTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);

  const [jobs, setJobs] = useState<api.ArticleJob[]>([]);
  const [topicStatuses, setTopicStatuses] = useState<Record<string, "idle" | "running" | "completed">>({});

  const [readingJob, setReadingJob] = useState<api.ArticleJob | null>(null);
  const streamCleanupRef = useRef<(() => void) | null>(null);

  // Load decks on mount
  useEffect(() => {
    const loadDecks = async () => {
      try {
        setDecksLoading(true);
        const data = await api.decksApi.list();
        setDecks(data);
      } catch (err) {
        toast("Failed to load decks", "error");
        console.error(err);
      } finally {
        setDecksLoading(false);
      }
    };
    loadDecks();
  }, [toast]);

  // Load topics + jobs when a deck is selected
  const loadTopics = useCallback(async (deckId: number) => {
    setTopicsLoading(true);
    try {
      const [topicsRes, jobsRes] = await Promise.all([
        api.articlesApi.getTopics(deckId),
        api.articlesApi.listJobs(deckId),
      ]);
      setTopics(topicsRes.topics);
      setJobs(jobsRes.jobs);

      const statuses: Record<string, "idle" | "running" | "completed"> = {};
      for (const job of jobsRes.jobs) {
        if (job.status === "completed") statuses[job.topic] = "completed";
        else if (job.status === "running" || job.status === "pending") statuses[job.topic] = "running";
      }
      setTopicStatuses(statuses);
    } catch (err) {
      toast("Failed to load topics", "error");
      console.error(err);
    } finally {
      setTopicsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedDeckId !== null) {
      loadTopics(selectedDeckId);
    } else {
      setTopics([]);
      setJobs([]);
      setTopicStatuses({});
    }
  }, [selectedDeckId, loadTopics]);

  // Subscribe to SSE for running jobs
  useEffect(() => {
    const runningJobs = jobs.filter((j) => j.status === "running" || j.status === "pending");
    if (runningJobs.length === 0) return;

    // Subscribe to the most recent running job
    const job = runningJobs[0];
    streamCleanupRef.current?.();
    streamCleanupRef.current = api.articlesApi.streamJob(
      job.id,
      (event, data) => {
        const payload = data as { progress?: number; content?: string; status?: string };
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  progress: payload.progress ?? j.progress,
                  content: payload.content ?? j.content,
                  status: (payload.status as api.ArticleJob["status"]) ?? j.status,
                }
              : j
          )
        );
        if (payload.status === "completed" || payload.status === "failed") {
          setTopicStatuses((prev) => ({
            ...prev,
            [job.topic]: payload.status === "completed" ? "completed" : "idle",
          }));
          if (payload.status === "completed") {
            toast(`Article for "${job.topic}" is ready`, "success");
          }
        }
      },
      (err) => {
        console.error("SSE error:", err);
      }
    );

    return () => {
      streamCleanupRef.current?.();
      streamCleanupRef.current = null;
    };
  }, [jobs, toast]);

  const handleGenerate = async (topic: api.ArticleTopic) => {
    if (selectedDeckId === null) return;
    try {
      const created = await api.articlesApi.createJob(selectedDeckId, topic.name);
      setJobs((prev) => [created.job, ...prev]);
      setTopicStatuses((prev) => ({ ...prev, [topic.name]: "running" }));
      toast(`Generating article for "${topic.name}"…`, "info");
    } catch (err) {
      toast("Failed to start article generation", "error");
      console.error(err);
    }
  };

  const handleDeleteJob = async (id: string) => {
    try {
      await api.articlesApi.deleteJob(id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      toast("Article deleted", "success");
    } catch (err) {
      toast("Failed to delete article", "error");
      console.error(err);
    }
  };

  const selectedDeck = decks.find((d) => d.id === selectedDeckId) || null;

  return (
    <div>
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 relative"
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-2 mb-2"
            >
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-accent-cyan" />
              <span className="text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-accent-cyan">
                Research
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="font-display text-3xl sm:text-4xl font-bold text-text-primary tracking-tight"
            >
              Academic Articles
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-text-secondary text-sm mt-1.5 flex items-center gap-2"
            >
              <span className="inline-flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5 text-accent-purple" />
                AI-generated from your decks
              </span>
            </motion.p>
          </div>
        </div>
      </motion.div>

      <div className="flex gap-6">
        {/* Decks panel */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="shrink-0 w-[260px] hidden lg:block"
        >
          <div className="rounded-2xl p-3 sticky top-20" style={glassStyle}>
            <div className="flex items-center gap-2 mb-3 px-2">
              <Layers className="h-4 w-4 text-accent-cyan" />
              <span className="text-xs font-display font-semibold text-text-secondary tracking-wider uppercase">
                Decks
              </span>
            </div>
            {decksLoading ? (
              <div className="flex items-center justify-center py-8">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                  <Loader2 className="h-5 w-5 text-accent-cyan" />
                </motion.div>
              </div>
            ) : decks.length === 0 ? (
              <p className="text-xs text-text-muted px-2 py-4 text-center">No decks yet</p>
            ) : (
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                {decks.map((deck) => {
                  const active = selectedDeckId === deck.id;
                  return (
                    <motion.button
                      key={deck.id}
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedDeckId(active ? null : deck.id)}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
                      style={{
                        background: active ? "rgba(6, 182, 212, 0.1)" : "transparent",
                        border: active ? "1px solid rgba(6, 182, 212, 0.2)" : "1px solid transparent",
                        color: active ? "var(--accent-cyan)" : "var(--text-secondary)",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate font-medium">{deck.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 pl-5.5">
                        <span className="text-[10px] text-text-muted">{deck.cardCount || 0} cards</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        </motion.aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Mobile deck selector */}
          <div className="lg:hidden mb-4">
            <select
              value={selectedDeckId ?? ""}
              onChange={(e) => setSelectedDeckId(e.target.value ? Number(e.target.value) : null)}
              className="w-full h-11 px-4 rounded-xl text-sm outline-none"
              style={{ background: "var(--glass-input-bg)", border: "1px solid var(--glass-border-light)", color: "var(--text-primary)" }}
            >
              <option value="">Select a deck…</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {selectedDeckId === null ? (
            <EmptyScanState
              title="Select a Deck"
              description="Choose a deck from the panel to view its topics and generate academic articles."
              icon={<GraduationCap className="h-8 w-8 text-accent-cyan" />}
            />
          ) : topicsLoading ? (
            <div className="flex items-center justify-center py-20">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                <Loader2 className="h-8 w-8 text-accent-cyan" />
              </motion.div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Topics section */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-4 w-4 text-accent-purple" />
                  <h2 className="font-display text-lg font-semibold text-text-primary">Topics</h2>
                  <span className="text-xs text-text-muted">· {selectedDeck?.name}</span>
                </div>
                {topics.length === 0 ? (
                  <EmptyScanState
                    title="No Topics Found"
                    description="This deck has no extractable topics yet. Add cards to generate articles."
                  />
                ) : (
                  <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                      {topics.map((topic, idx) => (
                        <TopicCard
                          key={topic.name}
                          topic={topic}
                          index={idx}
                          status={topicStatuses[topic.name] || "idle"}
                          onGenerate={handleGenerate}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </section>

              {/* Generation queue section */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="h-4 w-4 text-accent-amber" />
                  <h2 className="font-display text-lg font-semibold text-text-primary">Generation Queue</h2>
                  {jobs.length > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: "rgba(245, 158, 11, 0.1)", color: "var(--accent-amber)", border: "1px solid rgba(245, 158, 11, 0.15)" }}>
                      {jobs.length}
                    </span>
                  )}
                </div>
                {jobs.length === 0 ? (
                  <EmptyScanState
                    title="No Articles in Queue"
                    description="Generate an article from a topic above to see it here."
                  />
                ) : (
                  <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnimatePresence mode="popLayout">
                      {jobs.map((job) => (
                        <ArticleJobCard
                          key={job.id}
                          job={job}
                          onRead={setReadingJob}
                          onDelete={handleDeleteJob}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      {/* Read article modal */}
      <Modal isOpen={readingJob !== null} onClose={() => setReadingJob(null)} title={readingJob?.topic || "Article"}>
        {readingJob?.content ? (
          <div className="prose prose-sm max-w-none" style={{ color: "var(--text-primary)" }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: (props) => <h1 className="font-display text-2xl font-bold text-text-primary mb-3" {...props} />,
                h2: (props) => <h2 className="font-display text-xl font-bold text-text-primary mt-6 mb-2" {...props} />,
                h3: (props) => <h3 className="font-display text-lg font-semibold text-text-primary mt-4 mb-2" {...props} />,
                p: (props) => <p className="text-text-secondary leading-relaxed mb-3" {...props} />,
                ul: (props) => <ul className="list-disc pl-5 space-y-1 text-text-secondary mb-3" {...props} />,
                ol: (props) => <ol className="list-decimal pl-5 space-y-1 text-text-secondary mb-3" {...props} />,
                li: (props) => <li className="text-text-secondary" {...props} />,
                code: ({ className: cn, children, ...props }) => {
                  const isInline = !cn;
                  return isInline ? (
                    <code className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: "var(--glass-surface)", color: "var(--accent-cyan)", border: "1px solid var(--glass-border)" }} {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className="block p-3 rounded-xl text-xs font-mono overflow-x-auto" style={{ background: "var(--glass-surface)", color: "var(--text-primary)", border: "1px solid var(--glass-border)" }} {...props}>
                      {children}
                    </code>
                  );
                },
                blockquote: (props) => (
                  <blockquote className="border-l-2 pl-4 my-3 italic" style={{ borderColor: "var(--accent-cyan)", color: "var(--text-muted)" }} {...props} />
                ),
              }}
            >
              {readingJob.content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-text-muted">No content available.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
