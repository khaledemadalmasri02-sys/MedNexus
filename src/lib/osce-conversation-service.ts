import type {
  AIMessage,
  AIChatResponse,
  AIProvider,
  StationContext,
  PatientResponse,
} from "./ai-providers";

export interface ConversationState {
  sessionId: string;
  attemptId: number;
  stationId: number;
  patientProfileId: number;
  conversation: AIMessage[];
  patientState: {
    emotion: string;
    trustLevel: number;
    revealedInfo: string[];
    symptoms: string[];
  };
  startTime: number;
  lastActivity: number;
  isActive: boolean;
}

export interface EvaluationResult {
  scores: {
    communication: number;
    history: number;
    examination: number;
    clinicalReasoning: number;
    management: number;
    professionalism: number;
    total: number;
  };
  strengths: string[];
  weaknesses: string[];
  missedItems: string[];
  feedback: string;
  improvementPlan: string[];
}

export interface ScoringCriterion {
  id: number;
  category: string;
  subCategory?: string;
  maxPoints: number;
  description: string;
  criteriaOrder: number;
}

export class OSCEConversationService {
  private sessions: Map<string, ConversationState> = new Map();
  private conversationTimeoutMs = 30 * 60 * 1000;

  private getPatientSystemPrompt(context: StationContext): string {
    const conversationHistory = context.conversationHistory
      ?.map(m => `${m.role}: ${m.content}`)
      .join("\n") || "No prior conversation";

    return `You are a standardized patient in a medical OSCE examination.

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
- Reveal information gradually based on trust level
- Current emotional state: ${context.emotion || "neutral"}
- Trust level: ${context.trustLevel || 50}/100

Patient Background:
- Chief complaint: ${context.patientSymptoms?.join(", ") || "Various symptoms"}
- Diagnosis (hidden): ${context.hiddenInfo?.diagnosis || "Undisclosed diagnosis"}
- Risk factors: ${JSON.stringify(context.hiddenInfo?.riskFactors || [])}
- Red flags: ${JSON.stringify(context.hiddenInfo?.redFlags || [])}
- Medical history: ${JSON.stringify(context.hiddenInfo?.medicalHistory || [])}
- Vital signs: ${JSON.stringify(context.hiddenInfo?.vitalSigns || {})}

Current conversation:
${conversationHistory}

Respond ONLY as the patient would - in natural, conversational language. Do not explain your reasoning or mention being an AI.`;
  }

  private async generatePatientResponse(
    chatFn: (messages: AIMessage[]) => Promise<AIChatResponse>,
    context: StationContext,
    studentMessage: string
  ): Promise<string> {
    const systemPrompt = this.getPatientSystemPrompt(context);

    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: studentMessage },
    ];

    const response = await chatFn(messages);
    return response.content.trim();
  }

  createSession(
    attemptId: number,
    stationId: number,
    patientProfileId: number,
    diagnosis: string,
    patientSymptoms: string[],
    hiddenInfo: StationContext["hiddenInfo"]
  ): ConversationState {
    const sessionId = `osce_${crypto.randomUUID().slice(0, 8)}`;

    const state: ConversationState = {
      sessionId,
      attemptId,
      stationId,
      patientProfileId,
      conversation: [],
      patientState: {
        emotion: "anxious",
        trustLevel: 50,
        revealedInfo: [],
        symptoms: patientSymptoms,
      },
      startTime: Date.now(),
      lastActivity: Date.now(),
      isActive: true,
    };

    this.sessions.set(sessionId, state);
    return state;
  }

  getSession(sessionId: string): ConversationState | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    if (Date.now() - session.lastActivity > this.conversationTimeoutMs) {
      this.endSession(sessionId);
      return undefined;
    }

    return session;
  }

  updateSession(
    sessionId: string,
    updates: Partial<Omit<ConversationState, "sessionId">>
  ): ConversationState | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    Object.assign(session, updates);
    session.lastActivity = Date.now();
    return session;
  }

  endSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  async processMessage(
    sessionId: string,
    studentMessage: string,
    chatFn: (messages: AIMessage[]) => Promise<AIChatResponse>
  ): Promise<{ response: string; emotion: string; trustLevel: number }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const context: StationContext = {
      stationId: session.stationId,
      patientProfileId: session.patientProfileId,
      diagnosis: "",
      patientSymptoms: session.patientState.symptoms,
      hiddenInfo: {},
      conversationHistory: session.conversation,
      emotion: session.patientState.emotion,
      trustLevel: session.patientState.trustLevel,
    };

    const patientResponse = await this.generatePatientResponse(chatFn, context, studentMessage);

    const updatedTrustLevel = this.calculateTrustLevel(
      session.patientState.trustLevel,
      studentMessage,
      patientResponse
    );

    const updatedEmotion = this.calculateEmotion(
      studentMessage,
      patientResponse,
      session.patientState.emotion
    );

    const newConversation: AIMessage[] = [
      ...session.conversation,
      { role: "user", content: studentMessage },
      { role: "assistant", content: patientResponse },
    ];

    this.sessions.set(sessionId, {
      ...session,
      conversation: newConversation,
      patientState: {
        ...session.patientState,
        trustLevel: updatedTrustLevel,
        emotion: updatedEmotion,
      },
      lastActivity: Date.now(),
    });

    return {
      response: patientResponse,
      emotion: updatedEmotion,
      trustLevel: updatedTrustLevel,
    };
  }

  private calculateTrustLevel(
    current: number,
    studentMessage: string,
    patientResponse: string
  ): number {
    const lowerMsg = studentMessage.toLowerCase();

    if (lowerMsg.includes("thank") || lowerMsg.includes("help") || lowerMsg.includes("empathy")) {
      return Math.min(100, current + 5);
    }

    if (lowerMsg.includes("sorry") || lowerMsg.includes("please")) {
      return Math.min(100, current + 3);
    }

    if (lowerMsg.includes("shut up") || lowerMsg.includes("stupid") || lowerMsg.includes("idiot")) {
      return Math.max(0, current - 20);
    }

    return current;
  }

  private calculateEmotion(
    studentMessage: string,
    patientResponse: string,
    currentEmotion: string
  ): string {
    const lowerMsg = studentMessage.toLowerCase();

    if (lowerMsg.includes("thank") || lowerMsg.includes("help") || lowerMsg.includes("empathy")) {
      return "cooperative";
    }

    if (lowerMsg.includes("hurry") || lowerMsg.includes("time") || lowerMsg.includes("slow")) {
      return "frustrated";
    }

    if (lowerMsg.includes("sorry") || lowerMsg.includes("please")) {
      return "cooperative";
    }

    if (patientResponse.length < 10) {
      return "frustrated";
    }

    return currentEmotion;
  }

  getConversationHistory(sessionId: string): AIMessage[] {
    const session = this.sessions.get(sessionId);
    return session?.conversation || [];
  }

  evaluateConversation(
    session: ConversationState,
    scoringCriteria: ScoringCriterion[],
    rubric: string
  ): EvaluationResult {
    const conversation: Array<{ speaker: "student" | "patient"; message: string; timestamp: number }> = [
      ...session.conversation
        .filter(m => m.role === "user")
        .map((msg, i) => ({
          speaker: "student" as const,
          message: msg.content,
          timestamp: Date.now() + i * 5000,
        })),
      ...session.conversation
        .filter(m => m.role === "assistant")
        .map((msg, i) => ({
          speaker: "patient" as const,
          message: msg.content,
          timestamp: Date.now() + i * 5000,
        })),
    ];

    const scores = this.calculateScores(conversation, scoringCriteria);
    const { strengths, weaknesses, missedItems } = this.analyzePerformance(conversation, scores);
    const feedback = this.generateFeedback(scores, strengths, weaknesses);
    const improvementPlan = this.generateImprovementPlan(weaknesses);

    return {
      scores,
      strengths,
      weaknesses,
      missedItems,
      feedback,
      improvementPlan,
    };
  }

  private calculateScores(
    conversation: { speaker: "student" | "patient"; message: string; timestamp: number }[],
    criteria: ScoringCriterion[]
  ): EvaluationResult["scores"] {
    const scores: EvaluationResult["scores"] = {
      communication: 0,
      history: 0,
      examination: 0,
      clinicalReasoning: 0,
      management: 0,
      professionalism: 0,
      total: 0,
    };

    for (const criterion of criteria) {
      const category = criterion.category.toLowerCase();
      if (category.includes("communication")) {
        scores.communication = Math.min(20, scores.communication + criterion.maxPoints);
      } else if (category.includes("history")) {
        scores.history = Math.min(15, scores.history + criterion.maxPoints);
      } else if (category.includes("examination")) {
        scores.examination = Math.min(15, scores.examination + criterion.maxPoints);
      } else if (category.includes("reasoning") || category.includes("differential")) {
        scores.clinicalReasoning = Math.min(20, scores.clinicalReasoning + criterion.maxPoints);
      } else if (category.includes("management") || category.includes("treatment")) {
        scores.management = Math.min(15, scores.management + criterion.maxPoints);
      } else if (category.includes("professionalism") || category.includes("time")) {
        scores.professionalism = Math.min(15, scores.professionalism + criterion.maxPoints);
      }
    }

    scores.total = scores.communication + scores.history + scores.examination +
      scores.clinicalReasoning + scores.management + scores.professionalism;

    return scores;
  }

  private analyzePerformance(
    conversation: { speaker: string; message: string; timestamp: number }[],
    scores: EvaluationResult["scores"]
  ): { strengths: string[]; weaknesses: string[]; missedItems: string[] } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const missedItems: string[] = [];

    const studentMessages = conversation.filter(m => m.speaker === "student");

    if (scores.communication >= 15) {
      strengths.push("Strong communication skills");
    } else if (scores.communication < 10) {
      weaknesses.push("Communication needs improvement");
      missedItems.push("Introduction and patient identification");
    }

    if (scores.history >= 10) {
      strengths.push("Good history taking");
    } else {
      weaknesses.push("Incomplete history");
      missedItems.push("Risk factors and associated symptoms");
    }

    if (scores.clinicalReasoning >= 15) {
      strengths.push("Strong clinical reasoning");
    } else if (scores.clinicalReasoning < 10) {
      weaknesses.push("Clinical reasoning needs development");
    }

    if (scores.professionalism >= 10) {
      strengths.push("Good professionalism");
    } else if (scores.professionalism < 10) {
      weaknesses.push("Professionalism issues");
      missedItems.push("Time awareness");
    }

    return { strengths, weaknesses, missedItems };
  }

  private generateFeedback(
    scores: EvaluationResult["scores"],
    strengths: string[],
    weaknesses: string[]
  ): string {
    const percentage = Math.round(scores.total);

    let feedback = `Your performance was ${percentage}%.\n\n`;

    if (strengths.length > 0) {
      feedback += `Key Strengths:\n- ${strengths.join("\n- ")}\n\n`;
    }

    if (weaknesses.length > 0) {
      feedback += `Areas for Improvement:\n- ${weaknesses.join("\n- ")}\n\n`;
    }

    feedback += `Overall Score: ${percentage}/100`;

    return feedback;
  }

  private generateImprovementPlan(weaknesses: string[]): string[] {
    const plan: string[] = [];

    for (const weakness of weaknesses) {
      if (weakness.includes("communication")) {
        plan.push("Practice patient introductions and empathy statements");
        plan.push("Review communication frameworks (SPIKES, SOAP)");
      }
      if (weakness.includes("history")) {
        plan.push("Review SOCRATES history-taking framework");
        plan.push("Practice eliciting risk factors");
      }
      if (weakness.includes("reasoning")) {
        plan.push("Practice differential diagnosis formulation");
        plan.push("Review red flag identification");
      }
      if (weakness.includes("professionalism")) {
        plan.push("Practice time management during stations");
        plan.push("Review patient privacy and documentation");
      }
    }

    return [...new Set(plan)].slice(0, 5);
  }

  cleanupExpiredSessions(): number {
    const now = Date.now();
    let count = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.conversationTimeoutMs) {
        this.sessions.delete(sessionId);
        count++;
      }
    }

    return count;
  }
}

export const osceConversationService = new OSCEConversationService();