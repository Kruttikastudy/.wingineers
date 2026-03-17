import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Shield,
  Brain,
  Search,
  ChevronRight,
  Loader2,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  Zap,
  Eye,
  Target,
  Globe,
  Mic2,
  Sparkles,
  LayoutDashboard,
  Microscope,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Send,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar";
import MetricCard from "../components/dashboard/MetricCard";
import TokenHeatmap from "../components/xai/TokenHeatmap";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";


/* ─── Risk Gauge ──────────────────────────────────────── */
function RiskGauge({ score }) {
  const cfg =
    score >= 70 ? { color: "#ef4444", label: "High Risk", glow: "#ef444440" }
    : score >= 40 ? { color: "#f97316", label: "Elevated", glow: "#f9731640" }
    : score >= 20 ? { color: "#f59e0b", label: "Moderate", glow: "#f59e0b40" }
    : { color: "#10b981", label: "Low Risk", glow: "#10b98140" };

  const r = 46,
    circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative"
        style={{ filter: `drop-shadow(0 0 10px ${cfg.glow})` }}
      >
        <svg width="120" height="120" className="-rotate-90">
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="7"
          />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={cfg.color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white leading-none">
            {Math.round(score)}
          </span>
          <span className="text-[9px] text-white/30 font-medium">/100</span>
        </div>
      </div>
      <span
        className="text-[10px] font-semibold px-3 py-1 rounded-full"
        style={{
          background: `${cfg.color}15`,
          color: cfg.color,
          border: `1px solid ${cfg.color}25`,
        }}
      >
        {cfg.label}
      </span>
    </div>
  );
}


/* ─── Activity Bar Chart ──────────────────────────────── */
function ActivityTimeline({ dailyTrend }) {
  const max = Math.max(...(dailyTrend?.map((d) => d.avg_score) || [0]), 1);

  return (
    <div
      className="rounded-xl p-6"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #111827 60%, #0c1528 100%)",
        border: "1px solid rgba(99,102,241,0.15)",
      }}
    >
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 className="w-4 h-4" style={{ color: "#818cf8" }} />
        <h3 className="text-sm font-semibold text-white">Activity Timeline</h3>
        <span
          className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8" }}
        >
          {dailyTrend?.length || 0} days
        </span>
      </div>

      {dailyTrend?.length > 0 ?
        <div className="h-28 w-full -ml-4 mt-4 relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrend}>
              <defs>
                <linearGradient
                  id="colorAvgScoreXai"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(255,255,255,0.04)"
              />
              <XAxis
                dataKey="date"
                tickFormatter={(val) => val.slice(5)}
                stroke="rgba(255,255,255,0.1)"
                tick={{
                  fill: "rgba(255,255,255,0.3)",
                  fontSize: 10,
                  fontFamily: "monospace",
                }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                stroke="rgba(255,255,255,0.1)"
                tick={{
                  fill: "rgba(255,255,255,0.3)",
                  fontSize: 10,
                  fontFamily: "monospace",
                }}
                axisLine={false}
                tickLine={false}
                domain={[
                  0,
                  Math.max(...dailyTrend.map((d) => d.avg_score || 0), 10),
                ]}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div
                        className="px-3 py-2 rounded-lg text-[10px] whitespace-nowrap text-white"
                        style={{
                          background: "#0d1117",
                          border: "1px solid rgba(99,102,241,0.3)",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                        }}
                      >
                        <div className="font-semibold mb-1 text-indigo-300">
                          {data.date}
                        </div>
                        <div className="text-white/50">
                          Avg risk:{" "}
                          <span className="text-white font-medium">
                            {Math.round(data.avg_score || 0)}
                          </span>
                        </div>
                        <div className="text-white/50">
                          {data.scan_count || 0} scan
                          {data.scan_count !== 1 ? "s" : ""}
                        </div>
                        <div className="text-white/50">
                          {data.threat_count || 0} threat
                          {data.threat_count !== 1 ? "s" : ""}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="avg_score"
                stroke="#818cf8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorAvgScoreXai)"
                activeDot={{
                  r: 4,
                  fill: "#0d1117",
                  stroke: "#818cf8",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      : <div className="py-8 text-center text-xs text-white/25">
          No timeline data yet — start scanning URLs to build history.
        </div>
      }
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────── */
export default function XAIDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [feedbackStats, setFeedbackStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [testUrl, setTestUrl] = useState("");
  const [explaining, setExplaining] = useState(false);
  const [xaiResult, setXaiResult] = useState(null);
  const [error, setError] = useState(null);

  const userId = "browser_default";

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 10000);
    return () => clearInterval(iv);
  }, []);

  async function fetchData() {
    try {
      const [profileRes, feedbackRes] = await Promise.all([
        fetch(`${API_BASE}/api/xai/user-profile/${userId}`).then((r) =>
          r.ok ? r.json() : null,
        ),
        fetch(`${API_BASE}/api/xai/feedback/stats`).then((r) =>
          r.ok ? r.json() : null,
        ),
      ]);
      if (profileRes) setProfile(profileRes);
      if (feedbackRes) setFeedbackStats(feedbackRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleExplain(e) {
    e.preventDefault();
    if (!testUrl.trim()) return;
    setExplaining(true);
    setXaiResult(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/xai/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: testUrl, url: testUrl, user_id: userId }),
      });
      if (res.ok) {
        const data = await res.json();
        setXaiResult(data);
        fetchData();
      } else {
        setError(`API returned ${res.status}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setExplaining(false);
    }
  }

  const vulnScore = profile?.vulnerability_score || 0;
  const totalScans = profile?.total_scans || 0;
  const totalThreats = profile?.total_threats || 0;
  const fpRate = feedbackStats?.fp_rate || 0;
  const fnRate = feedbackStats?.fn_rate || 0;

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
            <span className="text-white/70">XAI Dashboard</span>
          </div>
          <div className="flex items-center gap-5">
            <div
              className="flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: "#10b981" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SHAP Engine Active
            </div>
          </div>
        </header>

        {/* Body */}
        <main className="flex-1 px-8 py-8 max-w-[1400px] w-full mx-auto">
          {/* Title */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="p-1.5 rounded-lg"
                style={{ background: "rgba(167,139,250,0.15)" }}
              >
                <Microscope className="w-4 h-4 text-purple-400" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                XAI Dashboard
              </h1>
            </div>
            <p className="text-sm text-white/35 ml-8">
              Explainable AI analysis with SHAP token attribution, user
              vulnerability profiling, and continuous learning feedback.
            </p>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
              value={totalScans}
              label="URLs Scanned"
              icon={Search}
              accent="#3b82f6"
            />
            <MetricCard
              value={totalThreats}
              label="Threats Detected"
              icon={AlertTriangle}
              accent="#ef4444"
            />
            <MetricCard
              value={feedbackStats?.total || 0}
              label="Feedback Items"
              icon={MessageSquare}
              accent="#a78bfa"
            />
            <MetricCard
              value={`${Math.round(vulnScore)}`}
              label="Vulnerability Score"
              icon={Target}
              accent={
                vulnScore >= 70 ? "#ef4444"
                : vulnScore >= 40 ?
                  "#f97316"
                : "#10b981"
              }
            />
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: Explainer + Results + Timeline */}
            <div className="lg:col-span-2 space-y-5">
              {/* URL Explainer */}
              <div
                className="rounded-xl p-6"
                style={{
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <Eye className="w-4 h-4 text-purple-400" />
                  <h2 className="text-sm font-semibold text-white">
                    URL Explainer
                  </h2>
                  {xaiResult && !xaiResult.error && (
                    <span
                      className="ml-auto flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        background: "rgba(16,185,129,0.1)",
                        color: "#10b981",
                        border: "1px solid rgba(16,185,129,0.2)",
                      }}
                    >
                      <CheckCircle2 className="w-3 h-3" /> Complete
                    </span>
                  )}
                </div>

                <form onSubmit={handleExplain} className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                      type="text"
                      value={testUrl}
                      onChange={(e) => setTestUrl(e.target.value)}
                      placeholder="https://example.com/path?query=... — paste any URL for SHAP analysis"
                      className="w-full pl-10 pr-4 py-3 rounded-lg text-sm text-white placeholder:text-white/20 focus:outline-none transition-all font-mono"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        caretColor: "#a78bfa",
                      }}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "rgba(167,139,250,0.4)")
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor = "rgba(255,255,255,0.08)")
                      }
                    />
                    {testUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setTestUrl("");
                          setXaiResult(null);
                          setError(null);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-white/25 hover:text-white/50 transition-colors"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={explaining || !testUrl.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50 active:scale-95"
                      style={{
                        background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                      }}
                    >
                      {explaining ?
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Analyzing...
                        </>
                      : <>
                          <Send className="w-3.5 h-3.5" />
                          Explain
                        </>
                      }
                    </button>
                    {error && (
                      <div
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg"
                        style={{
                          background: "rgba(239,68,68,0.08)",
                          border: "1px solid rgba(239,68,68,0.2)",
                        }}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-xs text-red-400 font-medium">
                          {error}
                        </span>
                      </div>
                    )}
                  </div>
                </form>
              </div>

              {/* Loading */}
              {explaining && (
                <div
                  className="rounded-xl p-10 text-center"
                  style={{
                    background: "#111827",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: "rgba(167,139,250,0.1)" }}
                  >
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  </div>
                  <p className="text-sm font-semibold text-white mb-1">
                    Running SHAP analysis...
                  </p>
                  <p className="text-xs text-white/30">
                    Computing token-level attribution values
                  </p>
                </div>
              )}

              {/* SHAP Result */}
              {xaiResult && !xaiResult.error && !explaining && (
                <TokenHeatmap
                  tokens={xaiResult.tokens}
                  shapValues={xaiResult.shap_values}
                  modelScore={xaiResult.fused_score}
                  severity={xaiResult.severity}
                  cta={xaiResult.cta}
                  fallback={xaiResult.fallback}
                />
              )}

              {/* Empty state */}
              {!xaiResult && !explaining && (
                <div
                  className="rounded-xl p-10 text-center"
                  style={{
                    background: "#111827",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderStyle: "dashed",
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
                    style={{
                      background: "rgba(167,139,250,0.1)",
                      border: "1px solid rgba(167,139,250,0.15)",
                    }}
                  >
                    <Brain className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">
                    No analysis yet
                  </h3>
                  <p className="text-xs text-white/30 max-w-xs mx-auto leading-relaxed">
                    Paste a URL above to run SHAP-powered token attribution and
                    see which parts of the URL drove the model's decision.
                  </p>
                </div>
              )}

              {/* Timeline */}
              <ActivityTimeline dailyTrend={profile?.daily_trend || []} />
            </div>

            {/* RIGHT: Vulnerability + Learning + Domains */}
            <div className="space-y-5">
              {/* Vulnerability Score */}
              <div
                className="rounded-xl p-5"
                style={{
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-3.5 h-3.5 text-white/30" />
                  <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                    Vulnerability Score
                  </h3>
                </div>
                {loading ?
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  </div>
                : <div className="flex flex-col items-center py-2 gap-4">
                    <RiskGauge score={vulnScore} />
                    <div className="w-full space-y-2">
                      {[
                        {
                          label: "Total Scans",
                          value: totalScans,
                          color: "#3b82f6",
                        },
                        {
                          label: "Threats Found",
                          value: totalThreats,
                          color: "#ef4444",
                        },
                      ].map(({ label, value, color }) => (
                        <div
                          key={label}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                          style={{ borderColor: "rgba(255,255,255,0.04)" }}
                        >
                          <span className="text-[11px] text-white/35 font-medium">
                            {label}
                          </span>
                          <span className="text-xs font-bold" style={{ color }}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                }
              </div>

              {/* Continuous Learning */}
              <div
                className="rounded-xl p-5"
                style={{
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-3.5 h-3.5 text-white/30" />
                  <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                    Continuous Learning
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    {
                      label: "Total",
                      value: feedbackStats?.total || 0,
                      color: "#fff",
                    },
                    {
                      label: "False +",
                      value: feedbackStats?.false_positives || 0,
                      color: "#f59e0b",
                    },
                    {
                      label: "False -",
                      value: feedbackStats?.false_negatives || 0,
                      color: "#ef4444",
                    },
                  ].map(({ label, value, color }) => (
                    <div
                      key={label}
                      className="text-center p-2.5 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                    >
                      <p
                        className="text-base font-bold mb-0.5"
                        style={{ color }}
                      >
                        {value}
                      </p>
                      <p className="text-[9px] text-white/25 uppercase tracking-wide font-medium">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
                {feedbackStats?.total > 0 && (
                  <div className="space-y-3">
                    {[
                      {
                        label: "FP Rate",
                        rate: fpRate * 100,
                        color: "#f59e0b",
                      },
                      {
                        label: "FN Rate",
                        rate: fnRate * 100,
                        color: "#ef4444",
                      },
                    ].map(({ label, rate, color }) => (
                      <div key={label}>
                        <div
                          className="flex justify-between text-[10px] font-medium mb-1.5"
                          style={{ color: "rgba(255,255,255,0.3)" }}
                        >
                          <span>{label}</span>
                          <span style={{ color }}>{rate.toFixed(1)}%</span>
                        </div>
                        <div
                          className="h-1 rounded-full overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.06)" }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.min(rate, 100)}%`,
                              background: color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recent feedback */}
                {feedbackStats?.recent_feedback?.length > 0 && (
                  <div
                    className="mt-4 pt-4 border-t"
                    style={{ borderColor: "rgba(255,255,255,0.05)" }}
                  >
                    <p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest mb-2">
                      Recent
                    </p>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {feedbackStats.recent_feedback.slice(0, 5).map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs text-white/40"
                        >
                          {f.user_label === "safe" ?
                            <ThumbsUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          : <ThumbsDown className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          }
                          <span className="truncate font-mono">{f.url}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
