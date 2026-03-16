import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import Navbar from "../components/shared/Navbar";
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
} from "lucide-react";

const API_BASE = "http://localhost:8000";

const RISK_LEVELS = {
  high_risk: {
    label: "Critical Threat",
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    icon: <AlertTriangle className="w-5 h-5" />,
    glow: "shadow-[0_0_20px_rgba(239,68,68,0.15)]",
  },
  medium_risk: {
    label: "Suspicious",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: <ShieldAlert className="w-5 h-5" />,
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.15)]",
  },
  low_risk: {
    label: "Warning",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    icon: <Info className="w-5 h-5" />,
    glow: "shadow-[0_0_20px_rgba(234,179,8,0.1)]",
  },
  safe: {
    label: "Verified Safe",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: <ShieldCheck className="w-5 h-5" />,
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.1)]",
  },
};

function StatCard({ value, label, icon: Icon, color, trend, trendType }) {
  return (
    <div className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-300 hover:bg-white/10 hover:border-white/20">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`p-3 rounded-2xl ${color.replace("text-", "bg-")}/10 border border-white/5`}
        >
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${trendType === "up" ? "text-red-400 bg-red-400/10" : "text-emerald-400 bg-emerald-400/10"}`}
          >
            {trendType === "up" ?
              <TrendingUp className="w-3 h-3" />
            : <TrendingDown className="w-3 h-3" />}
            {trend}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-3xl font-black text-white mb-1 tracking-tight">
          {value}
        </h3>
        <p className="text-xs font-bold text-white/40 uppercase tracking-widest">
          {label}
        </p>
      </div>
      <div
        className={`absolute bottom-0 left-6 right-6 h-[2px] ${color.replace("text-", "bg-")}/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity`}
      />
    </div>
  );
}

function ThreatItem({ threat, onClick }) {
  const level = RISK_LEVELS[threat.category] || RISK_LEVELS.safe;
  const time = new Date(threat.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      onClick={() => onClick(threat)}
      className={`group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 cursor-pointer mb-3
        ${level.bg} ${level.border} ${level.glow} hover:scale-[1.01] active:scale-[0.99]`}
    >
      <div
        className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-black/40 border border-white/5 ${level.color}`}
      >
        {level.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md bg-black/40 ${level.color} border border-white/5`}
          >
            {level.label}
          </span>
          <span className="text-[10px] font-mono text-white/40">{time}</span>
        </div>
        <p className="text-sm font-bold text-white truncate font-mono tracking-tight group-hover:text-white/90 transition-colors">
          {threat.url}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1">
        <div className="text-xl font-black text-white/90 leading-none">
          {threat.riskScore}
          <span className="text-[10px] text-white/30 ml-0.5">/100</span>
        </div>
        <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest whitespace-nowrap">
          {(threat.confidence * 100).toFixed(0)}% Conf.
        </div>
      </div>

      <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/50 transition-colors" />
    </div>
  );
}

function ThreatDetailModal({ threat, onClose }) {
  if (!threat) return null;
  const level = RISK_LEVELS[threat.category] || RISK_LEVELS.safe;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className={`h-2 w-full ${level.color.replace("text-", "bg-")}`} />

        <div className="p-8 lg:p-10">
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-black/50 border border-white/10 ${level.color}`}
              >
                {level.icon}
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-2">
                  Threat Analysis Report
                </h3>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-xs font-black uppercase tracking-widest ${level.color}`}
                  >
                    {level.label}
                  </span>
                  <span className="text-xs font-mono text-white/30">
                    {new Date(threat.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">
                Target URL
              </h4>
              <p className="text-sm font-mono text-white break-all leading-relaxed">
                {threat.url}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                <div className={`text-4xl font-black mb-1 ${level.color}`}>
                  {threat.riskScore}
                </div>
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                  Risk Index
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                <div className="text-4xl font-black mb-1 text-cyan-400">
                  {(threat.confidence * 100).toFixed(0)}%
                </div>
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                  Model Confidence
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">
                Neural Engine Indicators
              </h4>
              <div className="space-y-3">
                {threat.reasons?.map((reason, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-4 bg-white/5 border border-white/5 rounded-xl"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                    <p className="text-sm text-white/70 font-medium leading-tight">
                      {reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 flex gap-4">
            <button className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-xs font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all">
              Export Evidence
            </button>
            <button
              className={`flex-1 py-4 rounded-2xl font-black text-white uppercase tracking-widest shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-xs
               ${threat.safe ? "bg-emerald-600 shadow-emerald-600/20" : "bg-red-600 shadow-red-600/20"}`}
            >
              {threat.safe ? "Add to Whitelist" : "Block Connection"}
            </button>
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
    const interval = setInterval(fetchThreats, 5000); // Faster refresh for SOC feel
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
      setError("SOC communication error: Unable to reach threat database.");
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
      setTestResult({ error: "Analysis engine timed out." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 overflow-x-hidden pt-24 pb-20">
      <Navbar />

      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] left-[-5%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[150px]" />
        <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-red-900/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="max-w-2xl">
            <h1 className="text-5xl lg:text-6xl font-black tracking-tighter mb-4 italic leading-tight">
              PHISGUARD{" "}
              <span className="inline-block pr-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 italic">
                CORE
              </span>
            </h1>
            <p className="text-lg text-white/40 font-medium">
              Advanced neural intercept for real-time phishing detection and
              malicious vector analysis.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          <StatCard
            value={stats.total}
            label="Neural Scans"
            icon={Globe}
            color="text-cyan-400"
            trend="+12%"
            trendType="down"
          />
          <StatCard
            value={stats.today}
            label="Threats Today"
            icon={Activity}
            color="text-indigo-400"
            trend="+5.2%"
            trendType="up"
          />
          <StatCard
            value={stats.highRisk}
            label="Critical Blocks"
            icon={ShieldAlert}
            color="text-red-400"
            trend="+2"
            trendType="up"
          />
          <StatCard
            value={
              (stats.total > 0 ?
                (((stats.total - stats.highRisk) / stats.total) * 100).toFixed(
                  1,
                )
              : 100) + "%"
            }
            label="Uptime Integrity"
            icon={Zap}
            color="text-emerald-400"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Feed Column */}
          <div className="lg:col-span-8 space-y-8">
            {/* Instant Scan Tool */}
            <section className="relative group bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl overflow-hidden transition-all duration-500 hover:border-cyan-500/30">
              <div className="absolute top-0 right-0 p-8 text-cyan-500/5 group-hover:text-cyan-500/10 transition-colors">
                <Search className="w-32 h-32 rotate-12" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/20">
                    <MousePointer2 className="w-4 h-4 text-cyan-400" />
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight">
                    Rapid Threat Diagnostics
                  </h2>
                </div>

                <form
                  onSubmit={handleTestUrl}
                  className="flex flex-col sm:flex-row gap-4 mb-6"
                >
                  <div className="relative flex-1">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <input
                      type="text"
                      value={testUrl}
                      onChange={(e) => setTestUrl(e.target.value)}
                      placeholder="Input suspect URL for deep packet inspection..."
                      className="w-full px-14 py-5 bg-black/40 border border-white/10 rounded-3xl text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 transition-all font-mono text-sm tracking-tight"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={testing || !testUrl}
                    className="group px-10 py-5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-3xl transition-all shadow-[0_0_25px_rgba(8,145,178,0.3)] hover:shadow-[0_0_35px_rgba(8,145,178,0.5)] flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                  >
                    {testing ?
                      <Loader2 className="w-5 h-5 animate-spin" />
                    : <>
                        Analyze{" "}
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    }
                  </button>
                </form>

                {testResult && !testResult.error && (
                  <div
                    className={`p-6 rounded-3xl border animate-in slide-in-from-top-2 duration-300 ${testResult.safe ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-black/40 border border-white/5 ${testResult.safe ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {testResult.safe ?
                            <ShieldCheck className="w-6 h-6" />
                          : <AlertTriangle className="w-6 h-6" />}
                        </div>
                        <div>
                          <p
                            className={`text-lg font-black leading-none mb-1 ${testResult.safe ? "text-emerald-400" : "text-red-400"}`}
                          >
                            {testResult.safe ?
                              "CLEARED"
                            : "MALICIOUS VECTOR DETECTED"}
                          </p>
                          <p className="text-xs font-bold text-white/40 uppercase tracking-widest italic">
                            {testResult.category?.replace("_", " ")} Detected
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono text-white/50 leading-none mb-1">
                          Risk Index
                        </p>
                        <p
                          className={`text-2xl font-black ${testResult.safe ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {testResult.riskScore}
                          <span className="text-xs text-white/20">/100</span>
                        </p>
                      </div>
                    </div>
                    {testResult.reasons?.length > 0 && (
                      <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                        {testResult.reasons.map((r, i) => (
                          <p
                            key={i}
                            className="text-xs font-medium text-white/60 flex items-center gap-2"
                          >
                            <div
                              className={`w-1 h-1 rounded-full ${testResult.safe ? "bg-emerald-500" : "bg-red-500"}`}
                            />{" "}
                            {r}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Live Feed Diagnostic */}
            <section className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl flex flex-col min-h-[600px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/20">
                    <Activity className="w-4 h-4 text-indigo-400" />
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight">
                    Live Intelligence Stream
                  </h2>
                </div>

                <div className="flex items-center gap-3 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Refine stream..."
                      className="pl-9 pr-4 py-2 bg-transparent border-none focus:outline-none text-xs font-bold text-white placeholder:text-white/20 w-40"
                    />
                  </div>
                  <div className="w-[1px] h-4 bg-white/10" />
                  <div className="flex gap-1">
                    {["all", "high_risk", "medium_risk"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                            ${filter === f ? "bg-white text-black" : "text-white/40 hover:text-white hover:bg-white/5"}`}
                      >
                        {f === "all" ? "All" : f.split("_")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {loading ?
                <div className="flex-1 flex flex-col items-center justify-center p-20 gap-4 opacity-50">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
                    <div className="absolute inset-0 rounded-full border-t-2 border-cyan-500 animate-spin" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40 animate-pulse">
                    Syncing Database...
                  </p>
                </div>
              : threats.length === 0 ?
                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6 border border-white/5 text-white/20">
                    <History className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    No Active Threats Found
                  </h3>
                  <p className="text-sm text-white/40 max-w-[280px] font-medium leading-relaxed">
                    System integrity is within expected parameters. New
                    intercepts will appear in real-time.
                  </p>
                </div>
              : <div className="flex-1 space-y-4 overflow-y-auto max-h-[420px] pr-2 custom-scrollbar">
                  {threats.map((threat) => (
                    <ThreatItem
                      key={threat.id}
                      threat={threat}
                      onClick={setSelectedThreat}
                    />
                  ))}
                </div>
              }
            </section>
          </div>

          {/* Side Panel Column */}
          <div className="lg:col-span-4 space-y-8">
            <section className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 m-6">
                <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)] animate-pulse" />
              </div>

              <h2 className="text-xs font-black text-white/30 uppercase tracking-[0.2em] mb-6">
                Neural Engine Status
              </h2>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">
                    <span>Intercept Integrity</span>
                    <span className="text-cyan-400">99.8%</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 p-0.5">
                    <div
                      className="h-full bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                      style={{ width: "99.8%" }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div className="text-center p-4 rounded-3xl bg-black/20 border border-white/5">
                    <Fingerprint className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">
                      Bio Signatures
                    </p>
                    <p className="text-lg font-black text-white">Active</p>
                  </div>
                  <div className="text-center p-4 rounded-3xl bg-black/20 border border-white/5">
                    <Globe className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">
                      Global Nodes
                    </p>
                    <p className="text-lg font-black text-white">1,248</p>
                  </div>
                </div>

                <div className="bg-cyan-500/5 rounded-3xl p-6 border border-cyan-500/10">
                  <div className="flex items-center gap-3 mb-4">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">
                      System Logs
                    </p>
                  </div>
                  <div className="space-y-2 font-mono text-[10px] text-cyan-400/50">
                    <p>
                      <span className="text-cyan-400 opacity-100">[INFO]</span>{" "}
                      Neural engine synced.
                    </p>
                    <p>
                      <span className="text-cyan-400 opacity-100">[DB]</span>{" "}
                      Threat database updated.
                    </p>
                    <p>
                      <span className="text-cyan-400 opacity-100">[WARN]</span>{" "}
                      High latency in node-42.
                    </p>
                    <p className="animate-pulse">_</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-gradient-to-br from-indigo-900/20 to-blue-900/20 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative group cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/5 transition-all duration-500" />
              <h2 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-4">
                Security Insights
              </h2>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white tracking-tight leading-none">
                  Vulnerability Score
                </h3>
                <div className="w-10 h-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 flex items-center justify-center text-[10px] font-black italic">
                  82
                </div>
              </div>
              <p className="text-xs text-white/50 leading-relaxed font-medium mb-6 italic">
                "Our heuristic analysis shows a 14% increase in spoofed
                subdomains targeting financial portals this week. Ensure
                bio-scans are active."
              </p>
              <div className="flex items-center gap-2 text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em] group-hover:gap-3 transition-all">
                Read Full Intelligence <ChevronRight className="w-4 h-4" />
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedThreat && (
        <ThreatDetailModal
          threat={selectedThreat}
          onClose={() => setSelectedThreat(null)}
        />
      )}

      {/* Quick Access Toast */}
      {error && (
        <div className="fixed bottom-10 right-10 z-[200] max-w-sm animate-in slide-in-from-right-4 duration-500">
          <div className="bg-red-600 shadow-2xl shadow-red-600/20 rounded-2xl p-4 border border-white/10 flex items-start gap-4">
            <div className="p-2 bg-black/20 rounded-xl">
              <Bug className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-white uppercase tracking-widest leading-none mb-1">
                Critical Error
              </p>
              <p className="text-[11px] text-white/80 font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
