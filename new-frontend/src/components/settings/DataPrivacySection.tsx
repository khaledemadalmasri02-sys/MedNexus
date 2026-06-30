import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Upload, Trash2, Database, AlertTriangle, ChevronDown, ChevronUp, FileJson, FileSpreadsheet, CreditCard, Loader2, HardDrive, RotateCcw, Clock, CheckCircle2 } from "lucide-react";
import { SettingRow } from "./SettingRow";
import { SettingsSection } from "./SettingsSection";
import { useToast } from "../Toast";
import { userDataApi, type StorageUsage, type BackupInfo } from "../../lib/api";
import type { Settings } from "../../hooks/useSettings";

interface DataPrivacySectionProps {
  settings?: Settings;
  updateSetting?: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onReset?: () => void;
  onDataChanged?: () => void;
}

export function DataPrivacySection({ onDataChanged }: DataPrivacySectionProps) {
  const { toast } = useToast();
  const [dangerOpen, setDangerOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [storageLoading, setStorageLoading] = useState(true);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState<string | null>(null);

  const loadStorage = useCallback(async () => {
    try {
      const data = await userDataApi.getStorageUsage();
      setStorage(data);
    } catch {
      setStorage({
        totalDecks: 0,
        totalCards: 0,
        totalSummaries: 0,
        totalStudySessions: 0,
        storageUsedMb: 0,
        storageLimitMb: 10240,
      });
    } finally {
      setStorageLoading(false);
    }
  }, []);

  const loadBackups = useCallback(async () => {
    setBackupsLoading(true);
    try {
      const data = await userDataApi.listBackups();
      setBackups(data.backups);
    } catch {
      setBackups([]);
    } finally {
      setBackupsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStorage();
    loadBackups();
  }, [loadStorage, loadBackups]);

  const handleExport = async (format: string) => {
    setExporting(format);
    try {
      if (format === "json" || format === "csv") {
        const response = await fetch("/api/user/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format }),
          credentials: "include",
        });
        if (!response.ok) throw new Error("Export failed");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ankigen-export-${Date.now()}.${format}`; // eslint-disable-line react-hooks/purity
        a.click();
        URL.revokeObjectURL(url);
        toast(`Data exported as ${format.toUpperCase()}`, "success");
      } else if (format === "anki") {
        toast("Anki export requires a deck. Use deck export instead.", "info");
      }
    } catch (err) {
      toast(`Export failed: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    } finally {
      setExporting(null);
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.csv,.txt";
    input.onchange = async () => {
      if (!input.files?.length) return;
      setImporting(true);
      try {
        const result = await userDataApi.importData(input.files[0]);
        toast(`Imported ${result.imported} items. ${result.skipped} skipped.`, "success");
        onDataChanged?.();
        loadStorage();
      } catch (err) {
        toast(`Import failed: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  const handleClearHistory = async () => {
    try {
      const result = await userDataApi.clearGenerationHistory();
      toast(`Cleared ${result.deleted} generation records`, "success");
      onDataChanged?.();
      loadStorage();
    } catch {
      toast("Failed to clear history", "error");
    }
  };

  const handleDeleteAllData = async () => {
    try {
      await userDataApi.deleteAllData();
      toast("All data deleted successfully", "warning");
      onDataChanged?.();
      loadStorage();
    } catch {
      toast("Failed to delete data", "error");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText === "DELETE") {
      try {
        await userDataApi.deleteAccount();
        toast("Account deleted. Redirecting...", "warning");
        setTimeout(() => { window.location.href = "/"; }, 2000);
      } catch {
        toast("Failed to delete account", "error");
      }
      setDeleteConfirmText("");
    }
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const backup = await userDataApi.createBackup();
      toast(`Backup created: ${backup.name}`, "success");
      loadBackups();
    } catch {
      toast("Failed to create backup", "error");
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    setRestoringBackup(backupId);
    try {
      await userDataApi.restoreBackup(backupId);
      toast("Restore initiated. Server will restart...", "info");
    } catch {
      toast("Failed to restore backup", "error");
      setRestoringBackup(null);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    try {
      await userDataApi.deleteBackup(backupId);
      toast("Backup deleted", "success");
      loadBackups();
    } catch {
      toast("Failed to delete backup", "error");
    }
  };

  const storagePercent = storage
    ? Math.min(100, Math.round((storage.storageUsedMb / storage.storageLimitMb) * 100))
    : 0;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString();
  };

  return (
    <SettingsSection title="Data & Privacy" description="Manage your data, backups, exports, and account">
      <div className="px-5 pb-5 space-y-1">
        <SettingRow icon={Download} label="Export Your Data" description="Download all your decks, cards, and summaries">
          <div className="flex gap-1.5">
            {[
              { format: "json", label: "JSON", icon: FileJson },
              { format: "csv", label: "CSV", icon: FileSpreadsheet },
              { format: "anki", label: "Anki", icon: CreditCard },
            ].map(({ format, label, icon: Icon }) => (
              <motion.button
                key={format}
                onClick={() => handleExport(format)}
                disabled={exporting !== null}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium"
                style={{
                  background: "var(--glass-surface)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                  opacity: exporting !== null ? 0.6 : 1,
                }}
                whileHover={exporting ? undefined : { borderColor: "var(--accent-blue)", color: "var(--accent-blue)" }}
                whileTap={exporting ? undefined : { scale: 0.95 }}
              >
                {exporting === format ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
                {label}
              </motion.button>
            ))}
          </div>
        </SettingRow>

        <SettingRow icon={Upload} label="Import Data" description="Import from JSON or CSV files">
          <motion.button
            onClick={handleImport}
            disabled={importing}
            className="text-xs font-medium px-4 py-1.5 rounded-lg flex items-center gap-1.5"
            style={{
              background: "var(--accent-blue)",
              color: "white",
              opacity: importing ? 0.6 : 1,
            }}
            whileHover={importing ? undefined : { scale: 1.02 }}
            whileTap={importing ? undefined : { scale: 0.98 }}
          >
            {importing && <Loader2 className="w-3 h-3 animate-spin" />}
            {importing ? "Importing..." : "Choose file..."}
          </motion.button>
        </SettingRow>

        <SettingRow icon={Database} label="Storage Used" description={`${storage?.storageUsedMb ?? 0} MB of ${storage ? Math.round(storage.storageLimitMb / 1024) : 10} GB used`}>
          <div className="w-[200px]">
            {storageLoading ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--text-muted)" }} />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Decks: {storage?.totalDecks ?? 0}</span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Cards: {storage?.totalCards ?? 0}</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--border-default)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: "linear-gradient(90deg, var(--accent-green), var(--accent-blue))",
                      width: `${storagePercent}%`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${storagePercent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Summaries: {storage?.totalSummaries ?? 0}</span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{storagePercent}%</span>
                </div>
              </>
            )}
          </div>
        </SettingRow>
      </div>

      <div className="px-5 pb-5">
        <div className="rounded-xl p-4" style={{ background: "var(--glass-surface-faint)", border: "1px solid var(--glass-border)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4" style={{ color: "var(--accent-blue)" }} />
              <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>System Backups</span>
            </div>
            <motion.button
              onClick={handleCreateBackup}
              disabled={creatingBackup}
              className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg"
              style={{
                background: "var(--accent-blue)",
                color: "white",
                opacity: creatingBackup ? 0.6 : 1,
              }}
              whileHover={creatingBackup ? undefined : { scale: 1.02 }}
              whileTap={creatingBackup ? undefined : { scale: 0.98 }}
            >
              {creatingBackup ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
              {creatingBackup ? "Creating..." : "Create Backup"}
            </motion.button>
          </div>

          {backupsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-muted)" }} />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-4">
              <Clock className="w-5 h-5 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>No backups yet. Create one to protect your data.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-2.5 rounded-lg"
                  style={{ background: "var(--glass-surface)", border: "1px solid var(--glass-border)" }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent-green)" }} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{backup.name}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{formatSize(backup.size)} &middot; {formatDate(backup.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={userDataApi.downloadBackup(backup.id)}
                      className="p-1.5 rounded-md"
                      style={{ color: "var(--text-secondary)" }}
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <motion.button
                      onClick={() => handleRestoreBackup(backup.id)}
                      disabled={restoringBackup !== null}
                      className="p-1.5 rounded-md"
                      style={{ color: "var(--accent-blue)", opacity: restoringBackup !== null ? 0.5 : 1 }}
                      title="Restore"
                      whileTap={{ scale: 0.9 }}
                    >
                      {restoringBackup === backup.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    </motion.button>
                    <motion.button
                      onClick={() => handleDeleteBackup(backup.id)}
                      className="p-1.5 rounded-md"
                      style={{ color: "var(--accent-rose)" }}
                      title="Delete"
                      whileTap={{ scale: 0.9 }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pb-5">
        <motion.div
          className="rounded-xl overflow-hidden"
          style={{
            background: "rgba(239, 68, 68, 0.05)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
          }}
        >
          <motion.button
            onClick={() => setDangerOpen(!dangerOpen)}
            className="w-full flex items-center justify-between px-4 py-3"
            whileHover={{ backgroundColor: "rgba(239, 68, 68, 0.08)" }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: "var(--accent-rose)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--accent-rose)" }}>Danger Zone</span>
            </div>
            {dangerOpen ? (
              <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            ) : (
              <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            )}
          </motion.button>

          <AnimatePresence>
            {dangerOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3">
                  <div className="space-y-1.5">
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Clear all generation history</p>
                    <motion.button
                      onClick={handleClearHistory}
                      className="text-xs font-medium px-4 py-1.5 rounded-lg"
                      style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)", color: "var(--accent-amber)" }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Clear history
                    </motion.button>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Delete all data</p>
                    <motion.button
                      onClick={handleDeleteAllData}
                      className="text-xs font-medium px-4 py-1.5 rounded-lg"
                      style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "var(--accent-rose)" }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Delete all data
                    </motion.button>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Delete account — This action cannot be undone</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder='Type "DELETE" to confirm'
                        value={deleteConfirmText}
                        onChange={e => setDeleteConfirmText(e.target.value)}
                        className="text-xs rounded-lg px-3 py-1.5 outline-none flex-1"
                        style={{
                          background: "rgba(239, 68, 68, 0.08)",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                          color: "var(--text-primary)",
                        }}
                      />
                      <motion.button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== "DELETE"}
                        className="text-xs font-semibold px-4 py-1.5 rounded-lg flex items-center gap-1"
                        style={{
                          background: deleteConfirmText === "DELETE" ? "var(--accent-rose)" : "rgba(239, 68, 68, 0.1)",
                          color: deleteConfirmText === "DELETE" ? "white" : "var(--text-muted)",
                        }}
                        whileTap={deleteConfirmText === "DELETE" ? { scale: 0.95 } : undefined}
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete account
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </SettingsSection>
  );
}
