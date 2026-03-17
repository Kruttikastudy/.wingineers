import { useAuth } from "../context/AuthContext";
import { useNavigate, Link, Navigate } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar";
import { ChevronRight, Globe, Mic2, Mail, Film, Microscope, Sparkles, Shield, CreditCard, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "#080d14" }}>
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent"></div>
          <p className="mt-4 text-white font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const features = [
    {
      title: "Phishing Detection",
      description: "Advanced URL and email analysis to detect phishing attempts and malicious links in real-time.",
      icon: Globe,
      color: "#06b6d4",
      route: "/dashboard/phishing",
      highlights: ["URL scanning", "Email analysis", "Real-time alerts"]
    },
    {
      title: "Voice Authentication",
      description: "Detect voice-based threats including deepfake audio and synthetic voice attacks.",
      icon: Mic2,
      color: "#8b5cf6",
      route: "/dashboard/voice",
      highlights: ["Audio analysis", "Deepfake detection", "Voice patterns"]
    },
    {
      title: "Email Security",
      description: "Comprehensive email threat analysis with header anomaly detection and sender verification.",
      icon: Mail,
      color: "#3b82f6",
      route: "/dashboard/email",
      highlights: ["Header analysis", "Sender verification", "Content scanning"]
    },
    {
      title: "Deepfake Detection",
      description: "Analyze audio and video files to detect AI-generated manipulation and synthetic content.",
      icon: Film,
      color: "#ec4899",
      route: "/dashboard/deepfake",
      highlights: ["Video analysis", "Audio analysis", "Confidence scoring"]
    },
    {
      title: "Explainable AI (XAI)",
      description: "Understand threat detection reasoning with detailed explanations and insight into analysis decisions.",
      icon: Microscope,
      color: "#f59e0b",
      route: "/dashboard/xai",
      highlights: ["Interpretability", "Analysis breakdown", "Risk insights"]
    },
    {
      title: "Prompt Guard",
      description: "Protect against prompt injection attacks and malicious input manipulation in AI systems.",
      icon: Sparkles,
      color: "#10b981",
      route: "/dashboard/prompt-injection",
      highlights: ["Injection detection", "Input validation", "AI safety"]
    }
  ];

  return (
    <div className="min-h-screen flex" style={{ background: "#080d14", fontFamily: "'Inter', sans-serif" }}>
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
            <span className="text-white/70">Overview</span>
          </div>
          <Link
            to="/pricing"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:bg-white/10"
            style={{ color: "#10b981" }}
          >
            <CreditCard className="w-4 h-4" />
            Upgrade Plan
          </Link>
        </header>

        {/* Body */}
        <main className="flex-1 px-8 py-8 overflow-y-auto">
          {/* Welcome Section */}
          <div className="mb-12">
            <h2 className="font-mono text-sm tracking-[0.3em] font-black text-cyan-400 uppercase mb-3">
              Welcome Back
            </h2>
            <h1 className="font-display text-4xl font-black text-white mb-2">
              KES Lumina
              <span className="text-white/30"> Threat Intelligence</span>
            </h1>
            <p className="text-sm text-white/50 font-medium max-w-3xl">
              Your comprehensive cybersecurity platform for detecting, analyzing, and mitigating threats across multiple domains.
              Leverage advanced AI and machine learning to stay ahead of emerging threats.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.title}
                  to={feature.route}
                  className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer"
                  style={{
                    background: "#111827",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {/* Gradient border on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: `linear-gradient(135deg, ${feature.color}20 0%, ${feature.color}10 100%)`,
                      pointerEvents: "none"
                    }}
                  />

                  <div className="relative p-6 flex flex-col h-full">
                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-all duration-300"
                      style={{ background: `${feature.color}15`, color: feature.color }}
                    >
                      <Icon className="w-6 h-6" />
                    </div>

                    {/* Title and Description */}
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-white transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-white/50 mb-4 flex-1">
                      {feature.description}
                    </p>

                    {/* Highlights */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {feature.highlights.map((highlight, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider"
                          style={{ background: `${feature.color}20`, color: feature.color }}
                        >
                          {highlight}
                        </span>
                      ))}
                    </div>

                    {/* Arrow */}
                    <div
                      className="flex items-center gap-2 text-xs font-semibold transition-all duration-300 group-hover:gap-3"
                      style={{ color: feature.color }}
                    >
                      Explore
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Key Capabilities Section */}
          <div
            className="rounded-xl p-8 mb-12"
            style={{
              background: "linear-gradient(135deg, #0f172a 0%, #111827 60%, #0c1528 100%)",
              border: "1px solid rgba(99,102,241,0.15)",
            }}
          >
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <Shield className="w-5 h-5" style={{ color: "#10b981" }} />
              Key Capabilities
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { label: "Real-time Analysis", desc: "Instant threat detection and categorization" },
                { label: "Multi-modal Detection", desc: "Text, audio, video, and image analysis" },
                { label: "Risk Scoring", desc: "Comprehensive risk assessment algorithms" },
                { label: "Explainable AI", desc: "Transparent reasoning for all detections" },
                { label: "Regional Support", desc: "8+ Indian languages supported" },
                { label: "Secure Processing", desc: "Enterprise-grade data protection" },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                    style={{ background: "#06b6d4" }}
                  />
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">{item.label}</h4>
                    <p className="text-xs text-white/50">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subscription Info */}
          <div
            className="rounded-xl p-6 border"
            style={{
              background: "rgba(16, 185, 129, 0.05)",
              borderColor: "rgba(16, 185, 129, 0.2)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Premium Features</h4>
                <p className="text-xs text-white/50">
                  Upgrade to Premium for unlimited scans, deepfake analysis, and regional language support.
                </p>
              </div>
              <Link
                to="/pricing"
                className="px-4 py-2 rounded-lg font-semibold text-xs uppercase tracking-widest transition-all"
                style={{
                  background: "linear-gradient(135deg, #10b981, #06b6d4)",
                  color: "white"
                }}
              >
                View Plans
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
