export interface PatientState {
  symptoms: string[];
  revealed_information: string[];
  emotion: string;
  trust_level: number;
  communication_quality: number;
}

export interface PatientData {
  symptoms: string[];
  revealed_information: string[];
  emotion: string;
  trust_level: number;
}

export interface HiddenInfo {
  diagnosis?: string;
  riskFactors?: string[];
  redFlags?: string[];
  medicalHistory?: any[];
  vitalSigns?: any;
  painDescription?: string;
}

export interface StationData {
  id: string;
  title: string;
  specialty: string;
  difficulty: string;
  duration: number;
  instructions: string;
  learningObjectives: string[];
  category: string;
}

export class OsceAgentSystem {
  private patientAgents: Map<string, PatientState> = new Map();

  getPatientPrompt(input: {
    patientData: PatientData;
    diagnosis: string;
    hiddenInfo: HiddenInfo;
  }): string {
    const { patientData, diagnosis, hiddenInfo } = input;
    const revealedInfo = patientData.revealed_information.length > 0 
      ? patientData.revealed_information.join(", ") 
      : "none";

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

Patient History:
Chief complaint: ${patientData.symptoms.join(", ") || "Various symptoms"}
Medical history: ${JSON.stringify(hiddenInfo.medicalHistory || [])}
Risk factors: ${JSON.stringify(hiddenInfo.riskFactors || [])}
Red flags: ${JSON.stringify(hiddenInfo.redFlags || [])}
Diagnosis (hidden): ${diagnosis}

Current emotional state: ${patientData.emotion}
Trust level: ${patientData.trust_level}/100
Information already revealed: ${revealedInfo}

Respond ONLY as the patient would - in natural, conversational language. Do not explain your reasoning or mention being an AI.`;
  }

  getExaminerPrompt(input: {
    sessionId: string;
    stationId: string;
    userId: string;
  }): string {
    return `You are an OSCE examiner observing a clinical station.

Your task:
Evaluate the student's performance silently during the examination.

Do NOT communicate with the student during the station.

Evaluate these areas:
1. Communication (0-20 points): Introduction, confirmation of identity, empathy, summarizing
2. History (0-15 points): SOCRATES framework, risk factors, associated symptoms
3. Examination (0-15 points): Appropriate exam techniques, relevant findings sought
4. Clinical Reasoning (0-20 points): Differential diagnosis, red flags, appropriate investigations
5. Management (0-15 points): Immediate actions, treatment plans, follow-up
6. Professionalism (0-15 points): Time awareness, patient privacy, documentation

Return ONLY a JSON object with the scoring:
{"communication":0-20,"history":0-15,"examination":0-15,"reasoning":0-20,"management":0-15,"professionalism":0-15,"total":0-100,"strengths":[],"weaknesses":[],"missed_items":[]}`;
  }

  getEvaluationPrompt(input: {
    conversation: any[];
    rubrics: any[];
    station: StationData | null;
  }): string {
    const { conversation, rubrics, station } = input;
    
    const transcript = conversation
      .map((c) => `${c.speaker}: ${c.message}`)
      .join("\n");

    const rubricText = rubrics
      .map((r) => `- ${r.category} (${r.points} pts): ${r.criterion}`)
      .join("\n");

    const totalPoints = rubrics.reduce((sum, r) => sum + (r.points || 0), 0);

    return `You are an OSCE evaluator analyzing a completed station.

Station: ${station?.title || "Unknown"}
Instructions: ${station?.instructions || "N/A"}
Duration: ${station?.duration || 480} seconds

Rubric (total ${totalPoints} points):
${rubricText}

Conversation Transcript:
${transcript}

Analyze the student's performance against each rubric criterion.

Return ONLY a JSON object:
{"communication":0-20,"history_points":0-15,"examination_points":0-15,"reasoning_points":0-20,"management_points":0-15,"professionalism_points":0-15,"total":0-100,"score":0-100,"strengths":[],"weaknesses":[],"missed_items":[],"history_points_detail":{"SOCRATES":0,"risk_factors":0,"associated_symptoms":0},"suggestions":[]}`;
  }

  getFeedbackPrompt(input: {
    score: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    station: StationData | null;
  }): string {
    const { score, strengths, weaknesses, suggestions, station } = input;

    return `You are an OSCE feedback generator. Provide educational, constructive feedback.

Student Score: ${score}/100
Station: ${station?.title || "Unknown"}
Strengths: ${strengths.join(", ") || "None identified"}
Weaknesses: ${weaknesses.join(", ") || "None identified"}
Suggestions: ${suggestions.join(", ") || "Practice more stations"}

Write feedback in this format:
"Your performance was [X]%. 

Key Strengths:
- [bullet point strength 1]
- [bullet point strength 2]

Areas for Improvement:
- [bullet point weakness 1 with specific action]
- [bullet point weakness 2 with specific action]

Recommended Practice:
- [specific station type to practice]
- [specific skill to focus on]

Keep tone encouraging and educational. Avoid phrases like 'you failed' - use 'opportunities for improvement' instead.`;
  }

  updatePatientState(sessionId: string, studentMessage: string, patientResponse: string): PatientState | null {
    const state = this.patientAgents.get(sessionId);
    if (!state) return null;

    const lowerMsg = studentMessage.toLowerCase();

    if (lowerMsg.includes("thank") || lowerMsg.includes("help") || lowerMsg.includes("empathy")) {
      state.trust_level = Math.min(100, state.trust_level + 5);
      state.emotion = "cooperative";
    }

    if (lowerMsg.includes("sorry") || lowerMsg.includes("please")) {
      state.trust_level = Math.min(100, state.trust_level + 3);
    }

    if (lowerMsg.includes("shut up") || lowerMsg.includes("stupid") || lowerMsg.includes("idiot")) {
      state.trust_level = Math.max(0, state.trust_level - 20);
      state.emotion = "frustrated";
    }

    if (patientResponse.length < 10 && !state.revealed_information.includes(patientResponse)) {
      state.communication_quality = Math.max(0, state.communication_quality - 1);
    }

    return state;
  }

  createPatientState(): PatientState {
    const state: PatientState = {
      symptoms: [],
      revealed_information: [],
      emotion: "anxious",
      trust_level: 50,
      communication_quality: 0,
    };
    const sessionId = `patient_${crypto.randomUUID().slice(0, 8)}`;
    this.patientAgents.set(sessionId, state);
    return state;
  }

  getPatientState(sessionId: string): PatientState | undefined {
    return this.patientAgents.get(sessionId);
  }

  removePatientState(sessionId: string): void {
    this.patientAgents.delete(sessionId);
  }
}

export const osceAgentSystem = new OsceAgentSystem();