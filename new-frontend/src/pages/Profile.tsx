/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { User, Mail, Calendar, Clock, Trash2, Shield, ChevronRight, Award, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import * as api from "../lib/api";
import { FloatingWidget, PageTransition, AnimatedCounter } from "../components/ui";
import { useToast } from "../components/Toast";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ totalCards: 0, totalStudyMinutes: 0, memberSince: "" });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
          const userData = await (api.authApi as any).getProfile?.().catch(() => null);
          const dashState = await api.dashboardExtendedApi.getState().catch(() => null);
        setProfile(userData);
        setStats({
          totalCards: (dashState as any)?.totalCards || 0,
          totalStudyMinutes: (dashState as any)?.totalStudyMinutes || 0,
          memberSince: userData?.createdAt || new Date().toISOString(),
        });
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <PageTransition className="max-w-2xl mx-auto">
        <div className="space-y-4">
          <div className="h-32 rounded-2xl animate-shimmer" style={{ background: "var(--border-subtle)" }} />
          <div className="h-24 rounded-2xl animate-shimmer" style={{ background: "var(--border-subtle)" }} />
        </div>
      </PageTransition>
    );
  }

  const hours = Math.round(stats.totalStudyMinutes / 60);
  const memberDate = new Date(stats.memberSince);
  const daysSince = Math.max(0, Math.floor((Date.now() - memberDate.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <PageTransition className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-text-primary mb-2">Profile</h1>
        <p className="text-sm text-text-secondary">Your account information and stats</p>
      </div>

      <FloatingWidget className="p-6 mb-4">
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.15))",
              border: "1px solid rgba(6,182,212,0.2)",
            }}
          >
            <User className="h-7 w-7 text-accent-cyan" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {profile?.firstName || profile?.email?.split("@")[0] || "User"}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
              <Mail className="h-3 w-3" />
              {profile?.email || "No email"}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
              <Calendar className="h-3 w-3" />
              Member for {daysSince} days
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Cards Studied", value: stats.totalCards, icon: BookOpen, color: "var(--accent-green)" },
            { label: "Study Hours", value: hours, icon: Clock, color: "var(--accent-blue)" },
            { label: "Days Active", value: daysSince, icon: Award, color: "var(--accent-purple)" },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-3 rounded-xl" style={{ background: "var(--bg-elevated)" }}>
              <stat.icon className="h-4 w-4 mx-auto mb-1" style={{ color: stat.color }} />
              <div className="text-lg font-bold text-text-primary">
                <AnimatedCounter value={stat.value} />
              </div>
              <div className="text-[9px] text-text-muted">{stat.label}</div>
            </div>
          ))}
        </div>
      </FloatingWidget>

      <FloatingWidget className="p-4 mb-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Account</h3>
        <div className="space-y-1">
          <Link to="/settings" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors">
            <Shield className="h-4 w-4 text-text-muted" />
            <span className="text-sm text-text-primary flex-1">Settings & Privacy</span>
            <ChevronRight className="h-4 w-4 text-text-muted" />
          </Link>
          <Link to="/achievements" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors">
            <Award className="h-4 w-4 text-accent-amber" />
            <span className="text-sm text-text-primary flex-1">Achievements</span>
            <ChevronRight className="h-4 w-4 text-text-muted" />
          </Link>
        </div>
      </FloatingWidget>

      <FloatingWidget className="p-4">
        <h3 className="text-sm font-semibold text-accent-rose mb-3">Danger Zone</h3>
        <div className="space-y-1">
          <button
            onClick={() => toast("Account deletion is not available in this version.", "info")}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/5 transition-colors text-left"
          >
            <Trash2 className="h-4 w-4 text-accent-rose" />
            <span className="text-sm text-accent-rose">Delete Account</span>
          </button>
        </div>
      </FloatingWidget>
    </PageTransition>
  );
}
