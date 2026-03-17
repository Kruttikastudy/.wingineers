export default function RiskGauge({ score }) {
  const cfg =
    score >= 70
      ? { color: "#ef4444", label: "High Risk", glow: "#ef444440" }
      : score >= 40
        ? { color: "#f97316", label: "Elevated", glow: "#f9731640" }
        : score >= 20
          ? { color: "#f59e0b", label: "Moderate", glow: "#f59e0b40" }
          : { color: "#10b981", label: "Low Risk", glow: "#10b98140" };

  const r = 46;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative"
        style={{ filter: `drop-shadow(0 0 10px ${cfg.glow})` }}
      >
        <svg width="120" height="120" className="-rotate-90">
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="7"
          />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={cfg.color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white leading-none">
            {Math.round(score)}
          </span>
          <span className="text-[9px] text-white/30 font-medium">/100</span>
        </div>
      </div>
      <span
        className="text-[10px] font-semibold px-3 py-1 rounded-full"
        style={{
          background: `${cfg.color}15`,
          color: cfg.color,
          border: `1px solid ${cfg.color}25`,
        }}
      >
        {cfg.label}
      </span>
    </div>
  );
}
