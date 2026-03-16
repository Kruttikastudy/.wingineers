import { Compass, Menu, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingNavbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 lg:px-24 py-6 transition-all duration-300 bg-transparent">
      <div className="flex items-center space-x-3 cursor-pointer group">
        <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-lg group-hover:bg-white/20 transition-all duration-300">
          <Compass className="w-5 h-5 text-white" />
        </div>
        <span className="font-display text-xl font-black text-white tracking-widest uppercase drop-shadow-md">
          LUMINA
        </span>
      </div>

      {/* Desktop Menu */}
      <div className="hidden lg:flex items-center space-x-10 px-8 py-3 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl">
        <a
          href="#detection"
          className="text-sm font-semibold text-white/80 hover:text-white transition-colors tracking-wide"
        >
          Detection
        </a>
        <a
          href="#explainability"
          className="text-sm font-semibold text-white/80 hover:text-white transition-colors tracking-wide"
        >
          Explainability
        </a>
        <a
          href="#mitigation"
          className="text-sm font-semibold text-white/80 hover:text-white transition-colors tracking-wide"
        >
          Mitigation
        </a>
        <a
          href="#dashboard"
          className="text-sm font-semibold text-white/80 hover:text-white transition-colors tracking-wide"
        >
          Dashboard
        </a>
      </div>

      {/* Actions */}
      <div className="hidden lg:flex items-center">
        <Link
          to="/login"
          className="font-mono group relative inline-flex items-center justify-center px-8 py-2.5 text-xs font-black text-white uppercase tracking-widest overflow-hidden rounded-full bg-blue-600 hover:bg-blue-500 transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
        >
          <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
          <span className="relative z-10 flex items-center">
            Log In
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>
      </div>

      {/* Mobile Menu Icon */}
      <button className="lg:hidden p-2 text-white/80 hover:text-white bg-white/5 border border-white/10 rounded-xl backdrop-blur-md">
        <Menu className="w-6 h-6" />
      </button>
    </nav>
  );
}
