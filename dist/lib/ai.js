import { getConfig } from "../config.js";
import { logger } from "./logger.js";
import { errorLearningService } from "./error-learning.js";
import http from "http";
import https from "https";
// Connection pooling agents — reuse TCP connections across requests
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 20 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 20 });
function getAgent(url) {
    return url.startsWith("https") ? httpsAgent : httpAgent;
}
// Parse model string to provider/model format
function parseModel(model) {
    const parts = model.split("/");
    if (parts.length >= 2) {
        return { provider: parts[0], modelName: parts.slice(1).join("/") };
    }
    return { provider: "openrouter", modelName: model };
}
// Get API key for the model's provider
function getApiKey(model) {
    const config = getConfig();
    const { provider } = parseModel(model);
    switch (provider) {
        case "openrouter":
            return config.OPENROUTER_API_KEY;
        case "openai":
            return config.OPENAI_API_KEY;
        case "groq":
            return config.GROQ_API_KEY;
        case "mistral":
            return config.MISTRAL_API_KEY;
        case "google":
            return config.GOOGLE_AI_API_KEY;
        case "nvidia":
        case "cohere":
            return config.OPENROUTER_API_KEY; // These use OpenRouter gateway
        default:
            return config.OPENROUTER_API_KEY; // Default to OpenRouter
    }
}
// Get the API base URL for the provider
function getApiBaseUrl(model) {
    const { provider } = parseModel(model);
    switch (provider) {
        case "openrouter":
        case "nvidia":
        case "cohere":
            return "https://openrouter.ai/api/v1";
        case "openai":
            return "https://api.openai.com/v1";
        case "groq":
            return "https://api.groq.com/openai/v1";
        case "mistral":
            return "https://api.mistral.ai/v1";
        case "google":
            return "https://generativelanguage.googleapis.com/v1beta";
        default:
            return "https://openrouter.ai/api/v1";
    }
}
// Get the full model name for API call
function getFullModelName(model) {
    const { provider, modelName } = parseModel(model);
    if (provider === "openrouter") {
        return modelName;
    }
    return model;
}
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;
const AI_TIMEOUT_MS = 60_000;
const CIRCUIT_BREAK_THRESHOLD = 3;
const CIRCUIT_BREAK_RESET_MS = 60_000;
function isRetryableStatus(status) {
    return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}
const circuitBreakers = new Map();
function getCircuitBreaker(provider) {
    let cb = circuitBreakers.get(provider);
    if (!cb) {
        cb = { failures: 0, lastFailure: 0, open: false };
        circuitBreakers.set(provider, cb);
    }
    return cb;
}
function isCircuitOpen(provider) {
    const cb = getCircuitBreaker(provider);
    if (!cb.open)
        return false;
    if (Date.now() - cb.lastFailure > CIRCUIT_BREAK_RESET_MS) {
        cb.open = false;
        cb.failures = 0;
        return false;
    }
    return true;
}
function recordCircuitSuccess(provider) {
    const cb = getCircuitBreaker(provider);
    cb.failures = 0;
    cb.open = false;
}
function recordCircuitFailure(provider) {
    const cb = getCircuitBreaker(provider);
    cb.failures++;
    cb.lastFailure = Date.now();
    if (cb.failures >= CIRCUIT_BREAK_THRESHOLD) {
        cb.open = true;
        logger.warn({ provider, failures: cb.failures }, "Circuit breaker opened for AI provider");
    }
}
async function fetchWithRetry(url, init, label, provider) {
    if (isCircuitOpen(provider)) {
        throw new Error(`AI provider ${provider} is temporarily unavailable. Please try again in a moment.`);
    }
    let lastError = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
            const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
            logger.info({ label, attempt, delayMs: delay }, "Retrying AI request");
            await new Promise((r) => setTimeout(r, delay));
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
        try {
            const response = await fetch(url, { ...init, signal: controller.signal });
            if (response.ok) {
                recordCircuitSuccess(provider);
                return response;
            }
            if (!isRetryableStatus(response.status)) {
                recordCircuitSuccess(provider);
                return response;
            }
            const body = await response.text().catch(() => "");
            lastError = new Error(`AI API ${response.status}: ${body}`);
            logger.warn({ label, status: response.status, attempt: attempt + 1 }, "Retryable AI error");
        }
        catch (err) {
            if (err?.name === "AbortError") {
                lastError = new Error("AI request timed out after 4 minutes");
            }
            else {
                lastError = err;
            }
            logger.warn({ label, attempt: attempt + 1, err: lastError.message }, "AI request network error");
        }
        finally {
            clearTimeout(timeout);
        }
    }
    recordCircuitFailure(provider);
    throw lastError || new Error("AI request failed after retries");
}
export class AIService {
    config = getConfig();
    sanitizePromptInput(input) {
        let sanitized = input.slice(0, 50000);
        sanitized = sanitized.replace(/ignore\s+(previous|above|all|system)\s+instructions?/gi, "[FILTERED]");
        sanitized = sanitized.replace(/forget\s+(previous|above|all|system)\s+instructions?/gi, "[FILTERED]");
        sanitized = sanitized.replace(/you\s+are\s+now\s+/gi, "[FILTERED]");
        sanitized = sanitized.replace(/pretend\s+(you\s+are|to\s+be)\s+/gi, "[FILTERED]");
        sanitized = sanitized.replace(/act\s+as\s+if\s+/gi, "[FILTERED]");
        sanitized = sanitized.replace(/system\s*:\s*/gi, "[FILTERED]");
        sanitized = sanitized.replace(/<\|im_start\|>/gi, "[FILTERED]");
        sanitized = sanitized.replace(/<\|im_end\|>/gi, "[FILTERED]");
        return sanitized;
    }
    // Generate a simple text completion
    async complete(messages, options = {}) {
        const model = options.model || this.config.AI_TEXT_MODEL;
        const apiKey = getApiKey(model);
        const { provider } = parseModel(model);
        if (!apiKey) {
            const err = new Error(`No API key configured for model: ${model}`);
            errorLearningService.logError({
                errorType: "AUTH_ERROR",
                errorCode: "NO_API_KEY",
                model,
                operation: "complete",
                inputData: JSON.stringify(messages),
                error: err,
                context: { temperature: options.temperature },
            });
            throw err;
        }
        const baseUrl = getApiBaseUrl(model);
        const fullModel = getFullModelName(model);
        const response = await fetchWithRetry(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": this.config.APP_URL || "http://localhost:5173",
                "X-Title": "MedNexus",
            },
            body: JSON.stringify({
                model: fullModel,
                messages,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens ?? 8192,
            }),
            agent: getAgent(baseUrl),
        }, `complete:${model}`, provider);
        if (!response.ok) {
            const error = await response.text();
            logger.error({ status: response.status, error }, "AI API error");
            const err = new Error(`AI API error: ${response.status} - ${error}`);
            await errorLearningService.logError({
                errorType: "API_ERROR",
                errorCode: response.status.toString(),
                model,
                operation: "complete",
                inputData: JSON.stringify(messages).slice(0, 1000),
                error: err,
                context: { status: response.status },
            });
            throw err;
        }
        const data = await response.json();
        return data.choices[0]?.message?.content || "";
    }
    // Stream a text completion
    async *streamComplete(messages, options = {}) {
        const model = options.model || this.config.AI_TEXT_MODEL;
        const apiKey = getApiKey(model);
        const { provider } = parseModel(model);
        if (!apiKey) {
            const err = new Error(`No API key configured for model: ${model}`);
            errorLearningService.logError({
                errorType: "AUTH_ERROR",
                errorCode: "NO_API_KEY",
                model,
                operation: "stream",
                inputData: JSON.stringify(messages),
                error: err,
            });
            throw err;
        }
        const baseUrl = getApiBaseUrl(model);
        const fullModel = getFullModelName(model);
        const response = await fetchWithRetry(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": this.config.APP_URL || "http://localhost:5173",
                "X-Title": "MedNexus",
            },
            body: JSON.stringify({
                model: fullModel,
                messages,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens ?? 8192,
                stream: true,
            }),
            agent: getAgent(baseUrl),
        }, `stream:${model}`, provider);
        if (!response.ok) {
            const error = await response.text();
            logger.error({ status: response.status, error }, "AI API streaming error");
            const err = new Error(`AI API error: ${response.status} - ${error}`);
            await errorLearningService.logError({
                errorType: "API_ERROR",
                errorCode: response.status.toString(),
                model,
                operation: "stream",
                inputData: JSON.stringify(messages).slice(0, 1000),
                error: err,
                context: { status: response.status, streaming: true },
            });
            throw err;
        }
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error("No response body");
        }
        const decoder = new TextDecoder();
        let buffer = "";
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith("data: "))
                        continue;
                    const data = trimmed.slice(6);
                    if (data === "[DONE]")
                        return;
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices[0]?.delta?.content;
                        if (content)
                            yield content;
                    }
                    catch {
                        // Skip malformed JSON
                    }
                }
            }
        }
        finally {
            reader.releaseLock();
        }
    }
    // Generate flashcards from text
    async generateCards(text, cardCount = 10, options = {}) {
        const model = options.model || this.config.AI_TEXT_MODEL;
        const errorContext = await errorLearningService.buildErrorContextAsync("generateCards", model);
        const systemPrompt = `You are an expert flashcard creator. Generate ${cardCount} high-quality flashcards from the provided text.
Rules:
- Each card should test one key concept
- Front side: A clear question or prompt
- Back side: A concise, accurate answer
- Include relevant tags for categorization
- Focus on the most important information

Return ONLY a valid JSON array in this format:
[
  {
    "front": "Question or prompt",
    "back": "Answer",
    "tags": ["tag1", "tag2"]
  }
]${errorContext.instructions ? "\n\n" + errorContext.instructions : ""}`;
        const userPrompt = `Generate ${cardCount} flashcards from this text:\n\n${this.sanitizePromptInput(text)}`;
        const response = await this.complete([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ], { ...options, model, temperature: 0.5 });
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            const err = new Error("Invalid response format from AI: no JSON array found");
            await errorLearningService.logError({
                errorType: "PARSE_ERROR",
                errorCode: "NO_JSON_ARRAY",
                model,
                operation: "generateCards",
                inputData: response.slice(0, 500),
                error: err,
                context: { responseLength: response.length },
            });
            throw err;
        }
        try {
            return JSON.parse(jsonMatch[0]);
        }
        catch (parseErr) {
            const err = new Error(`Failed to parse JSON response: ${parseErr.message}`);
            await errorLearningService.logError({
                errorType: "PARSE_ERROR",
                errorCode: "JSON_PARSE_FAILED",
                model,
                operation: "generateCards",
                inputData: jsonMatch[0].slice(0, 500),
                error: err,
                context: { originalError: parseErr.message },
            });
            throw err;
        }
    }
    // Generate question bank (MCQ) from text
    async generateQuestions(text, questionCount = 10, options = {}) {
        const model = options.model || this.config.AI_QBANK_MODEL;
        const errorContext = await errorLearningService.buildErrorContextAsync("generateQuestions", model);
        const systemPrompt = `You are an expert question bank creator for medical/educational exams. Generate ${questionCount} high-quality multiple-choice questions from the provided text.
Rules:
- Each question should test clinical reasoning or key knowledge
- Include a clinical vignette when appropriate
- Provide 4-5 plausible distractors
- Mark the correct answer with correctIndex (0-based)
- Include a detailed explanation for the correct answer

Return ONLY a valid JSON array in this format:
[
  {
    "front": "Question text with vignette if applicable",
    "back": "Brief answer summary",
    "choices": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Detailed explanation of why the correct answer is right and others are wrong"
  }
]${errorContext.instructions ? "\n\n" + errorContext.instructions : ""}`;
        const userPrompt = `Generate ${questionCount} multiple-choice questions from this text:\n\n${this.sanitizePromptInput(text)}`;
        const response = await this.complete([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ], { ...options, model, temperature: 0.5 });
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            const err = new Error("Invalid response format from AI: no JSON array found");
            await errorLearningService.logError({
                errorType: "PARSE_ERROR",
                errorCode: "NO_JSON_ARRAY",
                model,
                operation: "generateQuestions",
                inputData: response.slice(0, 500),
                error: err,
                context: { responseLength: response.length },
            });
            throw err;
        }
        try {
            return JSON.parse(jsonMatch[0]);
        }
        catch (parseErr) {
            const err = new Error(`Failed to parse JSON response: ${parseErr.message}`);
            await errorLearningService.logError({
                errorType: "PARSE_ERROR",
                errorCode: "JSON_PARSE_FAILED",
                model,
                operation: "generateQuestions",
                inputData: jsonMatch[0].slice(0, 500),
                error: err,
                context: { originalError: parseErr.message },
            });
            throw err;
        }
    }
    // Generate explanation for a card
    async explainCard(front, back, mode = "full", options = {}) {
        const model = options.model || this.config.AI_EXPLAIN_MODEL;
        const modePrompts = {
            full: `Generate a comprehensive and detailed breakdown of this medical concept, suitable for in-depth learning and understanding. The explanation should cover all essential aspects of the topic, providing a foundational knowledge base.

## Structure and Content Guidelines

### Title
The title should clearly state "Full Explanation" and the specific topic.

### Introduction
Begin with a concise introduction that briefly defines the topic and outlines what will be covered in the explanation.

### Core Content Sections
Organize the main body into logical sections using Markdown headings. Include these sections as applicable:

- **Overview**: Provide a general understanding and context of the topic.
- **Etiology/Pathophysiology**: Discuss the causes and mechanisms of the condition or process. Explain HOW and WHY the medical phenomenon occurs.
- **Clinical Presentation**: Describe the signs, symptoms, and typical manifestations of the condition in patients.
- **Diagnosis**: Detail the methods and criteria used to diagnose the condition, including relevant tests and their interpretation.
- **Management/Treatment**: Outline the therapeutic approaches, interventions, and strategies for managing the condition.
- **Complications**: Discuss potential adverse outcomes or sequelae associated with the condition or its treatment.
- **Key Takeaways**: Conclude with a summary of the most critical information as concise bullet points.

### Formatting Instructions
- Use appropriate Markdown headings (##, ###) to structure the content logically
- Write detailed, well-structured paragraphs for comprehensive explanations
- Utilize bullet points or numbered lists for enumerating items
- Use **bold** text for key terms, concepts, or phrases that require emphasis
- Use Markdown blockquotes (>) to create callout boxes for important notes, clinical pearls, or warnings
- Use Markdown pipe tables for data presentation (e.g., differential diagnoses, drug dosages)`,
            revision: "Provide a concise revision summary focusing on high-yield facts and common exam points.",
            osce: "Provide an OSCE-style explanation including what to look for, key findings, and how to present.",
            brief: "Provide a brief, bullet-point summary of the key points.",
            mnemonic: "Create helpful mnemonics and memory aids for this topic.",
            clinical: "Focus on clinical relevance, presentation, diagnosis, and management.",
            testtrap: `Generate content that highlights common exam pitfalls, trick questions, or frequent misconceptions related to a medical concept.

## Structure

### Title
"Test Trap: [Concept/Scenario]"

### Introduction
Brief explanation of the common error or tricky concept.

### The Trap
Describe the common misconception or trick question.

### Why it's a Trap
Explain the underlying reason for the error.

### How to Avoid
Provide actionable strategies to prevent falling into the trap.

### Example Question (Optional)
Include an example question with explanation of the correct answer.

## Formatting
- Use ## headings for sections
- Use bullet points for "How to Avoid" strategies
- Use **bold** for key terms
- Use blockquotes (>) for example questions`,
        };
        const systemPrompt = `You are an expert medical educator creating comprehensive study materials for medical students. ${modePrompts[mode]}

IMPORTANT: Return ONLY the formatted Markdown content. Do not include any meta-commentary or explanations about what you're doing.`;
        const userPrompt = `Generate a ${mode === 'full' ? 'comprehensive full explanation' : mode + ' explanation'} for this medical concept:

Question/Front: ${this.sanitizePromptInput(front)}
Answer/Back: ${this.sanitizePromptInput(back)}

${mode === 'full' ? 'Create a complete study document that a medical student can use to thoroughly understand this topic.' : ''}`;
        return this.complete([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ], { ...options, model, temperature: 0.7, maxTokens: 2048 });
    }
    // Stream explanation for a card
    async *streamExplainCard(front, back, mode = "full", options = {}) {
        const model = options.model || this.config.AI_EXPLAIN_MODEL;
        const modePrompts = {
            full: `Generate a comprehensive and detailed breakdown of this medical concept, suitable for in-depth learning and understanding. The explanation should cover all essential aspects of the topic, providing a foundational knowledge base.

## Structure and Content Guidelines

### Title
The title should clearly state "Full Explanation" and the specific topic.

### Introduction
Begin with a concise introduction that briefly defines the topic and outlines what will be covered in the explanation.

### Core Content Sections
Organize the main body into logical sections using Markdown headings. Include these sections as applicable:

- **Overview**: Provide a general understanding and context of the topic.
- **Etiology/Pathophysiology**: Discuss the causes and mechanisms of the condition or process. Explain HOW and WHY the medical phenomenon occurs.
- **Clinical Presentation**: Describe the signs, symptoms, and typical manifestations of the condition in patients.
- **Diagnosis**: Detail the methods and criteria used to diagnose the condition, including relevant tests and their interpretation.
- **Management/Treatment**: Outline the therapeutic approaches, interventions, and strategies for managing the condition.
- **Complications**: Discuss potential adverse outcomes or sequelae associated with the condition or its treatment.
- **Key Takeaways**: Conclude with a summary of the most critical information as concise bullet points.

### Formatting Instructions
- Use appropriate Markdown headings (##, ###) to structure the content logically
- Write detailed, well-structured paragraphs for comprehensive explanations
- Utilize bullet points or numbered lists for enumerating items
- Use **bold** text for key terms, concepts, or phrases that require emphasis
- Use Markdown blockquotes (>) to create callout boxes for important notes, clinical pearls, or warnings
- Use Markdown pipe tables for data presentation (e.g., differential diagnoses, drug dosages)`,
            revision: "Provide a concise revision summary focusing on high-yield facts and common exam points.",
            osce: "Provide an OSCE-style explanation including what to look for, key findings, and how to present.",
            brief: "Provide a brief, bullet-point summary of the key points.",
            mnemonic: "Create helpful mnemonics and memory aids for this topic.",
            clinical: "Focus on clinical relevance, presentation, diagnosis, and management.",
            testtrap: `Generate content that highlights common exam pitfalls, trick questions, or frequent misconceptions related to a medical concept.

## Structure

### Title
"Test Trap: [Concept/Scenario]"

### Introduction
Brief explanation of the common error or tricky concept.

### The Trap
Describe the common misconception or trick question.

### Why it's a Trap
Explain the underlying reason for the error.

### How to Avoid
Provide actionable strategies to prevent falling into the trap.

### Example Question (Optional)
Include an example question with explanation of the correct answer.

## Formatting
- Use ## headings for sections
- Use bullet points for "How to Avoid" strategies
- Use **bold** for key terms
- Use blockquotes (>) for example questions`,
        };
        const systemPrompt = `You are an expert medical educator creating comprehensive study materials for medical students. ${modePrompts[mode]}

IMPORTANT: Return ONLY the formatted Markdown content. Do not include any meta-commentary or explanations about what you're doing.`;
        const userPrompt = `Generate a ${mode === 'full' ? 'comprehensive full explanation' : mode + ' explanation'} for this medical concept:

Question/Front: ${this.sanitizePromptInput(front)}
Answer/Back: ${this.sanitizePromptInput(back)}

${mode === 'full' ? 'Create a complete study document that a medical student can use to thoroughly understand this topic.' : ''}`;
        yield* this.streamComplete([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ], { ...options, model, temperature: 0.7, maxTokens: 2048 });
    }
    // Stream card generation
    async *streamGenerateCards(text, cardCount = 10, options = {}) {
        const model = options.model || this.config.AI_TEXT_MODEL;
        const systemPrompt = `You are an expert flashcard creator. Generate ${cardCount} high-quality flashcards from the provided text.
Rules:
- Each card should test one key concept
- Front side: A clear question or prompt
- Back side: A concise, accurate answer
- Include relevant tags for categorization
- Focus on the most important information

Return ONLY a valid JSON array in this format:
[
  {
    "front": "Question or prompt",
    "back": "Answer",
    "tags": ["tag1", "tag2"]
  }
]`;
        const userPrompt = `Generate ${cardCount} flashcards from this text:\n\n${text}`;
        yield { type: "progress", data: { message: "Generating flashcards..." } };
        let fullResponse = "";
        for await (const chunk of this.streamComplete([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ], { ...options, model, temperature: 0.5 })) {
            fullResponse += chunk;
        }
        const jsonMatch = fullResponse.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error("Invalid response format from AI");
        }
        const cards = JSON.parse(jsonMatch[0]);
        for (const card of cards) {
            yield { type: "card", data: card };
        }
        yield { type: "done", data: { count: cards.length } };
    }
}
// Singleton instance
export const aiService = new AIService();
//# sourceMappingURL=ai.js.map