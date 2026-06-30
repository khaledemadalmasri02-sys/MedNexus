import { motion, AnimatePresence } from "framer-motion";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-[100] overflow-hidden"
        >
          <div
            className="flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium"
            style={{ background: "rgba(245, 158, 11, 0.15)", borderBottom: "1px solid rgba(245, 158, 11, 0.25)", color: "#F59E0B" }}
          >
            <WifiOff className="h-4 w-4" />
            <span>You&apos;re offline — some features may be limited</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
