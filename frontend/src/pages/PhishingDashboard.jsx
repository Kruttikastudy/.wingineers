import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar";
import SaaSStatCard from "../components/phishing/SaaSStatCard";
import DiagnosticReport from "../components/phishing/DiagnosticReport";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Activity,
  AlertTriangle,
  History,
  Info,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Globe,
  Lock,
  Zap,
  Loader2,
  Filter,
  X,
  RefreshCw,
  Terminal,
  MousePointer2,
  Bug,
  LayoutDashboard,
  Eye,
  Fingerprint,
  BarChart3,
  ListFilter,
  ArrowUpRight,
  AlertCircle,
  Database,
  Cpu,
  Server,
  Code2,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const RISK_LEVELS = {
  high_risk: {
    label: "Critical",
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  medium_risk: {
    label: "Suspicious",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    icon: <ShieldAlert className="w-4 h-4" />,
  },
  low_risk: {
    label: "Warning",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
    icon: <Info className="w-4 h-4" />,
  },
  safe: {
    label: "Safe",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    icon: <ShieldCheck className="w-4 h-4" />,
  },
};

function RiskGauge({ score }) {
  const percentage = Math.min(100, Math.max(0, score));
  const getColor = () => {
    if (score >= 70) return "stroke-red-500";
    if (score >= 40) return "stroke-amber-500";
    return "stroke-emerald-500";
  };

  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          className="stroke-slate-800"
          strokeWidth="8"
          fill="transparent"
          r="40"
          cx="50"
          cy="50"
        />
        <circle
          className={`${getColor()} transition-all duration-1000 ease-out`}
          strokeWidth="8"
          strokeDasharray={2 * Math.PI * 40}
          strokeDashoffset={2 * Math.PI * 40 * (1 - percentage / 100)}
          strokeLinecap="round"
          fill="transparent"
          r="40"
          cx="50"
          cy="50"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white leading-none">
          {score}
        </span>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
          Risk
        </span>
      </div>
    </div>
  );
}

export default function PhishingDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [threats, setThreats] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    today: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [testUrl, setTestUrl] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchThreats();
    const interval = setInterval(fetchThreats, 5000);
    return () => clearInterval(interval);
  }, [filter, search]);

  async function fetchThreats() {
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (filter !== "all") params.append("category", filter);
      if (search) params.append("search", search);

      const res = await fetch(`${API_BASE}/api/threats?${params}`);
      if (!res.ok) throw new Error("API Connection Failed");

      const data = await res.json();
      setThreats(data.threats || []);
      setStats(data.stats || stats);
      setError(null);
    } catch (err) {
      setError("Network error: Unable to connect to threat intelligence node.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTestUrl(e) {
    e.preventDefault();
    if (!testUrl.trim()) return;
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/analyze-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: testUrl }),
      });
      const data = await res.json();
      setTestResult(data);
      fetchThreats();
    } catch {
      setTestResult({ error: "Heuristic engine timeout." });
    } finally {
      setTesting(false);
    }
  }

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
            <span className="text-white/70">Phishing Analysis</span>
          </div>
          <div className="flex items-center gap-5">
            <div
              className="flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: "#10b981" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Intelligence Node Active
            </div>
            <div
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/50"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              v2.1.0-stable
            </div>
          </div>
        </header>

        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Dashboard Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
                  Phishing Investigation
                </h1>
                <p className="text-sm text-white/40">
                  Real-time heuristic analysis and malicious vector tracking for
                  distributed phishing attempts.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white hover:bg-slate-800 transition-colors flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Intelligence Report
                </button>
                <button className="px-5 py-2.5 rounded-xl bg-cyan-600 text-xs font-bold text-white hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-600/20">
                  Bulk Investigation
                </button>
              </div>
            </div>

            {/* SaaS Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <SaaSStatCard
                value={stats.total}
                label="Investigations"
                icon={Search}
                color="text-cyan-400"
                trend="+12.5%"
                trendType="up"
              />
              <SaaSStatCard
                value={stats.today}
                label="Active Intercepts"
                icon={Activity}
                color="text-slate-300"
                trend="+42"
                trendType="up"
              />
              <SaaSStatCard
                value={stats.highRisk}
                label="Gateway Blocks"
                icon={ShieldAlert}
                color="text-red-400"
                trend="+2.1%"
                trendType="up"
              />
              <SaaSStatCard
                value={
                  Math.round((stats.highRisk / (stats.total || 1)) * 100) + "%"
                }
                label="Threat Density"
                icon={Zap}
                color="text-amber-400"
              />
            </div>

            {/* Central Investigator Tool */}
            <div className="space-y-8">
              <section className="bg-[#111827] border border-slate-800 rounded-[2.5rem] p-8 lg:p-12 shadow-xl shadow-black/50">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-10">
                    <h2 className="text-2xl font-bold text-white mb-2 underline decoration-cyan-500/30 underline-offset-8">
                      Investigator Tool
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">
                      Input a suspect URL to initiate automated heuristic
                      diagnostic scanning.
                    </p>
                  </div>

                  <form
                    onSubmit={handleTestUrl}
                    className="flex gap-4 p-2 bg-slate-900 border border-slate-800 rounded-3xl mb-8 focus-within:border-cyan-500/50 transition-all"
                  >
                    <div className="relative flex-1">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <input
                        type="text"
                        value={testUrl}
                        onChange={(e) => setTestUrl(e.target.value)}
                        placeholder="https://example.com/login..."
                        className="w-full pl-12 pr-4 py-4 bg-transparent border-none focus:outline-none text-sm font-mono text-white placeholder:text-slate-700"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={testing || !testUrl}
                      className="px-8 py-4 bg-white text-black font-black rounded-2xl transition-all hover:bg-slate-200 active:scale-95 disabled:opacity-50 text-[11px] uppercase tracking-widest flex items-center gap-2"
                    >
                      {testing ?
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                      : "Investigate"}
                    </button>
                  </form>

                  {testResult && !testResult.error && (
                    <DiagnosticReport
                      result={testResult}
                      onClose={() => setTestResult(null)}
                      RiskGaugeComponent={RiskGauge}
                    />
                  )}
                </div>
              </section>

              {/* Activity Logs Table */}
              <section className="bg-[#111827] border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-xl shadow-black/50">
                <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-slate-800 rounded-lg">
                      <History className="w-4 h-4 text-slate-400" />
                    </div>
                    <h2 className="text-lg font-bold text-white">
                      Investigation History
                    </h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative flex items-center">
                      <Search className="absolute left-3 w-3.5 h-3.5 text-slate-600" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Filter URLs..."
                        className="pl-9 pr-4 py-1.5 bg-slate-900/50 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 placeholder:text-slate-700 focus:outline-none focus:border-cyan-500/30 w-48"
                      />
                    </div>
                    <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                      {["all", "high_risk", "medium_risk"].map((f) => (
                        <button
                          key={f}
                          onClick={() => setFilter(f)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all
                        ${filter === f ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}
                        >
                          {f === "all" ? "All" : f.split("_")[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/50 text-[10px] uppercase tracking-[0.2em] font-black text-slate-500">
                        <th className="px-8 py-4 border-b border-slate-800">
                          Timestamp
                        </th>
                        <th className="px-6 py-4 border-b border-slate-800">
                          Investigation Target
                        </th>
                        <th className="px-6 py-4 border-b border-slate-800">
                          Risk Profile
                        </th>
                        <th className="px-6 py-4 border-b border-slate-800">
                          Verdict
                        </th>
                        <th className="px-8 py-4 border-b border-slate-800 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {loading ?
                        <tr>
                          <td colSpan="5" className="px-8 py-20 text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-700 mx-auto mb-4" />
                            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                              Hydrating Intelligence Node...
                            </p>
                          </td>
                        </tr>
                      : threats.length === 0 ?
                        <tr>
                          <td colSpan="5" className="px-8 py-20 text-center">
                            <AlertCircle className="w-8 h-8 text-slate-800 mx-auto mb-4" />
                            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                              No matching investigations found
                            </p>
                          </td>
                        </tr>
                      : threats.map((threat) => {
                          const level =
                            RISK_LEVELS[threat.category] || RISK_LEVELS.safe;
                          return (
                            <tr
                              key={threat.id}
                              className="group hover:bg-slate-800/30 transition-colors"
                            >
                              <td className="px-8 py-5 whitespace-nowrap">
                                <span className="text-xs font-mono text-slate-500">
                                  {new Date(
                                    threat.timestamp,
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </span>
                                <span className="block text-[10px] text-slate-700 mt-1 font-mono">
                                  {new Date(
                                    threat.timestamp,
                                  ).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="px-6 py-5">
                                <p className="text-sm font-mono text-slate-300 truncate max-w-sm group-hover:text-white transition-colors">
                                  {threat.url}
                                </p>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex flex-col gap-1.5 font-mono">
                                  <div className="text-sm font-bold text-white">
                                    {threat.riskScore}
                                    <span className="text-[10px] text-slate-600 ml-1">
                                      IDX
                                    </span>
                                  </div>
                                  <div className="h-1 w-20 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        threat.riskScore >= 70 ? "bg-red-500"
                                        : threat.riskScore >= 40 ?
                                          "bg-amber-500"
                                        : "bg-emerald-500"
                                      }`}
                                      style={{ width: `${threat.riskScore}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${level.bg} ${level.color} ${level.border}`}
                                >
                                  {level.icon}
                                  {level.label}
                                </span>
                              </td>
                              <td className="px-8 py-5 text-right">
                                <button
                                  onClick={() => setSelectedThreat(threat)}
                                  className="p-2 hover:bg-slate-700 rounded-xl transition-all text-slate-500 hover:text-white"
                                >
                                  <ArrowUpRight className="w-5 h-5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      }
                    </tbody>
                  </table>
                </div>

                <div className="px-8 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                    Showing {threats.length} of {stats.total} total
                    investigations
                  </p>
                  <div className="flex gap-4">
                    <button className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors disabled:opacity-30">
                      Previous
                    </button>
                    <button className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors disabled:opacity-30">
                      Next
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

      {/* Detail Modal Overlay */}
      {selectedThreat && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
          <div className="max-w-4xl w-full">
            <DiagnosticReport
              result={{
                ...selectedThreat,
                safe: selectedThreat.riskScore < 40,
              }}
              onClose={() => setSelectedThreat(null)}
              RiskGaugeComponent={RiskGauge}
            />
          </div>
        </div>
      )}

      {/* Global Error Toast */}
      {error && (
        <div className="fixed bottom-8 right-8 z-[200] max-w-sm">
          <div className="bg-red-600 rounded-2xl p-4 border border-white/10 shadow-2xl flex items-center gap-4">
            <AlertCircle className="w-6 h-6 text-white shrink-0" />
            <p className="text-[12px] font-bold text-white">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Custom Icons for infrastructure
function Box(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.29 7 12 12 20.71 7"></polyline>
      <line x1="12" y1="22" x2="12" y2="12"></line>
    </svg>
  );
}
