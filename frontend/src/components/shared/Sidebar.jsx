import { Link, useLocation } from "react-router-dom";
import {
  Shield,
  Globe,
  Mic2,
  Microscope,
  Sparkles,
  Mail,
  LayoutDashboard,
  LogOut,
  CreditCard,
  Clapperboard,
} from "lucide-react";

export default function Sidebar({ user, onLogout }) {
  const location = useLocation();

  const NAV = [
    { label: "Overview", icon: LayoutDashboard, to: "/dashboard" },
    { label: "Phishing", icon: Globe, to: "/dashboard/phishing" },
    { label: "Voice", icon: Mic2, to: "/dashboard/voice" },
    { label: "Email", icon: Mail, to: "/dashboard/email" },
    { label: "Deepfake", icon: Clapperboard, to: "/dashboard/deepfake" },
    { label: "XAI", icon: Microscope, to: "/dashboard/xai" },
    {
      label: "Prompt Guard",
      icon: Sparkles,
      to: "/dashboard/prompt-injection",
    },
    { label: "Mitigation", icon: Shield, to: "/mitigation" },
    { label: "Pricing", icon: CreditCard, to: "/pricing" },
  ];

  return (
    <aside
      className="fixed inset-y-0 left-0 w-[230px] flex flex-col z-50"
      style={{
        background: "#0d1117",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="flex items-center gap-3 px-5 py-5 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center p-1"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <img
            src="/assets/logo.png"
            alt="Cryptix Logo"
            className="w-full h-full object-contain"
          />
        </div>
        <div>
          <span className="text-white font-bold text-sm tracking-[0.15em]">
            CRYPTIX
          </span>
          <p className="text-[10px] text-cyan-400/50 font-black uppercase tracking-widest">
            Level 5 Security
          </p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest px-2 mb-3">
          Platform
        </p>
        {NAV.map(({ label, icon: Icon, to }) => {
          const active =
            location.pathname === to ||
            (to !== "/dashboard" && location.pathname.startsWith(to));
          return (
            <Link
              key={label}
              to={to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
              style={
                active ?
                  {
                    background: "rgba(59,130,246,0.12)",
                    color: "#60a5fa",
                    borderLeft: "2px solid #3b82f6",
                    paddingLeft: "10px",
                  }
                : { color: "rgba(255,255,255,0.45)" }
              }
            >
              <Icon
                className="w-4 h-4 shrink-0"
                style={active ? { color: "#60a5fa" } : {}}
              />
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
              )}
            </Link>
          );
        })}
      </nav>
      <div
        className="px-3 py-4 border-t space-y-1"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          {user?.picture ?
            <img src={user?.picture} alt="" className="w-7 h-7 rounded-full" />
          : <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold">
              {user?.email?.charAt(0)?.toUpperCase() || "U"}
            </div>
          }
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white/80 truncate">
              {user?.name || user?.email?.split("@")[0] || "User"}
            </p>
            <p className="text-[10px] text-white/30 truncate">
              {user?.email || "analyst"}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-white/30 hover:text-white/60 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
