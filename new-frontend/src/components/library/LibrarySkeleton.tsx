import { motion } from "framer-motion";
import { staggerContainer, listItem, Skeleton } from "../ui";

export function LibrarySkeleton() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div key={i} variants={listItem}>
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
            <div className="h-2 w-full" style={{ background: "var(--glass-border)" }} />
            <div className="p-5">
              <div className="flex items-start gap-3.5">
                <Skeleton variant="rectangular" width={44} height={44} className="rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton width="65%" height={15} />
                  <Skeleton width="35%" height={10} />
                </div>
                <Skeleton variant="circular" width={52} height={52} />
              </div>
              <div className="flex gap-1.5 mt-3">
                <Skeleton width={60} height={18} className="rounded-md" />
                <Skeleton width={50} height={18} className="rounded-md" />
              </div>
              <div className="mt-3.5">
                <div className="flex justify-between mb-1.5">
                  <div className="flex gap-3">
                    <Skeleton width={20} height={10} />
                    <Skeleton width={20} height={10} />
                    <Skeleton width={20} height={10} />
                  </div>
                  <Skeleton width={40} height={10} />
                </div>
                <Skeleton width="100%" height={6} className="rounded-full" />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

export function DeckGridSkeleton() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div key={i} variants={listItem}>
          <div className="rounded-2xl p-5 space-y-3" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)" }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Skeleton width="60%" height={16} />
            <Skeleton width="80%" height={10} />
            <Skeleton width="40%" height={10} />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

export function StudySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton width={200} height={28} />
        <Skeleton width={100} height={36} />
      </div>
      <div className="rounded-2xl p-8 space-y-4" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", minHeight: 300 }}>
        <Skeleton width="70%" height={20} />
        <Skeleton width="90%" height={14} />
        <Skeleton width="80%" height={14} />
        <Skeleton width="60%" height={14} />
      </div>
      <div className="flex justify-center gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} width={80} height={40} />
        ))}
      </div>
    </div>
  );
}

export function GenerateSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton width={300} height={32} />
      <div className="rounded-2xl p-6 space-y-4" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)" }}>
        <Skeleton width="100%" height={200} />
        <Skeleton width="40%" height={16} />
        <div className="flex gap-3">
          <Skeleton width={120} height={44} />
          <Skeleton width={120} height={44} />
        </div>
      </div>
    </div>
  );
}
