import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  AuthUser,
  RememberedAccount,
  getCurrentUser,
  getRememberedAccounts,
  loginUser,
  logoutCurrentSession,
  registerUser,
  switchAccountSession,
} from "../api/auth";

// ── Types ─────────────────────────────────────────────────
type User = AuthUser;

interface AuthContextType {
  user: User | null;
  accounts: RememberedAccount[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  switchAccount: (sessionId: string) => Promise<void>;
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
  const [accounts, setAccounts] = useState<RememberedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("user");
      }
    }

    if (import.meta.env.MODE === "test") {
      setIsLoading(false);
      return;
    }

    void (async () => {
      try {
        const [rememberedAccounts, currentUser] = await Promise.all([
          getRememberedAccounts(),
          getCurrentUser(),
        ]);
        setAccounts(rememberedAccounts);
        setUser(currentUser);
        localStorage.setItem("user", JSON.stringify(currentUser));
      } catch {
        try {
          const rememberedAccounts = await getRememberedAccounts();
          setAccounts(rememberedAccounts);
        } catch {
          setAccounts([]);
        }

        setUser(null);
        localStorage.removeItem("user");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Login ─────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    const response = await loginUser(email, password);
    const rememberedAccounts = await getRememberedAccounts();
    setAccounts(rememberedAccounts);
    setUser(response.user);
    localStorage.setItem("user", JSON.stringify(response.user));
  };

  // ── Register ──────────────────────────────────────────
  const register = async (data: RegisterData) => {
    const response = await registerUser(data);
    const rememberedAccounts = await getRememberedAccounts();
    setAccounts(rememberedAccounts);
    setUser(response.user);
    localStorage.setItem("user", JSON.stringify(response.user));
  };

  // ── Logout ────────────────────────────────────────────
  const logout = async () => {
    await logoutCurrentSession().catch(() => {});
    const rememberedAccounts = await getRememberedAccounts().catch(() => []);
    setAccounts(rememberedAccounts);
    setUser(null);
    localStorage.removeItem("user");
  };

  const switchAccount = async (sessionId: string) => {
    const nextUser = await switchAccountSession(sessionId);
    const rememberedAccounts = await getRememberedAccounts();
    setAccounts(rememberedAccounts);
    setUser(nextUser);
    localStorage.setItem("user", JSON.stringify(nextUser));
  };

  const updateUserContext = (data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      const nextAccounts = accounts.map((account) =>
        account.user.userId === updated.userId
          ? { ...account, user: { ...account.user, ...data } }
          : account
      );
      setAccounts(nextAccounts);
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  const value: AuthContextType = {
    user,
    accounts,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    switchAccount,
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
