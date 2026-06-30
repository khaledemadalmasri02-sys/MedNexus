import { useEffect } from "react";

const FONT_SIZE_MAP: Record<string, string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
  xlarge: "20px",
};

let styleEl: HTMLStyleElement | null = null;

const DENSITY_MAP: Record<string, { padding: string; gap: string }> = {
  compact: { padding: "0.5rem", gap: "0.5rem" },
  comfortable: { padding: "1rem", gap: "0.75rem" },
  spacious: { padding: "1.5rem", gap: "1rem" },
};

export function useApplySettings(settings: {
  fontSize?: string;
  animationSpeed?: number;
  animationsEnabled?: boolean;
  ambientEnabled?: boolean;
  ripplesEnabled?: boolean;
  customCursorEnabled?: boolean;
  reduceMotion?: boolean;
  density?: string;
}) {
  useEffect(() => {
     const root = document.documentElement;

     if (settings.fontSize && FONT_SIZE_MAP[settings.fontSize]) {
       if (!styleEl) {
         styleEl = document.createElement("style");
         document.head.appendChild(styleEl);
       }
       styleEl.textContent = `html { font-size: ${FONT_SIZE_MAP[settings.fontSize]} !important; }`;
       root.style.fontSize = FONT_SIZE_MAP[settings.fontSize];
     }

    if (typeof settings.animationSpeed === "number" && settings.animationSpeed > 0) {
      root.style.setProperty("--animation-speed-multiplier", String(settings.animationSpeed));
    }

    root.style.setProperty("--animate", settings.animationsEnabled !== false ? "1" : "0");

    root.setAttribute("data-ambient", settings.ambientEnabled !== false ? "true" : "false");

    root.setAttribute("data-ripples", settings.ripplesEnabled !== false ? "true" : "false");

    if (settings.density && DENSITY_MAP[settings.density]) {
      root.style.setProperty("--density-padding", DENSITY_MAP[settings.density].padding);
      root.style.setProperty("--density-gap", DENSITY_MAP[settings.density].gap);
    }

    if (settings.reduceMotion) {
      root.setAttribute("data-reduce-motion", "true");
      root.style.setProperty("--animate", "0");
    } else {
      root.removeAttribute("data-reduce-motion");
    }
  }, [
    settings.fontSize,
    settings.animationSpeed,
    settings.animationsEnabled,
    settings.ambientEnabled,
    settings.ripplesEnabled,
    settings.customCursorEnabled,
    settings.reduceMotion,
    settings.density,
  ]);
}
