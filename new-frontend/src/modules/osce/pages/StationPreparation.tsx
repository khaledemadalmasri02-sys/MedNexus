import { motion } from "framer-motion";
import { Clock, Stethoscope, Brain, Heart, AlertCircle } from "lucide-react";
import type { OsceStation, Specialty, StationType, Difficulty } from "../types";

interface StationPreparationProps {
  station: OsceStation;
  onStart: () => void;
  onCancel: () => void;
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <Icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-medium text-[var(--text-primary)]">{value}</p>
      </div>
    </div>
  );
}

export function StationPreparation({ station, onStart, onCancel }: StationPreparationProps) {
  const getRoleDescription = (specialty: Specialty) => {
    const descriptions: Record<Specialty, string> = {
      "Internal Medicine": "You are a medical student in an outpatient clinic.",
      "Surgery": "You are a medical student in the surgical clinic.",
      "Pediatrics": "You are a medical student in the pediatric clinic.",
      "Obstetrics": "You are a medical student in the obstetrics clinic.",
      "Psychiatry": "You are a medical student in the psychiatry clinic.",
      "Emergency Medicine": "You are a medical student in the emergency department.",
      "Cardiology": "You are a medical student in the cardiology clinic.",
      "Neurology": "You are a medical student in the neurology clinic.",
      "Gastroenterology": "You are a medical student in the gastroenterology clinic.",
      "Endocrinology": "You are a medical student in the endocrinology clinic.",
      "Respiratory Medicine": "You are a medical student in the respiratory medicine clinic.",
      "Oncology": "You are a medical student in the oncology clinic.",
      "Rheumatology": "You are a medical student in the rheumatology clinic.",
      "Infectious Disease": "You are a medical student in the infectious disease clinic.",
      "Geriatrics": "You are a medical student in the geriatrics clinic.",
      "Ophthalmology": "You are a medical student in the ophthalmology clinic.",
      "ENT": "You are a medical student in the ENT clinic.",
      "Orthopedics": "You are a medical student in the orthopedics clinic.",
      "Urology": "You are a medical student in the urology clinic.",
      "Nephrology": "You are a medical student in the nephrology clinic.",
    };
    return descriptions[specialty] || "You are a medical student in a clinical setting.";
  };

  const getTypeInstructions = (type: StationType) => {
    const instructions: Record<StationType, string> = {
      History: "Take a focused history from this patient. Ask about chief complaint, associated symptoms, past medical history, medications, and social history.",
      Examination: "Perform a focused physical examination. Document findings systematically.",
      Counseling: "Provide patient education and counseling. Discuss lifestyle modifications, medication adherence, and support resources.",
      Communication: "Communicate effectively with the patient. Practice active listening, empathy, and clear explanations.",
      Interpretation: "Interpret diagnostic data provided by the patient or examine further.",
      Emergency: "Manage this emergency situation rapidly and effectively. Prioritize interventions based on ABCs and critical findings.",
    };
    return instructions[type] || "Engage with the patient appropriately.";
  };

  const difficultyColors: Record<Difficulty, string> = {
    Beginner: "bg-green-100 text-green-700",
    Intermediate: "bg-yellow-100 text-yellow-700",
    Advanced: "bg-orange-100 text-orange-700",
    "Residency level": "bg-red-100 text-red-700",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-black flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="max-w-2xl w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
      >
        <div className="p-8">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-[var(--accent-primary)]/10 rounded-full mb-4"
            >
              <Stethoscope className="w-8 h-8 text-[var(--accent-primary)]" />
            </motion.div>
            
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              {station.title}
            </h2>
            
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${difficultyColors[station.difficulty]}`}>
                {station.difficulty}
              </span>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Candidate Instructions</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {getRoleDescription(station.specialty)}
              </p>
              <p className="mt-2 text-gray-600 dark:text-gray-300 leading-relaxed">
                {getTypeInstructions(station.type)}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Station Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InfoItem 
                  icon={Clock} 
                  label="Time Allotted" 
                  value={`${station.durationMinutes} minutes`} 
                />
                <InfoItem 
                  icon={Brain} 
                  label="Specialty" 
                  value={station.specialty} 
                />
                <InfoItem 
                  icon={Heart} 
                  label="Station Type" 
                  value={station.type} 
                />
              </div>
            </div>

            {station.skills.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Skills to Demonstrate</h4>
                <div className="flex flex-wrap gap-2">
                  {station.skills.map((skill) => (
                    <span 
                      key={skill} 
                      className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Important: Real-time feedback will be provided after completion
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Focus on the clinical task at hand. Do not worry about scoring during the examination.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-5 py-3 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onStart}
              className="px-8 py-3 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 transition-opacity font-medium shadow-lg"
            >
              Start Examination
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}