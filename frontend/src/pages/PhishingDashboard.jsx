import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import Navbar from "../components/shared/Navbar";
import phishingBg from "../assets/phising.avif";
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

const API_BASE = "http://localhost:8000";

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

function SaaSStatCard({ value, label, icon: Icon, color, trend, trendType }) {
  return (
    <div className="bg-[#1e293b]/50 border border-slate-800 rounded-2xl p-6 transition-all duration-200 hover:bg-[#1e293b]/80">
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">
          {label}
        </p>
        {trend && (
          <div
            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${trendType === "up" ? "text-red-400 bg-red-400/10" : "text-emerald-400 bg-emerald-400/10"}`}
          >
            {trend}
            {trendType === "up" ?
              <TrendingUp className="w-3 h-3" />
            : <TrendingDown className="w-3 h-3" />}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Icon className={`w-6 h-6 ${color}`} />
        <h3 className="text-3xl font-bold text-white tracking-tight leading-none">
          {value}
        </h3>
      </div>
    </div>
  );
}

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

function DiagnosticReport({ result, onClose }) {
  if (!result) return null;
  const level = RISK_LEVELS[result.category] || RISK_LEVELS.safe;

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500 shadow-2xl">
      <div className="p-8 lg:p-10">
        <div className="flex items-start justify-between mb-8 pb-8 border-b border-slate-800">
          <div className="flex gap-8">
            <RiskGauge score={result.riskScore} />
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
                {result.safe ?
                  "Domain profile matches verified patterns. No immediate threat signature detected in payload entropy."
                : "High entropy detected in URL encoding. Pattern aligns with known credential harvesting campaign vectors."
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PhishingDashboard() {
  const { user } = useAuth();
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
    <div className="relative min-h-screen w-full font-sans text-slate-200 selection:bg-cyan-500/30 overflow-x-hidden">
      <Navbar />

      {/* Background Image Layer */}
      <div
        className="fixed inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: `url(${phishingBg})` }}
      >
        <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-md" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-20">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center gap-2 mb-8 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          <Link to="/" className="hover:text-cyan-400 transition-colors">
            Protect
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-300">Phishing Investigation</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-slate-400 font-mono uppercase">
              System: Healthy / 12 Nodes Online
            </span>
          </div>
        </div>

        {/* Dashboard Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-2">
              Threat Intelligence
            </h1>
            <p className="text-slate-400 font-medium max-w-xl">
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
                  Input a suspect URL to initiate automated heuristic diagnostic
                  scanning.
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
                              {new Date(threat.timestamp).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                },
                              )}
                            </span>
                            <span className="block text-[10px] text-slate-700 mt-1 font-mono">
                              {new Date(threat.timestamp).toLocaleDateString()}
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
                                    : threat.riskScore >= 40 ? "bg-amber-500"
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
                Showing {threats.length} of {stats.total} total investigations
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
      </main>

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
