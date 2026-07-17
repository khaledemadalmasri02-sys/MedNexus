/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Layout from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";
import { AuthProvider } from "./hooks/useAuth";
import { NavbarVisibilityProvider } from "./components/Navbar";
import { ToastProvider } from "./components/Toast";
import { OfflineBanner } from "./components/OfflineBanner";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { CustomCursor } from "./components/theme/CustomCursor";
import { useSettings } from "./hooks/useSettings";
import { useApplySettings } from "./hooks/useApplySettings";
import { useAuth } from "./hooks/useAuth";
import { WebGLBudgetProvider } from "./components/theme/ThreeThemeBackground";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Generate = lazy(() => import("./pages/Generate"));
const Library = lazy(() => import("./pages/Library"));
const Study = lazy(() => import("./pages/Study"));
const History = lazy(() => import("./pages/History"));
const Planner = lazy(() => import("./pages/Planner"));
const DeckDetail = lazy(() => import("./pages/DeckDetail"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Chat = lazy(() => import("./pages/Chat"));
const SmartReview = lazy(() => import("./pages/SmartReview"));
const DeckDoctor = lazy(() => import("./pages/DeckDoctor"));
const Exam = lazy(() => import("./pages/Exam"));
const Summarize = lazy(() => import("./pages/Summarize"));
const Mnemonics = lazy(() => import("./pages/Mnemonics"));
const Coach = lazy(() => import("./pages/Coach"));
const StudyPilot = lazy(() => import("./pages/StudyPilot"));
const ImageAnalyze = lazy(() => import("./pages/ImageAnalyze"));
const VoiceStudy = lazy(() => import("./pages/VoiceStudy"));
const GroupStudy = lazy(() => import("./pages/GroupStudy"));
const ProfilePage = lazy(() => import("./pages/Profile"));
const AchievementsPage = lazy(() => import("./pages/Achievements"));
const HelpPage = lazy(() => import("./pages/Help"));
const DrollingGame = lazy(() => import("./pages/DrollingGame"));
const Agents = lazy(() => import("./pages/Agents"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const AdminPage = lazy(() => import("./pages/Admin"));
const DownloadPage = lazy(() => import("./pages/Download"));
const Articles = lazy(() => import("./pages/Articles"));
const ArticleRead = lazy(() => import("./pages/ArticleRead"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function KeyboardShortcuts() {
  useKeyboardShortcuts();
  return null;
}

function AnimatedRoutes() {
  const location = useLocation();
  const { settings } = useSettings();

  useApplySettings({
    fontSize: settings.fontSize as string,
    animationSpeed: settings.animationSpeed as number,
    animationsEnabled: settings.animationsEnabled as boolean,
    ambientEnabled: settings.ambientEnabled as boolean,
    ripplesEnabled: settings.ripplesEnabled as boolean,
    customCursorEnabled: settings.customCursorEnabled as boolean,
    reduceMotion: settings.reduceMotion as boolean,
    density: settings.density as string,
  });

  const customCursorEnabled = (settings as any).customCursorEnabled as boolean ?? true;
  const reduceMotion = (settings as any).reduceMotion as boolean ?? false;

  return (
    <>
      <CustomCursor enabled={customCursorEnabled && !reduceMotion} />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
        <Route path="/welcome" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}><VerifyEmail /></Suspense>
          </ErrorBoundary>
        } />
        <Route path="/reset-password" element={
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}><ForgotPassword /></Suspense>
          </ErrorBoundary>
        } />
        <Route element={<Layout />}>
          <Route path="/" element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/generate" element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}><Generate /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/library" element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}><Library /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/deck/:id" element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}><DeckDetail /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/study" element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}><Study /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/history" element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}><History /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/planner" element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}><Planner /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/settings" element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/admin" element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}><AdminPage /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/chat" element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}><Chat /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/smart-review" element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}><SmartReview /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/deck/:id/doctor" element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}><DeckDoctor /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/exam" element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}><Exam /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/summarize" element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}><Summarize /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/mnemonics" element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}><Mnemonics /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/coach" element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}><Coach /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/studypilot" element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}><StudyPilot /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/image-analyze" element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}><ImageAnalyze /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/voice-study" element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}><VoiceStudy /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/group-study" element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}><GroupStudy /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/profile" element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/achievements" element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}><AchievementsPage /></Suspense>
            </ErrorBoundary>
          } />
<Route path="/help" element={
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}><HelpPage /></Suspense>
          </ErrorBoundary>
        } />
        <Route path="/game" element={
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}><DrollingGame /></Suspense>
          </ErrorBoundary>
        } />
         <Route path="/agents" element={
           <ErrorBoundary>
             <Suspense fallback={<PageLoader />}><Agents /></Suspense>
           </ErrorBoundary>
         } />
         <Route path="/download" element={
           <ErrorBoundary>
             <Suspense fallback={<PageLoader />}><DownloadPage /></Suspense>
           </ErrorBoundary>
         } />
         <Route path="/articles">
           <Route index element={
             <ErrorBoundary>
               <Suspense fallback={<PageLoader />}><Articles /></Suspense>
             </ErrorBoundary>
           } />
           <Route path=":id" element={
             <ErrorBoundary>
               <Suspense fallback={<PageLoader />}><ArticleRead /></Suspense>
             </ErrorBoundary>
           } />
         </Route>
        <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      </AnimatePresence>
    </>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-primary,#020408)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-[var(--accent-primary,#22c55e)] border-t-transparent rounded-full animate-spin" />
          <span className="text-[var(--text-secondary,#94a3b8)] text-sm font-medium tracking-wide">Loading MedNexus…</span>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthGate>
          <ToastProvider>
            <NavbarVisibilityProvider>
              <WebGLBudgetProvider>
                <KeyboardShortcuts />
                <OfflineBanner />
                <AnimatedRoutes />
              </WebGLBudgetProvider>
            </NavbarVisibilityProvider>
          </ToastProvider>
        </AuthGate>
      </AuthProvider>
    </BrowserRouter>
  );
}
