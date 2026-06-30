import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './Navbar';
import { ThreeThemeBackground } from './theme/ThreeThemeBackground';
import { ThemeTapFeedback } from './theme/ThemeTapFeedback';
import { Breadcrumb } from './Breadcrumb';
import { CommandPalette } from './CommandPalette';
import SupportBubble from './support/SupportBubble';
import { useTheme } from '../context/ThemeContext';

export default function Layout() {
  const location = useLocation();
  const { themeId } = useTheme();

  const isFormula = themeId === "formula";

  return (
    <>
      {!isFormula && <div className="fixed inset-0 z-0 pointer-events-none" style={{ background: "var(--bg-void)" }} aria-hidden="true" />}
      <ThreeThemeBackground />
      <ThemeTapFeedback />
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-lg focus:text-[var(--text-on-accent)] focus:bg-[var(--accent-primary)] focus:text-sm focus:font-semibold">
        Skip to main content
      </a>
      <div className="min-h-screen text-[var(--text-primary)] relative isolation-isolate">
        <Navbar />
        <CommandPalette />
        <SupportBubble />

        <main id="main-content" className="relative z-10 pt-20 pb-12" tabIndex={-1}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Breadcrumb />
            <AnimatePresence mode="wait">
              <Outlet key={location.pathname} />
            </AnimatePresence>
          </div>
        </main>
      </div>
    </>
  );
}
