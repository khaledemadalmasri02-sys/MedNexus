import { logger } from "./logger";

export interface SimilarityResult {
  similarity: number;
  isDuplicate: boolean;
  threshold: number;
}

export class SimilarityService {
  private threshold: number;

  constructor(threshold = 0.85) {
    this.threshold = threshold;
  }

  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 && setB.size === 0) return 1;
    if (setA.size === 0 || setB.size === 0) return 0;

    const intersection = new Set<string>();
    for (const item of setA) {
      if (setB.has(item)) intersection.add(item);
    }

    const union = new Set<string>([...setA, ...setB]);

    return intersection.size / union.size;
  }

  tokenSetSimilarity(strA: string, strB: string): number {
    const tokensA = new Set(strA.toLowerCase().split(/\s+/));
    const tokensB = new Set(strB.toLowerCase().split(/\s+/));

    return this.jaccardSimilarity(tokensA, tokensB);
  }

  tokenSortSimilarity(strA: string, strB: string): number {
    const sortedA = strA.toLowerCase().split(/\s+/).sort().join(" ");
    const sortedB = strB.toLowerCase().split(/\s+/).sort().join(" ");

    return this.tokenSetSimilarity(sortedA, sortedB);
  }

  partialTokenSimilarity(strA: string, strB: string): number {
    const tokensA = strA.toLowerCase().split(/\s+/);
    const tokensB = strB.toLowerCase().split(/\s+/);

    const setA = new Set(tokensA);
    const setB = new Set(tokensB);

    let maxSimilarity = 0;

    for (const tokenA of setA) {
      for (const tokenB of setB) {
        const sim = this.stringSimilarity(tokenA, tokenB);
        if (sim > maxSimilarity) maxSimilarity = sim;
      }
    }

    return maxSimilarity;
  }

  stringSimilarity(strA: string, strB: string): number {
    const lenA = strA.length;
    const lenB = strB.length;

    if (lenA === 0 && lenB === 0) return 1;
    if (lenA === 0 || lenB === 0) return 0;

    const distance = this.levenshteinDistance(strA.toLowerCase(), strB.toLowerCase());
    const maxLen = Math.max(lenA, lenB);

    return 1 - distance / maxLen;
  }

  levenshteinDistance(strA: string, strB: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= strB.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= strA.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= strB.length; i++) {
      for (let j = 1; j <= strA.length; j++) {
        if (strB[i - 1] === strA[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[strB.length][strA.length];
  }

  semanticSimilarity(textA: string, textB: string): number {
    const tokensA = textA.toLowerCase().split(/\s+/);
    const tokensB = textB.toLowerCase().split(/\s+/);

    const setA = new Set(tokensA);
    const setB = new Set(tokensB);

    const commonRatio = Math.min(setA.size, setB.size) / Math.max(setA.size, setB.size);
    const lengthRatio = Math.min(textA.length, textB.length) / Math.max(textA.length, textB.length);
    const tokenSort = this.tokenSortSimilarity(textA, textB);

    return (commonRatio * 0.4 + lengthRatio * 0.3 + tokenSort * 0.3);
  }

  calculateSimilarity(textA: string, textB: string, method: "cosine" | "jaccard" | "semantic" | "token" | "levenshtein" = "semantic"): number {
    switch (method) {
      case "cosine":
        return this.cosineSimilarity(this.textToVector(textA), this.textToVector(textB));
      case "jaccard":
        return this.jaccardSimilarity(new Set(textA.toLowerCase().split(/\s+/)), new Set(textB.toLowerCase().split(/\s+/)));
      case "semantic":
        return this.semanticSimilarity(textA, textB);
      case "token":
        return this.tokenSetSimilarity(textA, textB);
      case "levenshtein":
        return this.stringSimilarity(textA, textB);
      default:
        return this.semanticSimilarity(textA, textB);
    }
  }

  textToVector(text: string, dimensions = 100): number[] {
    const words = text.toLowerCase().split(/\s+/);
    const vector = new Array(dimensions).fill(0);

    for (const word of words) {
      const hash = this.hashString(word);
      vector[hash % dimensions] += 1;
    }

    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm;
      }
    }

    return vector;
  }

  hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  isDuplicate(textA: string, textB: string, threshold?: number): SimilarityResult {
    const simThreshold = threshold ?? this.threshold;
    const similarity = this.semanticSimilarity(textA, textB);
    const isDup = similarity >= simThreshold;

    return {
      similarity,
      isDuplicate: isDup,
      threshold: simThreshold,
    };
  }

  findDuplicates(cards: { id: number; front: string; back: string }[], threshold?: number): Array<{ cardA: number; cardB: number; similarity: number }> {
    const results: Array<{ cardA: number; cardB: number; similarity: number }> = [];
    const simThreshold = threshold ?? this.threshold;

    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        const textA = `${cards[i].front} ${cards[i].back}`;
        const textB = `${cards[j].front} ${cards[j].back}`;
        const similarity = this.semanticSimilarity(textA, textB);

        if (similarity >= simThreshold) {
          results.push({
            cardA: cards[i].id,
            cardB: cards[j].id,
            similarity,
          });
        }
      }
    }

    return results;
  }

  setThreshold(threshold: number): void {
    this.threshold = threshold;
  }

  getThreshold(): number {
    return this.threshold;
  }
}

export function createSimilarityService(threshold = 0.85): SimilarityService {
  return new SimilarityService(threshold);
}