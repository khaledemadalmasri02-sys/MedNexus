import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  requireVerified?: boolean;
}

export function AuthGuard({ children, requireVerified = false }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
    }
  }, [loading, user, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-8 h-8" style={{ color: "var(--accent-green)" }} />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requireVerified && !user.emailVerified) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-6">
        <div
          className="inline-flex items-center justify-center h-16 w-16 rounded-2xl mb-6"
          style={{ background: "rgba(245, 158, 11, 0.1)", border: "2px solid rgba(245, 158, 11, 0.3)" }}
        >
          <Loader2 className="h-8 w-8" style={{ color: "var(--accent-amber)" }} />
        </div>
        <h2 className="font-display text-xl font-bold text-text-primary mb-3">Email verification required</h2>
        <p className="text-text-secondary text-sm mb-6">
          Please verify your email address to access this feature. Check your inbox for the verification link.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
