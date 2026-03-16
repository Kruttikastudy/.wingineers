import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./context/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import DeepfakeDetection from "./pages/DeepfakeDetection";
import Dashboard from "./pages/Dashboard";
import PhishingDashboard from "./pages/PhishingDashboard";
import VoiceDashboard from "./pages/VoiceDashboard";
import XAIDashboard from "./pages/XAIDashboard";

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/deepfake" element={<DeepfakeDetection />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/phishing" element={<PhishingDashboard />} />
            <Route path="/dashboard/voice" element={<VoiceDashboard />} />
            <Route path="/dashboard/xai" element={<XAIDashboard />} />
          </Routes>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
