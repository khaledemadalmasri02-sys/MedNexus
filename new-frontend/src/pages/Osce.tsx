import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOsceStore } from "../modules/osce/store/osceStore";
import { StationLibrary } from "../modules/osce/components/StationLibrary";
import { ExaminationRoom } from "../modules/osce/components/ExaminationRoom";
import { StationPreparation } from "../modules/osce/pages/StationPreparation";
import { AssessmentReport } from "../modules/osce/pages/AssessmentReport";
import { PerformanceDashboard } from "../modules/osce/pages/PerformanceDashboard";
import { OscEDashboard } from "../modules/osce/pages/OscEDashboard";
import type { OsceStation, OsceFeedback } from "../modules/osce/types";

const MOCK_STATIONS: OsceStation[] = [
  {
    id: "chest-pain-history",
    title: "Chest Pain History",
    specialty: "Internal Medicine",
    type: "History",
    difficulty: "Advanced",
    difficultyLevel: 4,
    durationMinutes: 8,
    skills: ["History", "Clinical Reasoning"],
    description: "Take a focused history from a patient presenting with chest pain",
  },
  {
    id: "diabetes-counseling",
    title: "Diabetes Counseling",
    specialty: "Internal Medicine",
    type: "Counseling",
    difficulty: "Intermediate",
    difficultyLevel: 3,
    durationMinutes: 10,
    skills: ["Communication", "Management"],
    description: "Provide patient education and counseling for diabetes management",
  },
  {
    id: "abdominal-pain-exam",
    title: "Abdominal Pain Examination",
    specialty: "Internal Medicine",
    type: "Examination",
    difficulty: "Advanced",
    difficultyLevel: 4,
    durationMinutes: 12,
    skills: ["Examination", "Clinical Reasoning"],
    description: "Perform a focused physical examination for abdominal pain",
  },
  {
    id: "pediatric-aph-thyroid",
    title: "Pediatric Aphthous Thyroid",
    specialty: "Pediatrics",
    type: "History",
    difficulty: "Beginner",
    difficultyLevel: 1,
    durationMinutes: 6,
    skills: ["History", "Communication"],
    description: "History taking for pediatric patient with throat issues",
  },
  {
    id: "ob-stress-test",
    title: "Obstetric Stress Test",
    specialty: "Obstetrics",
    type: "Interpretation",
    difficulty: "Intermediate",
    difficultyLevel: 3,
    durationMinutes: 10,
    skills: ["Interpretation", "Clinical Reasoning"],
    description: "Interpret fetal heart rate patterns",
  },
  {
    id: "psychiatric-assessment",
    title: "Psychiatric Assessment",
    specialty: "Psychiatry",
    type: "History",
    difficulty: "Advanced",
    difficultyLevel: 4,
    durationMinutes: 15,
    skills: ["History", "Communication"],
    description: "Mental status examination and assessment",
  },
  {
    id: "trauma-primary-survey",
    title: "Trauma Primary Survey",
    specialty: "Emergency Medicine",
    type: "Examination",
    difficulty: "Residency level",
    difficultyLevel: 5,
    durationMinutes: 10,
    skills: ["Examination", "Clinical Reasoning", "Management"],
    description: "ABCDE primary survey for trauma patient",
  },
  {
    id: "surgical-abdo-pain",
    title: "Surgical Abdomen Pain",
    specialty: "Surgery",
    type: "Examination",
    difficulty: "Advanced",
    difficultyLevel: 4,
    durationMinutes: 12,
    skills: ["Examination", "Clinical Reasoning"],
    description: "Focused abdominal examination for surgical candidates",
  },
];

type ViewState = "dashboard" | "library" | "preparation" | "examination" | "assessment" | "performance";

export default function OscePage() {
  const [viewState, setViewState] = useState<ViewState>("dashboard");
  const [currentStation, setCurrentStation] = useState<OsceStation | null>(null);
const [assessmentResult, setAssessmentResult] = useState<OsceFeedback | null>(null);
  
  const { setAvailableStations } = useOsceStore();
  
  useEffect(() => {
    setAvailableStations(MOCK_STATIONS);
  }, []);
  
  const handleSelectStation = (station: OsceStation) => {
    setCurrentStation(station);
    setViewState("preparation");
  };

  const handleStartExamination = () => {
    if (currentStation) {
      setViewState("examination");
    }
  };

  const handleCancelPreparation = () => {
    setViewState("library");
  };

  const handleCompleteExamination = (feedback: OsceFeedback) => {
    setAssessmentResult(feedback);
    setViewState("assessment");
  };

  const handleRetry = () => {
    setViewState("preparation");
  };

  const handleContinuePractice = () => {
    setViewState("library");
    setAssessmentResult(null);
  };

  const handlePerformanceDashboard = () => {
    setViewState("performance");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AnimatePresence mode="wait">
        {viewState === "dashboard" && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <OscEDashboard 
              onSelectStation={handleSelectStation}
              onShowPerformance={handlePerformanceDashboard}
            />
          </motion.div>
        )}

        {viewState === "library" && (
          <motion.div
            key="library"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <StationLibrary
              stations={MOCK_STATIONS}
              filters={{ specialty: "all", type: "all", difficulty: "all", searchQuery: "" }}
              onFilterChange={() => {}}
              onSelectStation={handleSelectStation}
            />
          </motion.div>
        )}

        {viewState === "preparation" && currentStation && (
          <motion.div
            key="preparation"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <StationPreparation
              station={currentStation}
              onStart={handleStartExamination}
              onCancel={handleCancelPreparation}
            />
          </motion.div>
        )}

        {viewState === "examination" && currentStation && (
          <motion.div
            key="examination"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <ExaminationRoom
              station={currentStation}
              onComplete={handleCompleteExamination}
            />
          </motion.div>
        )}

        {viewState === "assessment" && currentStation && assessmentResult && (
          <motion.div
            key="assessment"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <AssessmentReport
              feedback={assessmentResult}
              onRetry={handleRetry}
              onContinue={handleContinuePractice}
            />
          </motion.div>
        )}

        {viewState === "performance" && (
          <motion.div
            key="performance"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <PerformanceDashboard />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}