const CATEGORY_CONFIG = {
  role_manipulation: {
    icon: "🎭",
    color: "#a78bfa",
    label: "Role Manipulation",
    desc: "Overrides system instructions or persona",
  },
  information_extraction: {
    icon: "🔓",
    color: "#f59e0b",
    label: "Info Extraction",
    desc: "Leaks system prompts or internal data",
  },
  jailbreaking: {
    icon: "⛓️",
    color: "#ef4444",
    label: "Jailbreaking",
    desc: "Bypasses safety filters and restrictions",
  },
  encoding_tricks: {
    icon: "🔐",
    color: "#06b6d4",
    label: "Encoding Tricks",
    desc: "Hides payloads via obfuscation",
  },
  command_injection: {
    icon: "💉",
    color: "#f97316",
    label: "Command Injection",
    desc: "Embeds code, SQL, or shell commands",
  },
};

export default function PatternCard({ pattern }) {
  const cat = CATEGORY_CONFIG[pattern.category] || {};
  const sev = pattern.severity || 0;
  const sevColor =
    sev >= 8 ? "#ef4444"
    : sev >= 5 ? "#f59e0b"
    : "#eab308";

  return (
    <div
      className="p-4 rounded-lg transition-all"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${cat.color || "#ffffff"}18`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="p-2 rounded-lg shrink-0 text-base"
          style={{ background: `${cat.color || "#ffffff"}12` }}
        >
          {cat.icon || "🛡️"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h4 className="text-xs font-semibold text-white">
              {pattern.name
                ?.replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())}
            </h4>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
              style={{
                background: `${cat.color || "#ffffff"}12`,
                color: cat.color || "#ffffff",
              }}
            >
              {pattern.category_label || cat.label}
            </span>
          </div>

          {/* Severity dots */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-white/30 font-medium uppercase tracking-wider">
              Severity
            </span>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: i <= sev ? sevColor : "rgba(255,255,255,0.1)",
                }}
              />
            ))}
          </div>

          <p className="text-[11px] text-white/40 leading-snug">
            {pattern.description || cat.desc}
          </p>
        </div>
      </div>
    </div>
  );
}
