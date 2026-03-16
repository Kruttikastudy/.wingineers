import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

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

  const handleLoginSuccess = (credential) => {
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem("googleToken");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        handleLoginSuccess,
        handleLoginError,
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
