import apiClient from "./client";

export interface AuthUser {
  userId: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  isActive: boolean;
}

export interface RememberedAccount {
  sessionId: string;
  user: AuthUser;
  lastActiveAt: string;
}

export interface AuthResponse {
  expiresIn: number;
  user: AuthUser;
}

export async function loginUser(email: string, password: string) {
  const response = await apiClient.post<AuthResponse>("/auth/login", { email, password });
  return response.data;
}

export async function registerUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}) {
  const response = await apiClient.post<AuthResponse>("/auth/register", data);
  return response.data;
}

export async function getCurrentUser() {
  const response = await apiClient.get<AuthUser>("/auth/me");
  return response.data;
}

export async function getRememberedAccounts() {
  const response = await apiClient.get<{ accounts: RememberedAccount[] }>("/auth/accounts");
  return response.data.accounts;
}

export async function switchAccountSession(sessionId: string) {
  const response = await apiClient.post<AuthUser>("/auth/switch-account", { sessionId });
  return response.data;
}

export async function logoutCurrentSession() {
  await apiClient.post("/auth/logout");
}
