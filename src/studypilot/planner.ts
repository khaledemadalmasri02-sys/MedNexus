// StudyPilot planner — pure, side-effect-free heuristics.
//
// IMPORTANT: This is a heuristic study planner, NOT a tutor or an LLM. It uses
// simple keyword/co-occurrence heuristics to split text into cards, guess the
// card type and difficulty, cluster cards into coarse "modules", and spread the
// work across days before a deadline. The output is approximate and should be
// presented to the user as such.

export type CardType = "definition" | "formula" | "problem";
export type Difficulty = "easy" | "medium" | "hard";

export interface RawCard {
  /** Recall prompt shown to the learner (templated). */
  front: string;
  /** Templated explanation shown after recall. */
  back: string;
  /** Original raw text chunk this card was built from. */
  raw: string;
  cardType: CardType;
  difficulty: Difficulty;
  /** Topic keywords detected for this card. */
  topics: string[];
}

export interface ModuleCluster {
  name: string;
  topics: string[];
  difficulty: Difficulty;
  cards: RawCard[];
}

const STOPWORDS = new Set(
  "the a an and or but of to in on at for with as is are was were be been being this that these those it its by from into we you they he she them his her their our your i not no can will would should could may might must do does did has have had if then than so such also which who whom what when where why how all any each more most other some only own same".split(
    " "
  )
);

const HARD_WORDS = ["prove", "derive", "analyze", "analyse", "complex", "solve", "calculate", "evaluate", "justify", "critique"];
const EASY_WORDS = ["define", "list", "name", "state", "identify", "recall", "describe", "mention"];

function normalizeToken(w: string): string {
  return w.toLowerCase().replace(/[^a-z0-9+#-]/g, "");
}

/** Clean and tokenize text, dropping stopwords and short tokens. */
function tokenize(text: string): string[] {
  return text
    .split(/\s+/)
    .map(normalizeToken)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

export function detectType(text: string): CardType {
  const lower = text.toLowerCase();
  if (
    /[=:]/.test(text) &&
    /(=|≈|formula|given by|equation|rate|velocity|force|energy|mass|volume|area|pressure)/.test(lower)
  ) {
    return "formula";
  }
  if (/\b(problem|question|scenario|patient|case|calculate|solve|given that)\b/.test(lower)) {
    return "problem";
  }
  if (/\b(is defined as|refers to|means|are called|definition|is a |is an |is the |are the )\b/.test(lower)) {
    return "definition";
  }
  // Heuristic: a sentence ending with a colon or starting with a term + ":"
  if (/:\s*$/.test(text.trim()) || /^(what|who|where|when|why|how)\b/i.test(text.trim())) {
    return "definition";
  }
  return "definition";
}

export function detectDifficulty(text: string): Difficulty {
  const lower = text.toLowerCase();
  if (HARD_WORDS.some((w) => new RegExp(`\\b${w}\\b`).test(lower))) return "hard";
  if (EASY_WORDS.some((w) => new RegExp(`\\b${w}\\b`).test(lower))) return "easy";
  const words = text.split(/\s+/).length;
  if (words > 180) return "hard";
  if (words < 40) return "easy";
  return "medium";
}

/** Extract top-N topic keywords from a single chunk via TF. */
export function extractTopics(text: string, limit = 5): string[] {
  const counts = new Map<string, number>();
  for (const t of tokenize(text)) {
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([t]) => t);
}

function titleCase(t: string): string {
  return t.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Build a recall prompt (front) and templated explanation (back) from a chunk. */
function buildCard(raw: string): RawCard {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  const cardType = detectType(trimmed);
  const difficulty = detectDifficulty(trimmed);
  const topics = extractTopics(trimmed, 5);

  let front = trimmed;
  let back = trimmed;

  if (cardType === "definition") {
    // Prompt: ask for the definition of the key term. Use first detected topic.
    const term = topics[0] ? titleCase(topics[0]) : "this concept";
    front = `What is ${term}? (definition)`;
    back = `${term}: ${trimmed}`;
  } else if (cardType === "formula") {
    // Prompt: state the formula / variables; back holds the formula text.
    const term = topics[0] ? titleCase(topics[0]) : "this relationship";
    front = `State the formula for ${term} and define its variables.`;
    back = trimmed;
  } else {
    // problem
    front = `Solve / work through:\n${trimmed}`;
    back = `Approach & result:\n${trimmed}`;
  }

  return { front, back, raw: trimmed, cardType, difficulty, topics };
}

/** Split pasted text into individual card chunks. */
export function splitCards(text: string): string[] {
  const cleaned = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .trim();
  if (!cleaned) return [];

  // Explicit "Q:" / "A:" markers take precedence.
  if (/\n\s*Q[:.]?\s/mi.test(cleaned)) {
    const parts = cleaned.split(/\n\s*Q[:.]?\s/mi).map((s) => s.trim()).filter(Boolean);
    return parts.flatMap((p) => {
      const [q, ...rest] = p.split(/\n\s*A[:.]?\s/mi);
      const chunks = [];
      if (q && q.trim()) chunks.push(q.trim());
      const a = rest.join("\n").trim();
      if (a) chunks.push(a);
      return chunks.length ? chunks : [p];
    });
  }

  // Otherwise split on blank lines, then on paragraphs.
  const byBlank = cleaned.split(/\n\s*\n+/).map((s) => s.trim()).filter(Boolean);
  const chunks: string[] = [];
  for (const block of byBlank) {
    // Further split very long blocks on sentence boundaries if > ~400 words.
    const sentences = block.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    let current = "";
    for (const s of sentences) {
      if ((current + " " + s).split(/\s+/).length > 400) {
        if (current) chunks.push(current.trim());
        current = s;
      } else {
        current = current ? current + " " + s : s;
      }
    }
    if (current.trim()) chunks.push(current.trim());
  }
  return chunks.filter((c) => c.split(/\s+/).length >= 3);
}

/** Full ingest: text -> RawCard[]. */
export function ingestText(text: string): RawCard[] {
  return splitCards(text).map(buildCard);
}

function difficultyRank(d: Difficulty): number {
  return d === "easy" ? 0 : d === "medium" ? 1 : 2;
}

function aggregateDifficulty(cards: RawCard[]): Difficulty {
  const ranks = cards.map((c) => difficultyRank(c.difficulty));
  const avg = ranks.reduce((a, b) => a + b, 0) / Math.max(1, ranks.length);
  if (avg < 0.66) return "easy";
  if (avg < 1.66) return "medium";
  return "hard";
}

/**
 * Coarse topic clustering: group cards that share enough top keywords to be the
 * same subject. This is intentionally simple — module names are editable in the
 * UI. The overlap test avoids the old "single shared keyword merges everything"
 * behaviour that produced a few giant catch-all modules.
 *
 * Membership is decided by:
 *   - sharing >= 2 topics, OR
 *   - Jaccard topic overlap >= MIN_TOPIC_OVERLAP (fraction of the smaller topic set)
 * A card is appended to the *best* matching cluster (highest overlap), so the
 * result is order-stable rather than dependent on which card is seen first.
 * Tiny / singleton clusters are folded into the most similar neighbour at the end
 * so "Module 7: xyz" noise is reduced without dropping any cards.
 */
export const MIN_TOPIC_OVERLAP = 0.34;
export const MAX_MODULES = 12;

function topicOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let shared = 0;
  for (const t of a) if (setB.has(t)) shared++;
  const union = new Set([...a, ...b]).size;
  return shared / Math.max(1, union); // Jaccard
}

function topicOverlapCount(a: string[], b: string[]): number {
  const setB = new Set(b);
  return a.reduce((n, t) => (setB.has(t) ? n + 1 : n), 0);
}

function representativeName(cl: ModuleCluster): string {
  if (cl.topics.length === 0) return `Module`;
  // Prefer the most frequent topics across the cluster's cards for a stable name.
  const freq = new Map<string, number>();
  for (const card of cl.cards) {
    for (const t of card.topics) freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  const top = [...freq.entries()].sort((x, y) => y[1] - x[1]).map(([t]) => t);
  return titleCase(top.slice(0, 2).join(" / ")) || titleCase(cl.topics.slice(0, 2).join(" / "));
}

export function clusterModules(cards: RawCard[]): ModuleCluster[] {
  const clusters: ModuleCluster[] = [];

  for (const card of cards) {
    let bestIdx = -1;
    let bestScore = 0;
    for (let i = 0; i < clusters.length; i++) {
      const shared = topicOverlapCount(card.topics, clusters[i].topics);
      const jac = topicOverlap(card.topics, clusters[i].topics);
      // Score: reward shared topics, fall back to Jaccard for sparse topic sets.
      const score = shared >= 2 ? shared : jac >= MIN_TOPIC_OVERLAP ? 1 + jac : 0;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      clusters[bestIdx].cards.push(card);
      for (const t of card.topics) {
        if (!clusters[bestIdx].topics.includes(t)) clusters[bestIdx].topics.push(t);
      }
    } else {
      clusters.push({
        name: representativeName({
          name: "",
          topics: card.topics,
          difficulty: card.difficulty,
          cards: [card],
        }),
        topics: [...card.topics],
        difficulty: card.difficulty,
        cards: [card],
      });
    }
  }

  // Finalize aggregated difficulty + a stable, representative name per cluster.
  for (const cl of clusters) {
    cl.difficulty = aggregateDifficulty(cl.cards);
    cl.name = representativeName(cl);
  }

  // Fold tiny clusters (<=2 cards) into the most similar neighbour so we don't
  // emit noisy singleton modules, while never dropping a card.
  const merged = mergeSmallClusters(clusters);
  return merged.slice(0, MAX_MODULES);
}

function mergeSmallClusters(clusters: ModuleCluster[]): ModuleCluster[] {
  const SMALL = 2;
  let changed = true;
  const result = clusters.map((c) => ({ ...c, cards: [...c.cards], topics: [...c.topics] }));

  while (changed) {
    changed = false;
    if (result.length <= 1) break;
    for (let i = 0; i < result.length; i++) {
      if (result[i].cards.length > SMALL) continue;
      // Find the best neighbour by topic overlap.
      let bestIdx = -1;
      let bestScore = 0;
      for (let j = 0; j < result.length; j++) {
        if (i === j) continue;
        const score = topicOverlap(result[i].topics, result[j].topics);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = j;
        }
      }
      if (bestIdx >= 0) {
        const src = result[i];
        const dst = result[bestIdx];
        dst.cards.push(...src.cards);
        for (const t of src.topics) if (!dst.topics.includes(t)) dst.topics.push(t);
        result.splice(i, 1);
        // Recompute difficulty + name for the absorbing cluster.
        dst.difficulty = aggregateDifficulty(dst.cards);
        dst.name = representativeName(dst);
        changed = true;
        break;
      }
    }
  }
  return result;
}

/** Order modules easy -> hard (stable tiebreak by card count, desc). */
export function orderModules(clusters: ModuleCluster[]): ModuleCluster[] {
  return [...clusters].sort((a, b) => {
    const dr = difficultyRank(a.difficulty) - difficultyRank(b.difficulty);
    if (dr !== 0) return dr;
    return b.cards.length - a.cards.length;
  });
}

/**
 * Offline fallback explanation for a card (no AI available at all). This is NOT
 * a raw dump: it restructures the card's own front/back into a study-friendly
 * summary (the prompt, the answer material, key points pulled from the text, and
 * a recall tip) so the learner still gets something useful. Used by the Coach
 * only when both the local model and the OpenRouter fallback are unavailable.
 */
export function buildExplanationHeuristic(card: {
  front?: string | null;
  back?: string | null;
  aiFront?: string | null;
  aiBack?: string | null;
}): string {
  const front = (card.aiFront || card.front || "").trim();
  const back = (card.aiBack || card.back || "").trim();

  const lines: string[] = [];

  if (front) {
    lines.push(`## Recall prompt`);
    lines.push("");
    lines.push(front);
    lines.push("");
  }

  if (back) {
    lines.push(`## Answer`);
    lines.push("");
    lines.push(back);
    lines.push("");

    // Pull out sentence-length "key points" so the offline view isn't just a
    // wall of text. Keep only substantive sentences (>= 6 words).
    const sentences = back
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.split(/\s+/).length >= 6);
    if (sentences.length > 1) {
      lines.push(`## Key points`);
      lines.push("");
      for (const s of sentences.slice(0, 6)) lines.push(`- ${s}`);
      lines.push("");
    }
  }

  lines.push(`> _Offline summary — AI explanations are unavailable right now. This reorganizes the card text to help you study; it is not a generated teaching explanation._`);
  return lines.join("\n").trim();
}

export interface ScheduleDay {
  dayIndex: number;
  date: string; // ISO yyyy-mm-dd
  minutes: number;
  moduleNames: string[];
  cardCount: number;
  /** Per-module card counts for this day. */
  modules: Array<{ name: string; cardCount: number }>;
}

// Estimate used to convert a card count into study minutes.
export const MINUTES_PER_CARD = 1.5;

/**
 * Distribute cards across days so the daily load ≈ dailyMinutes, finishing
 * before the deadline. Returns one ScheduleDay per study day plus the total.
 */
export function buildSchedule(
  orderedModules: ModuleCluster[],
  dailyMinutes: number,
  deadline: Date
): { days: ScheduleDay[]; totalCards: number } {
  const totalCards = orderedModules.reduce((s, m) => s + m.cards.length, 0);
  if (totalCards === 0) return { days: [], totalCards: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(deadline);
  end.setHours(0, 0, 0, 0);
  const msPerDay = 24 * 60 * 60 * 1000;
  let totalDays = Math.max(1, Math.round((end.getTime() - today.getTime()) / msPerDay) + 1);
  totalDays = Math.min(totalDays, Math.max(1, Math.ceil((totalCards * MINUTES_PER_CARD) / Math.max(1, dailyMinutes))));

  const days: ScheduleDay[] = [];
  const dayCapacity = Math.max(1, Math.round((totalCards * MINUTES_PER_CARD) / totalDays));

  // Flatten modules (easy→hard) into a single ordered card stream.
  const flat: Array<{ name: string }> = [];
  for (const m of orderedModules) {
    for (let i = 0; i < m.cards.length; i++) flat.push({ name: m.name });
  }

  let cursor = 0;
  for (let d = 0; d < totalDays; d++) {
    const date = new Date(today.getTime() + d * msPerDay);
    const iso = date.toISOString().split("T")[0];
    const dayModules = new Map<string, number>();
    let minutes = 0;
    let count = 0;

    while (count < dayCapacity && cursor < flat.length) {
      const { name } = flat[cursor];
      dayModules.set(name, (dayModules.get(name) ?? 0) + 1);
      minutes += MINUTES_PER_CARD;
      count++;
      cursor++;
    }

    days.push({
      dayIndex: d,
      date: iso,
      minutes,
      cardCount: count,
      moduleNames: [...dayModules.keys()],
      modules: [...dayModules.entries()].map(([name, c]) => ({ name, cardCount: c })),
    });
  }

  // If rounding left cards unassigned, append them to the final day.
  if (cursor < flat.length) {
    const last = days[days.length - 1];
    while (cursor < flat.length) {
      const { name } = flat[cursor];
      last.modules.push({ name, cardCount: 1 });
      last.minutes += MINUTES_PER_CARD;
      last.cardCount += 1;
      cursor++;
    }
    last.moduleNames = [...new Set(last.modules.map((m) => m.name))];
  }

  return { days, totalCards };
}
