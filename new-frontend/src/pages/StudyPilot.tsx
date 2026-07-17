/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect, useRef } from "react";
import {
  Upload, FileText, Image as ImageIcon, Type, Sparkles,
  Loader2, CalendarClock, Layers, PlayCircle, ClipboardCheck, ArrowRight,
  History, Library, Check,
} from "lucide-react";
import * as api from "../lib/api";
import * as sp from "../lib/studypilotApi";
import { ocrImage } from "../lib/ocr";
import { ApiError } from "../lib/api";
import { extractPdfTextClient } from "../lib/pdfExtractClient";
import PlanView from "../components/studypilot/PlanView";
import StudySession from "../components/studypilot/StudySession";

type Tab = "upload" | "plan" | "study" | "due" | "library";

const LS_KEY = "studypilot-session";

interface PersistedSession {
  tab: Tab;
  source: "text" | "pdf" | "image";
  title: string;
  text: string;
  fileName: string;
  lastIngest: sp.StudyPilotIngestResult | null;
  planId: number | null;
  lastModuleDeckId: number | null;
  lastModuleName: string | null;
}

function loadSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedSession;
  } catch {
    return null;
  }
}

function saveSession(s: PersistedSession) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export default function StudyPilotPage() {
  const [tab, setTabState] = useState<Tab>("upload");
  const [plan, setPlan] = useState<sp.StudyPilotPlan | null>(null);
  const [studyPlan, setStudyPlan] = useState<sp.StudyPilotPlan | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [resume, setResume] = useState<PersistedSession | null>(null);
  const [source, setSource] = useState<"text" | "pdf" | "image">("text");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [fileName, setFileName] = useState("");

  const sessionRef = useRef<PersistedSession>({
    tab: "upload", source: "text", title: "", text: "", fileName: "",
    lastIngest: null, planId: null, lastModuleDeckId: null, lastModuleName: null,
  });

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3500);
  };

  const persist = useCallback((patch: Partial<PersistedSession>) => {
    sessionRef.current = { ...sessionRef.current, ...patch };
    saveSession(sessionRef.current);
  }, []);

  const setTab = (t: Tab) => { setTabState(t); persist({ tab: t }); };

  useEffect(() => {
    (async () => {
      try {
        const { plan } = await sp.studypilotApi.getPlan();
        if (plan) setPlan(plan);
      } catch { /* ignore */ }
    })();
    const saved = loadSession();
    if (saved) {
      sessionRef.current = saved;
      setTabState(saved.tab);
      setSource(saved.source);
      setTitle(saved.title);
      setText(saved.text);
      setFileName(saved.fileName);
      setResume(saved);
    }
  }, []);

  const handleIngested = (r: sp.StudyPilotIngestResult) => {
    persist({ lastIngest: r, text, title, source, fileName });
    const src = r.usedAi ? "AI-generated" : "Heuristic (offline)";
    flash(`Created ${r.cardCount} cards across ${r.moduleCount} modules · ${src}`);
    setTab("plan");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: "rgba(124,58,237,0.15)" }}>
            <Sparkles className="w-6 h-6" style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">StudyPilot</h1>
            <p className="text-text-secondary text-sm">
              Turn notes, PDFs, or images into a deadline-driven study plan with spaced repetition.
            </p>
          </div>
        </div>

        {resume && (resume.lastIngest || resume.planId) && (
          <button
            onClick={() => {
              if (resume.planId) {
                sp.studypilotApi.getPlan(resume.planId).then(({ plan }) => plan && setPlan(plan)).catch(() => {});
              }
              setTab(resume.tab);
            }}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border"
            style={{ borderColor: "rgba(34,197,94,0.4)", background: "rgba(34,197,94,0.10)", color: "#86efac" }}
          >
            <History className="w-4 h-4" /> Continue where you left off
            {resume.lastIngest ? ` · ${resume.lastIngest.cardCount} cards` : ""}
            {resume.planId ? ` · plan #${resume.planId}` : ""}
          </button>
        )}

        <div className="flex gap-2 mt-5 flex-wrap">
          {([
            ["upload", "Import", Upload],
            ["library", "Library", Library],
            ["plan", "Plan", CalendarClock],
            ["study", "Study", PlayCircle],
            ["due", "Due & New", ClipboardCheck],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id as Tab)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors"
              style={{
                borderColor: tab === id ? "var(--accent-primary)" : "rgba(255,255,255,0.1)",
                background: tab === id ? "rgba(124,58,237,0.15)" : "transparent",
                color: tab === id ? "#fff" : "var(--text-secondary)",
              }}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-text-secondary mb-6">
        <Sparkles className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#a78bfa" }} />
        <span>
          AI-powered study assistant — cards are generated with a local AI model and fall back to offline
          heuristics when the model is unavailable. Review the results and edit as needed.
        </span>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] text-white text-sm shadow-lg">
          {toast}
        </div>
      )}

      {tab === "upload" && (
        <UploadPanel
          source={source}
          text={text}
          title={title}
          fileName={fileName}
          onSourceChange={(s) => { setSource(s); persist({ source: s, text: "", fileName: "" }); }}
          onTextChange={(t) => { setText(t); persist({ text: t }); }}
          onTitleChange={(t) => { setTitle(t); persist({ title: t }); }}
          onFileNameChange={(f) => { setFileName(f); persist({ fileName: f }); }}
          onIngested={handleIngested}
        />
      )}
      {tab === "plan" && <PlanTab plan={plan} onPlanned={(p) => { setPlan(p); persist({ planId: p.id }); }} onGoStudy={(p) => { setStudyPlan(p); setTab("study"); }} />}
      {tab === "study" && (
        <StudyTab
          plan={studyPlan}
          onOpenModule={(deckId, name) => persist({ lastModuleDeckId: deckId, lastModuleName: name })}
        />
      )}
      {tab === "due" && <DueTab />}
      {tab === "library" && <LibraryTab onCloned={() => setTab("plan")} flash={flash} />}
    </div>
  );
}

/* ----------------------------- Upload ----------------------------- */
function UploadPanel({
  source, text, title, fileName,
  onSourceChange, onTextChange, onTitleChange, onFileNameChange, onIngested,
}: {
  source: "text" | "pdf" | "image";
  text: string;
  title: string;
  fileName: string;
  onSourceChange: (s: "text" | "pdf" | "image") => void;
  onTextChange: (t: string) => void;
  onTitleChange: (t: string) => void;
  onFileNameChange: (f: string) => void;
  onIngested: (r: sp.StudyPilotIngestResult) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePdf(file: File) {
    setBusy(true); setError(null); onFileNameChange(file.name);
    try {
      // pdfjs runs in the browser and reconstructs proper line breaks (the
      // Worker edge extractor returns one character per line for many PDFs).
      const res = await extractPdfTextClient(file);
      onTextChange(res.text);
      if (!res.text.trim()) {
        setError("No text could be extracted. This PDF may be scanned/image-based — try the image (OCR) option instead.");
      }
    } catch {
      try {
        const res = await api.extractApi.extractPDF(file);
        onTextChange(res.text);
        if (!res.text.trim()) {
          setError("No text could be extracted. This PDF may be scanned/image-based — try the image (OCR) option instead.");
        }
      } catch (err2) {
        setError(err2 instanceof ApiError ? err2.message : "PDF extraction failed");
      }
    } finally { setBusy(false); }
  }

  async function handleImage(file: File) {
    setBusy(true); setError(null); setOcrProgress(0); onFileNameChange(file.name);
    try {
      const txt = await ocrImage(file, setOcrProgress);
      onTextChange(txt);
      if (!txt.trim()) setError("OCR returned no text. Try a clearer image or type the text manually below.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "OCR failed");
    } finally { setBusy(false); setOcrProgress(null); }
  }

  async function submit() {
    if (!text.trim()) { setError("Add some text, a PDF, or an image first."); return; }
    setBusy(true); setError(null);
    try {
      const res = await sp.studypilotApi.ingest({ source, text, title: title || undefined });
      onIngested(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ingestion failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
          {([
            ["text", "Paste text", Type],
            ["pdf", "Upload PDF", FileText],
            ["image", "Image (OCR)", ImageIcon],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => { onSourceChange(id); onTextChange(""); onFileNameChange(""); setError(null); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border"
              style={{
                borderColor: source === id ? "var(--accent-primary)" : "rgba(255,255,255,0.1)",
                background: source === id ? "rgba(124,58,237,0.15)" : "transparent",
                color: source === id ? "#fff" : "var(--text-secondary)",
              }}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
      </div>

          {source === "pdf" && (
            <div className="rounded-2xl border border-dashed border-white/20 p-6 text-center">
              <input
                type="file" accept="application/pdf"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdf(f); }}
                className="hidden" id="pdf-input"
              />
              <label htmlFor="pdf-input" className="cursor-pointer inline-flex items-center gap-2 text-text-secondary">
                <Upload className="w-5 h-5" /> Choose a PDF (text-based, ≤ 2 MB)
              </label>
              {fileName && <p className="mt-2 text-sm text-text-primary">{fileName}</p>}
            </div>
          )}

          {source === "image" && (
        <div className="rounded-2xl border border-dashed border-white/20 p-6 text-center">
          <input
            type="file" accept="image/*"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f); }}
            className="hidden" id="img-input"
          />
          <label htmlFor="img-input" className="cursor-pointer inline-flex items-center gap-2 text-text-secondary">
            <Upload className="w-5 h-5" /> Choose an image (OCR runs in your browser)
          </label>
          {ocrProgress !== null && (
            <div className="mt-3 max-w-xs mx-auto">
              <div className="h-1.5 rounded-full bg-black/30 overflow-hidden">
                <div className="h-full bg-[var(--accent-primary)] transition-all" style={{ width: `${Math.round(ocrProgress * 100)}%` }} />
              </div>
              <p className="text-xs text-text-secondary mt-1">OCR {Math.round(ocrProgress * 100)}%…</p>
            </div>
          )}
          {fileName && ocrProgress === null && <p className="mt-2 text-sm text-text-primary">{fileName}</p>}
          <p className="mt-3 text-xs text-amber-300/80">OCR may be imperfect — review & edit the text below before importing.</p>
        </div>
      )}

      <div>
          <label className="text-sm text-text-secondary block mb-1">Material title (optional)</label>
          <input
            value={title} onChange={(e) => onTitleChange(e.target.value)}
            placeholder="e.g. Cell Biology Chapter 4"
            className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-text-primary outline-none focus:border-[var(--accent-primary)]"
          />
        </div>

        <div>
          <label className="text-sm text-text-secondary block mb-1">
            {source === "text" ? "Paste your notes below" : "Extracted text (editable)"}
          </label>
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            rows={12}
          placeholder={source === "text" ? "Paste lecture notes, textbook excerpts, or any study text…" : "Extracted text will appear here; edit if needed."}
          className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-text-primary outline-none focus:border-[var(--accent-primary)] font-mono text-sm resize-y"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={submit} disabled={busy}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-white disabled:opacity-50"
        style={{ background: "var(--accent-primary)" }}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        Generate cards & modules
      </button>
    </div>
  );
}

/* ----------------------------- Plan ----------------------------- */
function PlanTab({ plan, onPlanned, onGoStudy }: {
  plan: sp.StudyPilotPlan | null;
  onPlanned: (p: sp.StudyPilotPlan) => void;
  onGoStudy: (p: sp.StudyPilotPlan) => void;
}) {
  const [dailyMinutes, setDailyMinutes] = useState(30);
  const [deadline, setDeadline] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modules, setModules] = useState<sp.StudyPilotModule[]>([]);

  const loadModules = useCallback(async () => {
    try { const { modules } = await sp.studypilotApi.getModules(); setModules(modules); }
    catch { /* ignore */ }
  }, []);

  useEffect(() => { loadModules(); }, [loadModules]);

  // Default deadline = 7 days out.
  useEffect(() => {
    if (!deadline) {
      const d = new Date(); d.setDate(d.getDate() + 7);
      setDeadline(d.toISOString().slice(0, 16));
    }
  }, [deadline]);

  async function build() {
    if (!deadline) { setError("Pick a deadline."); return; }
    setBusy(true); setError(null);
    try {
      const p = await sp.studypilotApi.plan({ dailyMinutes, deadline: new Date(deadline).toISOString(), title: title || undefined });
      onPlanned(p);
      flashMsg("Plan created");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to build plan");
    } finally { setBusy(false); }
  }

  const [msg, setMsg] = useState<string | null>(null);
  const flashMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2500); };

  return (
    <div className="space-y-6">
      {plan && (
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-card,#0b1220)] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-text-primary">Current plan: {plan.title}</h3>
            <button onClick={() => onGoStudy(plan)} className="inline-flex items-center gap-1 text-sm text-[var(--accent-primary)]">
              Study now <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <PlanView plan={plan} />
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-[var(--bg-card,#0b1220)] p-5 space-y-4">
        <h3 className="font-semibold text-text-primary">Build a new plan</h3>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-text-secondary block mb-1">Daily minutes</label>
            <input type="number" min={5} max={1440} value={dailyMinutes}
              onChange={(e) => setDailyMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-text-primary outline-none focus:border-[var(--accent-primary)]" />
          </div>
          <div>
            <label className="text-sm text-text-secondary block mb-1">Deadline</label>
            <input type="datetime-local" value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-text-primary outline-none focus:border-[var(--accent-primary)]" />
          </div>
          <div>
            <label className="text-sm text-text-secondary block mb-1">Plan title (optional)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Exam prep"
              className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-text-primary outline-none focus:border-[var(--accent-primary)]" />
          </div>
        </div>

        <div>
          <label className="text-sm text-text-secondary block mb-2">
            Modules to include ({modules.length})
          </label>
          {modules.length === 0 ? (
            <p className="text-sm text-text-muted">No modules yet — import material first (Upload tab).</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {modules.map((m) => (
                <li key={m.deckId} className="px-3 py-1.5 rounded-full text-xs border border-white/10 text-text-secondary">
                  {m.name} · {m.cardCount} · {m.difficulty}
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {msg && <p className="text-sm text-green-400">{msg}</p>}

        <button
          onClick={build} disabled={busy || modules.length === 0}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--accent-primary)" }}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
          Create plan
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- Study ----------------------------- */
function StudyTab({
  plan,
  onOpenModule,
}: {
  plan: sp.StudyPilotPlan | null;
  onOpenModule: (deckId: number, name: string) => void;
}) {
  // Plan-driven step-by-step study: walk the saved plan's modules in order.
  const [planModules, setPlanModules] = useState<sp.StudyPilotPlanModule[] | null>(null);
  const [step, setStep] = useState(0);
  const [session, setSession] = useState<{ cards: any[]; title: string; moduleIndex: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // All-decks fallback mode (no active plan).
  const [modules, setModules] = useState<sp.StudyPilotModule[]>([]);
  const [active, setActive] = useState<{ cards: any[]; title: string } | null>(null);

  const loadPlanModules = useCallback(async () => {
    if (!plan) return;
    setLoading(true); setError(null);
    try {
      const { modules: pm } = await sp.studypilotApi.getPlanCards(plan.id);
      setPlanModules(pm);
      setStep(0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load plan cards");
    } finally { setLoading(false); }
  }, [plan]);

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    try { const { modules } = await sp.studypilotApi.getModules(); setModules(modules); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Failed to load modules"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (plan) loadPlanModules();
    else loadAll();
  }, [plan, loadPlanModules, loadAll]);

  async function openModule(deckId: number, name: string) {
    onOpenModule(deckId, name);
    setLoading(true);
    try {
      const cards = await api.cardsApi.list(deckId);
      setActive({ cards, title: name });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load cards");
    } finally { setLoading(false); }
  }

  function startStep(i: number) {
    if (!planModules) return;
    const m = planModules[i];
    if (!m || m.cards.length === 0) {
      // Skip empty modules.
      if (i + 1 < (planModules?.length ?? 0)) startStep(i + 1);
      return;
    }
    setStep(i);
    setSession({ cards: m.cards, title: m.name, moduleIndex: i });
  }

  function finishStep() {
    setSession(null);
    if (planModules && step + 1 < planModules.length) startStep(step + 1);
  }

  // ── Plan-driven step-by-step study view ──
  if (plan && planModules) {
    if (session) {
      return (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setSession(null)} className="text-sm text-text-secondary inline-flex items-center gap-1">
              ← Stop & back to steps
            </button>
            <span className="text-xs text-text-muted">
              Step {session.moduleIndex + 1} / {planModules.length} · {plan.title}
            </span>
          </div>
          <StudySession cards={session.cards} title={session.title} onDone={finishStep} />
        </div>
      );
    }
    const allDone = step >= planModules.length;
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text-primary">Study your plan · {plan.title}</h3>
          <button onClick={loadPlanModules} className="text-sm text-text-secondary">Reload</button>
        </div>
        <p className="text-sm text-text-secondary">
          Step through each module in study order (easy → hard). Each card includes an AI explanation when available.
        </p>
        <ol className="space-y-2">
          {planModules.map((m, i) => {
            const done = i < step && !allDone ? false : i < step;
            const isCurrent = i === step && !allDone;
            return (
              <li key={m.deckId}>
                <button
                  disabled={m.cards.length === 0}
                  onClick={() => startStep(i)}
                  className="w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-colors disabled:opacity-40"
                  style={{
                    borderColor: isCurrent ? "var(--accent-primary)" : "rgba(255,255,255,0.1)",
                    background: isCurrent ? "rgba(124,58,237,0.15)" : "var(--bg-card,#0b1220)",
                  }}
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: isCurrent ? "var(--accent-primary)" : "rgba(255,255,255,0.08)",
                      color: isCurrent ? "#fff" : "var(--text-secondary)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <Layers className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
                  <span className="flex-1">
                    <span className="block text-text-primary font-medium">{m.name}</span>
                    <span className="text-xs text-text-secondary">{m.cardCount} cards · {m.difficulty}</span>
                  </span>
                  {isCurrent
                    ? <PlayCircle className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
                    : <ArrowRight className="w-4 h-4 text-text-muted" />}
                </button>
              </li>
            );
          })}
        </ol>
        {allDone && (
          <div className="rounded-2xl border border-white/10 bg-[var(--bg-card,#0b1220)] p-6 text-center">
            <Check className="w-10 h-10 mx-auto mb-2" style={{ color: "var(--accent-primary)" }} />
            <p className="text-text-primary font-medium">Plan complete!</p>
            <p className="text-sm text-text-secondary mt-1">You've stepped through every module in this plan.</p>
          </div>
        )}
      </div>
    );
  }

  // ── Fallback: study any module (no active plan) ──
  if (active) {
    return (
      <div>
        <button onClick={() => setActive(null)} className="text-sm text-text-secondary mb-4 inline-flex items-center gap-1">
          ← Back to modules
        </button>
        <StudySession cards={active.cards} title={active.title} onDone={() => setActive(null)} />
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-semibold text-text-primary mb-3">Study a module</h3>
      {loading && <Loader2 className="w-5 h-5 animate-spin text-text-secondary" />}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!loading && modules.length === 0 && <p className="text-text-muted">No modules yet — import material first.</p>}
      <ul className="space-y-2">
        {modules.map((m) => (
          <li key={m.deckId}>
            <button
              onClick={() => openModule(m.deckId, m.name)}
              className="w-full flex items-center gap-3 rounded-xl border border-white/10 bg-[var(--bg-card,#0b1220)] p-4 hover:border-[var(--accent-primary)] transition-colors text-left"
            >
              <Layers className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
              <span className="flex-1">
                <span className="block text-text-primary font-medium">{m.name}</span>
                <span className="text-xs text-text-secondary">{m.cardCount} cards · {m.difficulty}</span>
              </span>
              <PlayCircle className="w-5 h-5 text-text-secondary" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------------------- Due ----------------------------- */
function DueTab() {
  const [cards, setCards] = useState<sp.StudyPilotDueCard[]>([]);
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try { const r = await sp.studypilotApi.getDue(); setCards(r.cards); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Failed to load due cards"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  if (active && cards.length > 0) {
    return (
      <div>
        <button onClick={() => setActive(false)} className="text-sm text-text-secondary mb-4 inline-flex items-center gap-1">
          ← Back
        </button>
        <StudySession cards={cards} title="Due & new reviews" onDone={() => { setActive(false); load(); }} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text-primary">Due & new reviews</h3>
        <button onClick={load} className="text-sm text-text-secondary">Refresh</button>
      </div>
      {loading && <Loader2 className="w-5 h-5 animate-spin text-text-secondary" />}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!loading && cards.length === 0 && <p className="text-text-muted">Nothing due. Import material and study to build your review queue.</p>}
      {cards.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">{cards.length} card(s) ready (due + new).</p>
          <button
            onClick={() => setActive(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-white"
            style={{ background: "var(--accent-primary)" }}
          >
            <ClipboardCheck className="w-4 h-4" /> Start review
          </button>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Library ----------------------------- */
function LibraryTab({ onCloned, flash }: { onCloned: () => void; flash: (m: string) => void }) {
  const [decks, setDecks] = useState<sp.LibraryDeck[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<sp.LibraryDeckDetail | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [cloneBusyId, setCloneBusyId] = useState<number | null>(null);

  const load = useCallback(async (cat?: string, search?: string) => {
    setLoading(true); setError(null);
    try {
      const { decks, categories } = await sp.studypilotApi.getLibrary({
        category: cat || undefined,
        q: search || undefined,
      });
      setDecks(decks);
      setCategories(categories);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load library");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(category, q); }, [load, category, q]);

  async function openPreview(id: number) {
    setPreviewBusy(true);
    try {
      const detail = await sp.studypilotApi.getLibraryDeck(id);
      setPreview(detail);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load deck");
    } finally { setPreviewBusy(false); }
  }

  async function clone(id: number, cardCount: number) {
    setCloneBusyId(id);
    try {
      await sp.studypilotApi.cloneLibraryDeck(id);
      flash(`Cloned ${cardCount} cards into your decks`);
      onCloned();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to clone deck");
    } finally { setCloneBusyId(null); }
  }

  const difficultyColor: Record<string, string> = {
    easy: "#86efac",
    medium: "#fcd34d",
    hard: "#fca5a5",
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the library…"
          className="flex-1 min-w-[180px] px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-text-primary outline-none focus:border-[var(--accent-primary)]"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-text-primary outline-none focus:border-[var(--accent-primary)]"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {loading && <Loader2 className="w-5 h-5 animate-spin text-text-secondary" />}
      {!loading && decks.length === 0 && (
        <p className="text-text-muted">No library decks found.</p>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {decks.map((d) => (
          <div key={d.id} className="rounded-2xl border border-white/10 bg-[var(--bg-card,#0b1220)] p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-text-primary">{d.name}</h3>
                <p className="text-xs text-text-secondary">{d.category} · {d.cardCount} cards</p>
              </div>
              {d.difficulty && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: "rgba(255,255,255,0.06)", color: difficultyColor[d.difficulty] || "#fff" }}
                >
                  {d.difficulty}
                </span>
              )}
            </div>
            {d.description && <p className="text-sm text-text-secondary line-clamp-2">{d.description}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => openPreview(d.id)}
                disabled={previewBusy}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-white/10 text-text-secondary hover:border-[var(--accent-primary)] transition-colors"
              >
                Preview
              </button>
              <button
                onClick={() => clone(d.id, d.cardCount)}
                disabled={cloneBusyId === d.id}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "var(--accent-primary)" }}
              >
                {cloneBusyId === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Library className="w-4 h-4" />}
                Clone to my decks
              </button>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreview(null)}>
          <div
            className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl border border-white/10 bg-[var(--bg-card,#0b1220)] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-text-primary">{preview.deck.name}</h3>
                <p className="text-xs text-text-secondary">{preview.deck.cardCount} cards</p>
              </div>
              <button onClick={() => setPreview(null)} className="text-text-secondary text-sm">Close</button>
            </div>
            {preview.deck.description && <p className="text-sm text-text-secondary mb-3">{preview.deck.description}</p>}
            <ul className="space-y-2">
              {preview.cards.map((c) => (
                <li key={c.id} className="rounded-xl border border-white/10 p-3">
                  <p className="text-text-primary text-sm">{c.front}</p>
                  <p className="text-text-secondary text-sm mt-1">{c.back}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
