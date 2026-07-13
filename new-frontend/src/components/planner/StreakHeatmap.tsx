
interface StreakHeatmapProps {
  days: Array<{ date: string; plannedMinutes: number; actualMinutes: number; sessionsCompleted: number; hasActivity: boolean }>;
  compact?: boolean;
}

const LEVEL_COLORS = ['#1e293b', '#14532d', '#166534', '#16a34a', '#22c55e'];

function levelFor(minutes: number): number {
  if (minutes <= 0) return 0;
  return Math.min(4, 1 + Math.floor(minutes / 60));
}

export default function StreakHeatmap({ days, compact = false }: StreakHeatmapProps) {
  const cell = compact ? 'w-2.5 h-2.5' : 'w-3 h-3';
  const gap = compact ? 'gap-0.5' : 'gap-1';
  // Render in weeks (columns of 7)
  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="flex flex-col gap-2">
      <div className={`flex gap-2 ${gap} overflow-x-auto pb-1`}>
        {weeks.map((week, wi) => (
          <div key={wi} className={`flex flex-col ${gap}`}>
            {week.map((d) => (
              <div
                key={d.date}
                title={`${d.date} · ${d.actualMinutes}m studied · ${d.sessionsCompleted} sessions`}
                className={`${cell} rounded-sm shrink-0`}
                style={{ background: LEVEL_COLORS[levelFor(d.actualMinutes)] }}
              />
            ))}
          </div>
        ))}
      </div>
      {!compact && (
        <div className="flex items-center gap-1 text-[10px] text-text-muted">
          <span>Less</span>
          {LEVEL_COLORS.map((c) => (
            <span key={c} className="w-3 h-3 rounded-sm" style={{ background: c }} />
          ))}
          <span>More</span>
        </div>
      )}
    </div>
  );
}
