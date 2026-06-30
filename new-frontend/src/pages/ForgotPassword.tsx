import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mail, ArrowRight, Check, Loader2, Lock, Eye, EyeOff, Shield, X } from "lucide-react";
import { authApi } from "../lib/api";
import { GradientOrb, smoothTransition } from "../components/ui";

type ResetMode = "request" | "reset" | "success";

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [mode, setMode] = useState<ResetMode>(token ? "reset" : "request");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Please enter your email address"); return; }

    setLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword(email);
      setMode("success");
    } catch {
      setError("Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) { setError("Please enter a new password"); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    if (!token) { setError("Invalid reset token"); return; }

    setLoading(true);
    setError(null);
    try {
      await authApi.resetPassword(token, newPassword);
      navigate("/login", { state: { message: "Password reset successfully. Please sign in." } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to reset password";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-6">
      <GradientOrb color="cyan" size={400} className="fixed -top-32 -left-32 z-0" />
      <GradientOrb color="purple" size={350} className="fixed -bottom-24 -right-24 z-0" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={smoothTransition}
        className="w-full max-w-md"
      >
        <AnimatePresence mode="wait">
          {mode === "request" && (
            <motion.div
              key="request"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={smoothTransition}
            >
              <div className="text-center mb-8">
                <div
                  className="inline-flex items-center justify-center h-16 w-16 rounded-2xl mb-4"
                  style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}
                >
                  <Mail className="h-8 w-8 text-white" />
                </div>
                <h2 className="font-display text-2xl font-bold text-text-primary mb-2">Forgot password?</h2>
                <p className="text-text-secondary text-sm">No worries! Enter your email and we'll send you a reset link.</p>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-6 flex items-center gap-3 p-4 rounded-2xl"
                    style={{ background: "rgba(244, 63, 94, 0.08)", border: "1px solid rgba(244, 63, 94, 0.2)" }}
                  >
                    <X className="h-5 w-5 shrink-0" style={{ color: "var(--accent-rose)" }} />
                    <p className="text-sm" style={{ color: "var(--accent-rose)" }}>{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleRequestReset} className="space-y-4">
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

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="w-full py-3.5 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    <span className="flex items-center gap-2">Send Reset Link <ArrowRight className="h-4 w-4" /></span>
                  )}
                </motion.button>
              </form>

              <p className="text-center text-sm text-text-secondary mt-6">
                Remember your password?{" "}
                <button onClick={() => navigate("/login")} className="font-semibold hover:underline" style={{ color: "var(--accent-green)" }}>
                  Sign in
                </button>
              </p>
            </motion.div>
          )}

          {mode === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
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
                <Check className="h-10 w-10" style={{ color: "var(--accent-green)" }} />
              </motion.div>
              <h2 className="font-display text-2xl font-bold text-text-primary mb-3">Check your email</h2>
              <p className="text-text-secondary text-sm mb-8">
                We've sent a password reset link to <span className="font-semibold" style={{ color: "var(--accent-green)" }}>{email}</span>
              </p>
              <button
                onClick={() => navigate("/login")}
                className="px-8 py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 mx-auto"
                style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}
              >
                Back to Sign In
              </button>
            </motion.div>
          )}

          {mode === "reset" && (
            <motion.div
              key="reset"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={smoothTransition}
            >
              <div className="text-center mb-8">
                <div
                  className="inline-flex items-center justify-center h-16 w-16 rounded-2xl mb-4"
                  style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}
                >
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h2 className="font-display text-2xl font-bold text-text-primary mb-2">Set new password</h2>
                <p className="text-text-secondary text-sm">Enter your new password below.</p>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-6 flex items-center gap-3 p-4 rounded-2xl"
                    style={{ background: "rgba(244, 63, 94, 0.08)", border: "1px solid rgba(244, 63, 94, 0.2)" }}
                  >
                    <X className="h-5 w-5 shrink-0" style={{ color: "var(--accent-rose)" }} />
                    <p className="text-sm" style={{ color: "var(--accent-rose)" }}>{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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

                <div className="relative">
                  <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all duration-300"
                    style={{
                      background: "var(--glass-input-bg)",
                      border: `1px solid ${confirmPassword && confirmPassword !== newPassword ? "var(--accent-rose)" : "var(--glass-border-light)"}`,
                      color: "var(--text-primary)",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--accent-green)"; e.target.style.boxShadow = "0 0 0 3px rgba(34, 197, 94, 0.1)"; }}
                    onBlur={(e) => { e.target.style.borderColor = confirmPassword && confirmPassword !== newPassword ? "var(--accent-rose)" : "var(--glass-border-light)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="w-full py-3.5 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    <span className="flex items-center gap-2">Reset Password <ArrowRight className="h-4 w-4" /></span>
                  )}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
