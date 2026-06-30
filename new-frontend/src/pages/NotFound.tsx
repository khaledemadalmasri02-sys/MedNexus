import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';
import { GradientOrb } from '../components/ui';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center relative">
      <GradientOrb color="purple" size={300} className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0" />

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1.4, 0.36, 1] as const }}
        className="relative z-10"
      >
        <h1 className="font-display text-7xl sm:text-8xl font-bold gradient-text mb-2">404</h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="relative z-10"
      >
        <h2 className="font-display text-xl font-semibold text-text-primary mb-2">Page Not Found</h2>
        <p className="text-text-secondary text-sm max-w-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="flex gap-3 relative z-10"
      >
        <button
          onClick={() => window.history.back()}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
          style={{ border: '1px solid var(--glass-border-light)', color: 'var(--text-primary)', background: 'var(--bg-elevated)', backdropFilter: 'blur(20px)' }}
        >
          <ArrowLeft className="h-4 w-4" /> Go Back
        </button>
        <Link to="/">
          <button
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, var(--accent-green), var(--accent-blue))', boxShadow: '0 4px 20px rgba(6, 182, 212, 0.25)' }}
          >
            <Home className="h-4 w-4" /> Dashboard
          </button>
        </Link>
      </motion.div>
    </div>
  );
}
