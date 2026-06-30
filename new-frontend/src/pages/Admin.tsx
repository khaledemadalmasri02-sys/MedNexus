import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, AlertTriangle, MessageSquare, Shield, Search, Trash2,
  ChevronDown, ChevronRight, Check, RefreshCw, X, LogOut,
  UserX, Bug, Star, ShieldCheck, Activity, Inbox, Lock,
} from "lucide-react";
import * as api from "../lib/api";
import type { AdminStats, AdminUser, AdminError, AdminFeedback } from "../lib/api";

type TabId = "users" | "errors" | "feedback";

const TABS: { id: TabId; label: string; icon: typeof Users; desc: string }[] = [
  { id: "users", label: "Users", icon: Users, desc: "Manage registered accounts" },
  { id: "errors", label: "Errors", icon: AlertTriangle, desc: "System error patterns" },
  { id: "feedback", label: "Feedback", icon: MessageSquare, desc: "User submissions" },
];

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25 },
};

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("users");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);

  const storedKey = useRef(() => {
    try { return window.localStorage.getItem("admin_key") || ""; } catch { return ""; }
  });

  const verifyKey = useCallback(async () => {
    if (!adminKey.trim()) return;
    setAuthError(false);
    setLoading(true);
    try {
      await api.adminApi.stats({ "x-admin-key": adminKey });
      window.localStorage.setItem("admin_key", adminKey);
      setIsAuthenticated(true);
    } catch {
      setAuthError(true);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    const key = storedKey.current();
    if (key) {
      setLoading(true);
      api.adminApi.stats().then(setStats).catch(() => {
        setIsAuthenticated(false);
      }).finally(() => setLoading(false));
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4" style={{ background: "var(--bg-void)" }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: "var(--accent-green)" }} />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: "var(--accent-blue)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 blur-3xl" style={{ background: "var(--accent-purple)" }} />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-md"
        >
          <div className="absolute inset-0 rounded-3xl opacity-50 blur-xl" style={{ background: "linear-gradient(135deg, var(--accent-green) 0%, var(--accent-blue) 100%)" }} />
          <div
            className="relative rounded-3xl p-8 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.85) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 25px 60px -15px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, var(--accent-green), var(--accent-blue), transparent)" }} />

            <div className="flex items-center gap-4 mb-8">
              <motion.div
                className="w-14 h-14 rounded-2xl flex items-center justify-center relative"
                style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))", boxShadow: "0 8px 32px rgba(34,197,94,0.3)" }}
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Shield className="w-7 h-7 text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Admin Panel</h1>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Restricted area — authentication required</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: "var(--text-secondary)" }}>Secret Key</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  <input
                    type="password"
                    value={adminKey}
                    onChange={e => { setAdminKey(e.target.value); setAuthError(false); }}
                    onKeyDown={e => e.key === "Enter" && verifyKey()}
                    placeholder="Enter admin key..."
                    className="w-full rounded-xl text-sm pl-10 pr-4 py-3.5 outline-none transition-all duration-200"
                    style={{
                      background: "rgba(15,23,42,0.6)",
                      border: authError ? "1px solid rgba(244,63,94,0.5)" : "1px solid rgba(255,255,255,0.08)",
                      color: "var(--text-primary)",
                      boxShadow: authError ? "0 0 0 3px rgba(244,63,94,0.1)" : "none",
                    }}
                  />
                </div>
                <AnimatePresence>
                  {authError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-xs mt-2 flex items-center gap-1.5"
                      style={{ color: "var(--accent-rose)" }}
                    >
                      <X className="w-3 h-3" /> Invalid key — please try again
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={verifyKey}
                disabled={loading || !adminKey.trim()}
                className="w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, var(--accent-green) 0%, var(--accent-blue) 100%)",
                  boxShadow: "0 4px 20px rgba(34,197,94,0.25)",
                }}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Authenticate
                  </>
                )}
              </motion.button>
            </div>

            <div className="mt-6 pt-5 flex items-center justify-center gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <Lock className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Encrypted connection • Access logged</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-void)" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: "var(--accent-green)" }} />
        <div className="absolute top-1/2 -left-40 w-96 h-96 rounded-full opacity-8 blur-3xl" style={{ background: "var(--accent-blue)" }} />
      </div>

      <div className="relative flex h-screen">
        <motion.aside
          initial={{ x: -280, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-72 shrink-0 flex flex-col h-full overflow-hidden"
          style={{
            background: "linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(2,6,23,0.98) 100%)",
            borderRight: "1px solid rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="p-6 pb-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))", boxShadow: "0 4px 16px rgba(34,197,94,0.25)" }}>
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-base font-bold" style={{ color: "var(--text-primary)" }}>Admin</h1>
                <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Control Panel</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-2 space-y-1">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="w-full relative flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 group"
                  style={{
                    background: isActive ? "linear-gradient(135deg, rgba(34,197,94,0.1), rgba(59,130,246,0.08))" : "transparent",
                    border: isActive ? "1px solid rgba(34,197,94,0.15)" : "1px solid transparent",
                  }}
                  whileHover={{ x: 2 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-pill"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                      style={{ background: "var(--accent-green)" }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                    style={{
                      background: isActive ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.04)",
                    }}
                  >
                    <tab.icon className="w-4 h-4" style={{ color: isActive ? "var(--accent-green)" : "var(--text-muted)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}>
                      {tab.label}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{tab.desc}</p>
                  </div>
                  {tab.id === "errors" && stats && stats.unresolvedErrors > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(245,158,11,0.15)", color: "var(--accent-amber)" }}>
                      {stats.unresolvedErrors}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </nav>

          {stats && (
            <div className="px-4 py-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider px-1" style={{ color: "var(--text-muted)" }}>System Status</p>
              <div className="grid grid-cols-2 gap-2">
                <MiniStat label="Users" value={stats.totalUsers} color="var(--accent-blue)" />
                <MiniStat label="Errors" value={stats.totalErrors} color="var(--accent-rose)" />
                <MiniStat label="Open" value={stats.unresolvedErrors} color="var(--accent-amber)" />
                <MiniStat label="Feedback" value={stats.totalFeedback} color="var(--accent-emerald)" />
              </div>
            </div>
          )}

          <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <button
              onClick={() => {
                setIsAuthenticated(false);
                setStats(null);
                setAdminKey("");
                window.localStorage.removeItem("admin_key");
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--accent-rose)"; e.currentTarget.style.background = "rgba(244,63,94,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </motion.aside>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <motion.header {...fadeUp} className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold font-display" style={{ color: "var(--text-primary)" }}>
                  {TABS.find(t => t.id === activeTab)?.label}
                </h2>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                  {TABS.find(t => t.id === activeTab)?.desc}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--accent-green)" }} />
                  <span className="text-xs font-medium" style={{ color: "var(--accent-green)" }}>Live</span>
                </div>
              </div>
            </div>
          </motion.header>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} {...fadeUp}>
              {activeTab === "users" && <UsersTab />}
              {activeTab === "errors" && <ErrorsTab />}
              {activeTab === "feedback" && <FeedbackTab />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
      <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    const o = reset ? 0 : offset;
    try {
      const res = await api.adminApi.listUsers(LIMIT, o);
      setUsers(res.users);
      setTotal(res.total);
      if (reset) setOffset(0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [offset]);

  useEffect(() => { load(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = search
    ? users.filter(u => u.email?.toLowerCase().includes(search.toLowerCase()) || u.id.includes(search))
    : users;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.adminApi.deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      load(true);
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by email or ID..."
            className="w-full rounded-xl text-sm pl-10 pr-4 py-2.5 outline-none"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
          />
        </div>
        <button onClick={() => load(true)} className="p-2.5 rounded-xl transition-colors" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
          <RefreshCw className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <th className="text-left text-xs font-semibold px-5 py-3.5" style={{ color: "var(--text-muted)" }}>Email</th>
                <th className="text-left text-xs font-semibold px-5 py-3.5" style={{ color: "var(--text-muted)" }}>Name</th>
                <th className="text-left text-xs font-semibold px-5 py-3.5" style={{ color: "var(--text-muted)" }}>Verified</th>
                <th className="text-left text-xs font-semibold px-5 py-3.5" style={{ color: "var(--text-muted)" }}>Created</th>
                <th className="text-right text-xs font-semibold px-5 py-3.5" style={{ color: "var(--text-muted)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12"><Activity className="w-5 h-5 mx-auto animate-spin" style={{ color: "var(--accent-green)" }} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12"><UserX className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)" }} /><p style={{ color: "var(--text-muted)" }}>No users found</p></td></tr>
              ) : filtered.map((u, i) => (
                <motion.tr
                  key={u.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  className="group"
                >
                  <td className="px-5 py-3.5">
                    <button onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
                      {expandedUser === u.id ? <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--accent-green)" }} /> : <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />}
                      {u.email || "—"}
                    </button>
                    <AnimatePresence>
                      {expandedUser === u.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 ml-6 text-xs space-y-1 overflow-hidden"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <p>ID: <span style={{ color: "var(--text-secondary)" }}>{u.id}</span></p>
                          <p>Provider: <span style={{ color: "var(--text-secondary)" }}>{u.authProvider || "local"}</span></p>
                          <p>Pro: <span style={{ color: u.isPro ? "var(--accent-emerald)" : "var(--text-muted)" }}>{u.isPro ? "Yes" : "No"}</span></p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </td>
                  <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {u.firstName || u.lastName ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{
                      background: u.emailVerified ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                      color: u.emailVerified ? "var(--accent-emerald)" : "var(--accent-amber)",
                    }}>
                      {u.emailVerified ? "Verified" : "Unverified"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs" style={{ color: "var(--text-muted)" }}>{formatDate(u.createdAt)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => setDeleteTarget(u)} className="p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100" style={{ color: "var(--accent-rose)", background: "rgba(244,63,94,0.08)" }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Showing {filtered.length} of {total} users</span>
          <div className="flex gap-2">
            <button
              onClick={() => { setOffset(Math.max(0, offset - LIMIT)); load(false); }}
              disabled={offset === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30 transition-colors"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
            >Previous</button>
            <button
              onClick={() => { setOffset(offset + LIMIT); load(false); }}
              disabled={offset + LIMIT >= total}
              className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30 transition-colors"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
            >Next</button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={() => setDeleteTarget(null)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-2xl p-6"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--glass-border)", boxShadow: "0 25px 60px rgba(0,0,0,0.4)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(244,63,94,0.12)" }}>
                  <UserX className="w-5 h-5" style={{ color: "var(--accent-rose)" }} />
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Delete User</h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
                Permanently remove <strong style={{ color: "var(--text-primary)" }}>{deleteTarget.email || deleteTarget.id}</strong> and all associated data?
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: "var(--text-secondary)", background: "var(--bg-elevated)" }}>Cancel</button>
                <button onClick={handleDelete} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--accent-rose)" }}>Delete User</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ErrorsTab() {
  const [errors, setErrors] = useState<AdminError[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "resolved" | "unresolved">("all");
  const [expandedError, setExpandedError] = useState<number | null>(null);
  const [resolvingError, setResolvingError] = useState<number | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [fixPattern, setFixPattern] = useState("");
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    const o = reset ? 0 : offset;
    try {
      const params: { resolved?: string; limit: number; offset: number } = { limit: LIMIT, offset: o };
      if (filter === "resolved") params.resolved = "true";
      else if (filter === "unresolved") params.resolved = "false";
      const res = await api.adminApi.listErrors(params);
      setErrors(res.errors);
      setTotal(res.total);
      if (reset) setOffset(0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [offset, filter]);

  useEffect(() => { load(true); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResolve = async (id: number) => {
    if (!resolutionNotes.trim() || !fixPattern.trim()) return;
    try {
      await api.adminApi.resolveError(id, resolutionNotes, fixPattern);
      setResolvingError(null);
      setResolutionNotes("");
      setFixPattern("");
      load(true);
    } catch { /* ignore */ }
  };

  const handleClearResolved = async () => {
    try {
      await api.adminApi.clearResolvedErrors();
      load(true);
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
          {(["all", "unresolved", "resolved"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
              style={{
                background: filter === f ? "var(--glass-surface)" : "transparent",
                color: filter === f ? "var(--text-primary)" : "var(--text-muted)",
                border: filter === f ? "1px solid var(--glass-border)" : "1px solid transparent",
              }}
            >{f}</button>
          ))}
        </div>
        <div className="flex-1" />
        <button
          onClick={handleClearResolved}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.15)", color: "var(--accent-rose)" }}
        >
          <X className="w-3 h-3 inline mr-1" />Clear Resolved
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <th className="text-left text-xs font-semibold px-5 py-3.5" style={{ color: "var(--text-muted)" }}>Type</th>
                <th className="text-left text-xs font-semibold px-5 py-3.5" style={{ color: "var(--text-muted)" }}>Model</th>
                <th className="text-left text-xs font-semibold px-5 py-3.5" style={{ color: "var(--text-muted)" }}>Count</th>
                <th className="text-left text-xs font-semibold px-5 py-3.5" style={{ color: "var(--text-muted)" }}>Status</th>
                <th className="text-left text-xs font-semibold px-5 py-3.5" style={{ color: "var(--text-muted)" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12"><Activity className="w-5 h-5 mx-auto animate-spin" style={{ color: "var(--accent-rose)" }} /></td></tr>
              ) : errors.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12"><Bug className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)" }} /><p style={{ color: "var(--text-muted)" }}>No errors logged</p></td></tr>
              ) : errors.map((e, i) => (
                <motion.tr
                  key={e.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  className="group"
                >
                  <td className="px-5 py-3.5">
                    <button onClick={() => { setExpandedError(expandedError === e.id ? null : e.id); setResolvingError(null); }} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
                      {expandedError === e.id ? <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--accent-rose)" }} /> : <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />}
                      {e.errorType}
                    </button>
                    <AnimatePresence>
                      {expandedError === e.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 ml-6 space-y-3 text-xs overflow-hidden"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <div className="p-3 rounded-lg" style={{ background: "var(--bg-elevated)" }}>
                            <p className="font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Error Message</p>
                            <p style={{ color: "var(--text-primary)" }}>{e.errorMessage}</p>
                          </div>
                          {e.errorStack && (
                            <div className="p-3 rounded-lg" style={{ background: "var(--bg-elevated)" }}>
                              <p className="font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Stack Trace</p>
                              <pre className="overflow-x-auto text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{e.errorStack}</pre>
                            </div>
                          )}
                          {e.resolved && (
                            <div className="p-3 rounded-lg" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)" }}>
                              <p className="font-semibold mb-1" style={{ color: "var(--accent-emerald)" }}>Resolution</p>
                              <p style={{ color: "var(--text-primary)" }}>{e.resolutionNotes}</p>
                            </div>
                          )}
                          {!e.resolved && resolvingError !== e.id && (
                            <button
                              onClick={() => { setResolvingError(e.id); setResolutionNotes(""); setFixPattern(""); }}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "var(--accent-emerald)" }}
                            >
                              <Check className="w-3 h-3 inline mr-1" />Resolve
                            </button>
                          )}
                          {resolvingError === e.id && (
                            <div className="space-y-2 p-3 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                              <textarea
                                value={resolutionNotes}
                                onChange={ev => setResolutionNotes(ev.target.value)}
                                placeholder="Resolution notes..."
                                rows={2}
                                className="w-full rounded-lg text-xs p-2.5 outline-none resize-none"
                                style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                              />
                              <input
                                value={fixPattern}
                                onChange={ev => setFixPattern(ev.target.value)}
                                placeholder="Fix pattern (short description)"
                                className="w-full rounded-lg text-xs px-3 py-2 outline-none"
                                style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                              />
                              <div className="flex gap-2">
                                <button onClick={() => handleResolve(e.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "var(--accent-emerald)" }}>
                                  <Check className="w-3 h-3 inline mr-1" />Save
                                </button>
                                <button onClick={() => setResolvingError(null)} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: "var(--text-muted)" }}>Cancel</button>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </td>
                  <td className="px-5 py-3.5 text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{e.model}</td>
                  <td className="px-5 py-3.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <span className="px-2 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.04)" }}>{e.occurrenceCount}x</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{
                      background: e.resolved ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                      color: e.resolved ? "var(--accent-emerald)" : "var(--accent-amber)",
                    }}>
                      {e.resolved ? "Resolved" : "Open"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs" style={{ color: "var(--text-muted)" }}>{formatDate(e.createdAt)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Showing {errors.length} of {total} errors</span>
          <div className="flex gap-2">
            <button onClick={() => { setOffset(Math.max(0, offset - LIMIT)); load(false); }} disabled={offset === 0} className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>Previous</button>
            <button onClick={() => { setOffset(offset + LIMIT); load(false); }} disabled={offset + LIMIT >= total} className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedbackTab() {
  const [items, setItems] = useState<AdminFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedFeedback, setExpandedFeedback] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    const o = reset ? 0 : offset;
    try {
      const params: { type?: string; limit: number; offset: number } = { limit: LIMIT, offset: o };
      if (filterType !== "all") params.type = filterType;
      const res = await api.adminApi.listFeedback(params);
      setItems(res.items);
      setTotal(res.total);
      if (reset) setOffset(0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [offset, filterType]);

  useEffect(() => { load(true); }, [filterType]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: number) => {
    try {
      await api.adminApi.deleteFeedback(id);
      setItems(prev => prev.filter(f => f.id !== id));
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
          {["all", "bug", "feature", "other"].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
              style={{
                background: filterType === t ? "var(--glass-surface)" : "transparent",
                color: filterType === t ? "var(--text-primary)" : "var(--text-muted)",
                border: filterType === t ? "1px solid var(--glass-border)" : "1px solid transparent",
              }}
            >{t}</button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <th className="text-left text-xs font-semibold px-5 py-3.5" style={{ color: "var(--text-muted)" }}>Date</th>
                <th className="text-left text-xs font-semibold px-5 py-3.5" style={{ color: "var(--text-muted)" }}>Type</th>
                <th className="text-left text-xs font-semibold px-5 py-3.5" style={{ color: "var(--text-muted)" }}>Rating</th>
                <th className="text-left text-xs font-semibold px-5 py-3.5" style={{ color: "var(--text-muted)" }}>Message</th>
                <th className="text-left text-xs font-semibold px-5 py-3.5" style={{ color: "var(--text-muted)" }}>User</th>
                <th className="text-right text-xs font-semibold px-5 py-3.5" style={{ color: "var(--text-muted)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12"><Activity className="w-5 h-5 mx-auto animate-spin" style={{ color: "var(--accent-blue)" }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12"><Inbox className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)" }} /><p style={{ color: "var(--text-muted)" }}>No feedback received</p></td></tr>
              ) : items.map((f, i) => (
                <motion.tr
                  key={f.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  className="group"
                >
                  <td className="px-5 py-3.5">
                    <button onClick={() => setExpandedFeedback(expandedFeedback === f.id ? null : f.id)} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      {expandedFeedback === f.id ? <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--accent-blue)" }} /> : <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />}
                      {formatDate(f.createdAt)}
                    </button>
                    <AnimatePresence>
                      {expandedFeedback === f.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 ml-6 p-3 rounded-lg overflow-hidden"
                          style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}
                        >
                          {f.message}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs px-2.5 py-1 rounded-full capitalize font-medium" style={{
                      background: f.type === "bug" ? "rgba(244,63,94,0.12)" : f.type === "feature" ? "rgba(245,158,11,0.12)" : "rgba(59,130,246,0.12)",
                      color: f.type === "bug" ? "var(--accent-rose)" : f.type === "feature" ? "var(--accent-amber)" : "var(--accent-blue)",
                    }}>{f.type}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    {f.rating ? (
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5" style={{ color: "var(--accent-amber)", fill: "var(--accent-amber)" }} />
                        <span className="text-xs font-medium" style={{ color: "var(--accent-amber)" }}>{f.rating}</span>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs max-w-xs truncate" style={{ color: "var(--text-secondary)" }}>{f.message}</td>
                  <td className="px-5 py-3.5 text-xs" style={{ color: "var(--text-muted)" }}>{f.userEmail || "Anonymous"}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => handleDelete(f.id)} className="p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100" style={{ color: "var(--accent-rose)", background: "rgba(244,63,94,0.08)" }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Showing {items.length} of {total} feedback</span>
          <div className="flex gap-2">
            <button onClick={() => { setOffset(Math.max(0, offset - LIMIT)); load(false); }} disabled={offset === 0} className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>Previous</button>
            <button onClick={() => { setOffset(offset + LIMIT); load(false); }} disabled={offset + LIMIT >= total} className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
