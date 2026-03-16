import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/shared/Navbar";
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

export default function VoiceDashboard() {
  const { user } = useAuth();
  const [liveCalls, setLiveCalls] = useState([]);
  const [history, setHistory] = useState([]);
  const [lastCallSummary, setLastCallSummary] = useState(null);

  const handleCallEnd = (summary) => {
    setLastCallSummary(summary);
    setHistory(prev => {
      // Avoid duplicates if both heartbeat and status callback fire
      if (prev.find(h => h.call_sid === summary.call_sid)) return prev;
      return [summary, ...prev].slice(0, 20);
    });
    setLiveCalls(prev => prev.filter(c => c.call_sid !== summary.call_sid));
  };

  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE}/api/events`);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "VOICE_CALL_TRANSCRIPT") {
          const data = payload.data;
          setLiveCalls(prev => {
            const existingIdx = prev.findIndex(c => c.call_sid === data.call_sid);
            const now = Date.now();
            if (existingIdx >= 0) {
              const updated = [...prev];
              updated[existingIdx] = { ...updated[existingIdx], ...data, lastSeen: now };
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
      setLiveCalls(prev => {
        const stale = prev.filter(c => now - (c.lastSeen || 0) > 20000);
        if (stale.length > 0) {
          stale.forEach(c => {
            setTimeout(() => {
              handleCallEnd({
                call_sid: c.call_sid,
                from: c.from,
                overall_risk: c.cumulative?.max_risk || c.analysis.risk_score,
                all_indicators: c.cumulative?.all_indicators || c.analysis.reasons,
                duration_sec: "---",
                status: "timed-out"
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
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-500/30 overflow-x-hidden pt-24 pb-20">
      <Navbar />

      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-red-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] left-[-5%] w-[500px] h-[500px] bg-amber-900/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div className="max-w-2xl">
            <h1 className="text-5xl lg:text-6xl font-black tracking-tighter mb-4 italic leading-tight">
              VOICE{" "}
              <span className="inline-block pr-6 text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-500 to-amber-600 italic">
                INTERCEPT
              </span>
            </h1>
            <p className="text-lg text-white/40 font-medium">
              Real-time AI voice monitoring and automated threat neutralization.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard value={liveCalls.length} label="Active Streams" icon={Radio} color="text-red-400" />
          <StatCard value="24/7" label="Neural Watch" icon={Mic} color="text-amber-400" />
          <StatCard value={history.length} label="Threats Bypassed" icon={ShieldAlert} color="text-orange-400" />
          <StatCard value="< 50ms" label="Latency" icon={Zap} color="text-yellow-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-8">
            <section className="bg-gradient-to-br from-white/5 to-transparent backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl relative overflow-hidden">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center border border-red-500/20">
                      <Activity className="w-4 h-4 text-red-400" />
                    </div>
                    <h2 className="text-xl font-black text-white tracking-tight">Intelligence Stream</h2>
                  </div>
                  {liveCalls.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 animate-pulse">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Intercept Active</span>
                    </div>
                  )}
               </div>

               {liveCalls.length === 0 ? (
                 <div className="py-20 text-center opacity-30">
                    <Phone className="w-16 h-16 mx-auto mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">Waiting for incoming signal...</p>
                 </div>
               ) : (
                 <div className="space-y-6">
                    {liveCalls.map((call) => (
                      <div key={call.call_sid} className="bg-black/60 border border-white/5 rounded-3xl p-8 relative group transition-all hover:border-red-500/30">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                              <Fingerprint className="w-7 h-7 text-white/40" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1 text-left">Origin</p>
                              <p className="text-xl font-black text-white font-mono">{call.from}</p>
                            </div>
                          </div>
                          <div className="flex gap-8">
                            <div className="text-right border-r border-white/10 pr-8">
                              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Risk Score</p>
                              <span className={`text-2xl font-black ${call.analysis.risk_score > 60 ? 'text-red-500' : 'text-amber-500'}`}>
                                {call.analysis.risk_score}
                                <span className="text-xs text-white/20 ml-1">/100</span>
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Confidence Index</p>
                              <span className="text-2xl font-black text-cyan-400">
                                {call.analysis.confidence || '92.4'}
                                <span className="text-xs text-white/20 ml-1">%</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-red-500/5 rounded-2xl p-6 mb-6 border border-white/5 italic">
                          <p className="text-white/90 text-lg leading-relaxed font-medium">"{call.text}"</p>
                        </div>

                        <div className="mb-4">
                          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">Threat Indicators</p>
                          <div className="flex flex-wrap gap-2">
                            {call.analysis.reasons.map((reason, i) => (
                              <span key={i} className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] font-black text-red-400 uppercase tracking-widest">
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="absolute top-8 right-8">
                           <button className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase rounded-2xl shadow-xl shadow-red-600/30 transition-all active:scale-95">Kill Signal</button>
                        </div>
                      </div>
                    ))}
                 </div>
               )}
            </section>
          </div>

          <div className="lg:col-span-4 space-y-8">
             <section className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative">
                <h2 className="text-xs font-black text-white/30 uppercase tracking-[0.2em] mb-6">Recent Alerts</h2>
                <div className="space-y-4">
                   {history.length === 0 ? (
                      <p className="text-xs text-white/20 italic">No historical threats detected.</p>
                   ) : (
                      history.slice(0, 5).map((h, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4 group transition-all hover:bg-white/10">
                           <div className={`w-2 h-2 rounded-full ${h.overall_risk > 60 ? 'bg-red-500' : h.overall_risk > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                           <div className="flex-1 min-w-0">
                             <p className="text-xs font-bold text-white truncate">{h.from}</p>
                             <div className="flex items-center gap-2 mt-1">
                               <span className={`text-[10px] font-black px-1.5 py-0.5 rounded bg-white/5 ${h.overall_risk > 60 ? 'text-red-400' : 'text-amber-400'}`}>
                                 SCORE: {h.overall_risk}
                               </span>
                               <p className="text-[10px] text-white/40 uppercase tracking-tighter">
                                 {h.duration_sec}s • {h.status}
                               </p>
                             </div>
                             {h.all_indicators && h.all_indicators.length > 0 && (
                               <div className="flex flex-wrap gap-1 mt-2">
                                 {h.all_indicators.slice(0, 3).map((tag, j) => (
                                   <span key={j} className="px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-[8px] font-black text-red-400 uppercase tracking-widest leading-none">
                                     {tag}
                                   </span>
                                 ))}
                                 {h.all_indicators.length > 3 && (
                                   <span className="text-[8px] text-white/20 font-bold self-center">+{h.all_indicators.length - 3}</span>
                                 )}
                               </div>
                             )}
                           </div>
                           <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40" />
                        </div>
                      ))
                   )}
                </div>
             </section>
          </div>
        </div>
      </div>

      {/* Final Call Report Modal */}
      {lastCallSummary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60 font-sans">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <div className={`h-2 w-full ${lastCallSummary.overall_risk > 60 ? 'bg-red-500' : 'bg-amber-500'}`} />
            
            <div className="p-10">
               <h2 className="text-4xl font-black text-white tracking-tighter mb-2 italic">FINAL MITIGATION REPORT</h2>
               <p className="text-white/40 text-sm font-bold uppercase tracking-widest mb-10">Signal Terminated • Post-Call Analysis Complete</p>
               
               <div className="grid grid-cols-2 gap-6 mb-10">
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-6">
                     <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Overall Risk Score</p>
                     <p className={`text-4xl font-black ${lastCallSummary.overall_risk > 60 ? 'text-red-500' : 'text-amber-500'}`}>
                       {lastCallSummary.overall_risk}<span className="text-lg text-white/20">/100</span>
                     </p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-6">
                     <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Duration</p>
                     <p className="text-4xl font-black text-white">{lastCallSummary.duration_sec}s</p>
                  </div>
               </div>

               <div className="bg-white/5 border border-white/5 rounded-3xl p-8 mb-10">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">Final Threat Assessment</p>
                  {lastCallSummary.all_indicators.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                       {lastCallSummary.all_indicators.map((reason, i) => (
                         <span key={i} className="px-5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-black text-red-400 uppercase tracking-widest">{reason}</span>
                       ))}
                    </div>
                  ) : (
                    <p className="text-emerald-400 font-bold">Call verified as safe. No malicious intent patterns detected during this session.</p>
                  )}
               </div>

               <button 
                onClick={() => setLastCallSummary(null)}
                className="w-full py-5 bg-white text-black text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-white/90 transition-all font-mono"
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
