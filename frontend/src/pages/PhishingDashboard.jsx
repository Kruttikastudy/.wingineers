import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const API_BASE = "http://localhost:8000";

const CATEGORY_COLORS = {
  high_risk: {
    bg: "bg-red-500/15",
    border: "border-red-500/30",
    text: "text-red-400",
    badge: "bg-red-500/20 text-red-300",
  },
  medium_risk: {
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
    text: "text-amber-400",
    badge: "bg-amber-500/20 text-amber-300",
  },
  low_risk: {
    bg: "bg-yellow-500/15",
    border: "border-yellow-500/30",
    text: "text-yellow-400",
    badge: "bg-yellow-500/20 text-yellow-300",
  },
  safe: {
    bg: "bg-green-500/15",
    border: "border-green-500/30",
    text: "text-green-400",
    badge: "bg-green-500/20 text-green-300",
  },
};

function RiskBadge({ score, category }) {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.safe;
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${colors.badge}`}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          score >= 70 ? "bg-red-400"
          : score >= 40 ? "bg-amber-400"
          : "bg-green-400"
        }`}
      />
      {score}/100
    </div>
  );
}

function StatCard({ value, label, color, icon }) {
  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className={`text-3xl font-black ${color}`}>{value}</span>
      </div>
      <p className="text-white/50 text-sm font-semibold">{label}</p>
    </div>
  );
}

function ThreatRow({ threat, onClick }) {
  const colors = CATEGORY_COLORS[threat.category] || CATEGORY_COLORS.safe;
  const time = new Date(threat.timestamp).toLocaleString();

  return (
    <div
      onClick={() => onClick(threat)}
      className={`${colors.bg} border ${colors.border} rounded-xl p-4 cursor-pointer hover:scale-[1.01] transition-all duration-200 mb-3`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate mb-1">
            {threat.url}
          </p>
          <p className="text-white/40 text-xs">{time}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <RiskBadge score={threat.riskScore} category={threat.category} />
          <div className="text-white/30 text-xs font-mono">
            {(threat.confidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>
      {threat.reasons?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {threat.reasons.slice(0, 2).map((r, i) => (
            <span
              key={i}
              className="text-white/50 text-xs bg-white/5 px-2 py-0.5 rounded-md"
            >
              {r.length > 60 ? r.substring(0, 60) + "…" : r}
            </span>
          ))}
          {threat.reasons.length > 2 && (
            <span className="text-white/30 text-xs bg-white/5 px-2 py-0.5 rounded-md">
              +{threat.reasons.length - 2} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ThreatDetail({ threat, onClose }) {
  if (!threat) return null;
  const colors = CATEGORY_COLORS[threat.category] || CATEGORY_COLORS.safe;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-white">Threat Details</h3>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-xl font-bold"
          >
            ✕
          </button>
        </div>

        <div
          className={`${colors.bg} border ${colors.border} rounded-xl p-4 mb-4`}
        >
          <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">
            URL
          </p>
          <p className="text-white font-mono text-sm break-all">{threat.url}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <p className={`text-2xl font-black ${colors.text}`}>
              {threat.riskScore}
            </p>
            <p className="text-white/40 text-xs font-semibold">Risk Score</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-black text-blue-400">
              {(threat.confidence * 100).toFixed(0)}%
            </p>
            <p className="text-white/40 text-xs font-semibold">Confidence</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <p className={`text-sm font-black ${colors.text} capitalize`}>
              {threat.category?.replace("_", " ")}
            </p>
            <p className="text-white/40 text-xs font-semibold mt-1">Category</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-3">
            Why this was flagged
          </p>
          <div className="space-y-2">
            {threat.reasons?.map((reason, i) => (
              <div
                key={i}
                className="flex items-start gap-2 bg-slate-800/30 rounded-lg p-3"
              >
                <span className="text-red-400 text-xs mt-0.5 flex-shrink-0">
                  ⚠
                </span>
                <p className="text-white/70 text-sm">{reason}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-xs">
          Detected: {new Date(threat.timestamp).toLocaleString()}
        </p>
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
    const interval = setInterval(fetchThreats, 10000);
    return () => clearInterval(interval);
  }, [filter, search]);

  async function fetchThreats() {
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filter !== "all") params.append("category", filter);
      if (search) params.append("search", search);

      const res = await fetch(`${API_BASE}/api/threats?${params}`);
      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      setThreats(data.threats || []);
      setStats(data.stats || stats);
      setError(null);
    } catch (err) {
      setError(
        "Cannot connect to PhishGuard API. Make sure the backend is running on port 8000.",
      );
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
      setTestResult({ error: "Failed to analyze URL" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🛡️</span>
              <h1 className="text-3xl font-black text-white">
                Phish<span className="text-blue-400">Guard</span> Dashboard
              </h1>
            </div>
            <p className="text-white/50 font-medium">
              Real-time phishing threat monitoring and URL analysis
            </p>
          </div>
          <Link
            to="/login"
            className="px-5 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-white/70 hover:text-white font-bold rounded-lg transition-colors text-sm"
          >
            ← Back to Profile
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            value={stats.total}
            label="Total Threats"
            color="text-blue-400"
            icon="🎯"
          />
          <StatCard
            value={stats.today}
            label="Detected Today"
            color="text-purple-400"
            icon="📅"
          />
          <StatCard
            value={stats.highRisk}
            label="High Risk"
            color="text-red-400"
            icon="🔴"
          />
          <StatCard
            value={stats.mediumRisk}
            label="Medium Risk"
            color="text-amber-400"
            icon="🟡"
          />
        </div>

        {/* Test URL Form */}
        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 mb-6 backdrop-blur-sm">
          <h2 className="text-lg font-black text-white mb-4">🔍 Test a URL</h2>
          <form onSubmit={handleTestUrl} className="flex gap-3">
            <input
              type="text"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="Enter a URL to analyze (e.g. http://suspicious-site.tk/login)"
              className="flex-1 px-4 py-3 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 font-mono text-sm"
            />
            <button
              type="submit"
              disabled={testing}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-bold rounded-xl transition-colors whitespace-nowrap"
            >
              {testing ? "Analyzing..." : "Analyze"}
            </button>
          </form>

          {testResult && !testResult.error && (
            <div
              className={`mt-4 p-4 rounded-xl border ${
                testResult.safe ?
                  "bg-green-500/10 border-green-500/30"
                : "bg-red-500/10 border-red-500/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`font-bold ${testResult.safe ? "text-green-400" : "text-red-400"}`}
                >
                  {testResult.safe ?
                    "✅ URL appears safe"
                  : "⚠️ Potential phishing detected!"}
                </span>
                <RiskBadge
                  score={testResult.riskScore}
                  category={testResult.category}
                />
              </div>
              {testResult.reasons?.length > 0 && (
                <div className="mt-2 space-y-1">
                  {testResult.reasons.map((r, i) => (
                    <p key={i} className="text-white/60 text-sm">
                      • {r}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
          {testResult?.error && (
            <p className="mt-3 text-red-400 text-sm">{testResult.error}</p>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search URLs..."
            className="flex-1 px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 text-sm"
          />
          <div className="flex gap-2">
            {["all", "high_risk", "medium_risk", "low_risk"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                  filter === f ?
                    "bg-blue-600 text-white"
                  : "bg-slate-800/50 border border-white/10 text-white/50 hover:text-white"
                }`}
              >
                {f === "all" ?
                  "All"
                : f.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-400 font-bold text-sm">⚠️ {error}</p>
            <p className="text-white/40 text-xs mt-1">
              Run: cd .wingineers/backend && npm start
            </p>
          </div>
        )}

        {/* Threat List */}
        <div className="mb-4">
          <h2 className="text-lg font-black text-white mb-4">
            📋 Detected Threats ({threats.length})
          </h2>

          {loading ?
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-400 border-t-transparent" />
              <p className="mt-3 text-white/40 font-medium">
                Loading threats...
              </p>
            </div>
          : threats.length === 0 ?
            <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-white/5">
              <p className="text-4xl mb-3">🛡️</p>
              <p className="text-white/60 font-bold">No threats detected yet</p>
              <p className="text-white/30 text-sm mt-1">
                Threats will appear here when the browser extension detects
                suspicious links.
                <br />
                Try testing a URL above!
              </p>
            </div>
          : <div>
              {threats.map((threat) => (
                <ThreatRow
                  key={threat.id}
                  threat={threat}
                  onClick={setSelectedThreat}
                />
              ))}
            </div>
          }
        </div>
      </div>

      {/* Threat Detail Modal */}
      {selectedThreat && (
        <ThreatDetail
          threat={selectedThreat}
          onClose={() => setSelectedThreat(null)}
        />
      )}
    </div>
  );
}
