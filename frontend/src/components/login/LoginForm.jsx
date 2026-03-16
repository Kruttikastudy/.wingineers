import { useState, useRef, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const { user, handleLoginSuccess, handleLoginError, loading, error } =
    useAuth();
  const googleButtonRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleGoogleClick = () => {
    googleButtonRef.current?.querySelector("div[role='button']")?.click();
  };

  const handleManualLogin = (e) => {
    e.preventDefault();
    navigate("/"); // Redirect to landing manually if Google isn't used
  };

  return (
    <div className="relative z-10 w-full lg:w-[38%] h-screen flex flex-col justify-center px-8 sm:px-12 md:px-20 lg:px-16 xl:px-24 bg-black/20 backdrop-blur-3xl border-l border-white/10 shadow-2xl">
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-12 text-center lg:text-left">
          <h2 className="font-mono text-sm font-black text-blue-400 uppercase tracking-[0.3em] mb-3 drop-shadow-sm">
            LUMINA
          </h2>
          <h3 className="font-display text-4xl font-extrabold text-white mb-3 tracking-tight drop-shadow-md">
            Sign In
          </h3>
          <p className="text-base text-white/90 font-bold drop-shadow-sm">
            Elevate your workflow today.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleManualLogin}>
          {/* Email Field */}
          <div className="space-y-2">
            <label
              className="font-mono block text-[10px] font-black text-white/80 uppercase tracking-widest ml-1"
              htmlFor="email"
            >
              Email Address
            </label>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/60 group-focus-within/input:text-blue-400 transition-colors">
                <Mail className="h-5 w-5" />
              </div>
              <input
                id="email"
                type="email"
                placeholder="name@nexus.com"
                className="block w-full pl-12 pr-4 py-4 border border-white/20 rounded-2xl leading-5 bg-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white/20 transition-all duration-300 text-sm shadow-xl font-medium"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label
                className="font-mono block text-[10px] font-black text-white/80 uppercase tracking-widest"
                htmlFor="password"
              >
                Password
              </label>
              <a
                href="#"
                className="font-black text-xs text-blue-400 hover:text-blue-300 transition-colors tracking-wide underline underline-offset-2"
              >
                Forgot?
              </a>
            </div>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/60 group-focus-within/input:text-blue-400 transition-colors">
                <Lock className="h-5 w-5" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="block w-full pl-12 pr-12 py-4 border border-white/20 rounded-2xl leading-5 bg-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white/20 transition-all duration-300 text-sm shadow-xl font-medium"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/60 hover:text-white focus:outline-none transition-colors"
              >
                {showPassword ?
                  <EyeOff className="h-5 w-5" />
                : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center pt-2">
            <input
              id="remember_me"
              type="checkbox"
              className="h-4.5 w-4.5 text-blue-500 focus:ring-blue-500/50 border-white/30 rounded bg-white/10 cursor-pointer"
            />
            <label
              htmlFor="remember_me"
              className="ml-3 block text-sm text-white/90 cursor-pointer font-bold hover:text-white transition-colors"
            >
              Remember this session
            </label>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full relative flex justify-center items-center py-4 px-4 rounded-2xl shadow-xl text-sm font-black text-white bg-blue-600 hover:bg-blue-500 transform transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden group shadow-blue-500/40"
            >
              <span className="font-mono relative z-10 flex items-center uppercase tracking-widest text-[11px]">
                Authenticate
                <svg
                  className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </span>
            </button>
          </div>

          <div className="flex items-center my-8">
            <div className="flex-grow border-t border-white/20"></div>
            <span className="font-mono px-4 text-[10px] text-white/60 font-black uppercase tracking-[0.3em] shrink-0">
              OR
            </span>
            <div className="flex-grow border-t border-white/20"></div>
          </div>

          <div ref={googleButtonRef} className="hidden">
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                handleLoginSuccess(credentialResponse.credential);
              }}
              onError={handleLoginError}
              theme="filled_black"
            />
          </div>
          <div>
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={loading}
              className="font-mono w-full flex justify-center items-center py-4 px-4 border border-white/20 rounded-2xl bg-white/10 text-xs font-black text-white hover:bg-white/20 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 tracking-wider"
            >
              <svg
                className="h-5 w-5 mr-3"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.86C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.05H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.95l3.66-2.86z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.86c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {loading ? "Signing in..." : "Continue with Google"}
            </button>
          </div>
          {error && (
            <div className="text-red-400 text-xs text-center font-bold mt-3">
              {error}
            </div>
          )}
        </form>

        <p className="mt-12 text-center text-xs text-white/70 tracking-wide font-medium">
          First time here?{" "}
          <a
            href="#"
            className="font-black text-blue-400 hover:text-blue-300 transition-colors uppercase ml-1 underline decoration-blue-400/30 underline-offset-4"
          >
            Create Account
          </a>
        </p>
      </div>
    </div>
  );
}
