import { useState, useEffect, useRef, createContext, useContext, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, LayoutDashboard, Library, Sparkles, History, CalendarDays,
  Menu, X, Flame, Settings,
  User, Award, HelpCircle, Gamepad2, Wand2, Smartphone, BookOpen, GraduationCap,
} from "lucide-react";
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './planner/NotificationBell';
import * as api from '../lib/api';
import { ToggleAnimation } from './micro';

const NavbarVisibilityContext = createContext<{ hidden: boolean; setHidden: (v: boolean) => void }>({ hidden: false, setHidden: () => {} });
export const useNavbarVisibility = () => useContext(NavbarVisibilityContext);
export const NavbarVisibilityProvider = ({ children }: { children: ReactNode }) => {
  const [hidden, setHidden] = useState(false);
  return <NavbarVisibilityContext.Provider value={{ hidden, setHidden }}>{children}</NavbarVisibilityContext.Provider>;
};

const navLinks = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/game', label: 'Game Center', icon: Gamepad2 },
  { to: '/history', label: 'History', icon: History },
  { to: '/planner', label: 'Planner', icon: CalendarDays },
  { to: '/studypilot', label: 'StudyPilot', icon: GraduationCap },
  { to: '/agents', label: 'AI Agents', icon: Wand2 },
  { to: '/articles', label: 'Articles', icon: BookOpen },
  { to: '/download', label: 'App', icon: Smartphone },
  { to: '/help', label: 'Help', icon: HelpCircle },
];

const mobileMoreLinks = [
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/achievements", icon: Award, label: "Achievements" },
  { to: "/download", icon: Smartphone, label: "Get the App" },
  { to: "/help", icon: HelpCircle, label: "Help & Support" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dueCount, setDueCount] = useState(0);
  const [pageProgress, setPageProgress] = useState(0);
  const location = useLocation();
  const { theme, isDark, setThemeMode } = useTheme();
  const prevLocation = useRef(location);
  const progressTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const fetchDueCount = async () => {
      try {
        const result = await api.cardProgressApi.getDueCount();
        setDueCount(result.count);
      } catch { /* ignore */ }
    };
    fetchDueCount();
    const interval = setInterval(fetchDueCount, 60000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (prevLocation.current.pathname !== location.pathname) {
      setPageProgress(30);
      if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
      progressTimeoutRef.current = setTimeout(() => setPageProgress(100), 300);
      setTimeout(() => setPageProgress(0), 700);
    }
    prevLocation.current = location;
  }, [location]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const activeTabStyle = {
    background: theme.gradientCta,
    border: `1px solid ${theme.borderActive}`,
    boxShadow: `0 10px 30px ${theme.glowPrimary}`,
  };

  const dueGradient = dueCount > 20
    ? "linear-gradient(135deg, var(--destructive-primary), var(--destructive-secondary))"
    : "linear-gradient(135deg, var(--destructive-secondary), var(--destructive-primary))";

  return (
    <>
      <motion.header
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="fixed top-0 inset-x-0 z-50"
        style={{
          background: scrolled ? 'var(--bg-glass-strong)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--glass-border)' : '1px solid transparent',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2.5 group">
              <motion.div className="relative" whileHover={{ scale: 0.95 }} whileTap={{ scale: 0.8 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
                <div className="absolute inset-0 rounded-xl blur-lg transition-all duration-500" style={{ background: theme.glowPrimary, opacity: 0.72 }} />
                <motion.div className="relative h-8 w-8 rounded-xl flex items-center justify-center transition-all duration-500" style={{ background: theme.gradientCta, boxShadow: `0 8px 22px ${theme.glowPrimary}` }} whileHover={{ rotate: 360 }} transition={{ duration: 0.7, ease: 'easeOut' }}>
                  <Zap className="h-4 w-4" style={{ color: theme.textOnAccent }} />
                </motion.div>
              </motion.div>
              <motion.span className="font-display text-lg font-bold tracking-wider hidden sm:inline transition-colors duration-500" style={{ color: theme.textPrimary, WebkitTextFillColor: theme.textPrimary }} whileHover={{ background: theme.gradientText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' } as Record<string, string>}>
                MedNexus
              </motion.span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(({ to, label, icon: Icon }) => {
                const active = isActive(to);
                return (
                  <Link key={to} to={to} className="relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 focus-ring-theme" style={{ color: active ? theme.textOnAccent : theme.textSecondary }}>
                    {active && <motion.div layoutId="nav-pill" className="absolute inset-0 rounded-xl" style={activeTabStyle} transition={{ type: 'spring', stiffness: 300, damping: 25 }} />}
                    <span className="relative flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" style={{ color: active ? theme.textOnAccent : "currentColor" }} />
                      {label}
                    </span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <motion.button onClick={() => setThemeMode(isDark ? "light" : "dark")} className="p-2.5 rounded-xl transition-all duration-300 relative overflow-hidden focus-ring-theme" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: theme.textSecondary }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
                <ToggleAnimation isDark={isDark} className="h-4 w-4" />
              </motion.button>
              <NotificationBell />
              <Link to="/settings" className="p-2.5 rounded-xl transition-all duration-300 focus-ring-theme" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: theme.textSecondary }} aria-label="Settings">
                <Settings className="h-4 w-4" />
              </Link>
              <Link to="/generate" className="hidden sm:inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-transform duration-200 focus-ring-theme" style={{ background: theme.gradientCta, boxShadow: `0 8px 24px ${theme.glowPrimary}`, color: theme.textOnAccent }}>
                <Sparkles className="h-4 w-4" />
                Generate
              </Link>
              {dueCount > 0 && (
                <Link to="/study?review=all">
                  <motion.button className="hidden sm:inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold relative overflow-hidden group transition-transform duration-200 focus-ring-theme" style={{ background: dueGradient, boxShadow: dueCount > 20 ? "0 4px 20px var(--glow-primary)" : "0 4px 12px var(--glow-secondary)", color: "var(--destructive-text)" }} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                    <Flame className="h-4 w-4" />
                    <span>Review {dueCount}</span>
                  </motion.button>
                </Link>
              )}
              <motion.button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2.5 rounded-xl transition-colors relative focus-ring-theme" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: theme.textSecondary }} whileTap={{ scale: 0.95 }}>
                <AnimatePresence mode="wait">
                  {mobileOpen ? (
                    <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <X className="h-5 w-5" />
                    </motion.div>
                  ) : (
                    <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <Menu className="h-5 w-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </div>
        {pageProgress > 0 && pageProgress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5">
            <motion.div className="h-full" style={{ background: theme.accentPrimary }} animate={{ width: `${pageProgress}%` }} transition={{ duration: 0.3 }} />
          </div>
        )}
      </motion.header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, y: -20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.98 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="fixed inset-x-0 top-16 z-40 md:hidden">
            <div className="mx-4 rounded-2xl p-4 shadow-2xl" style={{ background: 'var(--bg-glass-strong)', backdropFilter: 'blur(40px) saturate(1.6)', border: '1px solid var(--border-default)' }}>
              <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${theme.glowPrimary}, transparent)` }} />
              <nav className="space-y-1">
                {navLinks.map(({ to, label, icon: Icon }, i) => {
                  const active = isActive(to);
                  return (
                    <motion.div key={to} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 25 }}>
                      <Link to={to} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all focus-ring-theme" style={active ? { ...activeTabStyle, color: theme.textOnAccent } : { color: theme.textSecondary }}>
                        <Icon className="h-4 w-4" style={{ color: active ? theme.textOnAccent : "currentColor" }} />
                        {label}
                      </Link>
                    </motion.div>
                  );
                })}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: navLinks.length * 0.05, type: 'spring', stiffness: 300, damping: 25 }} className="pt-2">
                  {dueCount > 0 && (
                    <Link to="/study?review=all" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-semibold mb-2 focus-ring-theme" style={{ background: dueGradient, color: "var(--destructive-text)" }}>
                      <Flame className="h-4 w-4" />
                      Review {dueCount} Due Cards
                    </Link>
                  )}
                  <Link to="/generate" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-semibold relative overflow-hidden focus-ring-theme" style={{ background: theme.gradientCta, boxShadow: `0 8px 24px ${theme.glowPrimary}`, color: theme.textOnAccent }}>
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </Link>
                  <div className="pt-2 pb-1 px-4">
                    <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: theme.textSecondary }}>More</div>
                  </div>
                  {mobileMoreLinks.map(({ to, icon: Icon, label }, i) => (
                    <motion.div key={to} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: (navLinks.length + 1 + i) * 0.03, type: 'spring', stiffness: 300, damping: 25 }}>
                      <Link to={to} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors focus-ring-theme" style={{ color: theme.textSecondary }}>
                        <Icon className="h-4 w-4" />
                        {label}
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
