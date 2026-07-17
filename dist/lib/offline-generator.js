/**
 * Offline Card Generator
 * Generates flashcards and MCQs locally without AI API
 * Used as fallback when API key is invalid or service is unavailable
 */
// Common medical/distractor patterns for MCQ generation
const DISTRACTOR_PATTERNS = {
    prefixes: ["Hyper", "Hypo", "Anti", "Pre", "Post", "Sub", "Super", "Trans"],
    suffixes: ["itis", "osis", "emia", "pathy", "plasty", "tomy", "scopy", "gram"],
    modifiers: ["acute", "chronic", "primary", "secondary", "bilateral", "unilateral"],
};
/**
 * Extract key sentences from text
 */
function extractKeySentences(text) {
    // Split into sentences
    const sentences = text
        .replace(/\n+/g, ". ")
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 20 && s.length < 300);
    // Remove duplicates and return unique sentences
    return [...new Set(sentences)];
}
/**
 * Extract key terms (capitalized words, medical terms, etc.)
 */
function extractKeyTerms(text) {
    const terms = new Set();
    // Match capitalized phrases (potential proper nouns/terms)
    const capitalizedMatches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
    if (capitalizedMatches) {
        capitalizedMatches.forEach(term => {
            if (term.length > 3 && !["The", "This", "That", "These", "Those", "There", "Their"].includes(term)) {
                terms.add(term);
            }
        });
    }
    // Match words in bold/italic markers
    const formattedMatches = text.match(/\*+([^*]+)\*+/g);
    if (formattedMatches) {
        formattedMatches.forEach(match => {
            const term = match.replace(/\*/g, "").trim();
            if (term.length > 2)
                terms.add(term);
        });
    }
    // Match parenthetical definitions
    const definitionMatches = text.match(/\b(\w+)\s*\([^)]+\)/g);
    if (definitionMatches) {
        definitionMatches.forEach(match => {
            const term = match.split("(")[0].trim();
            if (term.length > 2)
                terms.add(term);
        });
    }
    return Array.from(terms).slice(0, 50);
}
/**
 * Generate a question from a sentence by blanking out key terms
 */
function generateQuestionFromSentence(sentence, keyTerms) {
    // Find the best term to blank out
    const termToBlank = keyTerms.find(term => sentence.toLowerCase().includes(term.toLowerCase()) && term.length > 3);
    if (!termToBlank)
        return null;
    // Create question by replacing term with blank
    const question = sentence.replace(new RegExp(`\\b${escapeRegex(termToBlank)}\\b`, "i"), "___________");
    return {
        front: `What term completes this statement?\n\n${question}`,
        back: termToBlank,
        tags: ["fill-in-blank"],
    };
}
/**
 * Generate a definition card from key terms
 */
function generateDefinitionCard(term, context) {
    // Find sentence containing the term
    const sentences = context.split(/[.!?]+/);
    const definitionSentence = sentences.find(s => s.toLowerCase().includes(term.toLowerCase()) && s.length > 30);
    if (!definitionSentence)
        return null;
    return {
        front: `Define: ${term}`,
        back: definitionSentence.trim(),
        tags: ["definition"],
    };
}
/**
 * Generate MCQ from content
 */
function generateMCQFromContent(sentence, correctAnswer, allTerms) {
    // Generate distractors from similar terms
    const distractors = allTerms
        .filter(term => term !== correctAnswer &&
        term.length > 2 &&
        !sentence.toLowerCase().includes(term.toLowerCase()))
        .slice(0, 3);
    if (distractors.length < 3) {
        // Generate synthetic distractors
        while (distractors.length < 3) {
            const syntheticDistractor = generateSyntheticDistractor(correctAnswer, distractors);
            distractors.push(syntheticDistractor);
        }
    }
    // Combine and shuffle choices
    const choices = [correctAnswer, ...distractors.slice(0, 3)];
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
/**
 * Generate a synthetic distractor based on the correct answer
 */
function generateSyntheticDistractor(correctAnswer, existingDistractors) {
    const prefix = DISTRACTOR_PATTERNS.prefixes[Math.floor(Math.random() * DISTRACTOR_PATTERNS.prefixes.length)];
    const suffix = DISTRACTOR_PATTERNS.suffixes[Math.floor(Math.random() * DISTRACTOR_PATTERNS.suffixes.length)];
    // Try different distractor generation strategies
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
/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
/**
 * Escape special regex characters
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/**
 * Main offline generator class
 */
export class OfflineGenerator {
    /**
     * Generate flashcards from text
     */
    generateCards(text, count = 10) {
        const cards = [];
        const keyTerms = extractKeyTerms(text);
        const sentences = extractKeySentences(text);
        // Strategy 1: Generate fill-in-the-blank questions
        for (const sentence of sentences) {
            if (cards.length >= count)
                break;
            const card = generateQuestionFromSentence(sentence, keyTerms);
            if (card && !cards.some(c => c.back === card.back)) {
                cards.push(card);
            }
        }
        // Strategy 2: Generate definition cards
        for (const term of keyTerms) {
            if (cards.length >= count)
                break;
            const card = generateDefinitionCard(term, text);
            if (card && !cards.some(c => c.front === card.front)) {
                cards.push(card);
            }
        }
        // Strategy 3: Generate Q&A from sentences
        for (const sentence of sentences) {
            if (cards.length >= count)
                break;
            if (sentence.includes(" is ") || sentence.includes(" are ")) {
                const parts = sentence.split(/\s+(?:is|are)\s+/i);
                if (parts.length === 2 && parts[0].length > 2 && parts[1].length > 5) {
                    const card = {
                        front: `What ${sentence.includes(" are ") ? "are" : "is"} ${parts[0].trim()}?`,
                        back: parts[1].trim(),
                        tags: ["q-and-a"],
                    };
                    if (!cards.some(c => c.front === card.front)) {
                        cards.push(card);
                    }
                }
            }
        }
        return cards.slice(0, count);
    }
    /**
     * Generate MCQ questions from text
     */
    generateQuestions(text, count = 10) {
        const questions = [];
        const keyTerms = extractKeyTerms(text);
        const sentences = extractKeySentences(text);
        // Generate MCQs from key terms and sentences
        for (const term of keyTerms) {
            if (questions.length >= count)
                break;
            // Find a sentence containing this term
            const contextSentence = sentences.find(s => s.toLowerCase().includes(term.toLowerCase()));
            if (contextSentence) {
                const question = generateMCQFromContent(contextSentence, term, keyTerms);
                if (question && !questions.some(q => q.back === question.back)) {
                    questions.push(question);
                }
            }
        }
        // If we need more questions, generate from sentences
        for (const sentence of sentences) {
            if (questions.length >= count)
                break;
            // Extract a key term from the sentence
            const words = sentence.split(/\s+/);
            const keyWord = words.find(w => w.length > 5 && /^[A-Z]/.test(w));
            if (keyWord) {
                const question = generateMCQFromContent(sentence, keyWord, keyTerms);
                if (question && !questions.some(q => q.back === question.back)) {
                    questions.push(question);
                }
            }
        }
        return questions.slice(0, count);
    }
    /**
     * Stream generate cards (simulates streaming for UI consistency)
     */
    async *streamGenerateCards(text, count = 10) {
        yield { type: "progress", data: { message: "Analyzing content..." } };
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 300));
        const keyTerms = extractKeyTerms(text);
        yield { type: "progress", data: { message: `Found ${keyTerms.length} key terms...` } };
        await new Promise(resolve => setTimeout(resolve, 200));
        const sentences = extractKeySentences(text);
        yield { type: "progress", data: { message: `Processing ${sentences.length} sentences...` } };
        const cards = this.generateCards(text, count);
        for (const card of cards) {
            await new Promise(resolve => setTimeout(resolve, 100));
            yield { type: "card", data: card };
        }
        yield { type: "progress", data: { message: `Generated ${cards.length} cards` } };
    }
    /**
     * Stream generate questions (simulates streaming for UI consistency)
     */
    async *streamGenerateQuestions(text, count = 10) {
        yield { type: "progress", data: { message: "Analyzing content for MCQ generation..." } };
        await new Promise(resolve => setTimeout(resolve, 300));
        const keyTerms = extractKeyTerms(text);
        yield { type: "progress", data: { message: `Found ${keyTerms.length} potential answer options...` } };
        await new Promise(resolve => setTimeout(resolve, 200));
        const questions = this.generateQuestions(text, count);
        for (const question of questions) {
            await new Promise(resolve => setTimeout(resolve, 100));
            yield { type: "card", data: question };
        }
        yield { type: "progress", data: { message: `Generated ${questions.length} questions` } };
    }
}
export const offlineGenerator = new OfflineGenerator();
//# sourceMappingURL=offline-generator.js.map