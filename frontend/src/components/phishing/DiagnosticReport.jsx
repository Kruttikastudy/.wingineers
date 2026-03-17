import { X, Activity, Zap, ExternalLink, Info } from "lucide-react";

const RISK_LEVELS = {
  high_risk: {
    label: "Critical",
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
  },
  medium_risk: {
    label: "Suspicious",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  low_risk: {
    label: "Warning",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  safe: {
    label: "Safe",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
};

export default function DiagnosticReport({ result, onClose, RiskGaugeComponent }) {
  if (!result) return null;
  const level = RISK_LEVELS[result.category] || RISK_LEVELS.safe;

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500 shadow-2xl">
      <div className="p-8 lg:p-10">
        <div className="flex items-start justify-between mb-8 pb-8 border-b border-slate-800">
          <div className="flex gap-8">
            {RiskGaugeComponent && <RiskGaugeComponent score={result.riskScore} />}
            <div className="pt-2">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${level.bg} ${level.color} border ${level.border}`}
                >
                  {level.label}
                </span>
                <span className="text-xs font-medium text-slate-500 font-mono">
                  Analysis Confidence: {(result.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                Diagnostic Report
              </h3>
              <p className="text-sm font-mono text-slate-400 break-all max-w-xl bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                {result.url}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div>
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Activity className="w-3 h-3 text-cyan-400" />
              Heuristic Markers
            </h4>
            <div className="space-y-3">
              {result.reasons?.map((reason, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 bg-slate-900/50 border border-slate-800 rounded-xl group transition-colors hover:border-slate-700"
                >
                  <div
                    className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${result.safe ? "bg-emerald-500" : "bg-red-500"}`}
                  />
                  <p className="text-[13px] text-slate-300 font-medium leading-tight">
                    {reason}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Zap className="w-3 h-3 text-amber-400" />
                Quick Actions
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white hover:bg-slate-800 transition-all">
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Domain WHOIS
                </button>
                <button
                  className={`flex items-center justify-center gap-2 p-3.5 rounded-xl text-xs font-bold text-white transition-all
                  ${result.safe ? "bg-slate-900 border border-emerald-500/20 hover:bg-emerald-500/10" : "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20"}`}
                >
                  {result.safe ? "Add to Safe List" : "Block at Gateway"}
                </button>
              </div>
            </div>

            <div className="p-5 bg-cyan-950/20 border border-cyan-500/10 rounded-2xl">
              <h5 className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
                <Info className="w-3 h-3" />
                Security Advisory
              </h5>
              <p className="text-[12px] text-cyan-400/70 font-medium leading-relaxed italic">
                {result.safe
                  ? "Domain profile matches verified patterns. No immediate threat signature detected in payload entropy."
                  : "High entropy detected in URL encoding. Pattern aligns with known credential harvesting campaign vectors."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
