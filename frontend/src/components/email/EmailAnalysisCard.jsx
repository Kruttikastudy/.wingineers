import { X, Zap } from "lucide-react";

export default function EmailAnalysisCard({ result, onClose }) {
  if (!result) return null;

  const riskLevel =
    result.risk_score >= 70
      ? "Critical"
      : result.risk_score >= 40
        ? "Suspicious"
        : result.risk_score >= 20
          ? "Warning"
          : "Safe";

  const riskColor =
    result.risk_score >= 70
      ? "#ef4444"
      : result.risk_score >= 40
        ? "#f97316"
        : result.risk_score >= 20
          ? "#f59e0b"
          : "#10b981";

  return (
    <div
      className="rounded-xl p-6"
      style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-start justify-between mb-5 pb-5 border-b border-white/10">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider"
              style={{
                background: `${riskColor}15`,
                color: riskColor,
                border: `1px solid ${riskColor}25`,
              }}
            >
              {riskLevel}
            </span>
            <span
              className="text-xs font-semibold"
              style={{ color: riskColor }}
            >
              Risk Score: {result.risk_score}/100
            </span>
          </div>
          <p className="text-sm font-mono text-white/60 truncate">
            From: {result.sender || "Unknown"}
          </p>
          <p className="text-sm font-semibold text-white mt-1">
            {result.subject || "No Subject"}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded text-white/25 hover:text-white/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Detection Reasons */}
      <div className="mb-5">
        <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
          Detection Findings
        </h4>
        <div className="space-y-2">
          {result.findings?.length > 0 ? (
            result.findings.map((finding, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-2.5 rounded-lg"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                  style={{ background: riskColor }}
                />
                <p className="text-xs text-white/70">{finding}</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-white/40">No specific findings</p>
          )}
        </div>
      </div>

      {/* Recommendation */}
      {result.recommendation && (
        <div
          className="flex items-start gap-2 p-3 rounded-lg mb-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-white/45 leading-relaxed">
            <span className="text-white/70 font-medium">Recommendation: </span>
            {result.recommendation}
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          Report Spam
        </button>
        <button
          className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all"
          style={{
            background: riskColor + "15",
            border: "1px solid " + riskColor + "25",
            color: riskColor,
          }}
        >
          {result.risk_score >= 40 ? "Block Sender" : "Whitelist"}
        </button>
      </div>
    </div>
  );
}
