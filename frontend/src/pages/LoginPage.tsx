import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate("/feed");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <h1 className="logo auth-logo" id="login-logo">Facebook</h1>

      <div className="auth-card">
        <p className="auth-subtitle">Login to continue to Facebook</p>

        {error && (
          <div className="auth-error" role="alert" id="login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" id="login-form">
          <div className="form-group">
            <label htmlFor="login-email">Email or Phone</label>
            <input
              id="login-email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            id="login-submit"
          >
            {isSubmitting ? "Logging in..." : "Log In"}
          </button>

          <a href="#" className="auth-forgot-link" id="forgot-password">
            Forgot password?
          </a>
        </form>

        <div className="auth-footer">
          <p>Don't have an account?</p>
          <Link to="/register" className="btn btn-outline" id="goto-register">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
