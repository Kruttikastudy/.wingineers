import { Brain, AlertTriangle, Zap } from "lucide-react";

export default function TokenHeatmap({
  tokens,
  shapValues,
  modelScore,
  severity,
  cta,
  fallback,
}) {
  const getColor = (val) => {
    const abs = Math.min(Math.abs(val) * 3, 1);
    if (val > 0.01) return `rgba(239,68,68,${0.15 + abs * 0.6})`;
    if (val < -0.01) return `rgba(34,197,94,${0.15 + abs * 0.6})`;
    return "rgba(255,255,255,0.05)";
  };

  const sevMap = {
    CRITICAL: {
      color: "#ef4444",
      bg: "rgba(239,68,68,0.08)",
      border: "rgba(239,68,68,0.2)",
    },
    HIGH: {
      color: "#f97316",
      bg: "rgba(249,115,22,0.08)",
      border: "rgba(249,115,22,0.2)",
    },
    MODERATE: {
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.08)",
      border: "rgba(245,158,11,0.2)",
    },
    LOW: {
      color: "#10b981",
      bg: "rgba(16,185,129,0.08)",
      border: "rgba(16,185,129,0.2)",
    },
  };
  const sev = sevMap[severity] || sevMap.LOW;

  return (
    <div
      className="rounded-xl p-6"
      style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">
            SHAP Token Attribution
          </h3>
        </div>
        {severity && (
          <span
            className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full"
            style={{
              background: sev.bg,
              color: sev.color,
              border: `1px solid ${sev.border}`,
            }}
          >
            <Zap className="w-3 h-3" />
            {Math.round(modelScore)}/100 · {severity}
          </span>
        )}
      </div>

      {tokens?.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mb-5 leading-9">
          {tokens.map((tok, i) => (
            <span
              key={i}
              className="group relative inline-block px-2 py-0.5 rounded font-mono text-xs text-white cursor-default transition-transform hover:scale-110"
              style={{ backgroundColor: getColor(shapValues?.[i] || 0) }}
            >
              {tok}
              <span
                className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded-md text-[10px] whitespace-nowrap z-50 font-mono"
                style={{
                  background: "#1a1a2e",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                }}
              >
                SHAP: {(shapValues?.[i] || 0) >= 0 ? "+" : ""}
                {(shapValues?.[i] || 0).toFixed(4)}
              </span>
            </span>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-white/25 mb-4">
          {fallback
            ? "SHAP tokens unavailable — model confidence only."
            : "Paste a URL above to view token-level attribution."}
        </div>
      )}

      {/* Legend */}
      <div
        className="flex items-center gap-4 pb-4 border-b mb-4"
        style={{ borderColor: "rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ background: "rgba(239,68,68,0.5)" }}
          />
          <span className="text-[10px] text-white/30 font-medium">
            Suspicious
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ background: "rgba(34,197,94,0.5)" }}
          />
          <span className="text-[10px] text-white/30 font-medium">Benign</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <span className="text-[10px] text-white/30 font-medium">Neutral</span>
        </div>
      </div>

      {cta && (
        <div
          className="flex items-start gap-2 p-3 rounded-lg"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-white/45 leading-relaxed">
            <span className="text-white/70 font-medium">Recommendation: </span>
            {cta}
          </p>
        </div>
      )}
    </div>
  );
}
