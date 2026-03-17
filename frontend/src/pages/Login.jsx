import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import loginImage from "../assets/login.avif";
import LoginHero from "../components/login/LoginHero";
import LoginForm from "../components/login/LoginForm";

export default function Login() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-black">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-400 border-t-transparent"></div>
          <p className="mt-4 text-white font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="relative min-h-screen w-full font-sans overflow-hidden flex items-center justify-end">
      {/* Background Image Layer */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.5s] ease-out scale-100"
        style={{ backgroundImage: `url(${loginImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent"></div>
      </div>

      {/* Hero Section (Left) */}
      <LoginHero />

      {/* Login Form Section (Right) */}
      <LoginForm />
    </div>
  );
}
