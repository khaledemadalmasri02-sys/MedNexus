import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, X, Loader2, Mail, ArrowRight } from "lucide-react";
import { authApi } from "../lib/api";
import { GradientOrb, smoothTransition } from "../components/ui";

type VerifyState = "loading" | "success" | "error" | "expired";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [state, setState] = useState<VerifyState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const currentToken: string | null = token;
    if (!currentToken) {
      setState("error");
      setErrorMessage("No verification token provided.");
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        const result = await authApi.verifyEmail(currentToken!);
        if (!cancelled) {
          if (result.success) {
            setState("success");
          } else {
            setState("error");
            setErrorMessage("Verification failed. The link may be invalid.");
          }
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "";
          if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("invalid")) {
            setState("expired");
          } else {
            setState("error");
            setErrorMessage(msg || "Verification failed. Please try again.");
          }
        }
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-6">
      <GradientOrb color="cyan" size={400} className="fixed -top-32 -left-32 z-0" />
      <GradientOrb color="purple" size={350} className="fixed -bottom-24 -right-24 z-0" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={smoothTransition}
        className="w-full max-w-md text-center"
      >
        <AnimatePresence mode="wait">
          {state === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="inline-flex items-center justify-center h-20 w-20 rounded-full mb-6"
                style={{ background: "rgba(59, 130, 246, 0.1)", border: "2px solid rgba(59, 130, 246, 0.3)" }}
              >
                <Loader2 className="h-10 w-10" style={{ color: "var(--accent-blue)" }} />
              </motion.div>
              <h2 className="font-display text-2xl font-bold text-text-primary mb-3">Verifying your email</h2>
              <p className="text-text-secondary text-sm">Please wait while we verify your email address...</p>
            </motion.div>
          )}

          {state === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={smoothTransition}
              className="py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
                className="inline-flex items-center justify-center h-20 w-20 rounded-full mb-6"
                style={{ background: "rgba(34, 197, 94, 0.1)", border: "2px solid rgba(34, 197, 94, 0.3)" }}
              >
                <Check className="h-10 w-10" style={{ color: "var(--accent-green)" }} />
              </motion.div>
              <h2 className="font-display text-2xl font-bold text-text-primary mb-3">Email verified!</h2>
              <p className="text-text-secondary text-sm mb-8">Your email has been successfully verified. You can now access all features.</p>
              <motion.button
                onClick={() => navigate("/")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 mx-auto"
                style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </motion.div>
          )}

          {(state === "error" || state === "expired") && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={smoothTransition}
              className="py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
                className="inline-flex items-center justify-center h-20 w-20 rounded-full mb-6"
                style={{ background: "rgba(244, 63, 94, 0.1)", border: "2px solid rgba(244, 63, 94, 0.3)" }}
              >
                <X className="h-10 w-10" style={{ color: "var(--accent-rose)" }} />
              </motion.div>
              <h2 className="font-display text-2xl font-bold text-text-primary mb-3">
                {state === "expired" ? "Link expired" : "Verification failed"}
              </h2>
              <p className="text-text-secondary text-sm mb-8">
                {state === "expired"
                  ? "This verification link has expired. Please request a new one."
                  : errorMessage || "The verification link is invalid or has already been used."}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/login")}
                  className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}
                >
                  <Mail className="h-4 w-4" />
                  Request new verification
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="w-full py-3 rounded-xl text-sm font-medium"
                  style={{ background: "var(--glass-input-bg)", border: "1px solid var(--glass-border-light)", color: "var(--text-primary)" }}
                >
                  Back to Sign In
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
