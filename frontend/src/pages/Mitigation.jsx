import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Shield,
  ShieldAlert,
  Activity,
  FileText,
  Download,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Phone,
  Globe,
  Brain,
  Target,
  Eye,
  CheckCircle2,
  LayoutDashboard,
  Microscope,
  Mic2,
  Sparkles,
  Zap,
  ChevronRight,
  Settings,
  User,
  LogOut,
  Circle,
  ArrowRight,
  RefreshCw,
  BarChart3,
  ShieldCheck,
  Clock,
  Cpu,
  Mail,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

import Sidebar from "../components/shared/Sidebar";
import MetricCard from "../components/dashboard/MetricCard";
import StatusRow from "../components/mitigation/StatusRow";

/* ─── Risk Gauge ──────────────────────────────────────── */
function RiskGauge({ score }) {
  const config =
    score >= 70 ? { color: "#ef4444", label: "Critical", glow: "#ef444440" }
    : score >= 50 ? { color: "#f97316", label: "High", glow: "#f9731640" }
    : score >= 30 ? { color: "#f59e0b", label: "Moderate", glow: "#f59e0b40" }
    : { color: "#10b981", label: "Low", glow: "#10b98140" };

  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative"
        style={{ filter: `drop-shadow(0 0 12px ${config.glow})` }}
      >
        <svg width="140" height="140" className="-rotate-90">
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
          />
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke={config.color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{score}</span>
          <span className="text-[10px] text-white/30 font-medium">/100</span>
        </div>
      </div>
      <span
        className="mt-3 text-xs font-semibold px-3 py-1 rounded-full"
        style={{ background: `${config.color}15`, color: config.color }}
      >
        {config.label} Risk
      </span>
    </div>
  );
}

/* ─── Recommendation Card ─────────────────────────────── */
const PRIORITY_CONFIG = {
  critical: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.2)",
  },
  high: {
    color: "#f97316",
    bg: "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.2)",
  },
  medium: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
  },
  low: {
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.2)",
  },
};

/* ─── Main Component ──────────────────────────────────── */
export default function Mitigation() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [report, setReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [threatsRes, voiceRes, feedbackRes] = await Promise.all([
        fetch(`${API_BASE}/api/threats?limit=1`)
          .then((r) => r.json())
          .catch(() => null),
        fetch(`${API_BASE}/api/voice/history`)
          .then((r) => r.json())
          .catch(() => []),
        fetch(`${API_BASE}/api/xai/feedback/stats`)
          .then((r) => r.json())
          .catch(() => null),
      ]);
      setStats({
        threats: threatsRes?.stats || {
          total: 0,
          highRisk: 0,
          mediumRisk: 0,
          lowRisk: 0,
          today: 0,
        },
        voice: Array.isArray(voiceRes) ? voiceRes : [],
        feedback: feedbackRes || { total: 0, fp_rate: 0, fn_rate: 0 },
      });
      setLastRefresh(new Date());
    } catch {
      setStats(null);
    }
  }

  async function handleGenerateReport() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/mitigation/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: "browser_default" }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      setReport(await res.json());
    } catch (err) {
      setError(err.message || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownloadPDF() {
    if (!report) return;
    setDownloading(true);
    try {
      const res = await fetch(`${API_BASE}/api/mitigation/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generated_at: report.generated_at,
          executive_summary: report.executive_summary,
          overall_risk_score: report.overall_risk_score,
          overall_risk_level: report.overall_risk_level,
          threat_breakdown: report.threat_breakdown,
          recommendations: report.recommendations,
          risk_trend_analysis: report.risk_trend_analysis,
        }),
      });
      if (!res.ok) throw new Error("PDF failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `LUMINA_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  }

  const voiceHighRisk =
    stats?.voice?.filter((c) => c.overall_risk > 60).length || 0;
  const totalThreats =
    (stats?.threats?.total || 0) + (stats?.voice?.length || 0);
  const accuracy =
    stats?.feedback?.total > 0 ?
      Math.round(
        (1 - (stats.feedback.fp_rate + stats.feedback.fn_rate) / 2) * 100,
      )
    : 98;

  const THREAT_ICONS = { phishing: Globe, voice: Phone, deepfake: Eye };
  const THREAT_COLORS = {
    phishing: "#06b6d4",
    voice: "#f97316",
    deepfake: "#a78bfa",
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "#080d14", fontFamily: "'Inter', sans-serif" }}
    >
      {/* Sidebar */}
      <Sidebar
        user={user}
        onLogout={() => {
          logout();
          navigate("/login");
        }}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col" style={{ marginLeft: "230px" }}>
        {/* Top Header */}
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
            <span className="text-white/70">Mitigation</span>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5 text-xs text-white/35 font-medium">
              <Clock className="w-3.5 h-3.5" />
              Refreshed{" "}
              {lastRefresh.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:bg-white/5"
              style={{
                color: "rgba(255,255,255,0.4)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
            <div
              className="flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: "#10b981" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              System Healthy · 12 nodes
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 px-8 py-8 max-w-[1400px] w-full mx-auto">
          {/* Page Title */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="p-1.5 rounded-lg"
                style={{ background: "rgba(59,130,246,0.15)" }}
              >
                <Shield className="w-4 h-4 text-blue-400" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Threat Mitigation Center
              </h1>
            </div>
            <p className="text-sm text-white/35 ml-8">
              AI-powered threat analysis and actionable mitigation
              recommendations across all channels.
            </p>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
              value={totalThreats}
              label="Total Incidents"
              icon={ShieldAlert}
              accent="#ef4444"
            />
            <MetricCard
              value={stats?.threats?.highRisk || 0}
              label="High Risk Phishing"
              icon={AlertTriangle}
              accent="#f97316"
            />
            <MetricCard
              value={voiceHighRisk}
              label="Risky Voice Calls"
              icon={Phone}
              accent="#f59e0b"
            />
            <MetricCard
              value={`${accuracy}%`}
              label="Model Accuracy"
              icon={Target}
              accent="#10b981"
              delta="+2.1%"
            />
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: Engine + Report */}
            <div className="lg:col-span-2 space-y-5">
              {/* AI Engine Card */}
              <div
                className="rounded-xl p-6"
                style={{
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="w-4 h-4 text-blue-400" />
                      <h2 className="text-sm font-semibold text-white">
                        AI Mitigation Engine
                      </h2>
                    </div>
                    <p className="text-xs text-white/35 max-w-md leading-relaxed">
                      Generate a comprehensive mitigation report powered by LLM
                      analysis. Aggregates data from all detection channels.
                    </p>
                  </div>
                  {report && (
                    <span
                      className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full"
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

                {/* Source chips */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {[
                    { label: "Phishing Analysis", color: "#06b6d4" },
                    { label: "Voice Intercept", color: "#f97316" },
                    { label: "Deepfake Scan", color: "#a78bfa" },
                  ].map(({ label, color }) => (
                    <span
                      key={label}
                      className="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1 rounded-full"
                      style={{
                        background: `${color}12`,
                        color,
                        border: `1px solid ${color}25`,
                      }}
                    >
                      <span
                        className="w-1 h-1 rounded-full"
                        style={{ background: color }}
                      />
                      {label}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleGenerateReport}
                    disabled={generating}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50 active:scale-95"
                    style={{
                      background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                    }}
                  >
                    {generating ?
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Analyzing...
                      </>
                    : <>
                        <Cpu className="w-3.5 h-3.5" />
                        {report ? "Re-generate Report" : "Generate Report"}
                      </>
                    }
                  </button>
                  {report && (
                    <button
                      onClick={handleDownloadPDF}
                      disabled={downloading}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition-all hover:bg-white/10 disabled:opacity-50"
                      style={{
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.7)",
                      }}
                    >
                      {downloading ?
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Exporting...
                        </>
                      : <>
                          <Download className="w-3.5 h-3.5" />
                          Export PDF
                        </>
                      }
                    </button>
                  )}
                </div>
              </div>

              {/* Report Content */}
              {report ?
                <div className="space-y-5">
                  {/* Executive Summary */}
                  <div
                    className="rounded-xl p-6"
                    style={{
                      background: "#111827",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <h3 className="text-sm font-semibold text-white">
                        Executive Summary
                      </h3>
                    </div>
                    <div
                      className="rounded-lg p-4 mb-4"
                      style={{
                        background: "rgba(6,182,212,0.06)",
                        border: "1px solid rgba(6,182,212,0.12)",
                      }}
                    >
                      <p className="text-xs text-cyan-300/70 leading-relaxed font-medium">
                        {report.executive_summary}
                      </p>
                    </div>
                    {report.risk_trend_analysis && (
                      <div
                        className="flex items-start gap-2 p-3 rounded-lg"
                        style={{
                          background: "rgba(245,158,11,0.06)",
                          border: "1px solid rgba(245,158,11,0.1)",
                        }}
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-300/60 leading-relaxed">
                          {report.risk_trend_analysis}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Threat Breakdown */}
                  {report.threat_breakdown?.length > 0 && (
                    <div
                      className="rounded-xl p-6"
                      style={{
                        background: "#111827",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="w-4 h-4 text-white/40" />
                        <h3 className="text-sm font-semibold text-white">
                          Threat Breakdown
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {report.threat_breakdown.map((cat, i) => {
                          const CatIcon = THREAT_ICONS[cat.category] || Shield;
                          const catColor =
                            THREAT_COLORS[cat.category] || "#ffffff";
                          return (
                            <div
                              key={i}
                              className="p-4 rounded-lg"
                              style={{
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.05)",
                              }}
                            >
                              <div className="flex items-center gap-3 mb-3">
                                <div
                                  className="p-1.5 rounded-md"
                                  style={{ background: `${catColor}15` }}
                                >
                                  <CatIcon
                                    className="w-3.5 h-3.5"
                                    style={{ color: catColor }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-white capitalize">
                                  {cat.category}
                                </span>
                                <span
                                  className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                                  style={
                                    cat.trend === "increasing" ?
                                      {
                                        background: "rgba(239,68,68,0.1)",
                                        color: "#f87171",
                                      }
                                    : cat.trend === "decreasing" ?
                                      {
                                        background: "rgba(16,185,129,0.1)",
                                        color: "#34d399",
                                      }
                                    : {
                                        background: "rgba(245,158,11,0.1)",
                                        color: "#fbbf24",
                                      }

                                  }
                                >
                                  {cat.trend}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                {[
                                  {
                                    value: cat.total_incidents,
                                    label: "Total",
                                  },
                                  {
                                    value: cat.high_risk_count,
                                    label: "High Risk",
                                  },
                                  {
                                    value: cat.medium_risk_count,
                                    label: "Medium",
                                  },
                                ].map(({ value, label }) => (
                                  <div
                                    key={label}
                                    className="text-center p-2 rounded"
                                    style={{
                                      background: "rgba(255,255,255,0.03)",
                                    }}
                                  >
                                    <p className="text-base font-bold text-white">
                                      {value}
                                    </p>
                                    <p className="text-[10px] text-white/30 uppercase tracking-wide font-medium">
                                      {label}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {report.recommendations?.length > 0 && (
                    <div
                      className="rounded-xl p-6"
                      style={{
                        background: "#111827",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <h3 className="text-sm font-semibold text-white">
                            Mitigation Recommendations
                          </h3>
                        </div>
                        <span
                          className="text-[10px] font-semibold px-2 py-1 rounded-md"
                          style={{
                            background: "rgba(16,185,129,0.1)",
                            color: "#34d399",
                          }}
                        >
                          {report.recommendations.length} actions
                        </span>
                      </div>
                      <div className="space-y-3">
                        {report.recommendations.map((rec, i) => {
                          const p =
                            PRIORITY_CONFIG[rec.priority] ||
                            PRIORITY_CONFIG.medium;
                          return (
                            <div
                              key={i}
                              className="p-4 rounded-lg transition-all hover:translate-x-0.5"
                              style={{
                                background: "rgba(255,255,255,0.02)",
                                border: "1px solid rgba(255,255,255,0.05)",
                              }}
                            >
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-[10px] font-mono text-white/20 w-5">
                                  {String(i + 1).padStart(2, "0")}
                                </span>
                                <span
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase"
                                  style={{
                                    background: p.bg,
                                    color: p.color,
                                    border: `1px solid ${p.border}`,
                                  }}
                                >
                                  {rec.priority}
                                </span>
                                <span className="text-[10px] text-white/25 uppercase tracking-wider font-medium">
                                  {rec.category}
                                </span>
                              </div>
                              <h4 className="text-xs font-semibold text-white mb-1 ml-8">
                                {rec.title}
                              </h4>
                              <p className="text-[11px] text-white/35 ml-8 leading-relaxed">
                                {rec.description}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              : !generating ?
                /* Empty State */
                <div
                  className="rounded-xl p-12 text-center"
                  style={{
                    background: "#111827",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderStyle: "dashed",
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{
                      background: "rgba(59,130,246,0.1)",
                      border: "1px solid rgba(59,130,246,0.15)",
                    }}
                  >
                    <Zap className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2">
                    No report generated yet
                  </h3>
                  <p className="text-xs text-white/30 mb-5 max-w-xs mx-auto leading-relaxed">
                    Click "Generate Report" to run AI analysis across phishing,
                    voice, and deepfake data.
                  </p>
                  <button
                    onClick={handleGenerateReport}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Run your first analysis{" "}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              : /* Loading State */
                <div
                  className="rounded-xl p-12 text-center"
                  style={{
                    background: "#111827",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: "rgba(59,130,246,0.1)" }}
                  >
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                  </div>
                  <p className="text-sm font-semibold text-white mb-1">
                    Analyzing threat data...
                  </p>
                  <p className="text-xs text-white/30">
                    Aggregating signals from all detection modules
                  </p>
                </div>
              }
            </div>

            {/* RIGHT: Sidebar panels */}
            <div className="space-y-5">
              {/* Risk Score Card — shown when report is available */}
              {report && (
                <div
                  className="rounded-xl p-5"
                  style={{
                    background: "#111827",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-3.5 h-3.5 text-white/30" />
                    <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                      Risk Score
                    </h3>
                  </div>
                  <div className="flex flex-col items-center py-2">
                    <RiskGauge score={report.overall_risk_score} />
                    <p className="text-[10px] text-white/25 mt-3 font-medium uppercase tracking-widest">
                      {report.overall_risk_level} Risk Level
                    </p>
                  </div>
                </div>
              )}

              {/* Platform Status */}
              <div
                className="rounded-xl p-5"
                style={{
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-3.5 h-3.5 text-white/30" />
                  <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                    Platform Status
                  </h3>
                </div>
                <div>
                  <StatusRow
                    label="Phishing Threats"
                    value={stats?.threats?.total ?? 0}
                    dotColor="#ef4444"
                  />
                  <StatusRow
                    label="Voice Calls Analyzed"
                    value={stats?.voice?.length ?? 0}
                    dotColor="#f97316"
                  />
                  <StatusRow
                    label="Today's Alerts"
                    value={stats?.threats?.today ?? 0}
                    dotColor="#f59e0b"
                  />
                  <StatusRow
                    label="Feedback Submitted"
                    value={stats?.feedback?.total ?? 0}
                    dotColor="#6366f1"
                  />
                </div>
              </div>

              {/* System Health */}
              <div
                className="rounded-xl p-5"
                style={{
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-white/30" />
                    <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                      System Health
                    </h3>
                  </div>
                  <span
                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(16,185,129,0.1)",
                      color: "#10b981",
                      border: "1px solid rgba(16,185,129,0.2)",
                    }}
                  >
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                    Operational
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Uptime", value: "99.9%" },
                    { label: "Last Scan", value: "2 min ago" },
                    { label: "Nodes", value: "12 / 12" },
                    { label: "Accuracy", value: `${accuracy}%` },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="p-3 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                    >
                      <p className="text-sm font-semibold text-white mb-0.5">
                        {value}
                      </p>
                      <p className="text-[10px] text-white/30 uppercase tracking-wide font-medium">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-6 right-6 z-[200] animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl"
            style={{
              background: "#1a0a0a",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-xs font-medium text-red-300">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-white/30 hover:text-white/60 text-base font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
