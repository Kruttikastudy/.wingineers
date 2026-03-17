export default function StatCard({ value, label, icon: Icon, color }) {
  const getColorHex = (c) => {
    if (c.includes("red")) return "#ef4444";
    if (c.includes("amber")) return "#f59e0b";
    if (c.includes("emerald")) return "#10b981";
    if (c.includes("orange")) return "#f97316";
    if (c.includes("blue")) return "#3b82f6";
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
      <div
        className="p-2 rounded-lg mb-3 w-fit"
        style={{ background: `${accent}15` }}
      >
        <Icon className="w-4 h-4" style={{ color: accent }} />
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
