import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/shared/Navbar";
import {
  Brain,
  Shield,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
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
} from "lucide-react";

const API_BASE = "http://localhost:8000";

// ── Vulnerability Gauge Component ──
function VulnerabilityGauge({ score, totalScans, totalThreats }) {
  const getColor = (s) => {
    if (s >= 70) return { ring: "stroke-red-500", text: "text-red-400", label: "HIGH RISK", bg: "from-red-500/10" };
    if (s >= 40) return { ring: "stroke-amber-500", text: "text-amber-400", label: "ELEVATED", bg: "from-amber-500/10" };
    if (s >= 20) return { ring: "stroke-yellow-500", text: "text-yellow-400", label: "MODERATE", bg: "from-yellow-500/10" };
    return { ring: "stroke-emerald-500", text: "text-emerald-400", label: "LOW RISK", bg: "from-emerald-500/10" };
  };

  const c = getColor(score);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={`relative bg-gradient-to-br ${c.bg} to-transparent backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/20">
          <Target className="w-4 h-4 text-indigo-400" />
        </div>
        <h2 className="text-xl font-black text-white tracking-tight">User Vulnerability Score</h2>
      </div>

      <div className="flex items-center justify-center gap-10">
        <div className="relative">
          <svg width="140" height="140" className="-rotate-90">
            <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
            <circle
              cx="70" cy="70" r="54" fill="none"
              className={c.ring}
              strokeWidth="10" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-black ${c.text}`}>{Math.round(score)}</span>
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">/100</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className={`text-xs font-black uppercase tracking-widest ${c.text}`}>{c.label}</div>
          <div className="space-y-1.5">
            <div className="text-xs text-white/40"><span className="text-white font-bold">{totalScans}</span> Total Scans</div>
            <div className="text-xs text-white/40"><span className="text-white font-bold">{totalThreats}</span> Threats Detected</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Token Heatmap Component ──
function TokenHeatmap({ tokens, shapValues, modelScore, severity, cta, fallback }) {
  const getTokenColor = (val) => {
    const absVal = Math.abs(val);
    const intensity = Math.min(absVal * 3, 1);
    if (val > 0.01) return `rgba(239, 68, 68, ${0.15 + intensity * 0.6})`;
    if (val < -0.01) return `rgba(34, 197, 94, ${0.15 + intensity * 0.6})`;
    return `rgba(255, 255, 255, 0.05)`;
  };

  const getSeverityStyle = (sev) => {
    const map = {
      CRITICAL: "text-red-400 bg-red-500/10 border-red-500/20",
      HIGH: "text-orange-400 bg-orange-500/10 border-orange-500/20",
      MODERATE: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      LOW: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    };
    return map[sev] || map.LOW;
  };

  return (
    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/20">
          <Brain className="w-4 h-4 text-purple-400" />
        </div>
        <h2 className="text-xl font-black text-white tracking-tight">Explainability — SHAP Token Map</h2>
      </div>

      {severity && (
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border mb-6 ${getSeverityStyle(severity)}`}>
          <Zap className="w-3.5 h-3.5" />
          Fused Score: {Math.round(modelScore)}/100 — {severity}
        </div>
      )}

      {tokens && tokens.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mb-6" style={{ lineHeight: "2.2" }}>
          {tokens.map((token, i) => (
            <span
              key={i}
              className="group relative inline-block px-2 py-0.5 rounded font-mono text-sm text-white cursor-default transition-transform hover:scale-110"
              style={{ backgroundColor: getTokenColor(shapValues[i] || 0) }}
            >
              {token}
              <span className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 bg-[#1a1a2e] border border-white/20 rounded-md px-2 py-1 text-[10px] whitespace-nowrap z-50 font-mono text-white">
                SHAP: {(shapValues[i] || 0) >= 0 ? "+" : ""}{(shapValues[i] || 0).toFixed(4)}
              </span>
            </span>
          ))}
        </div>
      ) : (
        <div className="text-sm text-white/40 mb-6 text-center py-10">
          {fallback ? "SHAP tokens unavailable — model confidence only." : "Enter a URL above to see token analysis."}
        </div>
      )}

      {cta && (
        <div className="text-sm text-white/50 border-t border-white/5 pt-4">
          <span className="font-bold text-white">Recommendation:</span> {cta}
        </div>
      )}
    </div>
  );
}

// ── Activity Timeline ──
function ActivityTimeline({ dailyTrend }) {
  if (!dailyTrend || dailyTrend.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/20">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Activity Timeline</h2>
        </div>
        <div className="text-center py-10 text-sm text-white/30">No activity data yet. Start scanning to build your timeline.</div>
      </div>
    );
  }

  const maxScore = Math.max(...dailyTrend.map(d => d.avg_score), 1);

  return (
    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/20">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
        </div>
        <h2 className="text-xl font-black text-white tracking-tight">Activity Timeline</h2>
      </div>

      <div className="flex items-end gap-2 h-40 px-2">
        {dailyTrend.map((day, i) => {
          const height = Math.max((day.avg_score / maxScore) * 100, 4);
          const barColor =
            day.avg_score >= 70 ? "bg-red-500" :
            day.avg_score >= 40 ? "bg-amber-500" :
            day.avg_score >= 20 ? "bg-yellow-500" :
            "bg-emerald-500";

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className={`w-full rounded-t-lg ${barColor} transition-all duration-500 min-w-[8px]`}
                style={{ height: `${height}%` }}
              />
              <span className="text-[8px] font-mono text-white/20 truncate w-full text-center">
                {day.date?.slice(5) || ""}
              </span>
              <div className="hidden group-hover:block absolute bottom-full mb-2 bg-[#1a1a2e] border border-white/20 rounded-lg px-3 py-2 text-[10px] z-50 whitespace-nowrap text-white">
                <div className="font-bold">{day.date}</div>
                <div>Avg Score: {Math.round(day.avg_score)}</div>
                <div>Scans: {day.scan_count}</div>
                <div>Threats: {day.threat_count}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between mt-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">
        <span>Oldest</span>
        <span>Today</span>
      </div>
    </div>
  );
}

// ── Feedback Stats Widget ──
function FeedbackStats({ stats }) {
  return (
    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
        </div>
        <h2 className="text-xl font-black text-white tracking-tight">Continuous Learning</h2>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 rounded-2xl bg-black/20 border border-white/5">
          <div className="text-2xl font-black text-white">{stats.total || 0}</div>
          <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">Feedback</div>
        </div>
        <div className="text-center p-4 rounded-2xl bg-black/20 border border-white/5">
          <div className="text-2xl font-black text-amber-400">{stats.false_positives || 0}</div>
          <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">False +</div>
        </div>
        <div className="text-center p-4 rounded-2xl bg-black/20 border border-white/5">
          <div className="text-2xl font-black text-red-400">{stats.false_negatives || 0}</div>
          <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">False -</div>
        </div>
      </div>

      {stats.total > 0 && (
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">
              <span>False Positive Rate</span>
              <span className="text-amber-400">{(stats.fp_rate * 100).toFixed(1)}%</span>
            </div>
            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(stats.fp_rate * 100, 100)}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">
              <span>False Negative Rate</span>
              <span className="text-red-400">{(stats.fn_rate * 100).toFixed(1)}%</span>
            </div>
            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(stats.fn_rate * 100, 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      {stats.recent_feedback && stats.recent_feedback.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white/5">
          <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-3">Recent Feedback</div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {stats.recent_feedback.slice(0, 5).map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-white/50">
                {f.user_label === "safe" ?
                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> :
                  <ThumbsDown className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                }
                <span className="truncate font-mono">{f.url}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ──
export default function XAIDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [feedbackStats, setFeedbackStats] = useState({});
  const [loading, setLoading] = useState(true);

  // Inline explainer state
  const [testUrl, setTestUrl] = useState("");
  const [explaining, setExplaining] = useState(false);
  const [xaiResult, setXaiResult] = useState(null);

  const userId = "browser_default"; // Extension provides its own ID; dashboard uses a default

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    try {
      const [profileRes, feedbackRes] = await Promise.all([
        fetch(`${API_BASE}/api/xai/user-profile/${userId}`).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE}/api/xai/feedback/stats`).then(r => r.ok ? r.json() : null),
      ]);
      if (profileRes) setProfile(profileRes);
      if (feedbackRes) setFeedbackStats(feedbackRes);
    } catch (err) {
      console.error("Dashboard data fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleExplain(e) {
    e.preventDefault();
    if (!testUrl.trim()) return;
    setExplaining(true);
    setXaiResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/xai/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: testUrl, url: testUrl, user_id: userId }),
      });
      if (res.ok) {
        const data = await res.json();
        setXaiResult(data);
        fetchData(); // Refresh profile after scan
      } else {
        setXaiResult({ error: `API returned ${res.status}` });
      }
    } catch (err) {
      setXaiResult({ error: err.message });
    } finally {
      setExplaining(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30 overflow-x-hidden pt-24 pb-20">
      <Navbar />

      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[-5%] w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[150px]" />
        <div className="absolute top-[40%] right-[30%] w-[300px] h-[300px] bg-cyan-900/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="max-w-2xl">
            <h1 className="text-5xl lg:text-6xl font-black tracking-tighter mb-4 italic leading-tight">
              XAI{" "}
              <span className="inline-block pr-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-500 to-cyan-600 italic">
                DASHBOARD
              </span>
            </h1>
            <p className="text-lg text-white/40 font-medium">
              Explainable AI analysis with SHAP token attribution, user profiling, and continuous learning.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-8">
            {/* Inline Explainer */}
            <section className="group relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl overflow-hidden transition-all duration-500 hover:border-purple-500/30">
              <div className="absolute top-0 right-0 p-8 text-purple-500/5 group-hover:text-purple-500/10 transition-colors">
                <Eye className="w-32 h-32 rotate-12" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/20">
                    <Search className="w-4 h-4 text-purple-400" />
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight">
                    Explain Any URL
                  </h2>
                </div>

                <form onSubmit={handleExplain} className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <input
                      type="text"
                      value={testUrl}
                      onChange={(e) => setTestUrl(e.target.value)}
                      placeholder="Enter a URL for SHAP-powered explanation..."
                      className="w-full px-14 py-5 bg-black/40 border border-white/10 rounded-3xl text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all font-mono text-sm tracking-tight"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={explaining || !testUrl}
                    className="group px-10 py-5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-3xl transition-all shadow-[0_0_25px_rgba(147,51,234,0.3)] hover:shadow-[0_0_35px_rgba(147,51,234,0.5)] flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                  >
                    {explaining ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Explain <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                {xaiResult && xaiResult.error && (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                    Analysis failed: {xaiResult.error}
                  </div>
                )}
              </div>
            </section>

            {/* Token Heatmap Result */}
            {xaiResult && !xaiResult.error && (
              <TokenHeatmap
                tokens={xaiResult.tokens}
                shapValues={xaiResult.shap_values}
                modelScore={xaiResult.fused_score}
                severity={xaiResult.severity}
                cta={xaiResult.cta}
                fallback={xaiResult.fallback}
              />
            )}

            {/* Activity Timeline */}
            <ActivityTimeline dailyTrend={profile?.daily_trend || []} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            {/* Vulnerability Gauge */}
            {loading ? (
              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 flex flex-col items-center justify-center gap-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-2 border-purple-500/20" />
                  <div className="absolute inset-0 rounded-full border-t-2 border-purple-500 animate-spin" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40 animate-pulse">
                  Loading Profile...
                </p>
              </div>
            ) : (
              <VulnerabilityGauge
                score={profile?.vulnerability_score || 0}
                totalScans={profile?.total_scans || 0}
                totalThreats={profile?.total_threats || 0}
              />
            )}

            {/* Feedback Stats */}
            <FeedbackStats stats={feedbackStats} />

            {/* Top Domains */}
            {profile?.top_domains && profile.top_domains.length > 0 && (
              <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
                <h2 className="text-xs font-black text-white/30 uppercase tracking-[0.2em] mb-4">
                  Your Top Domains
                </h2>
                <div className="space-y-2">
                  {profile.top_domains.slice(0, 8).map((domain, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/5">
                      <div className="w-6 h-6 rounded-md bg-indigo-500/20 flex items-center justify-center text-[10px] font-black text-indigo-400">
                        {i + 1}
                      </div>
                      <span className="text-xs font-mono text-white/60 truncate">{domain}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
