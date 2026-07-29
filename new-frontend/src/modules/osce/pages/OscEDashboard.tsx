import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, Clock, Brain, Heart, Stethoscope, Award, Activity } from "lucide-react";
import { useOsceStore } from "../store/osceStore";
import type { OsceStation } from "../types";

function StatCard({ 
  icon: Icon, 
  title, 
  value, 
  change,
  color = "primary" 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  title: string; 
  value: string | number; 
  change?: string;
  color?: "primary" | "success" | "warning" | "danger";
}) {
  const colors = {
    primary: "bg-[var(--accent-primary)]",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    danger: "bg-red-500",
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800"
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
          {change && (
            <p className="text-xs text-green-600 dark:text-green-400">{change}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SkillMeter({ 
  name, 
  score, 
  maxScore = 100,
  icon: Icon 
}: { 
  name: string; 
  score: number; 
  maxScore?: number;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const percentage = Math.min(100, (score / maxScore) * 100);
  const color = percentage >= 80 ? "bg-green-500" : percentage >= 60 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-gray-400" />}
          <span className="text-sm font-medium text-[var(--text-primary)]">{name}</span>
        </div>
        <span className="text-sm font-bold text-[var(--text-primary)]">{Math.round(percentage)}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-2.5 rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

interface RecommendedStationCardProps {
  station: OsceStation;
  onSelect: (station: OsceStation) => void;
}

function RecommendedStationCard({ station, onSelect }: RecommendedStationCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(station)}
      className="cursor-pointer bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all"
    >
      <h3 className="font-semibold text-[var(--text-primary)] mb-2">{station.title}</h3>
      <p className="text-sm text-[var(--text-secondary)] mb-3">{station.description}</p>
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
          {station.specialty}
        </span>
        <span>⏱ {station.durationMinutes}m</span>
      </div>
    </motion.div>
  );
}

export function OscEDashboard({ 
  onSelectStation,
  onShowPerformance
}: { 
  onSelectStation: (station: OsceStation) => void;
  onShowPerformance?: () => void;
}) {
  const { progress } = useOsceStore();
  
  const skillMastery = progress.skillMastery;
  const recommendedStations = [
    { id: "1", title: "Chest Pain History", specialty: "Internal Medicine" as const, type: "History" as const, difficulty: "Advanced" as const, difficultyLevel: 4, durationMinutes: 8, skills: ["History", "Clinical Reasoning"], description: "Complete cardiac history assessment" },
    { id: "2", title: "Diabetes Counseling", specialty: "Internal Medicine" as const, type: "Counseling" as const, difficulty: "Intermediate" as const, difficultyLevel: 3, durationMinutes: 10, skills: ["Communication", "Management"], description: "Lifestyle modification counseling" },
    { id: "3", title: "Abdominal Pain Examination", specialty: "Internal Medicine" as const, type: "Examination" as const, difficulty: "Advanced" as const, difficultyLevel: 4, durationMinutes: 12, skills: ["Examination", "Clinical Reasoning"], description: "Focused abdominal examination" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
          AI OSCE Simulator
        </h1>
        <p className="text-[var(--text-secondary)]">
          Welcome! Your clinical skills are improving with practice.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Brain}
          title="Stations Completed"
          value={progress.totalStationsCompleted}
          color="primary"
        />
        <StatCard
          icon={Award}
          title="Average Score"
          value={`${Math.round(progress.averageScore)}%`}
          change="+5% from last week"
          color="success"
        />
        <StatCard
          icon={AlertCircle}
          title="Weak Areas"
          value={progress.weakAreas.length}
          color="warning"
        />
        <StatCard
          icon={Clock}
          title="Recent Attempts"
          value={progress.recentAttempts.length}
          color="primary"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Your Progress</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-purple-600 flex items-center justify-center text-white font-bold text-3xl">
                {Math.round(progress.averageScore)}
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Overall Mastery</p>
          </div>

          <div className="space-y-4">
            <SkillMeter
              name="History Taking"
              score={skillMastery["History Taking"] || 0}
              icon={Stethoscope}
            />
            <SkillMeter
              name="Communication"
              score={skillMastery["Communication"] || 0}
              icon={Heart}
            />
            <SkillMeter
              name="Clinical Reasoning"
              score={skillMastery["Clinical Reasoning"] || 0}
              icon={Brain}
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-[var(--accent-primary)]" />
          Continue Practice
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendedStations.map(station => (
            <RecommendedStationCard
              key={station.id}
              station={station}
              onSelect={onSelectStation}
            />
          ))}
        </div>
      </div>

      {onShowPerformance && (
        <div className="mt-6 text-center">
          <button
            onClick={onShowPerformance}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 transition-colors"
          >
            <Activity className="w-4 h-4" />
            View Performance Dashboard
          </button>
        </div>
      )}
    </div>
  );
}