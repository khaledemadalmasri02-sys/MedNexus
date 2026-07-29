import { Hono } from "hono";
import type { AppEnv } from "../types";
import { getUserId, unauthorized } from "../lib/helpers";
import { createAIService } from "../lib/ai";
import { osceConversationService } from "../lib/osce-conversation-service";
import type { AIMessage } from "../lib/ai-providers";

const wsRoutes = new Hono<AppEnv>();

interface WebSocketMessage {
  type: "init" | "message" | "response" | "error" | "ping" | "pong" | "end";
  sessionId?: string;
  attemptId?: number;
  stationId?: number;
  message?: string;
  timestamp?: number;
}

interface SessionInfo {
  sessionId: string;
  attemptId: number;
  stationId: number;
  patientProfileId: number;
  diagnosis: string;
  patientSymptoms: string[];
  hiddenInfo: any;
}

const sessions = new Map<string, SessionInfo>();

wsRoutes.get("/ws", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);

  const upgradeHeader = c.req.header("upgrade");
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
    return c.text("Upgrade required", 426);
  }

  const socket = c.req.raw as unknown as {
    accept: () => void;
    send: (data: string) => void;
    close: () => void;
    addEventListener: (event: string, handler: (event: any) => void) => void;
  };

  if (!socket || typeof socket.accept !== "function") {
    return c.text("Socket not available", 400);
  }

  socket.accept();

  let sessionId: string | null = null;
  let sessionInfo: SessionInfo | null = null;

  socket.addEventListener("message", async (event: any) => {
    try {
      const data = JSON.parse(event.data as string) as WebSocketMessage;

      switch (data.type) {
        case "init": {
          if (!data.attemptId || !data.stationId) {
            socket.send(JSON.stringify({ type: "error", message: "Missing attemptId or stationId" }));
            socket.close();
            return;
          }

          const db = c.get("osceDb");
          if (!db) {
            socket.send(JSON.stringify({ type: "error", message: "Database not available" }));
            socket.close();
            return;
          }

          const attempt = await db.query.osceAttempts.findFirst({
            where: (a, ops) => {
              const { eq, and } = ops;
              return and(eq(a.id, data.attemptId!), eq(a.userId, userId));
            },
            with: {
              station: true,
              patientProfile: true,
            },
          });

          if (!attempt) {
            socket.send(JSON.stringify({ type: "error", message: "Attempt not found" }));
            socket.close();
            return;
          }

          const stationDiagnosis = (attempt.station as any)?.hiddenDiagnosis || "Undisclosed";

          sessionId = `ws_${crypto.randomUUID().slice(0, 8)}`;
          sessionInfo = {
            sessionId,
            attemptId: data.attemptId,
            stationId: data.stationId,
            patientProfileId: attempt.patientProfileId,
            diagnosis: stationDiagnosis,
            patientSymptoms: [],
            hiddenInfo: {},
          };

          sessions.set(sessionId, sessionInfo);

          socket.send(JSON.stringify({
            type: "init",
            sessionId,
            message: "WebSocket connection established",
          }));
          break;
        }

        case "message": {
          if (!sessionId || !sessionInfo) {
            socket.send(JSON.stringify({ type: "error", message: "Session not initialized" }));
            return;
          }

          if (!data.message) {
            socket.send(JSON.stringify({ type: "error", message: "No message provided" }));
            return;
          }

          socket.send(JSON.stringify({
            type: "ping",
            timestamp: Date.now(),
          }));

          try {
            const ai = createAIService(c.env);

            const conversationState = osceConversationService.getSession(sessionId);
            const conversation = conversationState?.conversation || [];

            const systemPrompt = `You are a standardized patient in a medical OSCE examination.

Your role:
Act as a real patient with realistic emotions and behavior.

Rules:
- Never volunteer diagnosis or hidden medical information
- Only answer questions asked directly
- Do not provide medical explanations
- Maintain consistent history throughout the session
- Show realistic emotions (anxious, worried, frustrated if not treated well)
- Be cooperative if student shows empathy
- Be short/cold if student is rude

Patient Background:
- Chief complaint: Various symptoms
- Diagnosis (hidden): ${sessionInfo.diagnosis}

Current conversation:
${conversation.map(m => `${m.role}: ${m.content}`).join("\n")}

Respond ONLY as the patient would - in natural, conversational language. Do not explain your reasoning or mention being an AI.`;

            const messages: AIMessage[] = [
              { role: "system", content: systemPrompt },
              { role: "user", content: data.message },
            ];

            const response = await ai.complete(messages, {
              temperature: 0.7,
              maxTokens: 200,
            });

            const trimmedResponse = response.trim();

            socket.send(JSON.stringify({
              type: "response",
              message: trimmedResponse,
              timestamp: Date.now(),
            }));
          } catch (err) {
            const error = err instanceof Error ? err : new Error("Unknown error");
            socket.send(JSON.stringify({
              type: "error",
              message: error.message || "Failed to generate response",
            }));
          }
          break;
        }

        case "end": {
          if (sessionId) {
            sessions.delete(sessionId);
          }
          socket.close();
          break;
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      socket.send(JSON.stringify({
        type: "error",
        message: error.message || "Invalid message format",
      }));
    }
  });

  socket.addEventListener("close", () => {
    if (sessionId && sessions.has(sessionId)) {
      sessions.delete(sessionId);
    }
  });

  socket.addEventListener("error", (err: any) => {
    console.error("WebSocket error:", err);
    if (sessionId && sessions.has(sessionId)) {
      sessions.delete(sessionId);
    }
  });
});

wsRoutes.post("/conversation/start", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);

  const body = await c.req.json<{
    attemptId: number;
    stationId: number;
  }>();

  if (!body.attemptId || !body.stationId) {
    return c.json({ error: { code: "INVALID_INPUT", message: "attemptId and stationId are required" } }, 400);
  }

  const db = c.get("osceDb");
  if (!db) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Database not available" } }, 500);
  }

  const attempt = await db.query.osceAttempts.findFirst({
    where: (a, ops) => {
      const { eq, and } = ops;
      return and(eq(a.id, body.attemptId), eq(a.userId, userId));
    },
    with: {
      station: true,
      patientProfile: true,
    },
  });

  if (!attempt) {
    return c.json({ error: { code: "NOT_FOUND", message: "Attempt not found" } }, 404);
  }

  const conversationState = osceConversationService.createSession(
    body.attemptId,
    body.stationId,
    attempt.patientProfileId,
    (attempt.station as any)?.hiddenDiagnosis || "Undisclosed",
    [],
    {}
  );

  return c.json({
    sessionId: conversationState.sessionId,
    attemptId: body.attemptId,
    stationId: body.stationId,
    station: attempt.station,
    patientProfile: attempt.patientProfile,
    message: "Conversation session started",
  });
});

wsRoutes.post("/conversation/message", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);

  const body = await c.req.json<{
    sessionId: string;
    message: string;
  }>();

  if (!body.sessionId || !body.message) {
    return c.json({ error: { code: "INVALID_INPUT", message: "sessionId and message are required" } }, 400);
  }

  const ai = createAIService(c.env);

  try {
    const result = await osceConversationService.processMessage(
      body.sessionId,
      body.message,
      (messages): Promise<AIMessage & { content: string; role: string }> => {
        return ai.complete(messages, { temperature: 0.7, maxTokens: 200 }) as unknown as Promise<AIMessage & { content: string; role: string }>;
      }
    );

    return c.json({
      response: result.response,
      emotion: result.emotion,
      trustLevel: result.trustLevel,
      conversation: osceConversationService.getConversationHistory(body.sessionId),
    });
  } catch (error) {
    return c.json({ error: { code: "SESSION_ERROR", message: error instanceof Error ? error.message : "Session error" } }, 400);
  }
});

wsRoutes.get("/conversation/history/:sessionId", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);

  const sessionId = c.req.param("sessionId");
  const history = osceConversationService.getConversationHistory(sessionId);

  if (history.length === 0) {
    return c.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, 404);
  }

  return c.json({ conversation: history });
});

wsRoutes.post("/conversation/evaluate/:sessionId", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);

  const sessionId = c.req.param("sessionId");
  const db = c.get("osceDb");

  if (!db) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Database not available" } }, 500);
  }

  const session = osceConversationService.getSession(sessionId);
  if (!session) {
    return c.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, 404);
  }

  const criteria = await db.query.scoringCriteria.findMany({
    where: (s, ops) => ops.eq(s.stationId, session.stationId),
    orderBy: (s, ops) => ops.asc(s.criteriaOrder),
  });

  const adjustedCriteria = criteria.map(c => ({
    ...c,
    subCategory: c.subCategory ?? undefined,
  }));

  const evaluation = osceConversationService.evaluateConversation(
    session,
    adjustedCriteria,
    ""
  );

  return c.json({
    sessionId,
    scores: evaluation.scores,
    strengths: evaluation.strengths,
    weaknesses: evaluation.weaknesses,
    feedback: evaluation.feedback,
    improvementPlan: evaluation.improvementPlan,
  });
});

wsRoutes.delete("/conversation/:sessionId", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);

  const sessionId = c.req.param("sessionId");
  const ended = osceConversationService.endSession(sessionId);

  if (!ended) {
    return c.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, 404);
  }

  return c.json({ success: true, message: "Session ended" });
});

wsRoutes.get("/sessions", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);

  const activeSessions = Array.from(sessions.values())
    .filter(s => s.attemptId > 0)
    .map(s => ({
      sessionId: s.sessionId,
      attemptId: s.attemptId,
      stationId: s.stationId,
    }));

  return c.json({ sessions: activeSessions });
});

export { wsRoutes };