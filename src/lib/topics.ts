import { getConfig } from "../config.js";

const STOPWORDS = new Set([
  "a","about","above","after","again","against","all","am","an","and","any","are",
  "aren't","as","at","be","because","been","before","being","below","between","both",
  "but","by","can","can't","cannot","could","couldn't","did","didn't","do","does",
  "doesn't","doing","don't","down","during","each","few","for","from","further","get",
  "got","had","hadn't","has","hasn't","have","haven't","having","he","he'd","he'll",
  "he's","her","here","here's","hers","herself","him","himself","his","how","how's",
  "i","i'd","i'll","i'm","i've","if","in","into","is","isn't","it","it's","its",
  "itself","just","let's","me","might","more","most","mustn't","my","myself","no",
  "nor","not","of","off","on","once","only","or","other","ought","our","ours",
  "ourselves","out","over","own","said","same","say","says","shan't","she","she'd",
  "she'll","she's","should","shouldn't","so","some","such","than","that","that's",
  "the","their","theirs","them","themselves","then","there","there's","these","they",
  "they'd","they'll","they're","they've","this","those","through","to","too","under",
  "until","up","us","very","was","wasn't","we","we'd","we'll","we're","we've","were",
  "weren't","what","what's","when","when's","where","where's","which","while","who",
  "who's","why","why's","will","with","won't","would","wouldn't","you","you'd",
  "you'll","you're","you've","your","yours","yourself","yourselves","also","using",
  "used","one","two","may","many","well","new","like","known","type","types","e.g",
  "et","etc","al","fig","figure","table","definition","define","defined","process"
]);

function normalizeToken(raw: string): string | null {
  const lower = raw.toLowerCase().replace(/[^a-z0-9']/g, "");
  if (lower.length < 3) return null;
  if (STOPWORDS.has(lower)) return null;
  let stem = lower
    .replace(/'s$/, "")
    .replace(/s$/, "")
    .replace(/ly$/, "")
    .replace(/ment$/, "")
    .replace(/tion$/, "")
    .replace(/ing$/, "")
    .replace(/able$/, "")
    .replace(/ness$/, "")
    .replace(/ive$/, "");
  if (stem.length < 3) return stem.length >= 2 ? stem : null;
  return stem;
}

export function tokenize(text: string): string[] {
  return text.split(/[\s,;:/()\[\]{}<>"'`~!@#$%^&*+=|\\\-]+/).filter(Boolean);
}

export interface DeckTopic {
  name: string;
  cardCount: number;
}

export function extractTopicsFromText(text: string): Map<string, number> {
  const tokens = tokenize(text);
  const counts = new Map<string, number>();
  for (const tok of tokens) {
    const stem = normalizeToken(tok);
    if (!stem) continue;
    counts.set(stem, (counts.get(stem) ?? 0) + 1);
  }
  return counts;
}

export function getDeckTopics(
  deckCards: Array<{ front?: string | null; back?: string | null; tags?: string | null }>,
  limit = 12
): DeckTopic[] {
  const frontWeights = new Map<string, Map<string, number>>();
  const global = new Map<string, Set<number>>();

  deckCards.forEach((card, idx) => {
    const text = `${card.front ?? ""} ${card.back ?? ""} ${card.tags ?? ""}`;
    const tokens = tokenize(text);
    for (const tok of tokens) {
      const lower = tok.toLowerCase();
      const stem = normalizeToken(tok);
      if (!stem) continue;
      const canonical = lower.length > 3 ? lower : stem;
      if (!frontWeights.has(stem)) frontWeights.set(stem, new Map());
      const canonicalCounts = frontWeights.get(stem)!;
      canonicalCounts.set(canonical, (canonicalCounts.get(canonical) ?? 0) + 1);
      if (!global.has(stem)) global.set(stem, new Set());
      global.get(stem)!.add(idx);
    }
  });

  const folded = new Map<string, { name: string; cardCount: number }>();
  for (const [stem, canonicalCounts] of frontWeights.entries()) {
    let bestCanonical = "";
    let bestCount = -1;
    for (const [canonical, count] of canonicalCounts) {
      if (count > bestCount || (count === bestCount && canonical.length > bestCanonical.length)) {
        bestCount = count;
        bestCanonical = canonical;
      }
    }
    const singularStem = stem.replace(/s$/, "");
    const foldKey = singularStem.length >= 3 ? singularStem : stem;
    const entry = {
      name: bestCanonical,
      cardCount: global.get(stem)?.size ?? bestCount,
    };
    const existing = folded.get(foldKey);
    if (existing) {
      if (entry.cardCount > existing.cardCount) {
        folded.set(foldKey, entry);
      }
    } else {
      folded.set(foldKey, entry);
    }
  }

  return Array.from(folded.values())
    .sort((a, b) => b.cardCount - a.cardCount || a.name.localeCompare(b.name))
    .slice(0, limit);
}
