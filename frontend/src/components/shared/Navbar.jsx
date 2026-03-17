import { Compass, Menu, ArrowRight, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

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
        <Link
          to="/"
          className="text-sm font-semibold text-white/80 hover:text-white transition-colors tracking-wide"
        >
          Home
        </Link>
        <Link
          to="/deepfake"
          className="text-sm font-semibold text-white/80 hover:text-white transition-colors tracking-wide"
        >
          Detection
        </Link>
        <Link
          to="/dashboard/phishing"
          className="text-sm font-semibold text-white/80 hover:text-white transition-colors tracking-wide"
        >
          Phishing
        </Link>
        <Link
          to="/dashboard/prompt-injection"
          className="text-sm font-semibold text-white/80 hover:text-white transition-colors tracking-wide"
        >
          Prompt Guard
        </Link>
        <Link
          to="/dashboard/voice"
          className="text-sm font-semibold text-white/80 hover:text-white transition-colors tracking-wide"
        >
          Voice
        </Link>
        <Link
          to="/mitigation"
          className="text-sm font-semibold text-white/80 hover:text-white transition-colors tracking-wide"
        >
          Mitigation
        </Link>
      </div>

      {/* Actions */}
      <div className="hidden lg:flex items-center space-x-4">
        {user ?
          <>
            <div className="flex items-center justify-center p-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
              {user.picture ?
                <img
                  src={user.picture}
                  alt="Profile"
                  className="w-8 h-8 rounded-full border border-white/20"
                />
              : <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 font-bold text-xs uppercase">
                  {user.email ? user.email.charAt(0) : "U"}
                </div>
              }
            </div>
            <button
              onClick={logout}
              className="font-mono group relative inline-flex items-center justify-center px-6 py-2.5 text-xs font-black text-white uppercase tracking-widest overflow-hidden rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <span className="relative z-10 flex items-center">Logout</span>
            </button>
          </>
        : <Link
            to="/login"
            className="font-mono group relative inline-flex items-center justify-center px-8 py-2.5 text-xs font-black text-white uppercase tracking-widest overflow-hidden rounded-full bg-blue-600 hover:bg-blue-500 transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
          >
            <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
            <span className="relative z-10 flex items-center">
              Log In
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        }
      </div>

      {/* Mobile Menu Icon */}
      <div className="lg:hidden flex items-center gap-4">
        <Link to="/dashboard/voice" className="p-2 text-white/80 hover:text-white bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-md">
          <Phone className="w-5 h-5" />
        </Link>
        <button className="p-2 text-white/80 hover:text-white bg-white/5 border border-white/10 rounded-xl backdrop-blur-md">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </nav>
  );
}
