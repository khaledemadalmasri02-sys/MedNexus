import { motion } from "framer-motion";
import { TrendingUp, Target, AlertCircle, CheckCircle, Star, History } from "lucide-react";
import { useOsceStore } from "../store/osceStore";
import type { OsceProgress } from "../types";

interface ProgressChartProps {
  attempts: OsceProgress["recentAttempts"];
}

function ProgressChart({ attempts }: ProgressChartProps) {
  if (attempts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No attempts recorded yet</p>
      </div>
    );
  }

  const maxScore = 100;
  const barWidth = Math.min(60, Math.max(20, 400 / Math.max(1, attempts.length)));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Progress Over Time</h3>
      
      <div className="h-48 flex items-end justify-around px-4 py-4">
        {attempts.slice(0, 10).map((attempt, index) => {
          const height = (attempt.score / maxScore) * 100;
          const isPassing = attempt.score >= 70;
          
          return (
            <motion.div
              key={attempt.id}
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="relative">
                <div
                  className={`rounded-t transition-all ${
                    isPassing ? "bg-green-500" : "bg-red-500"
                  }`}
                  style={{ width: barWidth, height: `${height}%` }}
                />
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-700 dark:text-gray-200">
                  {attempt.score}%
                </div>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                #{attempts.length - index}
              </span>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <TrendingUp className="inline w-4 h-4 mr-1" />
        Showing last {Math.min(10, attempts.length)} attempts
      </div>
    </div>
  );
}

interface SkillMapProps {
  skillMastery: OsceProgress["skillMastery"];
}

function SkillMap({ skillMastery }: SkillMapProps) {
  const skills = [
    { name: "History Taking", icon: History },
    { name: "Communication", icon: AlertCircle },
    { name: "Clinical Reasoning", icon: Target },
    { name: "Physical Examination", icon: CheckCircle },
    { name: "Patient Counseling", icon: Star },
  ];

  const getMasteryLevel = (score: number) => {
    if (score >= 90) return { label: "Excellent", color: "bg-green-500" };
    if (score >= 75) return { label: "Good", color: "bg-blue-500" };
    if (score >= 60) return { label: "Needs Work", color: "bg-yellow-500" };
    return { label: "Poor", color: "bg-red-500" };
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Skill Mastery</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        {skills.map((skill, index) => {
          const score = skillMastery[skill.name] || 0;
          const level = getMasteryLevel(score);
          
          return (
            <motion.div
              key={skill.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
            >
              <skill.icon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">
                {score}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {skill.name}
              </div>
              <span className={`px-2 py-1 text-xs rounded-full text-white ${level.color}`}>
                {level.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

interface WeaknessDetectionProps {
  weakAreas: string[];
}

function WeaknessDetection({ weakAreas }: WeaknessDetectionProps) {
  if (weakAreas.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
      <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-200 mb-3 flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        Pattern Detection
      </h3>
      
      <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-3">
        We've identified some patterns in your performance:
      </p>
      
      <ul className="space-y-2">
        {weakAreas.slice(0, 3).map((area, index) => (
          <motion.li
            key={area}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-2 text-yellow-700 dark:text-yellow-300 text-sm"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{area} requires additional practice</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export function PerformanceDashboard() {
  const { progress } = useOsceStore();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
          Performance Dashboard
        </h1>
        <p className="text-[var(--text-secondary)]">
          Track your clinical skills development over time
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-3"
        >
          <ProgressChart attempts={progress.recentAttempts} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <SkillMap skillMastery={progress.skillMastery} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 mb-6">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Summary</h3>
            
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-[var(--text-primary)] mb-2">
                  {progress.totalStationsCompleted}
                </div>
                <p className="text-gray-500 dark:text-gray-400">Stations Completed</p>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                  {Math.round(progress.averageScore)}%
                </div>
                <p className="text-gray-500 dark:text-gray-400">Average Score</p>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-500 mb-2">
                  {progress.weakAreas.length}
                </div>
                <p className="text-gray-500 dark:text-gray-400">Areas Needing Work</p>
              </div>
            </div>
          </div>

          <WeaknessDetection weakAreas={progress.weakAreas} />
        </motion.div>
      </div>
    </div>
  );
}