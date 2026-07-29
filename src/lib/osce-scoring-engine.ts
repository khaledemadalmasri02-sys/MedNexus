export interface WeightConfig {
  communication: number;
  empathy?: number;
  informationDelivery?: number;
  education?: number;
  examination?: number;
  history?: number;
  clinicalReasoning?: number;
  management?: number;
  professionalism?: number;
}

export interface ChecklistItem {
  id: string;
  name: string;
  points: number;
  category: string;
  keywords: string[];
}

export type SafetyPattern = string | RegExp;

export interface StationRubric {
  stationId: string;
  title: string;
  weights: WeightConfig;
  checklistItems: ChecklistItem[];
  automaticFailConditions?: string[];
  criticalSafetyPatterns?: SafetyPattern[];
  expectedDiagnoses?: string[];
  expectedInvestigations?: string[];
}

export interface ScoringResult {
  totalScore: number;
  maxScore: number;
  scoresByCategory: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  feedback: string[];
}

export interface RubricWeights {
  communication: number;
  empathy: number;
  history: number;
  clinicalReasoning: number;
  management: number;
  professionalism: number;
}

export interface ScoringWeight {
  communication: number;
  empathy: number;
  history: number;
  clinicalReasoning: number;
  management: number;
  professionalism: number;
  informationDelivery?: number;
  education?: number;
  examination?: number;
}

export function calculateScore(
  response: string,
  rubric: StationRubric,
  weights?: RubricWeights
): ScoringResult {
  const lowerResponse = response.toLowerCase();
  let totalScore = 0;
  let maxScore = 0;
  const scoresByCategory: Record<string, number> = {};
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const feedback: string[] = [];

  for (const item of rubric.checklistItems) {
    maxScore += item.points;
    const matched = item.keywords.some(kw => lowerResponse.includes(kw));
    if (matched) {
      totalScore += item.points;
      if (!scoresByCategory[item.category]) {
        scoresByCategory[item.category] = 0;
      }
      scoresByCategory[item.category] += item.points;
    }
  }

  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  if (percentage >= 80) {
    strengths.push(`Strong performance - ${Math.round(percentage)}% score`);
  } else if (percentage >= 60) {
    strengths.push(`Good performance - ${Math.round(percentage)}% score`);
  } else {
    weaknesses.push(`Needs improvement - ${Math.round(percentage)}% score`);
  }

  if (Object.keys(scoresByCategory).length === 0) {
    feedback.push("No matching criteria found in response");
  } else {
    feedback.push(`Matched ${Object.keys(scoresByCategory).length} categories`);
  }

  return {
    totalScore,
    maxScore,
    scoresByCategory,
    strengths,
    weaknesses,
    feedback,
  };
}