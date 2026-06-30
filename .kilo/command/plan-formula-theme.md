---
description: Plan a formula-scene theme with white/black tab colors using the provided CSS as the base background
---

Plan the implementation of a new theme/mode for the user's project in `$1` on the current branch. DO NOT write any code. Produce only a written plan as the final response the user can review and approve.

## Goal
Add a "formula scene" theme that combines:
- A white tap color and a black tap color (two tappable color options).
- Use the CSS code in the conversation background (the big CSS block) as the base styling/reset layer for the theme.

## Context (from prior analysis)
The project is a React + Vite app at `new-frontend/` with a mature theme system:
- `src/lib/themes.ts` — single source of truth. Defines `ThemeId` union, `THEME_IDS` array, `ThemeDefinition` interface, `themes: ThemeDefinition[]`, `getThemeById()`, `themeToCssVariables()`.
- `src/context/ThemeContext.tsx` — React context provider. Manages `themeId`, `themeMode`, accent color. Applies CSS variables to `document.documentElement` via `applyCssVariables()`.
- `src/components/settings/AppearanceSection.tsx` — theme picker UI. Iterates `themeList` and renders `<ThemePreviewCard>` per theme.
- `src/components/theme/ThemePreviewCard.tsx` — renders icon, name, mode badge, decorative gradient preview per theme. Has `id === "tokyo"` / `"ember"` / `"sakura"` / etc. gradient branches.
- `src/components/theme/ThreeThemeBackground.tsx` — picks a 3D scene per theme via `SCENE_MAP`. Falls back to `<StarfieldBackground />` when WebGL is unavailable.
- `src/components/theme/ThemeTapFeedback.tsx` — full-screen canvas overlay that renders expanding ripples using `--tap-color` and `--tap-glow` CSS variables.
- `src/hooks/useRipple.tsx` — Framer Motion ripple elements using `theme.tapColor`.
- `src/index.css` — Tailwind + `@theme` block + per-theme CSS variable overrides (e.g. `html[data-theme-id="nebula"][data-theme-mode="dark"]`).

## Analysis steps
1. Confirm the project path from `$1` (default to `new-frontend`).
2. Read `src/lib/themes.ts` to confirm current `ThemeId` union, `THEME_IDS`, `ThemeDefinition` shape, and existing `tapColor` / `tapGlow` / `tapShape` values.
3. Read `src/components/theme/ThemePreviewCard.tsx` to understand the gradient branch pattern.
4. Read `src/components/theme/ThreeThemeBackground.tsx` to understand scene wiring and the WebGL fallback path.
5. Read `src/index.css` to understand the per-theme CSS variable override pattern and decide how to scope the user's CSS block.

## Implementation plan

### 1. `src/lib/themes.ts`
- Add `"formula"` to the `ThemeId` union type.
- Add `"formula"` to the `THEME_IDS` array.
- Add a new `ThemeDefinition` entry at the end of `themes[]` with:
  - `id: "formula"`, `name: "Formula"`, `icon: "◉"`, `mode: "dark"`
  - `tapColor: "rgba(255, 255, 255, 0.85)"` (white tap)
  - `tapGlow: "rgba(0, 0, 0, 0.45)"` (black glow)
  - `tapShape: "orb"`
  - `backgroundType: "formula"` (add to `ThemeBackgroundType` union)
  - Dark palette: `bgSolid: "#000000"`, `bgRgb: "0, 0, 0"`, `bgDeep: "#050505"`, `bgSurface: "#0A0A0A"`, `bgElevated: "rgba(20,20,20,0.85)"`, `bgGlass: "rgba(10,10,10,0.62)"`, `bgGlassStrong: "rgba(5,5,5,0.9)"`
  - Borders: `borderSubtle: "rgba(255,255,255,0.08)"`, `borderDefault: "rgba(255,255,255,0.16)"`, `borderActive: "rgba(255,255,255,0.48)"`
  - Glows: `glowPrimary: "rgba(255,255,255,0.32)"`, `glowSecondary: "rgba(255,255,255,0.18)"`
  - Text: `textPrimary: "#FFFFFF"`, `textSecondary: "#B0B0B0"`, `textMuted: "#707070"`, `textOnAccent: "#000000"`
  - Accents: `accentPrimary: "#FFFFFF"`, `accentSecondary: "#000000"`, `accentTertiary: "#94A3B8"`
  - Gradients: `gradientText: "linear-gradient(135deg, #FFFFFF 0%, #94A3B8 55%, #FFFFFF 100%)"`, `gradientCta: "linear-gradient(135deg, #FFFFFF 0%, #000000 100%)"`

### 2. `src/components/theme/ThemePreviewCard.tsx`
- Add an `id === "formula"` branch in the outer decorative gradient (white radial on black).
- Add an `id === "formula"` branch in the inner card surface (use `rgba(255,255,255,0.06)`).

### 3. `src/components/theme/SceneFormula.tsx` (new file)
- A canvas-based animated background (no WebGL dependency) that renders on formula theme only.
- Subtle white grid + orbiting dots + concentric rings on black — matches the "formula" aesthetic.
- Exported as default.

### 4. `src/components/theme/ThreeThemeBackground.tsx`
- Import `SceneFormula` as a lazy default.
- In the WebGL-available branch: add `if (themeId === "formula")` before the main `<Canvas>` and render `<SceneFormula />` in a `fixed inset-0 z-0` wrapper.
- In the WebGL-unavailable branch: same — render `<SceneFormula />` instead of `<StarfieldBackground />`.
- Do NOT add `formula` to `SCENE_MAP` (it's canvas, not Three.js).

### 5. `src/index.css`
- Add a per-theme override block:
  ```css
  html[data-theme-id="formula"][data-theme-mode="dark"] {
    --bg-void: #000000;
    --bg-void-rgb: 0, 0, 0;
    --bg-deep: #050505;
    --bg-surface: #0A0A0A;
    --bg-elevated: rgba(20, 20, 20, 0.85);
    --bg-overlay: rgba(0, 0, 0, 0.6);
    --bg-glass: rgba(10, 10, 10, 0.62);
    --bg-glass-strong: rgba(5, 5, 5, 0.9);
    --glass-card-bg: linear-gradient(135deg, rgba(20,20,20,0.85) 0%, rgba(10,10,10,0.62) 100%);
    --glass-card-bg-strong: linear-gradient(135deg, rgba(5,5,5,0.9) 0%, rgba(20,20,20,0.85) 100%);
    --glass-input-bg: rgba(0, 0, 0, 0.46);
    --glass-surface: rgba(20, 20, 20, 0.85);
    --glass-surface-faint: rgba(20, 20, 20, 0.28);
    --glass-border: rgba(255, 255, 255, 0.16);
    --glass-border-light: rgba(255, 255, 255, 0.12);
    --glass-border-faint: rgba(255, 255, 255, 0.08);
    --glass-highlight: rgba(255, 255, 255, 0.08);
    --glass-highlight-light: rgba(255, 255, 255, 0.12);
    --accent-primary: #FFFFFF;
    --accent-primary-light: #94A3B8;
    --accent-primary-dark: #FFFFFF;
    --accent-secondary: #000000;
    --accent-secondary-light: #94A3B8;
    --accent-secondary-dark: #000000;
    --accent-tertiary: #94A3B8;
    --glow-primary: rgba(255, 255, 255, 0.32);
    --glow-secondary: rgba(255, 255, 255, 0.18);
    --text-primary: #FFFFFF;
    --text-secondary: #B0B0B0;
    --text-muted: #707070;
    --text-accent: #FFFFFF;
    --text-inverse: #000000;
    --text-on-accent: #000000;
    --border-subtle: rgba(255, 255, 255, 0.08);
    --border-default: rgba(255, 255, 255, 0.16);
    --border-active: rgba(255, 255, 255, 0.48);
    --border-glow: rgba(255, 255, 255, 0.32);
    --gradient-hero: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,255,0.06) 0%, transparent 70%);
    --gradient-card: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%);
    --gradient-text: linear-gradient(135deg, #FFFFFF 0%, #94A3B8 55%, #FFFFFF 100%);
    --gradient-text-alt: linear-gradient(135deg, #FFFFFF 0%, #B0B0B0 100%);
    --gradient-mesh: radial-gradient(at 0% 0%, rgba(255,255,255,0.05) 0px, transparent 45%), radial-gradient(at 100% 0%, rgba(255,255,255,0.04) 0px, transparent 45%), radial-gradient(at 100% 100%, rgba(255,255,255,0.03) 0px, transparent 45%), radial-gradient(at 0% 100%, rgba(255,255,255,0.02) 0px, transparent 45%);
    --gradient-shine: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 55%, transparent 60%);
    --gradient-cta: linear-gradient(135deg, #FFFFFF 0%, #000000 100%);
    --tap-color: rgba(255, 255, 255, 0.85);
    --tap-color-rgb: 255, 255, 255;
    --tap-glow: rgba(0, 0, 0, 0.45);
    --tap-shape-radius: 999px;
    --tap-rotate: 0deg;
    --destructive-primary: #EF4444;
    --destructive-secondary: #F97316;
    --destructive-text: #FFFFFF;
    --font-display: 'Space Grotesk', system-ui, sans-serif;
    --font-body: 'Inter', system-ui, sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    --color-background: #000000;
    --color-foreground: #FFFFFF;
    --color-border: rgba(255, 255, 255, 0.16);
    --color-primary: #FFFFFF;
    --color-primary-foreground: #000000;
    --color-secondary: rgba(20, 20, 20, 0.85);
    --color-secondary-foreground: #FFFFFF;
    --color-muted: #0A0A0A;
    --color-muted-foreground: #B0B0B0;
    --color-accent: #000000;
    --color-accent-foreground: #FFFFFF;
    --color-card: rgba(20, 20, 20, 0.85);
    --color-card-foreground: #FFFFFF;
    --color-destructive: #EF4444;
    --color-destructive-foreground: #FFFFFF;
    --color-ring: #FFFFFF;
    --color-input: #0A0A0A;
    --font-sans: 'Inter', system-ui, sans-serif;
    --radius: 0.75rem;
  }
  ```

### 6. Scope the user's raw CSS (the big block)
The user's CSS contains global resets (`html`, `body`, `#app`, `.page`, etc.) that would clash with the existing theme system if dropped in raw. Two options:
- **Option A (recommended)**: Wrap the entire block in `@layer formula-theme { :where(html[data-theme-id="formula"]) { ... } }` so it only applies under the formula theme. This isolates the reset overrides.
- **Option B**: Drop it in unconditionally as a global baseline override. Risky — it sets `body { position:fixed; background:#000 }` and `#app { background:#000; background-image:linear-gradient(120deg,#fdfbfb,#ebedee) }` which will conflict with the app's existing layout.

Recommend Option A.

## Order of operations
1. Edit `src/lib/themes.ts` — add type + entry.
2. Edit `src/components/theme/ThemePreviewCard.tsx` — add formula gradient branches.
3. Create `src/components/theme/SceneFormula.tsx` — canvas background.
4. Edit `src/components/theme/ThreeThemeBackground.tsx` — wire formula scene.
5. Edit `src/index.css` — add per-theme variable block + scoped raw CSS.
6. Manual test: `cd new-frontend && npm run dev` → Settings → Appearance → select Formula. Verify white tap ripples, black background, scene renders, cards/text visible.
7. If `npm run lint` / `npm run typecheck` exist, run them.

## Risks / open questions
- **CSS scope clash**: The user's raw CSS has `body { position:fixed; overflow:hidden }` and `#app { position:fixed }`. If scoped under `[data-theme-id="formula"]`, these only apply for formula — safe. If the user wants it global, they need to confirm.
- **`--color-primary-foreground: #000000`**: Text on white accent buttons will be black. Confirm this is the intended contrast.
- **SceneFormula visibility**: The canvas is `z-index: 0`. The page content wrapper in `Layout.tsx` has a solid `bg-void` div also at `z-index: 0` that covers the canvas. For formula theme, the `bg-void` div should be made transparent (or removed) so the canvas shows through. This requires a small edit to `Layout.tsx` — read `useTheme()` and conditionally hide the bg div when `themeId === "formula"`.
- **`gradient-cta: linear-gradient(135deg, #FFFFFF 0%, #000000 100%)`**: White-to-black gradient on buttons may render as a solid white-to-dark depending on button size. Confirm the visual result is acceptable.
- **No `npm`/`node` on PATH in current shell**: Type-check / lint can't be run from this shell. User should run manually in their terminal.

## Output
A concise implementation plan with:
- Summary of the approach.
- List of files to touch and what changes each one needs.
- Risks / open questions.
- Suggested verification steps.
