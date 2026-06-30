import { motion } from "framer-motion";
import { Stethoscope, BookOpen, Brain, Zap, GraduationCap, FileText, Check } from "lucide-react";

export interface GenerationTemplate {
  id: string;
  name: string;
  description: string;
  icon: typeof BookOpen;
  color: string;
  prompt: string;
  tags: string[];
}

export const GENERATION_TEMPLATES: GenerationTemplate[] = [
  {
    id: "clinical-vignettes",
    name: "Clinical Vignettes",
    description: "Case-based questions from patient scenarios",
    icon: Stethoscope,
    color: "var(--accent-rose)",
    prompt: "Generate clinical vignette-style flashcards. Each card should present a patient scenario and ask for the most likely diagnosis, next step in management, or best initial test.",
    tags: ["clinical", "diagnosis", "management"],
  },
  {
    id: "drug-cards",
    name: "Drug Cards",
    description: "Drug names, mechanisms, side effects",
    icon: Brain,
    color: "var(--accent-purple)",
    prompt: "Generate pharmacology flashcards focusing on drug names, mechanisms of action, indications, contraindications, and key side effects.",
    tags: ["pharmacology", "drugs", "mechanisms"],
  },
  {
    id: "anatomy",
    name: "Anatomy",
    description: "Structures, relations, functions",
    icon: BookOpen,
    color: "var(--accent-green)",
    prompt: "Generate anatomy flashcards focusing on anatomical structures, their relations, blood supply, innervation, and clinical significance.",
    tags: ["anatomy", "structures", "relations"],
  },
  {
    id: "quick-review",
    name: "Quick Review",
    description: "High-level summary cards",
    icon: Zap,
    color: "var(--accent-amber)",
    prompt: "Generate concise review flashcards with key facts and high-yield information. Keep answers brief and focused on the most important points.",
    tags: ["review", "summary", "high-yield"],
  },
  {
    id: "exam-prep",
    name: "Exam Prep",
    description: "USMLE-style questions",
    icon: GraduationCap,
    color: "var(--accent-blue)",
    prompt: "Generate USMLE-style flashcards with clinical vignettes, focusing on high-yield facts, classic presentations, and board-relevant concepts.",
    tags: ["usmle", "boards", "exam"],
  },
  {
    id: "pathology",
    name: "Pathology",
    description: "Disease mechanisms and pathology",
    icon: FileText,
    color: "var(--accent-cyan)",
    prompt: "Generate pathology flashcards covering disease mechanisms, histopathology, clinical features, and diagnostic criteria.",
    tags: ["pathology", "disease", "mechanisms"],
  },
];

interface GenerationTemplatesProps {
  selectedId: string | null;
  onSelect: (template: GenerationTemplate) => void;
}

export function GenerationTemplates({ selectedId, onSelect }: GenerationTemplatesProps) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-text-secondary">Generation Template</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {GENERATION_TEMPLATES.map((template) => {
          const isSelected = selectedId === template.id;
          return (
            <motion.button
              key={template.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(template)}
              className="relative flex flex-col items-start gap-2 p-3 rounded-xl text-left transition-all"
              style={{
                background: isSelected ? `${template.color}10` : "var(--bg-elevated)",
                border: `1px solid ${isSelected ? `${template.color}30` : "var(--border-subtle)"}`,
              }}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: template.color }}
                >
                  <Check className="h-2.5 w-2.5 text-white" />
                </motion.div>
              )}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${template.color}12`, border: `1px solid ${template.color}20` }}
              >
                <template.icon className="h-4 w-4" style={{ color: template.color }} />
              </div>
              <div>
                <div className="text-xs font-semibold text-text-primary">{template.name}</div>
                <div className="text-[10px] text-text-muted mt-0.5 leading-relaxed">{template.description}</div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
