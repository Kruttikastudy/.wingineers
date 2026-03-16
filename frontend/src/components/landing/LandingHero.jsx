import { ChevronRight } from "lucide-react";
import landingImage from "../../assets/landing.png";

export default function LandingHero() {
  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center px-6 pt-20 lg:pt-0 text-center overflow-hidden">
      {/* Local Background Image Layer just for Hero */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${landingImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
        {/* Headline */}
        <h1 className="font-display text-5xl sm:text-6xl lg:text-[5.5rem] font-black tracking-tighter leading-[1.05] text-white drop-shadow-[0_10px_40px_rgba(0,0,0,0.8)] mb-6">
          AI-Powered <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            Cyber Defense
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-base sm:text-lg lg:text-xl text-white/90 font-bold leading-relaxed max-w-2xl drop-shadow-2xl mb-10">
          Detect, analyze, and explain emerging cyber threats using intelligent
          ML models. Understand the <span className="text-teal-300">why</span>{" "}
          behind every alert and take decisive action.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full sm:w-auto">
          <button className="group w-full sm:w-auto flex justify-center items-center py-4 px-10 rounded-full shadow-[0_0_40px_rgba(45,212,191,0.5)] text-sm font-black text-white bg-teal-500 hover:bg-teal-400 transform transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] uppercase tracking-widest border border-teal-300/30">
            <span className="relative z-10 flex items-center">
              Scan Threat
              <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>

          <button className="w-full sm:w-auto flex justify-center items-center py-4 px-10 rounded-full shadow-2xl text-sm font-black text-white bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/20 transform transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] uppercase tracking-widest">
            View Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
