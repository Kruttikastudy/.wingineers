import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Restore session from localStorage on app load
    const token = localStorage.getItem("googleToken");
    if (token) {
      try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const userData = JSON.parse(jsonPayload);
        setUser(userData);
      } catch (err) {
        console.error("Failed to restore session:", err);
        localStorage.removeItem("googleToken");
      }
    }
    setLoading(false);
  }, []);

  // Save user data to MongoDB
  const saveUserToMongo = async (userData, provider) => {
    try {
      const endpoint = provider === "google" ? "/auth/google" : "/auth/login";
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to save user");
      }

      const result = await response.json();
      console.log(`✅ User saved to MongoDB: ${userData.email}`);
      return result;
    } catch (err) {
      console.error(`❌ Failed to save user to MongoDB: ${err.message}`);
      // Don't throw - frontend should work even if MongoDB save fails
    }
  };

  const handleLoginSuccess = async (credential) => {
    try {
      setLoading(true);
      // Decode JWT token (basic payload parsing)
      const base64Url = credential.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const userData = JSON.parse(jsonPayload);
      setUser(userData);
      setError(null);
      localStorage.setItem("googleToken", credential);

      // Save user to MongoDB
      await saveUserToMongo(
        {
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
          sub: userData.sub,
        },
        "google"
      );
    } catch (err) {
      setError("Failed to parse user data");
      console.error("Auth error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginError = () => {
    setError("Login failed. Please try again.");
  };

  // Manual login with email/password
  const manualLogin = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      // Save to MongoDB and get response
      const response = await saveUserToMongo({ email, password }, "email");

      if (response?.success) {
        // Create a minimal user object for frontend state
        const userData = {
          email,
          name: email.split("@")[0],
          iss: "manual-auth",
          sub: response.user_id || email,
        };

        setUser(userData);
        localStorage.setItem("manualToken", email);
        return { success: true };
      } else {
        setError("Login failed. Please try again.");
        return { success: false };
      }
    } catch (err) {
      const errorMsg = err.message || "Login failed";
      setError(errorMsg);
      console.error("Manual login error:", err);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("googleToken");
    localStorage.removeItem("manualToken");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        handleLoginSuccess,
        handleLoginError,
        manualLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
