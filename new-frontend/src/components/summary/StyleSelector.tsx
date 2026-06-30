import { motion } from "framer-motion";
import { smoothTransition } from "../ui/constants";
import StylePreviewCard from "./StylePreviewCard";
import type { SummaryStyle } from "../../lib/api";

interface StyleSelectorProps {
  selectedStyle: SummaryStyle;
  onSelect: (style: SummaryStyle) => void;
}

const STYLES: { id: SummaryStyle; name: string; description: string; tags: string[] }[] = [
  { id: "academic", name: "Academic", description: "Clean serif, structured headers, numbered sections", tags: ["Serif", "Numbered", "Formal"] },
  { id: "modern", name: "Modern", description: "Bold accent colors, colored section blocks", tags: ["Sans-serif", "Color blocks", "Clean"] },
  { id: "minimal", name: "Minimal", description: "Lots of whitespace, thin lines, elegant typography", tags: ["Light", "Spacious", "Elegant"] },
  { id: "clinical", name: "Clinical", description: "Medical handbook — KTP/MCQ/IMPORTANT/OSCE boxes", tags: ["Medical", "Boxes", "Handbook"] },
  { id: "cornell", name: "Cornell", description: "Cornell note-style with cue column", tags: ["2-column", "Notes", "Summary"] },
  { id: "smart-briefing", name: "Smart Briefing", description: "Multi-source merge with actionable takeaways", tags: ["Executive", "Actions", "Cross-ref"] },
];

function AcademicPreview() {
  return (
    <div className="p-2.5 font-serif text-[7px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
      <div className="text-[9px] font-bold text-center mb-1.5 tracking-wide" style={{ color: "rgba(38,38,78,0.7)" }}>STUDY SUMMARY</div>
      <div className="h-px mb-1.5" style={{ background: "rgba(128,128,150,0.4)" }} />
      <div className="font-bold mb-0.5 text-[8px]" style={{ color: "rgba(51,51,99,0.6)" }}>1. Key Concepts</div>
      <div className="mb-1.5 pl-1" style={{ borderLeft: "1.5px solid rgba(51,51,99,0.2)" }}>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.</div>
      <div className="font-bold mb-0.5 text-[8px]" style={{ color: "rgba(51,51,99,0.6)" }}>2. Clinical Details</div>
      <div className="mb-1.5 pl-1" style={{ borderLeft: "1.5px solid rgba(51,51,99,0.2)" }}>Tempor incididunt ut labore et dolore magna aliqua.</div>
      <div className="font-bold mb-0.5 text-[8px]" style={{ color: "rgba(51,51,99,0.6)" }}>3. Summary</div>
      <div className="pl-1" style={{ borderLeft: "1.5px solid rgba(51,51,99,0.2)" }}>Ut enim ad minim veniam, quis nostrud exercitation.</div>
    </div>
  );
}

function ModernPreview() {
  return (
    <div className="p-2.5 text-[7px] leading-relaxed">
      <div className="text-[9px] font-bold mb-1.5" style={{ color: "rgba(27,70,140,0.7)" }}>Summary</div>
      <div className="rounded-sm p-1 mb-1" style={{ background: "rgba(27,70,140,0.06)", borderLeft: "2px solid rgba(27,70,140,0.5)" }}>
        <div className="font-bold text-[7px]" style={{ color: "rgba(27,70,140,0.6)" }}>Key Points</div>
        <div className="text-[6px]" style={{ color: "var(--text-muted)" }}>Bold section blocks with accent colors</div>
      </div>
      <div className="rounded-sm p-1 mb-1" style={{ background: "rgba(139,92,246,0.06)", borderLeft: "2px solid rgba(139,92,246,0.4)" }}>
        <div className="font-bold text-[7px]" style={{ color: "rgba(139,92,246,0.6)" }}>Details</div>
        <div className="text-[6px]" style={{ color: "var(--text-muted)" }}>Colored accent blocks</div>
      </div>
      <div className="rounded-sm p-1" style={{ background: "rgba(6,182,212,0.06)", borderLeft: "2px solid rgba(6,182,212,0.4)" }}>
        <div className="font-bold text-[7px]" style={{ color: "rgba(6,182,212,0.6)" }}>Takeaways</div>
        <div className="text-[6px]" style={{ color: "var(--text-muted)" }}>Clean modern layout</div>
      </div>
    </div>
  );
}

function MinimalPreview() {
  return (
    <div className="p-2.5 text-[7px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
      <div className="text-[9px] font-light tracking-[0.15em] mb-2.5" style={{ color: "rgba(80,80,80,0.5)" }}>SUMMARY</div>
      <div className="h-px mb-2" style={{ background: "rgba(180,180,180,0.3)" }} />
      <div className="mb-2 font-light">Key concepts with lots of whitespace and breathing room</div>
      <div className="h-px mb-2" style={{ background: "rgba(180,180,180,0.3)" }} />
      <div className="font-light">Elegant thin typography with minimal visual noise</div>
      <div className="h-px mt-2" style={{ background: "rgba(180,180,180,0.3)" }} />
      <div className="mt-2 font-light text-[6px]">Clean · Simple · Focused</div>
    </div>
  );
}

function ClinicalPreview() {
  return (
    <div className="p-2.5 text-[7px] leading-relaxed">
      <div className="text-[9px] font-bold mb-1" style={{ color: "rgba(26,82,118,0.8)" }}>ORTHOPEDIC</div>
      <div className="text-[7px] mb-1" style={{ color: "rgba(117,117,117,0.6)" }}>Summary Handbook</div>
      <div className="h-px mb-1" style={{ background: "rgba(26,82,118,0.25)" }} />
      <div className="rounded-sm p-1 mb-0.5" style={{ background: "rgba(33,150,243,0.06)", borderLeft: "2px solid rgba(33,150,243,0.5)" }}>
        <div className="font-bold text-[6px]" style={{ color: "rgba(33,150,243,0.7)" }}>KEY TEACHING POINTS</div>
      </div>
      <div className="rounded-sm p-1 mb-0.5" style={{ background: "rgba(244,67,54,0.06)", borderLeft: "2px solid rgba(244,67,54,0.5)" }}>
        <div className="font-bold text-[6px]" style={{ color: "rgba(244,67,54,0.7)" }}>MCQ TRAPS</div>
      </div>
      <div className="rounded-sm p-1 mb-0.5" style={{ background: "rgba(76,175,80,0.06)", borderLeft: "2px solid rgba(76,175,80,0.5)" }}>
        <div className="font-bold text-[6px]" style={{ color: "rgba(76,175,80,0.7)" }}>OSCE PEARLS</div>
      </div>
      <div className="rounded-sm p-1" style={{ background: "rgba(255,152,0,0.06)", borderLeft: "2px solid rgba(255,152,0,0.5)" }}>
        <div className="font-bold text-[6px]" style={{ color: "rgba(255,152,0,0.7)" }}>IMPORTANT</div>
      </div>
    </div>
  );
}

function CornellPreview() {
  return (
    <div className="p-2.5 text-[7px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
      <div className="text-[9px] font-bold mb-1" style={{ color: "rgba(38,38,78,0.6)" }}>Cornell Notes</div>
      <div className="h-px mb-1" style={{ background: "rgba(128,128,150,0.3)" }} />
      <div className="flex gap-0.5 mb-1">
        <div className="w-2/5 p-0.5 rounded-sm" style={{ background: "rgba(38,50,100,0.05)" }}>
          <div className="font-bold text-[6px]" style={{ color: "rgba(38,50,100,0.5)" }}>Cue</div>
          <div className="text-[6px]">Terms</div>
          <div className="text-[6px]">Questions</div>
        </div>
        <div className="flex-1 p-0.5 rounded-sm" style={{ background: "rgba(38,50,100,0.02)" }}>
          <div className="font-bold text-[6px]" style={{ color: "rgba(38,50,100,0.5)" }}>Notes</div>
          <div className="text-[6px]">Main content</div>
          <div className="text-[6px]">area here</div>
        </div>
      </div>
      <div className="h-px mt-0.5" style={{ background: "rgba(128,128,150,0.3)" }} />
      <div className="p-0.5 mt-0.5 rounded-sm" style={{ background: "rgba(38,50,100,0.05)" }}>
        <div className="text-[6px] font-bold" style={{ color: "rgba(38,50,100,0.4)" }}>Summary</div>
      </div>
    </div>
  );
}

function SmartBriefingPreview() {
  return (
    <div className="p-2.5 text-[7px] leading-relaxed">
      <div className="text-[9px] font-bold mb-1.5" style={{ color: "rgba(10,60,80,0.7)" }}>📋 Briefing</div>
      <div className="rounded-sm p-1 mb-1" style={{ background: "rgba(0,100,80,0.06)", borderLeft: "2px solid rgba(0,100,80,0.5)" }}>
        <div className="font-bold text-[7px]" style={{ color: "rgba(0,100,80,0.6)" }}>🎯 Executive Summary</div>
        <div className="text-[6px]" style={{ color: "var(--text-muted)" }}>2-3 sentence overview</div>
      </div>
      <div className="rounded-sm p-1 mb-1" style={{ background: "rgba(27,70,140,0.06)", borderLeft: "2px solid rgba(27,70,140,0.4)" }}>
        <div className="font-bold text-[7px]" style={{ color: "rgba(27,70,140,0.6)" }}>🔗 Cross-Source</div>
        <div className="text-[6px]" style={{ color: "var(--text-muted)" }}>Connections & synthesis</div>
      </div>
      <div className="rounded-sm p-1" style={{ background: "rgba(180,120,20,0.06)", borderLeft: "2px solid rgba(180,120,20,0.4)" }}>
        <div className="font-bold text-[7px]" style={{ color: "rgba(180,120,20,0.6)" }}>💡 Action Items</div>
        <div className="text-[6px]" style={{ color: "var(--text-muted)" }}>Next steps & priorities</div>
      </div>
    </div>
  );
}

const PREVIEW_MAP: Record<SummaryStyle, () => React.ReactNode> = {
  academic: AcademicPreview,
  modern: ModernPreview,
  minimal: MinimalPreview,
  clinical: ClinicalPreview,
  cornell: CornellPreview,
  "smart-briefing": SmartBriefingPreview,
};

export default function StyleSelector({ selectedStyle, onSelect }: StyleSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={smoothTransition}
    >
      <h3 className="text-sm font-display font-semibold text-text-secondary tracking-wider uppercase mb-1">
        Choose a Style
      </h3>
      <p className="text-xs text-text-muted mb-4">
        Each style produces a different PDF layout. Preview before generating.
      </p>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-thin">
        {STYLES.map((s, idx) => {
          const Preview = PREVIEW_MAP[s.id];
          return (
            <StylePreviewCard
              key={s.id}
              style={s.id}
              name={s.name}
              description={s.description}
              tags={s.tags}
              isSelected={selectedStyle === s.id}
              onClick={() => onSelect(s.id)}
              delay={idx * 0.08}
              previewContent={<Preview />}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
