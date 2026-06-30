import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Zap, Mail, Lock, ArrowRight, AlertCircle, Loader2, Eye, EyeOff,
  Check, Shield, Sparkles, BookOpen, Brain, ChevronRight, RefreshCw,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { authApi } from "../lib/api";
import { GradientOrb, smoothTransition, STAGGER } from "../components/ui";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            context?: "signin" | "signup" | "use";
            ux_mode?: "popup" | "redirect";
            itp_support?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              width?: number;
              locale?: string;
            }
          ) => void;
          prompt: (callback?: (notification: {
            isNotDisplayed?: () => boolean;
            getNotDisplayedReason?: () => string;
            isSkippedMoment?: () => boolean;
            getSkippedReason?: () => string;
            isDisplayed?: () => boolean;
          }) => void) => void;
          disableAutoSelect?: () => void;
        };
      };
    };
  }
}

type GoogleIdentityServices = NonNullable<Window["google"]>;

const GOOGLE_SCRIPT_URL = "https://accounts.google.com/gsi/client";
const GOOGLE_SCRIPT_LOAD_TIMEOUT_MS = 10_000;

function loadGoogleIdentityServices(): Promise<GoogleIdentityServices> {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google as GoogleIdentityServices);
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT_URL}"]`);
    const script = existingScript ?? document.createElement("script");

    script.async = true;
    script.defer = true;
    script.src = GOOGLE_SCRIPT_URL;
    script.dataset.status = "loading";

    const timeout = window.setTimeout(() => {
      script.dataset.status = "failed";
      reject(new Error("Google Sign-In could not load. Please check your connection."));
    }, GOOGLE_SCRIPT_LOAD_TIMEOUT_MS);

    script.onload = () => {
      window.clearTimeout(timeout);
      script.dataset.status = "loaded";
      if (window.google?.accounts?.id) {
        resolve(window.google as GoogleIdentityServices);
        return;
      }
      reject(new Error("Google Sign-In could not load. Please check your connection."));
    };

    script.onerror = () => {
      window.clearTimeout(timeout);
      script.dataset.status = "failed";
      reject(new Error("Google Sign-In could not load. Please check your connection."));
    };

    if (!existingScript) {
      document.head.appendChild(script);
    }
  });
}

type AuthMode = "login" | "register" | "forgot-password";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER.normal, delayChildren: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: smoothTransition },
};

const shakeVariants = {
  shake: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.4 },
  },
};

const passwordStrength = (pw: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: "Weak", color: "var(--accent-rose)" };
  if (score <= 2) return { score: 2, label: "Fair", color: "var(--accent-amber)" };
  if (score <= 3) return { score: 3, label: "Good", color: "var(--accent-blue)" };
  if (score <= 4) return { score: 4, label: "Strong", color: "var(--accent-green)" };
  return { score: 5, label: "Excellent", color: "var(--accent-emerald)" };
};

export default function Login() {
  const navigate = useNavigate();
  const { login, register: registerUser, loginWithGoogle, error: authError, clearError } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [resendCooldown]);

  const switchMode = useCallback((newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    clearError();
    setSuccessMessage(null);
    setShowPassword(false);
  }, [clearError]);

  const pwStrength = passwordStrength(password);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    let cancelled = false;
    setGoogleLoading(true);

    loadGoogleIdentityServices()
      .then((google) => {
        if (cancelled || !googleButtonRef.current) return;

        google.accounts.id.initialize({
          client_id: googleClientId,
          auto_select: false,
          cancel_on_tap_outside: true,
          context: "signin",
          itp_support: true,
          callback: async (response) => {
            try {
              await loginWithGoogle(response.credential, rememberMe);
              navigate(redirectTo, { replace: true });
            } catch (err) {
              const message = err instanceof Error ? err.message : "Google sign-in failed. Please try again.";
              setError(message);
            } finally {
              setGoogleLoading(false);
            }
          },
        });

        google.accounts.id.renderButton(googleButtonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          width: 400,
          locale: "en",
        });

        setGoogleReady(true);
        setGoogleLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setGoogleLoading(false);
        setError(err instanceof Error ? err.message : "Google sign-in failed. Please try again.");
      });

    return () => {
      cancelled = true;
    };
  }, [googleClientId, loginWithGoogle, navigate, redirectTo, rememberMe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (mode === "forgot-password") {
      if (!email) { setError("Please enter your email address"); return; }
      setLoading(true);
      try {
        await authApi.forgotPassword(email);
        setSuccessMessage("Password reset link sent! Check your email.");
        setMode("login");
      } catch {
        setError("Failed to send reset email. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email || !password) {
      setError("Please fill in all required fields");
      return;
    }

    if (mode === "register") {
      if (!firstName) { setError("Please enter your first name"); return; }
      if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
      if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    }

    try {
      setLoading(true);
      if (mode === "login") {
        await login(email, password, rememberMe);
        navigate(redirectTo, { replace: true });
      } else {
        const result = await registerUser(email, password, firstName, lastName, rememberMe);
        if (result.isNewUser && result.verificationSent) {
          setPendingVerificationEmail(email);
          setSuccessMessage("Account created! Check your email for a verification link.");
        } else {
          navigate(redirectTo, { replace: true });
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      const message = err instanceof Error ? err.message : "Authentication failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail || resendCooldown > 0) return;
    try {
      const { authApi } = await import("../lib/api");
      await authApi.resendVerification(pendingVerificationEmail);
      setSuccessMessage("Verification email resent!");
      setResendCooldown(60);
    } catch {
      setError("Failed to resend verification email.");
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      <GradientOrb color="cyan" size={500} className="fixed -top-48 -left-48 z-0" />
      <GradientOrb color="purple" size={400} className="fixed -bottom-32 -right-32 z-0" />
      <GradientOrb color="emerald" size={300} className="fixed top-1/2 right-1/4 z-0" delay={4} />

      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)", opacity: 0.7 }} />
        <div className="absolute inset-0" style={{ background: "var(--gradient-mesh)", opacity: 0.3 }} />

        <motion.div
          className="relative z-10 text-center max-w-md"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center justify-center h-20 w-20 rounded-2xl mb-8"
            style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))", boxShadow: "0 0 60px rgba(6, 182, 212, 0.3)" }}
          >
            <Zap className="h-10 w-10 text-white" />
          </motion.div>

          <motion.h1 variants={itemVariants} className="font-display text-4xl font-bold gradient-text mb-4">
            MedNexus
          </motion.h1>
          <motion.p variants={itemVariants} className="text-text-secondary text-base mb-12 leading-relaxed">
            AI-powered flashcard generation with spaced repetition.<br />Master anything faster.
          </motion.p>

          <motion.div variants={itemVariants} className="space-y-4 text-left">
            {[
              { icon: Sparkles, text: "Smart AI Generation", desc: "Create flashcards from any content" },
              { icon: Brain, text: "Spaced Repetition", desc: "Optimized review scheduling" },
              { icon: BookOpen, text: "Detailed Analytics", desc: "Track your learning progress" },
            ].map((feature, i) => (
              <motion.div
                key={feature.text}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.15, ...smoothTransition }}
                className="flex items-center gap-4 p-4 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, var(--accent-green) 0%, var(--accent-blue) 100%)", opacity: 0.9 }}
                >
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{feature.text}</p>
                  <p className="text-xs text-text-muted">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      <div className="w-full lg:w-[52%] flex items-center justify-center p-6 sm:p-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}
            >
              <Zap className="h-6 w-6 text-white" />
            </div>
            <span className="font-display text-2xl font-bold gradient-text">MedNexus</span>
          </div>

          <AnimatePresence mode="wait">
            {pendingVerificationEmail && successMessage ? (
              <motion.div
                key="verification-sent"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={smoothTransition}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
                  className="inline-flex items-center justify-center h-20 w-20 rounded-full mb-6"
                  style={{ background: "rgba(34, 197, 94, 0.1)", border: "2px solid rgba(34, 197, 94, 0.3)" }}
                >
                  <motion.div
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  >
                    <Mail className="h-10 w-10" style={{ color: "var(--accent-green)" }} />
                  </motion.div>
                </motion.div>

                <h2 className="font-display text-2xl font-bold text-text-primary mb-3">Check your email</h2>
                <p className="text-text-secondary text-sm mb-2">
                  We sent a verification link to
                </p>
                <p className="text-accent-green font-semibold text-sm mb-8">{pendingVerificationEmail}</p>

                <div className="space-y-3">
                  <button
                    onClick={handleResendVerification}
                    disabled={resendCooldown > 0}
                    className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    style={{ background: "var(--glass-input-bg)", border: "1px solid var(--glass-border-light)", color: "var(--text-primary)" }}
                  >
                    <RefreshCw className={`h-4 w-4 ${resendCooldown > 0 ? "" : ""}`} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend verification email"}
                  </button>

                  <button
                    onClick={() => { setPendingVerificationEmail(null); setSuccessMessage(null); setMode("login"); }}
                    className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))", color: "white" }}
                  >
                    Back to Sign In
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="auth-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
                    transition={smoothTransition}
                  >
                    <h2 className="font-display text-2xl font-bold text-text-primary mb-2">
                      {mode === "login" ? "Welcome back" : mode === "register" ? "Create account" : "Reset password"}
                    </h2>
                    <p className="text-text-secondary text-sm mb-8">
                      {mode === "login" ? "Sign in to continue your learning journey" :
                       mode === "register" ? "Start your learning journey today" :
                       "Enter your email to receive a reset link"}
                    </p>
                  </motion.div>
                </AnimatePresence>

                <AnimatePresence>
                  {(error || authError) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0, ...shakeVariants.shake }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-6 flex items-center gap-3 p-4 rounded-2xl"
                      style={{ background: "rgba(244, 63, 94, 0.08)", border: "1px solid rgba(244, 63, 94, 0.2)" }}
                    >
                      <AlertCircle className="h-5 w-5 shrink-0" style={{ color: "var(--accent-rose)" }} />
                      <p className="text-sm" style={{ color: "var(--accent-rose)" }}>{error || authError}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {successMessage && !pendingVerificationEmail && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-6 flex items-center gap-3 p-4 rounded-2xl"
                      style={{ background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.2)" }}
                    >
                      <Check className="h-5 w-5 shrink-0" style={{ color: "var(--accent-green)" }} />
                      <p className="text-sm" style={{ color: "var(--accent-green)" }}>{successMessage}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {mode !== "forgot-password" && (
                  <div className="space-y-3 mb-6">
                    {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                      <div className="w-full">
                        {googleLoading && !googleReady && (
                          <motion.button
                            disabled
                            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-medium opacity-80"
                            style={{ background: "var(--glass-input-bg)", border: "1px solid var(--glass-border-light)", color: "var(--text-primary)" }}
                          >
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Loading Google Sign-In
                          </motion.button>
                        )}
                        <div ref={googleButtonRef} className="w-full min-h-[48px]" />
                      </div>
                     ) : (
                      <div
                        className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-medium opacity-60"
                        style={{ background: "var(--glass-input-bg)", border: "1px solid var(--glass-border-light)", color: "var(--text-secondary)" }}
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span>Google Sign-In (add VITE_GOOGLE_CLIENT_ID to enable)</span>
                      </div>
                    )}
                   </div>
                 )}

                {mode !== "forgot-password" && (
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 h-px" style={{ background: "var(--glass-border-light)" }} />
                    <span className="text-xs text-text-muted">or continue with email</span>
                    <div className="flex-1 h-px" style={{ background: "var(--glass-border-light)" }} />
                  </div>
                )}

                <AnimatePresence mode="wait">
                  <motion.form
                    key={mode}
                    onSubmit={handleSubmit}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <AnimatePresence mode="wait">
                      {mode === "register" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={smoothTransition}
                          className="grid grid-cols-2 gap-3"
                        >
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="First name"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-300"
                              style={{ background: "var(--glass-input-bg)", border: "1px solid var(--glass-border-light)", color: "var(--text-primary)" }}
                              onFocus={(e) => { e.target.style.borderColor = "var(--accent-green)"; e.target.style.boxShadow = "0 0 0 3px rgba(34, 197, 94, 0.1)"; }}
                              onBlur={(e) => { e.target.style.borderColor = "var(--glass-border-light)"; e.target.style.boxShadow = "none"; }}
                            />
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Last name"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-300"
                              style={{ background: "var(--glass-input-bg)", border: "1px solid var(--glass-border-light)", color: "var(--text-primary)" }}
                              onFocus={(e) => { e.target.style.borderColor = "var(--accent-green)"; e.target.style.boxShadow = "0 0 0 3px rgba(34, 197, 94, 0.1)"; }}
                              onBlur={(e) => { e.target.style.borderColor = "var(--glass-border-light)"; e.target.style.boxShadow = "none"; }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all duration-300"
                        style={{ background: "var(--glass-input-bg)", border: "1px solid var(--glass-border-light)", color: "var(--text-primary)" }}
                        onFocus={(e) => { e.target.style.borderColor = "var(--accent-green)"; e.target.style.boxShadow = "0 0 0 3px rgba(34, 197, 94, 0.1)"; }}
                        onBlur={(e) => { e.target.style.borderColor = "var(--glass-border-light)"; e.target.style.boxShadow = "none"; }}
                      />
                    </div>

                    {mode !== "forgot-password" && (
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-12 py-3 rounded-xl text-sm outline-none transition-all duration-300"
                          style={{ background: "var(--glass-input-bg)", border: "1px solid var(--glass-border-light)", color: "var(--text-primary)" }}
                          onFocus={(e) => { e.target.style.borderColor = "var(--accent-green)"; e.target.style.boxShadow = "0 0 0 3px rgba(34, 197, 94, 0.1)"; }}
                          onBlur={(e) => { e.target.style.borderColor = "var(--glass-border-light)"; e.target.style.boxShadow = "none"; }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    )}

                    <AnimatePresence>
                      {mode === "register" && password.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-2"
                        >
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <motion.div
                                key={i}
                                className="h-1 flex-1 rounded-full"
                                style={{ background: i <= pwStrength.score ? pwStrength.color : "var(--glass-border-light)" }}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ delay: i * 0.05 }}
                              />
                            ))}
                          </div>
                          <p className="text-xs" style={{ color: pwStrength.color }}>
                            {pwStrength.label}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence mode="wait">
                      {mode === "register" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={smoothTransition}
                        >
                          <div className="relative">
                            <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                            <input
                              type={showPassword ? "text" : "password"}
                              placeholder="Confirm password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all duration-300"
                              style={{
                                background: "var(--glass-input-bg)",
                                border: `1px solid ${confirmPassword && confirmPassword !== password ? "var(--accent-rose)" : "var(--glass-border-light)"}`,
                                color: "var(--text-primary)",
                              }}
                              onFocus={(e) => { e.target.style.borderColor = confirmPassword && confirmPassword !== password ? "var(--accent-rose)" : "var(--accent-green)"; e.target.style.boxShadow = `0 0 0 3px ${confirmPassword && confirmPassword !== password ? "rgba(244, 63, 94, 0.1)" : "rgba(34, 197, 94, 0.1)"}`; }}
                              onBlur={(e) => { e.target.style.borderColor = confirmPassword && confirmPassword !== password ? "var(--accent-rose)" : "var(--glass-border-light)"; e.target.style.boxShadow = "none"; }}
                            />
                          </div>
                          <AnimatePresence>
                            {confirmPassword && confirmPassword !== password && (
                              <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-xs mt-1"
                                style={{ color: "var(--accent-rose)" }}
                              >
                                Passwords do not match
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {mode === "login" && (
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <div
                            className="w-4 h-4 rounded flex items-center justify-center transition-all"
                            style={{
                              background: rememberMe ? "var(--accent-green)" : "var(--glass-input-bg)",
                              border: `1px solid ${rememberMe ? "var(--accent-green)" : "var(--glass-border-light)"}`,
                            }}
                            onClick={() => setRememberMe(!rememberMe)}
                          >
                            {rememberMe && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <span className="text-xs text-text-secondary">Remember me</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => switchMode("forgot-password")}
                          className="text-xs font-medium hover:underline"
                          style={{ color: "var(--accent-green)" }}
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}

                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: loading ? 1 : 1.02 }}
                      whileTap={{ scale: loading ? 1 : 0.98 }}
                      className="w-full py-3.5 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                      style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))", boxShadow: "0 4px 20px rgba(6, 182, 212, 0.25)" }}
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <span className="flex items-center gap-2">
                          {mode === "login" ? "Sign In" : mode === "register" ? "Create Account" : "Send Reset Link"}
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      )}
                    </motion.button>
                  </motion.form>
                </AnimatePresence>

                <div className="mt-6 space-y-3">
                  {mode === "login" && (
                    <p className="text-center text-sm text-text-secondary">
                      Don't have an account?{" "}
                      <button
                        onClick={() => switchMode("register")}
                        className="font-semibold hover:underline"
                        style={{ color: "var(--accent-green)" }}
                      >
                        Sign up
                      </button>
                    </p>
                  )}
                  {mode === "register" && (
                    <p className="text-center text-sm text-text-secondary">
                      Already have an account?{" "}
                      <button
                        onClick={() => switchMode("login")}
                        className="font-semibold hover:underline"
                        style={{ color: "var(--accent-green)" }}
                      >
                        Sign in
                      </button>
                    </p>
                  )}
                  {mode === "forgot-password" && (
                    <p className="text-center text-sm text-text-secondary">
                      Remember your password?{" "}
                      <button
                        onClick={() => switchMode("login")}
                        className="font-semibold hover:underline"
                        style={{ color: "var(--accent-green)" }}
                      >
                        Sign in
                      </button>
                    </p>
                  )}

                  <button
                    onClick={() => navigate("/")}
                    className="w-full py-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
                  >
                    Continue as guest →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
