import { motion } from "framer-motion";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, disabled = false }: ToggleProps) {
  return (
    <motion.button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className="relative w-11 h-6 rounded-full p-0.5 shrink-0"
      style={{
        background: checked ? "var(--accent-green)" : "rgba(148,163,184,0.15)",
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onClick={() => !disabled && onChange(!checked)}
      whileTap={disabled ? undefined : { scale: 0.95 }}
    >
      <motion.div
        className="w-5 h-5 rounded-full bg-white shadow-md"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
      {checked && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: "0 0 12px var(--accent-green)" }}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      )}
    </motion.button>
  );
}
