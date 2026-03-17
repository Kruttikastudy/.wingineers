import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import DeepfakeDetection from "./pages/DeepfakeDetection";
import Dashboard from "./pages/Dashboard";
import PhishingDashboard from "./pages/PhishingDashboard";
import VoiceDashboard from "./pages/VoiceDashboard";
import XAIDashboard from "./pages/XAIDashboard";
import EmailDashboard from "./pages/EmailDashboard";
import Pricing from "./pages/Pricing";
import Mitigation from "./pages/Mitigation";
import PromptInjectionDashboard from "./pages/PromptInjectionDashboard";

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/phishing" element={<PhishingDashboard />} />
            <Route path="/dashboard/voice" element={<VoiceDashboard />} />
            <Route path="/dashboard/email" element={<EmailDashboard />} />
            <Route path="/dashboard/deepfake" element={<DeepfakeDetection />} />
            <Route path="/dashboard/xai" element={<XAIDashboard />} />
            <Route path="/dashboard/prompt-injection" element={<PromptInjectionDashboard />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/mitigation" element={<Mitigation />} />
          </Routes>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
