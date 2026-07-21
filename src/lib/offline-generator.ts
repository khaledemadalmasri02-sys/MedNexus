const DISTRACTOR_PATTERNS = {
  prefixes: ["Hyper", "Hypo", "Anti", "Pre", "Post", "Sub", "Super", "Trans"],
  suffixes: ["itis", "osis", "emia", "pathy", "plasty", "tomy", "scopy", "gram"],
  modifiers: ["acute", "chronic", "primary", "secondary", "bilateral", "unilateral"],
};

function extractKeySentences(text: string): string[] {
  const sentences = text
    .replace(/\n+/g, ". ")
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 300);
  return [...new Set(sentences)];
}

function extractKeyTerms(text: string): string[] {
  const terms = new Set<string>();
  const capitalizedMatches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
  if (capitalizedMatches) {
    capitalizedMatches.forEach((term) => {
      if (term.length > 3 && !["The", "This", "That", "These", "Those", "There", "Their"].includes(term)) {
        terms.add(term);
      }
    });
  }
  const formattedMatches = text.match(/\*+([^*]+)\*+/g);
  if (formattedMatches) {
    formattedMatches.forEach((match) => {
      const term = match.replace(/\*/g, "").trim();
      if (term.length > 2) terms.add(term);
    });
  }
  const definitionMatches = text.match(/\b(\w+)\s*\([^)]+\)/g);
  if (definitionMatches) {
    definitionMatches.forEach((match) => {
      const term = match.split("(")[0].trim();
      if (term.length > 2) terms.add(term);
    });
  }
  return Array.from(terms).slice(0, 50);
}

interface GeneratedCard {
  front: string;
  back: string;
  tags?: string[];
}

interface GeneratedQuestion {
  front: string;
  back: string;
  choices: string[];
  correctIndex: number;
  explanation?: string;
}

function generateQuestionFromSentence(sentence: string, keyTerms: string[]): GeneratedCard | null {
  const termToBlank = keyTerms.find((term) => sentence.toLowerCase().includes(term.toLowerCase()) && term.length > 3);
  if (!termToBlank) return null;
  const question = sentence.replace(new RegExp(`\\b${escapeRegex(termToBlank)}\\b`, "i"), "___________");
  return {
    front: `What term completes this statement?\n\n${question}`,
    back: termToBlank,
    tags: ["fill-in-blank"],
  };
}

function generateDefinitionCard(term: string, context: string): GeneratedCard | null {
  const sentences = context.split(/[.!?]+/);
  const definitionSentence = sentences.find((s) => s.toLowerCase().includes(term.toLowerCase()) && s.length > 30);
  if (!definitionSentence) return null;
  return {
    front: `Define: ${term}`,
    back: definitionSentence.trim(),
    tags: ["definition"],
  };
}

function generateMCQFromContent(sentence: string, correctAnswer: string, allTerms: string[]): GeneratedQuestion | null {
  const distractors = allTerms
    .filter((term) => term !== correctAnswer && term.length > 2 && !sentence.toLowerCase().includes(term.toLowerCase()))
    .slice(0, 3);
  const finalDistractors = [...distractors];
  while (finalDistractors.length < 3) {
    const syntheticDistractor = generateSyntheticDistractor(correctAnswer, finalDistractors);
    finalDistractors.push(syntheticDistractor);
  }
  const choices = [correctAnswer, ...finalDistractors.slice(0, 3)];
  const shuffledChoices = shuffleArray(choices);
  const correctIndex = shuffledChoices.indexOf(correctAnswer);
  return {
    front: `Which of the following best relates to: ${sentence.substring(0, 100)}...`,
    back: correctAnswer,
    choices: shuffledChoices,
    correctIndex,
    explanation: `The correct answer is "${correctAnswer}" based on the provided content.`,
  };
}

function generateSyntheticDistractor(correctAnswer: string, existingDistractors: string[]): string {
  const prefix = DISTRACTOR_PATTERNS.prefixes[Math.floor(Math.random() * DISTRACTOR_PATTERNS.prefixes.length)];
  const suffix = DISTRACTOR_PATTERNS.suffixes[Math.floor(Math.random() * DISTRACTOR_PATTERNS.suffixes.length)];
  const strategies = [
    () => `${prefix}${correctAnswer.toLowerCase()}`,
    () => `${correctAnswer}${suffix}`,
    () => `${prefix}${correctAnswer.toLowerCase()}${suffix}`,
    () => `Non-${correctAnswer.toLowerCase()}`,
    () => `Pseudo${correctAnswer.toLowerCase()}`,
  ];
  for (const strategy of strategies) {
    const distractor = strategy();
    if (!existingDistractors.includes(distractor) && distractor !== correctAnswer) {
      return distractor;
    }
  }
  return `Alternative ${correctAnswer}`;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface StreamEvent {
  type: "progress" | "card";
  data: GeneratedCard | GeneratedQuestion | { message: string };
}

export class OfflineGenerator {
  generateCards(text: string, count = 10): GeneratedCard[] {
    const result: GeneratedCard[] = [];
    const keyTerms = extractKeyTerms(text);
    const sentences = extractKeySentences(text);
    for (const sentence of sentences) {
      if (result.length >= count) break;
      const card = generateQuestionFromSentence(sentence, keyTerms);
      if (card && !result.some((c) => c.back === card.back)) result.push(card);
    }
    for (const term of keyTerms) {
      if (result.length >= count) break;
      const card = generateDefinitionCard(term, text);
      if (card && !result.some((c) => c.front === card.front)) result.push(card);
    }
    for (const sentence of sentences) {
      if (result.length >= count) break;
      if (sentence.includes(" is ") || sentence.includes(" are ")) {
        const parts = sentence.split(/\s+(?:is|are)\s+/i);
        if (parts.length === 2 && parts[0].length > 2 && parts[1].length > 5) {
          const card: GeneratedCard = {
            front: `What ${sentence.includes(" are ") ? "are" : "is"} ${parts[0].trim()}?`,
            back: parts[1].trim(),
            tags: ["q-and-a"],
          };
          if (!result.some((c) => c.front === card.front)) result.push(card);
        }
      }
    }
    return result.slice(0, count);
  }

  generateQuestions(text: string, count = 10): GeneratedQuestion[] {
    const result: GeneratedQuestion[] = [];
    const keyTerms = extractKeyTerms(text);
    const sentences = extractKeySentences(text);
    for (const term of keyTerms) {
      if (result.length >= count) break;
      const contextSentence = sentences.find((s) => s.toLowerCase().includes(term.toLowerCase()));
      if (contextSentence) {
        const question = generateMCQFromContent(contextSentence, term, keyTerms);
        if (question && !result.some((q) => q.back === question.back)) result.push(question);
      }
    }
    for (const sentence of sentences) {
      if (result.length >= count) break;
      const words = sentence.split(/\s+/);
      const keyWord = words.find((w) => w.length > 5 && /^[A-Z]/.test(w));
      if (keyWord) {
        const question = generateMCQFromContent(sentence, keyWord, keyTerms);
        if (question && !result.some((q) => q.back === question.back)) result.push(question);
      }
    }
    return result.slice(0, count);
  }

  async *streamGenerateCards(text: string, count = 10): AsyncGenerator<StreamEvent> {
    yield { type: "progress", data: { message: "Analyzing content..." } };
    await new Promise((r) => setTimeout(r, 300));
    const keyTerms = extractKeyTerms(text);
    yield { type: "progress", data: { message: `Found ${keyTerms.length} key terms...` } };
    await new Promise((r) => setTimeout(r, 200));
    const sentences = extractKeySentences(text);
    yield { type: "progress", data: { message: `Processing ${sentences.length} sentences...` } };
    const cards = this.generateCards(text, count);
    for (const card of cards) {
      await new Promise((r) => setTimeout(r, 100));
      yield { type: "card", data: card };
    }
    yield { type: "progress", data: { message: `Generated ${cards.length} cards` } };
  }

  async *streamGenerateQuestions(text: string, count = 10): AsyncGenerator<StreamEvent> {
    yield { type: "progress", data: { message: "Analyzing content for MCQ generation..." } };
    await new Promise((r) => setTimeout(r, 300));
    const keyTerms = extractKeyTerms(text);
    yield { type: "progress", data: { message: `Found ${keyTerms.length} potential answer options...` } };
    await new Promise((r) => setTimeout(r, 200));
    const questions = this.generateQuestions(text, count);
    for (const question of questions) {
      await new Promise((r) => setTimeout(r, 100));
      yield { type: "card", data: question };
    }
    yield { type: "progress", data: { message: `Generated ${questions.length} questions` } };
  }
}

export const offlineGenerator = new OfflineGenerator();