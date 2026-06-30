import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, CheckCheck, Calendar, Flame, Trophy } from 'lucide-react';
import { notificationsApi } from "../../lib/api";
import type { AppNotification } from "../../lib/api";

const typeIcons: Record<string, typeof Bell> = {
  study_reminder: Calendar,
  streak_at_risk: Flame,
  weekly_summary: Trophy,
  default: Bell,
};

const typeColors: Record<string, string> = {
  study_reminder: 'var(--accent-green)',
  streak_at_risk: 'var(--accent-amber)',
  weekly_summary: 'var(--accent-purple)',
  default: 'var(--accent-blue)',
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationsApi.list();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markRead = async (id: number) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  return (
    <div ref={ref} className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        className="p-2.5 rounded-xl transition-all duration-300 relative"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
            style={{ background: 'var(--accent-rose)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-12 w-80 rounded-2xl overflow-hidden z-[60]"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-text-secondary" />
                <span className="text-sm font-semibold text-text-primary">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)' }}>
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] font-semibold text-accent-purple flex items-center gap-1 hover:underline">
                  <CheckCheck className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="py-8 text-center text-xs text-text-muted">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <BellOff className="h-8 w-8 text-text-muted mx-auto mb-2" />
                  <p className="text-xs text-text-muted">No notifications</p>
                </div>
              ) : (
                notifications.map(notif => {
                  const isRead = notif.read === true || notif.read === 1;
                  const Icon = typeIcons[notif.type] || typeIcons.default;
                  const color = typeColors[notif.type] || typeColors.default;
                  return (
                    <div
                      key={notif.id}
                      className="flex items-start gap-3 p-4 border-b transition-colors cursor-pointer"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        background: isRead ? 'transparent' : 'rgba(139, 92, 246, 0.03)',
                      }}
                      onClick={() => !isRead && markRead(notif.id)}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                        <Icon className="h-4 w-4" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-text-primary truncate">{notif.title}</p>
                          {!isRead && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />}
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{notif.message}</p>
                        <p className="text-[10px] text-text-muted mt-1">
                          {new Date(notif.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
