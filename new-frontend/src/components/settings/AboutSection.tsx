import { motion } from "framer-motion";
import { Zap, BookOpen, Bug, Lightbulb, Star, ExternalLink, Heart } from "lucide-react";
import { SettingsSection } from "./SettingsSection";

export function AboutSection() {
  return (
    <SettingsSection title="About" description="MedNexus — AI-Powered Learning Platform">
      <div className="px-5 pb-5 space-y-4">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Zap className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h4 className="font-display text-lg font-bold" style={{ color: "var(--text-primary)" }}>MedNexus</h4>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Version 1.2.0 · AI-Powered Learning Platform</p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Quick Links</p>
          {[
            { icon: BookOpen, label: "Documentation", url: "#" },
            { icon: Bug, label: "Report a bug", url: "#" },
            { icon: Lightbulb, label: "Request a feature", url: "#" },
            { icon: Star, label: "Rate us on GitHub", url: "#" },
          ].map(link => (
            <motion.a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{ background: "var(--glass-surface)" }}
              whileHover={{ backgroundColor: "var(--glass-surface-faint)", x: 2 }}
            >
              <div className="flex items-center gap-2.5">
                <link.icon className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>{link.label}</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
            </motion.a>
          ))}
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Open Source Licenses</p>
          {[
            { name: "React", license: "MIT" },
            { name: "Express", license: "MIT" },
            { name: "ReportLab", license: "BSD" },
            { name: "Tailwind CSS", license: "MIT" },
          ].map(lib => (
            <div
              key={lib.name}
              className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{ background: "var(--glass-surface-faint)" }}
            >
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{lib.name}</span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--glass-surface)", color: "var(--text-muted)" }}>
                {lib.license}
              </span>
            </div>
          ))}
        </div>

        <div className="text-center pt-2">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Made with <Heart className="w-3 h-3 inline-block" style={{ color: "var(--accent-rose)" }} /> for learners everywhere
          </p>
          <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>© 2025 MedNexus</p>
        </div>
      </div>
    </SettingsSection>
  );
}
