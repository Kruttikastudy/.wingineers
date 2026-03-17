import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar";
import StatCard from "../components/voice/StatCard";
import {
  ShieldAlert,
  Activity,
  ChevronRight,
  Fingerprint,
  Mic,
  Phone,
  Radio,
  Zap,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function VoiceDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [liveCalls, setLiveCalls] = useState([]);
  const [history, setHistory] = useState([]);
  const [lastCallSummary, setLastCallSummary] = useState(null);

  const handleCallEnd = (summary) => {
    setLastCallSummary(summary);
    setHistory((prev) => {
      // Avoid duplicates if both heartbeat and status callback fire
      if (prev.find((h) => h.call_sid === summary.call_sid)) return prev;
      return [summary, ...prev].slice(0, 100);
    });
    setLiveCalls((prev) => prev.filter((c) => c.call_sid !== summary.call_sid));
  };

  useEffect(() => {
    // Fetch initial history
    fetch(`${API_BASE}/api/voice/history`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setHistory(data);
        }
      })
      .catch((err) => console.error("Failed to fetch voice history:", err));
  }, []);

  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE}/api/events`);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "VOICE_CALL_TRANSCRIPT") {
          const data = payload.data;
          setLiveCalls((prev) => {
            const existingIdx = prev.findIndex(
              (c) => c.call_sid === data.call_sid,
            );
            const now = Date.now();
            if (existingIdx >= 0) {
              const updated = [...prev];
              updated[existingIdx] = {
                ...updated[existingIdx],
                ...data,
                lastSeen: now,
              };
              return updated;
            }
            return [{ ...data, lastSeen: now }, ...prev].slice(0, 5);
          });
        } else if (payload.type === "VOICE_CALL_ENDED") {
          handleCallEnd(payload.data);
        }
      } catch (err) {
        console.error("SSE Parse Error:", err);
      }
    };

    const staleInterval = setInterval(() => {
      const now = Date.now();
      setLiveCalls((prev) => {
        const stale = prev.filter((c) => now - (c.lastSeen || 0) > 20000);
        if (stale.length > 0) {
          stale.forEach((c) => {
            setTimeout(() => {
              handleCallEnd({
                call_sid: c.call_sid,
                from: c.from,
                overall_risk: c.cumulative?.max_risk || c.analysis.risk_score,
                all_indicators:
                  c.cumulative?.all_indicators || c.analysis.reasons,
                duration_sec: "---",
                status: "timed-out",
              });
            }, 0);
          });
        }
        return prev;
      });
    }, 5000);

    return () => {
      eventSource.close();
      clearInterval(staleInterval);
    };
  }, []);

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
            <span className="text-white/70">Voice Intercept</span>
          </div>
          <div className="flex items-center gap-5">
            <div
              className="flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: "#10b981" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Engine Active
            </div>
            <div
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/50"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              System Normal
            </div>
          </div>
        </header>

        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
              <div className="max-w-2xl">
                <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
                  Voice Intercept
                </h1>
                <p className="text-sm text-white/40">
                  Real-time AI voice monitoring and automated threat
                  neutralization.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                value={liveCalls.length}
                label="Active Streams"
                icon={Radio}
                color="text-red-400"
              />
              <StatCard
                value="24/7"
                label="Neural Watch"
                icon={Mic}
                color="text-amber-400"
              />
              <StatCard
                value={history.length}
                label="Threats Bypassed"
                icon={ShieldAlert}
                color="text-orange-400"
              />
              <StatCard
                value="< 50ms"
                label="Latency"
                icon={Zap}
                color="text-emerald-400"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                <section
                  className="rounded-[2.5rem] p-8 lg:p-10 shadow-2xl relative overflow-hidden"
                  style={{
                    background: "#111827",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center border border-red-500/20">
                        <Activity className="w-4 h-4 text-red-400" />
                      </div>
                      <h2 className="text-xl font-black text-white tracking-tight">
                        Intelligence Stream
                      </h2>
                    </div>
                    {liveCalls.length > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                          Intercept Active
                        </span>
                      </div>
                    )}
                  </div>

                  {liveCalls.length === 0 ?
                    <div className="py-20 text-center text-white/40">
                      <Phone className="w-16 h-16 mx-auto mb-4" />
                      <p className="text-sm font-bold uppercase tracking-widest">
                        Waiting for incoming signal...
                      </p>
                    </div>
                  : <div className="space-y-6">
                      {liveCalls.map((call) => (
                        <div
                          key={call.call_sid}
                          className="bg-black/60 border border-white/5 rounded-3xl p-8 relative group transition-all hover:border-red-500/30"
                        >
                          <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-5">
                              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                                <Fingerprint className="w-7 h-7 text-white/40" />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1 text-left">
                                  Origin
                                </p>
                                <p className="text-xl font-black text-white font-mono">
                                  {call.from}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-8">
                              <div className="text-right border-r border-white/10 pr-8">
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">
                                  Max Risk Score
                                </p>
                                <span
                                  className={`text-2xl font-black ${(call.cumulative?.max_risk || call.analysis.risk_score) > 60 ? "text-red-500" : "text-amber-500"}`}
                                >
                                  {call.cumulative?.max_risk ||
                                    call.analysis.risk_score}
                                  <span className="text-xs text-white/20 ml-1">
                                    /100
                                  </span>
                                </span>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">
                                  Confidence Index
                                </p>
                                <span className="text-2xl font-black text-cyan-400">
                                  {call.analysis.confidence || "92.4"}
                                  <span className="text-xs text-white/20 ml-1">
                                    %
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-red-500/5 rounded-2xl p-6 mb-6 border border-white/5 italic">
                            <p className="text-white/90 text-lg leading-relaxed font-medium">
                              "{call.text}"
                            </p>
                          </div>

                          <div className="mb-4">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">
                              Threat Indicators
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {(
                                call.cumulative?.all_indicators ||
                                call.analysis.reasons
                              ).map((reason, i) => (
                                <span
                                  key={i}
                                  className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] font-black text-red-400 uppercase tracking-widest"
                                >
                                  {reason}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="absolute top-8 right-8">
                            <button className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase rounded-2xl shadow-xl shadow-red-600/30 transition-all active:scale-95">
                              Kill Signal
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  }
                </section>
              </div>

              <div className="lg:col-span-4 space-y-8">
                <section
                  className="rounded-[2.5rem] p-8 shadow-2xl relative"
                  style={{
                    background: "#111827",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <h2 className="text-xs font-black text-white/30 uppercase tracking-[0.2em] mb-6">
                    Recent Alerts
                  </h2>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {history.length === 0 ?
                      <p className="text-xs text-white/20 italic">
                        No historical threats detected.
                      </p>
                    : history.map((h, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4 group transition-all hover:bg-white/10"
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              h.overall_risk > 60 ? "bg-red-500"
                              : h.overall_risk > 30 ? "bg-amber-500"
                              : "bg-emerald-500"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">
                              {h.from}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`text-[10px] font-black px-1.5 py-0.5 rounded bg-white/5 ${h.overall_risk > 60 ? "text-red-400" : "text-amber-400"}`}
                              >
                                MAX SCORE: {h.overall_risk}
                              </span>
                              <p className="text-[10px] text-white/40 uppercase tracking-tighter">
                                {h.duration_sec}s • {h.status}
                              </p>
                            </div>
                            {h.all_indicators &&
                              h.all_indicators.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {h.all_indicators
                                    .slice(0, 3)
                                    .map((tag, j) => (
                                      <span
                                        key={j}
                                        className="px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-[8px] font-black text-red-400 uppercase tracking-widest leading-none"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  {h.all_indicators.length > 3 && (
                                    <span className="text-[8px] text-white/20 font-bold self-center">
                                      +{h.all_indicators.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40" />
                        </div>
                      ))
                    }
                  </div>
                </section>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Detail Modal Overlay */}
      {lastCallSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
          <div className="max-w-lg w-full bg-[#111827] border border-white/10 rounded-3xl p-8 relative">
            <div className="absolute top-4 right-4 animate-pulse">
              <ShieldAlert className="w-8 h-8 text-red-500 opacity-50" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">
              Intercept Report
            </h3>
            <p className="text-xs font-bold text-white/40 font-mono tracking-widest mb-6">
              SID: {lastCallSummary.call_sid}
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                  Overall Risk
                </span>
                <span
                  className={`text-xl font-black ${lastCallSummary.overall_risk >= 70 ? "text-red-400" : "text-emerald-400"}`}
                >
                  {lastCallSummary.overall_risk}
                </span>
              </div>

              <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                  Duration
                </span>
                <span className="text-sm font-bold text-white font-mono">
                  {lastCallSummary.duration_sec}s
                </span>
              </div>

              <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                  Indicators
                </span>
                <div className="flex items-center gap-2">
                  {lastCallSummary.all_indicators?.map((ind, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-white/10 rounded text-[10px] font-bold text-white/50 uppercase tracking-widest"
                    >
                      {ind}
                    </span>
                  ))}
                  {(!lastCallSummary.all_indicators ||
                    lastCallSummary.all_indicators.length === 0) && (
                    <span className="text-sm text-white/30 italic">None</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setLastCallSummary(null)}
                className="w-full py-4 bg-white text-black text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-white/90 transition-all font-mono"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
