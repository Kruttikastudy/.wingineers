import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/shared/Navbar";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  FileText,
  Download,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Phone,
  Globe,
  Brain,
  Zap,
  ChevronRight,
  RefreshCw,
  Target,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";

const API_BASE = "http://localhost:8000";

function StatCard({ value, label, icon: Icon, color }) {
  return (
    <div className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-300 hover:bg-white/10 hover:border-white/20">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl ${color.replace("text-", "bg-")}/10 border border-white/5`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
      <div>
        <h3 className="text-3xl font-black text-white mb-1 tracking-tight">{value}</h3>
        <p className="text-xs font-bold text-white/40 uppercase tracking-widest">{label}</p>
      </div>
    </div>
  );
}

function RiskGauge({ score }) {
  const getColor = (s) => {
    if (s >= 70) return { ring: "stroke-red-500", text: "text-red-400", label: "CRITICAL" };
    if (s >= 50) return { ring: "stroke-orange-500", text: "text-orange-400", label: "HIGH" };
    if (s >= 30) return { ring: "stroke-amber-500", text: "text-amber-400", label: "MODERATE" };
    return { ring: "stroke-emerald-500", text: "text-emerald-400", label: "LOW" };
  };

  const c = getColor(score);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width="160" height="160" className="-rotate-90">
          <circle cx="80" cy="80" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
          <circle
            cx="80" cy="80" r="54" fill="none"
            className={c.ring}
            strokeWidth="10" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black text-white leading-none">{score}</span>
          <span className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-1">/100</span>
        </div>
      </div>
      <span className={`mt-3 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${c.text} bg-white/5 border border-white/10`}>
        {c.label}
      </span>
    </div>
  );
}

const PRIORITY_STYLES = {
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

export default function Mitigation() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [report, setReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [threatsRes, voiceRes, feedbackRes] = await Promise.all([
          fetch(`${API_BASE}/api/threats?limit=1`).then((r) => r.json()).catch(() => null),
          fetch(`${API_BASE}/api/voice/history`).then((r) => r.json()).catch(() => []),
          fetch(`${API_BASE}/api/xai/feedback/stats`).then((r) => r.json()).catch(() => null),
        ]);
        setStats({
          threats: threatsRes?.stats || { total: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0, today: 0 },
          voice: Array.isArray(voiceRes) ? voiceRes : [],
          feedback: feedbackRes || { total: 0, fp_rate: 0, fn_rate: 0 },
        });
      } catch {
        setStats(null);
      }
    }
    fetchInitialData();
  }, []);

  async function handleGenerateReport() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/mitigation/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: "browser_default" }),
      });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      setReport(data);
    } catch (err) {
      setError(err.message || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownloadPDF() {
    if (!report) return;
    setDownloading(true);
    setError(null);
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
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `LUMINA_Mitigation_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  }

  const voiceHighRisk = stats?.voice?.filter((c) => c.overall_risk > 60).length || 0;
  const totalThreats = (stats?.threats?.total || 0) + (stats?.voice?.length || 0);
  const accuracy = stats?.feedback?.total > 0
    ? Math.round((1 - (stats.feedback.fp_rate + stats.feedback.fn_rate) / 2) * 100)
    : 98;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white font-sans overflow-x-hidden pt-24 pb-20">
      <Navbar />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-8 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          <Link to="/" className="hover:text-cyan-400 transition-colors">Protect</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-300">Mitigation Center</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div className="max-w-2xl">
            <h1 className="text-5xl lg:text-6xl font-black tracking-tighter mb-4 italic leading-tight">
              THREAT{" "}
              <span className="inline-block pr-6 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-600 italic">
                MITIGATION
              </span>
            </h1>
            <p className="text-lg text-white/40 font-medium">
              AI-powered threat analysis and actionable mitigation recommendations.
            </p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard value={totalThreats} label="Total Incidents" icon={ShieldAlert} color="text-red-400" />
          <StatCard value={stats?.threats?.highRisk || 0} label="High Risk Phishing" icon={AlertTriangle} color="text-orange-400" />
          <StatCard value={voiceHighRisk} label="Risky Voice Calls" icon={Phone} color="text-amber-400" />
          <StatCard value={`${accuracy}%`} label="Model Accuracy" icon={Target} color="text-emerald-400" />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column */}
          <div className="lg:col-span-8 space-y-8">
            {/* Generate Report Section */}
            <section className="bg-gradient-to-br from-white/5 to-transparent backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl relative overflow-hidden">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/20">
                  <Brain className="w-4 h-4 text-cyan-400" />
                </div>
                <h2 className="text-xl font-black text-white tracking-tight">AI Mitigation Engine</h2>
              </div>

              <p className="text-sm text-white/40 mb-8 max-w-2xl">
                Generate a comprehensive mitigation report powered by LLM analysis. The engine aggregates
                data from phishing detection, voice interception, and deepfake analysis to produce
                actionable security recommendations.
              </p>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleGenerateReport}
                  disabled={generating}
                  className="px-8 py-4 bg-white text-black font-black rounded-2xl transition-all hover:bg-slate-200 active:scale-95 disabled:opacity-50 text-[11px] uppercase tracking-widest flex items-center gap-3"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing Threats...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4" />
                      Generate Report
                    </>
                  )}
                </button>

                {report && (
                  <button
                    onClick={handleDownloadPDF}
                    disabled={downloading}
                    className="px-8 py-4 bg-cyan-600 text-white font-black rounded-2xl transition-all hover:bg-cyan-500 active:scale-95 disabled:opacity-50 text-[11px] uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-cyan-600/20"
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download PDF
                      </>
                    )}
                  </button>
                )}
              </div>
            </section>

            {/* Executive Summary */}
            {report && (
              <section className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/20">
                    <FileText className="w-4 h-4 text-blue-400" />
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight">Executive Summary</h2>
                  <span className="ml-auto text-[10px] font-mono text-white/20">
                    {new Date(report.generated_at).toLocaleString()}
                  </span>
                </div>

                <div className="bg-cyan-950/20 border border-cyan-500/10 rounded-2xl p-6 mb-8">
                  <p className="text-sm text-cyan-400/80 font-medium leading-relaxed">
                    {report.executive_summary}
                  </p>
                </div>

                {/* Risk Trend Analysis */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                    Risk Trend Analysis
                  </h3>
                  <p className="text-sm text-white/50 leading-relaxed">
                    {report.risk_trend_analysis}
                  </p>
                </div>
              </section>
            )}

            {/* Recommendations */}
            {report && report.recommendations?.length > 0 && (
              <section className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                    <Shield className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight">Mitigation Recommendations</h2>
                  <span className="ml-auto text-[10px] font-bold text-white/20 uppercase tracking-widest">
                    {report.recommendations.length} actions
                  </span>
                </div>

                <div className="space-y-4">
                  {report.recommendations.map((rec, i) => (
                    <div key={i} className="p-5 bg-black/40 border border-white/5 rounded-2xl hover:border-white/10 transition-all group">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-sm font-black text-white/20 font-mono w-6">{String(i + 1).padStart(2, "0")}</span>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.medium}`}>
                          {rec.priority}
                        </span>
                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{rec.category}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1.5 pl-9">{rec.title}</h4>
                      <p className="text-xs text-white/40 pl-9 leading-relaxed">{rec.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {!report && !generating && (
              <section className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl">
                <div className="py-16 text-center opacity-30">
                  <Shield className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">
                    Generate a report to see AI-powered mitigation recommendations
                  </p>
                </div>
              </section>
            )}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 space-y-8">
            {/* Risk Gauge */}
            {report && (
              <section className="bg-gradient-to-br from-white/5 to-transparent backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl text-center animate-in fade-in zoom-in duration-300">
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-6">Overall Risk Score</h3>
                <RiskGauge score={report.overall_risk_score} />
              </section>
            )}

            {/* Threat Breakdown */}
            {report && report.threat_breakdown?.length > 0 && (
              <section className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in slide-in-from-right-4 duration-500">
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-6">Threat Breakdown</h3>
                <div className="space-y-4">
                  {report.threat_breakdown.map((cat, i) => {
                    const icons = { phishing: Globe, voice: Phone, deepfake: Eye };
                    const colors = { phishing: "text-cyan-400", voice: "text-red-400", deepfake: "text-purple-400" };
                    const CatIcon = icons[cat.category] || Shield;
                    const catColor = colors[cat.category] || "text-white";

                    return (
                      <div key={i} className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                        <div className="flex items-center gap-3 mb-3">
                          <CatIcon className={`w-4 h-4 ${catColor}`} />
                          <span className="text-xs font-black text-white uppercase tracking-widest">{cat.category}</span>
                          <span className={`ml-auto px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
                            cat.trend === "increasing" ? "text-red-400 bg-red-500/10" :
                            cat.trend === "decreasing" ? "text-emerald-400 bg-emerald-500/10" :
                            "text-amber-400 bg-amber-500/10"
                          }`}>
                            {cat.trend}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-lg font-black text-white">{cat.total_incidents}</p>
                            <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Total</p>
                          </div>
                          <div>
                            <p className="text-lg font-black text-red-400">{cat.high_risk_count}</p>
                            <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">High</p>
                          </div>
                          <div>
                            <p className="text-lg font-black text-amber-400">{cat.medium_risk_count}</p>
                            <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Medium</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Quick Stats Panel */}
            <section className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
              <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-6">Platform Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl">
                  <span className="text-xs font-bold text-white/50">Phishing Threats</span>
                  <span className="text-sm font-black text-white">{stats?.threats?.total || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl">
                  <span className="text-xs font-bold text-white/50">Voice Calls Analyzed</span>
                  <span className="text-sm font-black text-white">{stats?.voice?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl">
                  <span className="text-xs font-bold text-white/50">Today's Alerts</span>
                  <span className="text-sm font-black text-white">{stats?.threats?.today || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl">
                  <span className="text-xs font-bold text-white/50">Feedback Submitted</span>
                  <span className="text-sm font-black text-white">{stats?.feedback?.total || 0}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-8 right-8 z-[200] max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-red-600 rounded-2xl p-4 border border-white/10 shadow-2xl flex items-center gap-4">
            <AlertTriangle className="w-6 h-6 text-white shrink-0" />
            <p className="text-[12px] font-bold text-white">{error}</p>
            <button onClick={() => setError(null)} className="text-white/60 hover:text-white ml-auto">
              <span className="text-lg font-bold">&times;</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
