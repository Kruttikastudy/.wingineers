import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-black text-white mb-2">
              Welcome, <span className="text-blue-400">{user?.name || "User"}</span>
            </h1>
            <p className="text-white/70 font-medium">
              You are logged in with {user?.email}
            </p>
          </div>
          <button
            onClick={logout}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>

        {/* User Info Card */}
        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <h2 className="text-2xl font-black text-white mb-6">Profile Information</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-slate-700/30 rounded-lg">
              {user?.picture && (
                <img
                  src={user.picture}
                  alt="Profile"
                  className="w-16 h-16 rounded-full border-2 border-blue-400"
                />
              )}
              <div>
                <p className="text-white/60 text-sm uppercase tracking-wider font-bold">Name</p>
                <p className="text-white text-lg font-bold">{user?.name}</p>
              </div>
            </div>
            <div className="p-4 bg-slate-700/30 rounded-lg">
              <p className="text-white/60 text-sm uppercase tracking-wider font-bold">Email</p>
              <p className="text-white font-bold">{user?.email}</p>
            </div>
            <div className="p-4 bg-slate-700/30 rounded-lg">
              <p className="text-white/60 text-sm uppercase tracking-wider font-bold">Email Verified</p>
              <p className="text-blue-400 font-bold">{user?.email_verified ? "Yes" : "No"}</p>
            </div>
          </div>
        </div>

        {/* PhishGuard Protection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <Link
            to="/dashboard/phishing"
            className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-8 backdrop-blur-sm hover:bg-blue-500/15 hover:border-blue-500/40 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">🛡️</span>
                  <h3 className="text-xl font-black text-blue-400">PhishGuard Core</h3>
                </div>
                <p className="text-white/60 font-medium">
                  URL analysis • Threat monitoring
                </p>
              </div>
              <span className="text-white/30 group-hover:text-blue-400 text-2xl transition-colors">→</span>
            </div>
          </Link>

          <Link
            to="/dashboard/voice"
            className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 backdrop-blur-sm hover:bg-red-500/15 hover:border-red-500/40 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">🎙️</span>
                  <h3 className="text-xl font-black text-red-400">Voice Intercept</h3>
                </div>
                <p className="text-white/60 font-medium">
                  Real-time call monitoring • AI Analysis
                </p>
              </div>
              <span className="text-white/30 group-hover:text-red-400 text-2xl transition-colors">→</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
