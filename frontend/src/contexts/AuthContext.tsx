import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import apiClient from "../api/client";

// ── Types ─────────────────────────────────────────────────
interface User {
  userId: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUserContext: (data: Partial<User>) => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

// Create the context with a default value of undefined
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Provider Component ────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On page load, check if there's a stored token
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const accessToken = localStorage.getItem("accessToken");

    if (storedUser && accessToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // Corrupted data — clear it
        localStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  // ── Login ─────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    const response = await apiClient.post("/auth/login", { email, password });
    const { accessToken, refreshToken, user: userData } = response.data;

    // Store tokens and user in localStorage
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("user", JSON.stringify(userData));

    setUser(userData);
  };

  // ── Register ──────────────────────────────────────────
  const register = async (data: RegisterData) => {
    const response = await apiClient.post("/auth/register", data);
    const { accessToken, refreshToken, user: userData } = response.data;

    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("user", JSON.stringify(userData));

    setUser(userData);
  };

  // ── Logout ────────────────────────────────────────────
  const logout = () => {
    // Call server logout (fire and forget)
    apiClient.post("/auth/logout").catch(() => {});

    // Clear local state
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
  };

  const updateUserContext = (data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateUserContext,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ────────────────────────────────────────────────
/**
 * Custom hook to access auth state.
 *
 * Usage in any component:
 *   const { user, login, logout } = useAuth();
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
