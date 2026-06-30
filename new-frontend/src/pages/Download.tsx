import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Smartphone,
  Shield,
  Zap,
  ChevronRight,
  Check,
  AlertCircle,
  HardDrive,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageTransition, FloatingWidget } from "../components/ui";
import { staggerContainer, listItem } from "../components/ui/constants";

interface AppInfo {
  available: boolean;
  version: string;
  sizeBytes: number;
  sizeMB: number;
  minAndroidVersion: string;
  targetAndroidVersion: string;
  packageName: string;
  lastUpdated: string | null;
}

const features = [
  { icon: Zap, title: "Offline-First", desc: "Study anywhere with local SQLite storage" },
  { icon: Shield, title: "Secure", desc: "End-to-end encryption, biometric lock" },
  { icon: Smartphone, title: "Native Feel", desc: "Smooth animations, haptics, gestures" },
];

const steps = [
  { num: "1", title: "Download APK", desc: "Tap the button below to download" },
  { num: "2", title: "Allow Install", desc: "Enable \"Install from unknown sources\" in Settings" },
  { num: "3", title: "Install & Enjoy", desc: "Open the APK and follow the installer" },
];

export default function DownloadPage() {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/app/info")
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setError("Could not reach server"))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const link = document.createElement("a");
      link.href = "/api/app/download";
      link.download = `anigen-pro-${info?.version ?? "1.0.0"}.apk`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      setError("Download failed");
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  };

  return (
    <PageTransition className="max-w-5xl mx-auto">
      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium mb-8 hover:opacity-80 transition-opacity"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <motion.div variants={listItem} className="text-center mb-12">
          <motion.div
            className="inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-6"
            style={{
              background: "var(--gradient-cta)",
              boxShadow: "0 0 48px rgba(56, 189, 248, 0.24)",
            }}
          >
            <Smartphone className="w-12 h-12 text-white" />
          </motion.div>
          <h1
            className="font-display text-4xl sm:text-5xl font-bold mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            MedNexus Pro
          </h1>
          <p
            className="text-lg max-w-lg mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            Your study companion, now on Android. All your decks, cards, and AI
            tools — right in your pocket.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {features.map((f, i) => (
            <motion.div key={f.title} variants={listItem}>
              <FloatingWidget className="p-6 text-center h-full" style={{ animationDelay: `${i * 0.1}s` }}>
                <div
                  className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
                  style={{
                    background: "rgba(56, 189, 248, 0.12)",
                    color: "var(--accent-primary)",
                  }}
                >
                  <f.icon className="w-6 h-6" />
                </div>
                <h3
                  className="font-display text-lg font-semibold mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  {f.title}
                </h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {f.desc}
                </p>
              </FloatingWidget>
            </motion.div>
          ))}
        </div>

        <motion.div variants={listItem}>
          <FloatingWidget className="p-8 text-center mb-10">
            <div className="mb-6">
              <h2
                className="font-display text-2xl font-bold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Download for Android
              </h2>
              <p style={{ color: "var(--text-secondary)" }}>
                Get the latest version and install directly on your phone
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8">
                <div
                  className="w-6 h-6 border-2 rounded-full animate-spin"
                  style={{
                    borderColor: "var(--accent-primary)",
                    borderTopColor: "transparent",
                  }}
                />
                <span style={{ color: "var(--text-secondary)" }}>Checking availability...</span>
              </div>
            ) : error ? (
              <div
                className="flex items-center justify-center gap-2 py-4 px-4 rounded-xl"
                style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--accent-rose)" }}
              >
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            ) : info?.available ? (
              <>
                <div
                  className="flex flex-wrap items-center justify-center gap-4 mb-6 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4" /> {info.sizeMB} MB
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4" style={{ color: "var(--accent-green)" }} /> v{info.version}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" /> Android {info.minAndroidVersion}+
                  </span>
                  {info.lastUpdated && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />{" "}
                      {new Date(info.lastUpdated).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDownload}
                  disabled={downloading}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-lg font-semibold text-white"
                  style={{
                    background: "var(--gradient-cta)",
                    boxShadow: "0 0 32px rgba(56, 189, 248, 0.24)",
                    opacity: downloading ? 0.7 : 1,
                  }}
                >
                  {downloading ? (
                    <>
                      <div
                        className="w-5 h-5 border-2 rounded-full animate-spin"
                        style={{ borderColor: "white", borderTopColor: "transparent" }}
                      />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Download APK
                    </>
                  )}
                </motion.button>
              </>
            ) : (
              <div
                className="flex items-center justify-center gap-2 py-4 px-4 rounded-xl"
                style={{ background: "rgba(245, 158, 11, 0.1)", color: "var(--accent-amber)" }}
              >
                <AlertCircle className="w-5 h-5" />
                <span>APK is not available yet. We're building it — check back soon!</span>
              </div>
            )}
          </FloatingWidget>
        </motion.div>

        <motion.div variants={listItem} className="mb-12">
          <h2
            className="font-display text-xl font-bold mb-6 text-center"
            style={{ color: "var(--text-primary)" }}
          >
            How to Install
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {steps.map((s, i) => (
              <FloatingWidget key={s.num} className="p-6 text-center">
                <div
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-4 font-display font-bold"
                  style={{
                    background: "rgba(56, 189, 248, 0.12)",
                    color: "var(--accent-primary)",
                  }}
                >
                  {s.num}
                </div>
                <h3
                  className="font-semibold mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  {s.title}
                </h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {s.desc}
                </p>
                {i < steps.length - 1 && (
                  <ChevronRight
                    className="w-4 h-4 mt-3 hidden md:block mx-auto"
                    style={{ color: "var(--text-muted)" }}
                  />
                )}
              </FloatingWidget>
            ))}
          </div>
        </motion.div>

        <motion.div variants={listItem} className="text-center pb-8">
          <FloatingWidget className="p-6">
            <p style={{ color: "var(--text-secondary)" }} className="text-sm">
              <strong style={{ color: "var(--text-primary)" }}>Security note:</strong>{" "}
              This APK is built directly from our source code. It's safe to install.
              If prompted, allow installation from unknown sources in your Android Settings.
            </p>
          </FloatingWidget>
        </motion.div>
      </motion.div>
    </PageTransition>
  );
}
