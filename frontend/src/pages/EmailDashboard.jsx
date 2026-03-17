import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Mail,
  Search,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  MessageSquare,
  Target,
  History,
  ArrowUpRight,
  AlertCircle,
  ExternalLink,
  Activity,
  Info,
  Filter,
  RefreshCw,
  Zap,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar";
import MetricCard from "../components/dashboard/MetricCard";
import RiskGauge from "../components/dashboard/RiskGauge";
import EmailAnalysisCard from "../components/email/EmailAnalysisCard";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/* ─── Main Component ──────────────────────────────────── */
export default function EmailDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    suspicious: 0,
    blocked: 0,
    today: 0,
  });
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState([]);
  const [testEmail, setTestEmail] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  const userId = "browser_default";

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 10000);
    return () => clearInterval(iv);
  }, []);

  async function fetchData() {
    try {
      const [profileRes, emailsRes] = await Promise.all([
        fetch(`${API_BASE}/api/email/user-profile/${userId}`).then((r) =>
          r.ok ? r.json() : null,
        ),
        fetch(`${API_BASE}/api/email/recent-emails`).then((r) =>
          r.ok ? r.json() : null,
        ),
      ]);
      if (profileRes) setProfile(profileRes);
      if (emailsRes) setEmails(emailsRes.emails || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyzeEmail(e) {
    e.preventDefault();
    if (!testEmail.trim()) return;
    setAnalyzing(true);
    setAnalysisResult(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/analyze-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "Email Analysis",
          sender: "unknown@example.com",
          body_text: testEmail,
          links: [],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysisResult({
          risk_score: data.riskScore,
          sender: data.sender || "unknown",
          subject: data.subject,
          findings: data.reasons || [],
          recommendation: data.category,
        });
        fetchData();
      } else {
        setError(`API returned ${res.status}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  const riskScore = profile?.avg_risk_score || 0;
  const totalScanned = profile?.total_scanned || 0;
  const totalThreats = profile?.total_threats || 0;

  const filteredEmails = emails.filter((email) => {
    if (filter === "all") return true;
    if (filter === "suspicious") return email.risk_score >= 40;
    if (filter === "safe") return email.risk_score < 40;
    return true;
  });

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
            <span className="text-white/70">Email Security</span>
          </div>
          <div className="flex items-center gap-5">
            <div
              className="flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: "#10b981" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Email Engine Active
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
                style={{ background: "rgba(59,130,246,0.15)" }}
              >
                <Mail className="w-4 h-4 text-blue-400" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Email Security Dashboard
              </h1>
            </div>
            <p className="text-sm text-white/35 ml-8">
              Advanced email threat detection, phishing analysis, and inbox
              security monitoring.
            </p>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
              value={totalScanned}
              label="Emails Scanned"
              icon={Mail}
              accent="#3b82f6"
            />
            <MetricCard
              value={totalThreats}
              label="Threats Detected"
              icon={AlertTriangle}
              accent="#ef4444"
            />
            <MetricCard
              value={
                Math.round((totalThreats / (totalScanned || 1)) * 100) + "%"
              }
              label="Threat Rate"
              icon={Zap}
              accent="#f59e0b"
            />
            <MetricCard
              value={`${Math.round(riskScore)}`}
              label="Average Risk Score"
              icon={Target}
              accent={
                riskScore >= 70 ? "#ef4444"
                : riskScore >= 40 ?
                  "#f97316"
                : "#10b981"
              }
            />
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: Analyzer + Results + Timeline */}
            <div className="lg:col-span-2 space-y-5">
              {/* Email Analyzer */}
              <div
                className="rounded-xl p-6"
                style={{
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <h2 className="text-sm font-semibold text-white">
                    Email Analyzer
                  </h2>
                  {analysisResult && !analysisResult.error && (
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

                <form onSubmit={handleAnalyzeEmail} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <textarea
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="Paste email content here or provide sender, subject, and body for analysis..."
                      className="w-full pl-10 pr-4 py-3 rounded-lg text-sm text-white placeholder:text-white/20 focus:outline-none transition-all font-mono"
                      rows="4"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        caretColor: "#3b82f6",
                      }}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "rgba(59,130,246,0.4)")
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor = "rgba(255,255,255,0.08)")
                      }
                    />
                    {testEmail && (
                      <button
                        type="button"
                        onClick={() => {
                          setTestEmail("");
                          setAnalysisResult(null);
                          setError(null);
                        }}
                        className="absolute right-3 top-3 p-1 rounded text-white/25 hover:text-white/50 transition-colors"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={analyzing || !testEmail.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50 active:scale-95"
                      style={{
                        background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                      }}
                    >
                      {analyzing ?
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Analyzing...
                        </>
                      : <>
                          <Search className="w-3.5 h-3.5" />
                          Analyze Email
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
              {analyzing && (
                <div
                  className="rounded-xl p-10 text-center"
                  style={{
                    background: "#111827",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: "rgba(59,130,246,0.1)" }}
                  >
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  </div>
                  <p className="text-sm font-semibold text-white mb-1">
                    Analyzing email...
                  </p>
                  <p className="text-xs text-white/30">
                    Scanning for phishing indicators and malicious patterns
                  </p>
                </div>
              )}

              {/* Analysis Result */}
              {analysisResult && !analysisResult.error && !analyzing && (
                <EmailAnalysisCard
                  result={analysisResult}
                  onClose={() => setAnalysisResult(null)}
                />
              )}

              {/* Empty state */}
              {!analysisResult && !analyzing && (
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
                      background: "rgba(59,130,246,0.1)",
                      border: "1px solid rgba(59,130,246,0.15)",
                    }}
                  >
                    <Mail className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">
                    No analysis yet
                  </h3>
                  <p className="text-xs text-white/30 max-w-xs mx-auto leading-relaxed">
                    Paste an email above to analyze for phishing, malware,
                    spoofing, and other security threats.
                  </p>
                </div>
              )}
            </div>

            {/* RIGHT: Risk Score + Recent Emails */}
            <div className="space-y-5">
              {/* Risk Score */}
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
                    Inbox Risk Score
                  </h3>
                </div>
                {loading ?
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  </div>
                : <div className="flex flex-col items-center py-2 gap-4">
                    <RiskGauge score={riskScore} />
                    <div className="w-full space-y-2">
                      {[
                        {
                          label: "Total Scanned",
                          value: totalScanned,
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

              {/* Recent Emails */}
              <div
                className="rounded-xl p-5"
                style={{
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-3.5 h-3.5 text-white/30" />
                  <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                    Recent Emails
                  </h3>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredEmails.length > 0 ?
                    filteredEmails.slice(0, 8).map((email, i) => {
                      const riskLevel =
                        email.risk_score >= 70 ? "Critical"
                        : email.risk_score >= 40 ? "Suspicious"
                        : "Safe";
                      const riskColor =
                        email.risk_score >= 70 ? "#ef4444"
                        : email.risk_score >= 40 ? "#f97316"
                        : "#10b981";

                      return (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg border group hover:border-white/20 transition-colors cursor-pointer"
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            borderColor: "rgba(255,255,255,0.05)",
                          }}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-xs font-medium text-white truncate flex-1">
                              {email.subject || "No Subject"}
                            </p>
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
                              style={{
                                background: riskColor + "15",
                                color: riskColor,
                              }}
                            >
                              {riskLevel}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/40 truncate">
                            {email.sender || "Unknown"}
                          </p>
                        </div>
                      );
                    })
                  : <p className="text-xs text-white/30 text-center py-8">
                      No emails to display
                    </p>
                  }
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
