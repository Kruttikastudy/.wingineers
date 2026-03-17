export default function StatusRow({ label, value, dotColor }) {
  return (
    <div
      className="flex items-center justify-between py-2.5 border-b last:border-0"
      style={{ borderColor: "rgba(255,255,255,0.05)" }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: dotColor }}
        />
        <span className="text-xs text-white/50 font-medium">{label}</span>
      </div>
      <span className="text-xs font-semibold text-white">{value}</span>
    </div>
  );
}
