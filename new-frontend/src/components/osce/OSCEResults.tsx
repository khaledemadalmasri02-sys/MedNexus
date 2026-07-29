import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, X, Award, Brain, Stethoscope, UserCheck, MessageCircle } from "lucide-react";

interface OSCEResultsProps {
  sessionId: string;
  onClose: () => void;
  onRetry: () => void;
}

interface ScoreData {
  communication: number;
  history: number;
  examination: number;
  clinicalReasoning: number;
  management: number;
  professionalism: number;
  total: number;
}

export function OSCEResults({ sessionId, onClose, onRetry }: OSCEResultsProps) {
  const [scores, setScores] = useState<ScoreData | null>(null);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const response = await fetch(`/api/conversation/evaluate/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setScores(data.scores);
        setStrengths(data.strengths || []);
        setWeaknesses(data.weaknesses || []);
        setFeedback(data.feedback || "");
      }
    } catch (error) {
      console.error("Failed to fetch results:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBackgroundColor = (score: number) => {
    if (score >= 80) return "bg-green-100";
    if (score >= 60) return "bg-yellow-100";
    return "bg-red-100";
  };

  const scoreCategories = [
    { key: "communication", label: "Communication", icon: MessageCircle, maxPoints: 20 },
    { key: "history", label: "History", icon: Brain, maxPoints: 15 },
    { key: "examination", label: "Examination", icon: Stethoscope, maxPoints: 15 },
    { key: "clinicalReasoning", label: "Clinical Reasoning", icon: Brain, maxPoints: 20 },
    { key: "management", label: "Management", icon: Award, maxPoints: 15 },
    { key: "professionalism", label: "Professionalism", icon: UserCheck, maxPoints: 15 },
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4 text-center text-gray-600">Evaluating your performance...</p>
        </div>
      </div>
    );
  }

  if (!scores) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md text-center">
          <p className="text-gray-600">No results available</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">OSCE Results</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-2 ${scores.total >= 70 ? "bg-green-100" : "bg-red-100"}`}>
              <span className={`text-3xl font-bold ${scores.total >= 70 ? "text-green-600" : "text-red-600"}`}>
                {scores.total}%
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {scores.total >= 70 ? "Pass" : "Needs Improvement"}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {scoreCategories.map((category) => {
              const score = scores[category.key as keyof ScoreData] as number;
              const Icon = category.icon;
              return (
                <div key={category.key} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-700">{category.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-full h-2 rounded-full ${getScoreBackgroundColor(score)}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${getScoreBackgroundColor(score)}`}
                        style={{ width: `${(score / category.maxPoints) * 100}%` }}
                      />
                    </div>
                    <span className={`font-semibold ${getScoreColor(score)}`}>
                      {score}/{category.maxPoints}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {strengths.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-green-700 mb-3 flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  Strengths
                </h3>
                <ul className="space-y-2">
                  {strengths.map((strength, i) => (
                    <li key={i} className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {weaknesses.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-red-700 mb-3 flex items-center gap-2">
                  <X className="w-5 h-5" />
                  Areas for Improvement
                </h3>
                <ul className="space-y-2">
                  {weaknesses.map((weakness, i) => (
                    <li key={i} className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                      <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{weakness}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {feedback && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Feedback</h3>
              <p className="text-blue-800 text-sm">{feedback}</p>
            </div>
          )}

          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Close
            </button>
            <button
              onClick={onRetry}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <Award className="w-4 h-4" />
              Practice Again
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}