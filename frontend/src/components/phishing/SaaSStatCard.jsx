import { TrendingUp, TrendingDown } from "lucide-react";

export default function SaaSStatCard({ value, label, icon: Icon, color, trend, trendType }) {
  const getColorHex = (c) => {
    if (c.includes("red")) return "#ef4444";
    if (c.includes("blue")) return "#3b82f6";
    if (c.includes("emerald")) return "#10b981";
    if (c.includes("amber")) return "#f59e0b";
    return "#3b82f6";
  };
  const accent = getColorHex(color);

  return (
    <div
      className="relative rounded-xl p-5 overflow-hidden"
      style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full"
        style={{ background: accent }}
      />

      <div className="flex justify-between items-start mb-3">
        <div
          className="p-2 rounded-lg w-fit"
          style={{ background: `${accent}15` }}
        >
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>

        {trend && (
          <div
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md"
            style={{
              color: trendType === "up" ? "#ef4444" : "#10b981",
              background:
                trendType === "up"
                  ? "rgba(239,68,68,0.1)"
                  : "rgba(16,185,129,0.1)",
            }}
          >
            {trend}
            {trendType === "up" ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
          </div>
        )}
      </div>

      <p className="text-2xl font-bold text-white tracking-tight mb-0.5">
        {value}
      </p>
      <p className="text-[11px] font-medium uppercase tracking-widest text-white/35">
        {label}
      </p>
    </div>
  );
}
