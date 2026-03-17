import { Compass, Twitter, Github, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 w-full border-t border-white/10 bg-black/40 backdrop-blur-3xl pt-16 pb-8 px-6 lg:px-24">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-10 mb-16">
        {/* Brand Column */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-lg">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-black text-white tracking-widest uppercase drop-shadow-md">
              LUMINA
            </span>
          </div>
          <p className="text-white/50 font-medium text-sm max-w-xs leading-relaxed">
            AI-powered cyber defense platform. Securing the next generation of
            digital infrastructure through intelligent detection and explainable
            analytics.
          </p>
        </div>

        {/* Links Column */}
        <div className="flex flex-col md:flex-row gap-10 md:gap-20">
          <div className="flex flex-col space-y-4">
            <h4 className="font-mono text-xs font-black text-cyan-400 uppercase tracking-widest mb-2">
              Platform
            </h4>
            <a
              href="#detection"
              className="text-sm font-medium text-white/60 hover:text-white transition-colors"
            >
              Detection
            </a>
            <a
              href="#explainability"
              className="text-sm font-medium text-white/60 hover:text-white transition-colors"
            >
              Explainability
            </a>
            <Link
              to="/mitigation"
              className="text-sm font-medium text-white/60 hover:text-white transition-colors"
            >
              Mitigation
            </Link>
          </div>
          <div className="flex flex-col space-y-4">
            <h4 className="font-mono text-xs font-black text-cyan-400 uppercase tracking-widest mb-2">
              Company
            </h4>
            <a
              href="#about"
              className="text-sm font-medium text-white/60 hover:text-white transition-colors"
            >
              About Us
            </a>
            <a
              href="#privacy"
              className="text-sm font-medium text-white/60 hover:text-white transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="#terms"
              className="text-sm font-medium text-white/60 hover:text-white transition-colors"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-xs font-mono tracking-wider text-white/40">
          &copy; {currentYear} LUMINA SECURITY. ALL RIGHTS RESERVED.
        </p>
        <div className="flex items-center space-x-6">
          <a
            href="#"
            className="text-white/40 hover:text-cyan-400 transition-colors"
          >
            <Twitter className="w-4 h-4" />
          </a>
          <a
            href="#"
            className="text-white/40 hover:text-cyan-400 transition-colors"
          >
            <Github className="w-4 h-4" />
          </a>
          <a
            href="#"
            className="text-white/40 hover:text-cyan-400 transition-colors"
          >
            <Linkedin className="w-4 h-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
