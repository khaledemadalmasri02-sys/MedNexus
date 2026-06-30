import { Router, Request, Response } from "express";
import { logger } from "../lib/logger.js";
import { aiService } from "../lib/ai.js";
import { getConfig } from "../config.js";
import { validateBody } from "../middleware/validate.js";
import { explainSchema, fullExplainSchema, batchExplainSchema } from "./validators.js";

const router = Router();

export type ExplanationMode = "full" | "revision" | "osce" | "brief" | "mnemonic" | "clinical" | "testtrap";

const VALID_MODES: ExplanationMode[] = ["full", "revision", "osce", "brief", "mnemonic", "clinical", "testtrap"];

interface ExplanationRequest {
  front: string;
  back: string;
  mode?: ExplanationMode;
}

interface ExplanationResponse {
  explanation: string;
  mode: ExplanationMode;
  front: string;
  back: string;
  generatedAt: string;
}

// Generate explanation for a card
router.post("/", validateBody(explainSchema), async (req: Request, res: Response) => {
  const { front, back, mode = "full" } = req.body;

  try {
    const explanation = await aiService.explainCard(front, back, mode);
    
    const response: ExplanationResponse = {
      explanation,
      mode,
      front,
      back,
      generatedAt: new Date().toISOString(),
    };
    
    res.json(response);
  } catch (err) {
    logger.error({ err }, "Explanation generation failed");
    res.status(500).json({
      error: { code: "GENERATION_ERROR", message: "Failed to generate explanation" },
    });
  }
});

// Dedicated endpoint for Full Explanation with enhanced metadata
router.post("/full", validateBody(fullExplainSchema), async (req: Request, res: Response) => {
  const { front, back, topic } = req.body;

  try {
    const explanation = await aiService.explainCard(front, back, "full");
    
    // Extract title from the generated content if present
    const titleMatch = explanation.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : topic || front;
    
    const response = {
      explanation,
      mode: "full" as const,
      front,
      back,
      title,
      sections: extractSections(explanation),
      generatedAt: new Date().toISOString(),
    };
    
    res.json(response);
  } catch (err) {
    logger.error({ err }, "Full explanation generation failed");
    res.status(500).json({
      error: { code: "GENERATION_ERROR", message: "Failed to generate full explanation" },
    });
  }
});

// Helper function to extract section headers from markdown
function extractSections(markdown: string): string[] {
  const sectionRegex: RegExp = /^#{2,3}\s+(.+)$/gm;
  const sections: string[] = [];
  let match: RegExpExecArray | null;
  
  while ((match = sectionRegex.exec(markdown)) !== null) {
    sections.push(match[1]);
  }
  
  return sections;
}

// Stream explanation with SSE
router.post("/stream", async (req: Request, res: Response) => {
  const { front, back, mode = "full" } = req.body;
  
  if (!front || !back) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Front and back of card are required" },
    });
    return;
  }
  
  const validModes = ["full", "revision", "osce", "brief", "mnemonic", "clinical", "testtrap"];
  if (!validModes.includes(mode)) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: `Invalid mode. Must be one of: ${validModes.join(", ")}` },
    });
    return;
  }
  
  // Set up SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  
  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  
  try {
    sendEvent("status", { message: "Generating explanation..." });
    
    let fullExplanation = "";
    for await (const chunk of aiService.streamExplainCard(front, back, mode)) {
      fullExplanation += chunk;
      sendEvent("chunk", { content: chunk });
    }
    
    // Extract sections for navigation
    const sections = extractSections(fullExplanation);
    const titleMatch = fullExplanation.match(/^#\s+(.+)$/m);
    
    sendEvent("complete", {
      explanation: fullExplanation,
      mode,
      front,
      back,
      title: titleMatch ? titleMatch[1] : front,
      sections,
      generatedAt: new Date().toISOString(),
    });
    
    res.end();
  } catch (err) {
    logger.error({ err }, "Stream explanation failed");
    sendEvent("error", { message: "Failed to generate explanation" });
    res.end();
  }
});

// Batch explanations for multiple cards
router.post("/batch", validateBody(batchExplainSchema), async (req: Request, res: Response) => {
  const { cards, mode = "full" } = req.body;

  try {
    const results = await Promise.all(
      cards.map(async (card: { front: string; back: string }) => {
        if (!card.front || !card.back) {
          return { error: "Missing front or back" };
        }
        
        const explanation = await aiService.explainCard(card.front, card.back, mode);
        return {
          front: card.front,
          back: card.back,
          explanation,
          mode,
        };
      })
    );
    
    res.json({
      results,
      count: results.length,
      mode,
    });
  } catch (err) {
    logger.error({ err }, "Batch explanation failed");
    res.status(500).json({
      error: { code: "GENERATION_ERROR", message: "Failed to generate batch explanations" },
    });
  }
});

export default router;
