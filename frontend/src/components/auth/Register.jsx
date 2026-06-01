import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import toast from "react-hot-toast";
import "../../styles/auth.css";

export default function Register() {
  const [form, setForm] = useState({ name:"", email:"", phone:"", password:"", confirm:"" });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name||!form.email||!form.password||!form.confirm) {
      setError("Please fill in all required fields."); return;
    }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError("");
    try {
      await register(form.name, form.email, form.password, form.phone);
      toast.success("Account created! Welcome 🎉");
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
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
          <h2 className="auth-title">Create account</h2>
          <p className="auth-subtitle">Join ParkEase to find and rent parking slots.</p>
          {error && (
            <div className="auth-error"><span>⚠️</span><span>{error}</span></div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
              <div className="input-group">
                <label>Full Name *</label>
                <input type="text" placeholder="Arjun Kumar" value={form.name} onChange={set("name")}/>
              </div>
              <div className="input-group">
                <label>Phone</label>
                <input type="tel" placeholder="9876543210" maxLength={10} value={form.phone} onChange={set("phone")}/>
              </div>
            </div>
            <div className="input-group">
              <label>Email Address *</label>
              <input type="email" placeholder="you@example.com" value={form.email} onChange={set("email")}/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
              <div className="input-group">
                <label>Password *</label>
                <input type="password" placeholder="Min 6 chars" value={form.password} onChange={set("password")}/>
              </div>
              <div className="input-group">
                <label>Confirm *</label>
                <input type="password" placeholder="Repeat" value={form.confirm} onChange={set("confirm")}/>
              </div>
            </div>
            <button type="submit" className="btn btn-primary"
              style={{ width:"100%", justifyContent:"center", marginTop:8 }} disabled={loading}>
              {loading ? "Creating account…" : "Create Account →"}
            </button>
          </form>
        </div>
        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
