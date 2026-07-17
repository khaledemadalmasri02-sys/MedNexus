import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  path: string;
}

export function Breadcrumb() {
  const location = useLocation();

  const breadcrumbs = useMemo(() => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const items: BreadcrumbItem[] = [];

    items.push({ label: "Dashboard", path: "/" });

    if (pathSegments.length === 0) return items;

    const firstSegment = pathSegments[0];
    const routeLabels: Record<string, string> = {
      library: "Library",
      generate: "Generate",
      study: "Study",
      history: "History",
      planner: "Planner",
      settings: "Settings",
      chat: "Study Buddy",
      "smart-review": "Smart Review",
      exam: "Exam",
      summarize: "Summarize",
      mnemonics: "Mnemonics",
      coach: "Coach",
      "image-analyze": "Image Analyzer",
      "voice-study": "Voice Study",
      "group-study": "Group Study",
      studypilot: "StudyPilot",
    };

    if (routeLabels[firstSegment]) {
      items.push({ label: routeLabels[firstSegment], path: `/${firstSegment}` });
    }

    if (firstSegment === "deck" && pathSegments[1]) {
      const deckId = pathSegments[1];
      items.push({ label: `Deck #${deckId}`, path: `/deck/${deckId}` });
      if (pathSegments[2] === "doctor") {
        items.push({ label: "Deck Doctor", path: `/deck/${deckId}/doctor` });
      }
    }

    return items;
  }, [location.pathname]);

  if (breadcrumbs.length <= 1) return null;

  return (
    <motion.nav
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
      className="flex items-center gap-1.5 text-xs px-6 py-3 overflow-x-auto"
      style={{ scrollbarWidth: "none" }}
      aria-label="Breadcrumb"
    >
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const isFirst = index === 0;

        return (
          <div key={item.path} className="flex items-center gap-1.5 shrink-0">
            {index > 0 && (
              <ChevronRight className="h-3 w-3 text-text-muted" />
            )}
            {isLast ? (
              <span
                className="font-medium px-2 py-1 rounded-lg"
                style={{
                  color: "var(--text-primary)",
                  background: "rgba(6, 182, 212, 0.08)",
                }}
              >
                {isFirst && <Home className="h-3 w-3 inline mr-1 -mt-0.5" />}
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="px-2 py-1 rounded-lg transition-colors hover:bg-white/5"
                style={{ color: "var(--text-secondary)" }}
              >
                {isFirst && <Home className="h-3 w-3 inline mr-1 -mt-0.5" />}
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </motion.nav>
  );
}
