import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import toast from "react-hot-toast";
import "../../styles/auth.css";

export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true); setError("");
    try {
      await login(email, password);
      toast.success("Welcome back! 🚗");
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page grid-bg">
      <div className="auth-container">
        <div className="auth-logo">
          <div className="auth-logo-mark">🅿</div>
          <h1>ParkEase</h1>
          <p>Find &amp; manage parking, smarter.</p>
        </div>
        <div className="auth-card">
          <h2 className="auth-title">Sign in</h2>
          <p className="auth-subtitle">Welcome back! Enter your credentials to continue.</p>
          {error && (
            <div className="auth-error"><span>⚠️</span><span>{error}</span></div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Email Address</label>
              <input type="email" placeholder="you@example.com"
                value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/>
            </div>
            <div className="input-group">
              <label>Password</label>
              <input type="password" placeholder="••••••••"
                value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/>
            </div>
            <button type="submit" className="btn btn-primary"
              style={{ width:"100%", justifyContent:"center", marginTop:8 }} disabled={loading}>
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>
        </div>
        <div className="auth-footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}
