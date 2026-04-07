import axios from "axios";

function isAuthBootstrapRequest(url?: string) {
  return (
    !!url &&
    (url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/accounts") ||
      url.includes("/auth/me"))
  );
}

// Create a configured axios instance
const apiClient = axios.create({
  // In development, Vite proxies /api to http://localhost:8080
  // In production, we use VITE_API_BASE_URL if provided, else default to /api/v1
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 10000, // 10 seconds
});

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
      !isAuthBootstrapRequest(originalRequest.url)
    ) {
      originalRequest._retry = true;

      try {
        await apiClient.post("/auth/refresh");

        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("user");

        if (
          typeof window !== "undefined" &&
          window.location.pathname !== "/login" &&
          window.location.pathname !== "/register"
        ) {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
