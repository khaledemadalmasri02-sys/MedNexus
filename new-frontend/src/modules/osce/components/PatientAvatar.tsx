import { motion } from "framer-motion";
import { useMotionValue, useSpring } from "framer-motion";
import { useEffect } from "react";

interface PatientAvatarProps {
  emotion?: "neutral" | "happy" | "concerned" | "pained" | "anxious";
  isSpeaking?: boolean;
  isListening?: boolean;
  size?: "small" | "medium" | "large";
}

const sizeClasses = {
  small: "w-20 h-20",
  medium: "w-32 h-32",
  large: "w-48 h-48",
};

const emotionStyles = {
  neutral: "bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30",
  happy: "bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30",
  concerned: "bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30",
  pained: "bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30",
  anxious: "bg-gradient-to-br from-gray-100 to-blue-100 dark:from-gray-900/30 dark:to-blue-900/30",
};

const emotionExpressions = {
  neutral: "😐",
  happy: "😊",
  concerned: "😟",
  pained: "😣",
  anxious: "😰",
};

export function PatientAvatar2D({ 
  emotion = "neutral", 
  isSpeaking = false, 
  isListening = false,
  size = "medium" 
}: PatientAvatarProps) {
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springX = useSpring(mouseX, { stiffness: 300, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 300, damping: 30 });

  const rotation = springX.get() * 15;
  const scale = 1 + springY.get() * 0.05;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    };

    const avatar = document.querySelector('.patient-avatar-container');
    if (avatar) {
      avatar.addEventListener('mousemove', handleMouseMove as EventListener);
      return () => avatar.removeEventListener('mousemove', handleMouseMove as EventListener);
    }
  }, [mouseX, mouseY]);

  return (
    <div className="relative inline-block">
      <div 
        className={`patient-avatar-container ${sizeClasses[size]} rounded-full flex items-center justify-center transition-transform duration-300 cursor-move`}
        style={{
          background: emotionStyles[emotion],
          transform: `rotate(${rotation}deg) scale(${scale})`,
        }}
      >
        <span className="text-4xl md:text-5xl">{emotionExpressions[emotion]}</span>
        
        {isSpeaking && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute -bottom-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
          >
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-white text-xs"
            >
              🔊
            </motion.span>
          </motion.div>
        )}

        {isListening && (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
          >
            <MicIcon className="w-3 h-3 text-white" />
          </motion.div>
        )}
      </div>
    </div>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 9v6m-2-3h4" />
      <path d="M12 2a5 5 0 0 1 5 5v4.593l1.757 1.757a1 1 0 0 1-1.414 1.414L12 14.414V18a3 3 0 0 1-6 0v-5.586l-1.757-1.757a1 1 0 0 1 1.414-1.414L5 8.593V7a5 5 0 0 1 5-5z" />
    </svg>
  );
}

export function PatientAvatar3D({ 
  emotion = "neutral", 
  isSpeaking = false, 
  isListening = false,
  size = "medium" 
}: PatientAvatarProps) {
  const sizeClasses3d = {
    small: "w-24 h-24",
    medium: "w-48 h-48",
    large: "w-72 h-72",
  };

  return (
    <div className="relative">
      <div 
        className={`patient-avatar-container ${sizeClasses3d[size]} rounded-2xl overflow-hidden shadow-2xl`}
        style={{
          background: emotionStyles[emotion],
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-8xl md:text-[120px]">{emotionExpressions[emotion]}</div>
        </div>
        
        {isSpeaking && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
          >
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-white text-sm"
            >
              🔊
            </motion.span>
          </motion.div>
        )}

        {isListening && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute top-4 right-4 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center"
          >
            <MicIcon className="w-4 h-4 text-white" />
          </motion.div>
        )}
      </div>
    </div>
  );
}

export function PatientAvatar({ 
  emotion = "neutral", 
  isSpeaking = false, 
  isListening = false,
  size = "medium",
  style: use3d = "2d"
}: PatientAvatarProps & { style?: "2d" | "3d" }) {
  if (use3d === "3d") {
    return <PatientAvatar3D emotion={emotion} isSpeaking={isSpeaking} isListening={isListening} size={size} />;
  }
  return <PatientAvatar2D emotion={emotion} isSpeaking={isSpeaking} isListening={isListening} size={size} />;
}