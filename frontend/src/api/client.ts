import axios from "axios";

// Create a configured axios instance
const apiClient = axios.create({
  // In development, Vite proxies /api to http://localhost:8080
  // In production, we use VITE_API_BASE_URL if provided, else default to /api/v1
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 seconds
});

// ─── REQUEST INTERCEPTOR ──────────────────────────────────
// Runs BEFORE every request
apiClient.interceptors.request.use(
  (config) => {
    // Get the auth token from localStorage
    const token = localStorage.getItem("accessToken");
    if (token) {
      // Attach it as a Bearer token in the Authorization header
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── RESPONSE INTERCEPTOR ─────────────────────────────────
// Runs AFTER every response
apiClient.interceptors.response.use(
  // If response is successful (2xx), just return it
  (response) => response,
  // If response is an error
  async (error) => {
    const originalRequest = error.config;

    // If 401 (Unauthorized) and we haven't already retried
    // Do not redirect if the request is already for the login endpoint
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login")
    ) {
      originalRequest._retry = true;

      // Try to refresh the token (will be implemented in Diff 05)
      // For now, redirect to login
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default apiClient;
