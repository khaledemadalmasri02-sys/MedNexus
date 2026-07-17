/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { CalendarDays, Clock, Layers, Target, AlertTriangle } from "lucide-react";
import type { StudyPilotPlan } from "../../lib/studypilotApi";

const DIFF_COLOR: Record<string, string> = {
  easy: "#22c55e",
  medium: "#eab308",
  hard: "#ef4444",
};

export default function PlanView({ plan }: { plan: StudyPilotPlan }) {
  const { schedule } = plan;
  const chartData = schedule.days.map((d) => ({
    name: `Day ${d.dayIndex + 1}`,
    minutes: d.minutes,
    cards: d.cardCount,
  }));

  const deadline = new Date(plan.deadline).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={Layers} label="Modules" value={schedule.modules.length} />
        <Stat icon={Target} label="Cards" value={schedule.totalCards} />
        <Stat icon={Clock} label="Per day" value={`${plan.dailyMinutes}m`} />
        <Stat icon={CalendarDays} label="Deadline" value={deadline} small />
      </div>

      <div className="rounded-2xl border border-white/10 bg-[var(--bg-card,#0b1220)] p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Daily load</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
              <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: "#0b1220", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
                formatter={(v: any, n: any) => [n === "minutes" ? `${v} min` : `${v} cards`, n === "minutes" ? "Time" : "Cards"]}
              />
              <Bar dataKey="minutes" fill="var(--accent-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[var(--bg-card,#0b1220)] p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Modules (study order, easy → hard)</h3>
        <ul className="space-y-2">
          {schedule.modules.map((m, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              <span className="w-6 text-text-muted">{i + 1}.</span>
              <span className="flex-1 text-text-primary truncate">{m.name}</span>
              <span className="text-text-secondary">{m.cardCount} cards</span>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: `${DIFF_COLOR[m.difficulty] ?? "#64748b"}22`, color: DIFF_COLOR[m.difficulty] ?? "#94a3b8" }}
              >
                {m.difficulty}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Heuristic planner — module clustering and difficulty are coarse estimates, not expert analysis.
          Review the module names and reorder/merge decks in your Library if needed.
        </span>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, small }: { icon: any; label: string; value: string | number; small?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--bg-card,#0b1220)] p-4">
      <Icon className="w-4 h-4 mb-2" style={{ color: "var(--accent-primary)" }} />
      <div className={small ? "text-sm font-semibold text-text-primary" : "text-xl font-bold text-text-primary"}>{value}</div>
      <div className="text-xs text-text-secondary">{label}</div>
    </div>
  );
}
