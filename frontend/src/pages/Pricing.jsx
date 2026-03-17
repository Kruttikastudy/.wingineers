import { useAuth } from "../context/AuthContext";
import { ChevronRight, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar";
import LandingPricing from "../components/shared/LandingPricing";

export default function Pricing() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "#080d14", fontFamily: "'Inter', sans-serif" }}
    >
      <Sidebar
        user={user}
        onLogout={() => {
          logout();
          navigate("/login");
        }}
      />

      <div className="flex-1 flex flex-col" style={{ marginLeft: "230px" }}>
        {/* Header */}
        <header
          className="flex items-center justify-between px-8 py-4 sticky top-0 z-40"
          style={{
            background: "rgba(8,13,20,0.8)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center gap-2 text-xs text-white/30 font-medium">
            <span>Platform</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/70">Pricing Plans</span>
          </div>
          <div className="flex items-center gap-5">
            <div
              className="flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: "#10b981" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Subscription Active
            </div>
          </div>
        </header>

        {/* Body */}
        <main className="flex-1 px-8 py-8 overflow-y-auto">
          <LandingPricing />
        </main>
      </div>
    </div>
  );
}
