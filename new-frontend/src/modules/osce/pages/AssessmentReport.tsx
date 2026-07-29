import { motion } from "framer-motion";
import { CheckCircle, XCircle, AlertCircle, Lightbulb } from "lucide-react";
import type { OsceFeedback } from "../types";

interface AssessmentReportProps {
  feedback: OsceFeedback;
  onRetry: () => void;
  onContinue: () => void;
}

function ScoreCircle({ 
  score, 
  maxScore = 100,
  size = 120
}: { 
  score: number; 
  maxScore?: number;
  size?: number;
}) {
  const percentage = Math.min(100, (score / maxScore) * 100);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform rotate-[-90deg]" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="4"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={percentage >= 70 ? "#22c55e" : percentage >= 50 ? "#eab308" : "#ef4444"}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold text-[var(--text-primary)]">
            {Math.round(percentage)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Score</div>
        </div>
      </div>
    </div>
  );
}

function CompetencyBar({ 
  competency,
  score,
  maxScore = 100
}: {
  competency: OsceFeedback["competencies"][0];
  score: number;
  maxScore?: number;
}) {
  const percentage = Math.min(100, (score / maxScore) * 100);
  const isMissed = competency.missed;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${isMissed ? "text-red-600" : "text-gray-700 dark:text-gray-300"}`}>
          {competency.name}
          {isMissed && <XCircle className="inline w-3 h-3 ml-1" />}
        </span>
        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{Math.round(percentage)}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, delay: 0.1 }}
          className={`h-2 rounded-full ${
            percentage >= 80 ? "bg-green-500" : 
            percentage >= 60 ? "bg-yellow-500" : "bg-red-500"
          }`}
        />
      </div>
      {competency.feedback && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{competency.feedback}</p>
      )}
    </div>
  );
}

export function AssessmentReport({ feedback, onRetry, onContinue }: AssessmentReportProps) {
  const getStatusColor = (status: OsceFeedback["status"]) => {
    return status === "Pass" 
      ? "bg-green-500" 
      : "bg-red-500";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        >
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                {feedback.status === "Pass" ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600" />
                )}
              </div>
              
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                Station Completed
              </h2>
              
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                <span className={`px-2 py-1 text-xs font-medium rounded-full text-white ${getStatusColor(feedback.status)}`}>
                  {feedback.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center lg:text-left"
              >
                <ScoreCircle score={feedback.overallScore} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-2"
              >
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">
                  Performance Breakdown
                </h3>
                
                <div className="space-y-4">
                  {feedback.competencies.map((competency, index) => (
                    <motion.div
                      key={competency.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      <CompetencyBar 
                        competency={competency}
                        score={competency.score}
                        maxScore={competency.maxScore}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {feedback.missedPoints.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-8"
              >
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Missed Points
                </h3>
                
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <ul className="space-y-2">
                    {feedback.missedPoints.map((point, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="flex items-start gap-2 text-red-700 dark:text-red-300"
                      >
                        <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{point}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-8"
            >
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                Model Answer
              </h3>
              
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                <ol className="space-y-3">
                  {feedback.modelAnswer.map((step, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-start gap-3"
                    >
                      <div className="flex-shrink-0 w-7 h-7 bg-[var(--accent-primary)] text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">{step}</span>
                    </motion.li>
                  ))}
                </ol>
              </div>
            </motion.div>

            <div className="flex justify-end gap-3">
              <button
                onClick={onRetry}
                className="px-5 py-3 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Retry Station
              </button>
              <button
                onClick={onContinue}
                className="px-6 py-3 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                Continue Practice
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}