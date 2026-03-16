import { Layers, Globe, Lock, Cpu } from "lucide-react";

export default function LandingFeatures() {
  const features = [
    {
      title: "Hyperbolic Speed",
      description:
        "Experience latency so low it boundaries unnoticeable. A perfectly distributed global edge network ensures your operations execute at the theoretical limit of speed.",
      icon: ZapIcon,
    },
    {
      title: "Global Scale",
      description:
        "Deploy once, scale infinitely. Our architecture seamlessly expands across hundreds of availability zones, giving you the power to handle millions of connections without a thought.",
      icon: GlobeIcon,
    },
    {
      title: "Zero-Trust Security",
      description:
        "Your data is cryptographically isolated. We enforce strict zero-trust protocols at every layer, guaranteeing that access is continuously verified and completely inviolable.",
      icon: LockIcon,
    },
    {
      title: "Neural Analytics",
      description:
        "Harness the power of integrated machine learning. Identify patterns, automate complex optimizations, and make predictive decisions with unprecedented accuracy.",
      icon: CpuIcon,
    },
  ];

  return (
    <section
      id="features"
      className="relative z-10 w-full max-w-6xl mx-auto px-6 py-32 lg:py-48"
    >
      {/* Section Header */}
      <div className="text-center mb-32 lg:mb-48">
        <h2 className="font-mono text-sm tracking-[0.3em] font-black text-white/50 uppercase mb-4">
          Core Capabilities
        </h2>
        <h3 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight">
          Engineered for <span className="text-white/40">Scale</span>
        </h3>
      </div>

      {/* Stacked Cards Container */}
      <div className="flex flex-col relative pb-32">
        {features.map((feature, idx) => (
          <div
            key={idx}
            className={`sticky flex flex-col ${
              idx % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
            } items-stretch min-h-[500px] w-full bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden mb-24 transition-all duration-500`}
            style={{
              top: `calc(15vh + ${idx * 40}px)`,
              zIndex: idx * 10,
            }}
          >
            {/* Text Content */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center p-10 lg:p-20 relative z-10">
              <div className="font-mono text-white/30 font-black text-5xl lg:text-7xl mb-6 opacity-30 select-none">
                0{idx + 1}
              </div>
              <h4 className="font-display text-3xl flex items-center lg:text-4xl font-bold text-white mb-6">
                <feature.icon className="w-8 h-8 mr-4 text-white/80" />
                {feature.title}
              </h4>
              <p className="font-sans text-lg text-white/60 leading-relaxed font-medium">
                {feature.description}
              </p>
            </div>

            {/* Visual Graphic Representation (Clean, Minimalist) */}
            <div
              className={`w-full lg:w-1/2 relative flex items-center justify-center p-10 lg:p-20 bg-gradient-to-br from-white/[0.03] to-transparent ${idx % 2 === 0 ? "border-t lg:border-t-0 lg:border-l" : "border-t lg:border-t-0 lg:border-r"} border-white/5`}
            >
              {/* Abstract geometric representation */}
              <div className="relative w-full aspect-square max-w-[300px]">
                <div className="absolute inset-0 border border-white/10 rounded-full"></div>
                <div className="absolute inset-4 border border-white/5 rounded-full scale-90"></div>
                <div className="absolute inset-8 border border-white/[0.02] rounded-full scale-80"></div>

                {/* Subtle light sweep */}
                <div
                  className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 rounded-full transform -rotate-45"
                  style={{ filter: "blur(20px)" }}
                ></div>

                {/* Center crisp icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <feature.icon
                    className="w-24 h-24 text-white/20"
                    strokeWidth={1}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Simple internal icon components to avoid excessive lucide imports for custom styling
function ZapIcon(props) {
  return <Layers {...props} />;
}
function GlobeIcon(props) {
  return <Globe {...props} />;
}
function LockIcon(props) {
  return <Lock {...props} />;
}
function CpuIcon(props) {
  return <Cpu {...props} />;
}
