import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import socket from "../../services/socket.js";
import toast from "react-hot-toast";

export default function Navbar({ onEditProfile }) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [connected, setConnected] = useState(Boolean(socket?.connected));

  useEffect(() => {
    if (!socket?.on) return;
    const on  = () => setConnected(true);
    const off = () => setConnected(false);
    socket.on("connect",    on);
    socket.on("disconnect", off);
    return () => { socket.off("connect",on); socket.off("disconnect",off); };
  }, []);

  const handleLogout = () => { logout(); toast.success("Logged out"); navigate("/login"); };
  const initial = (user?.name||user?.email||"U")[0].toUpperCase();

  return (
    <nav className="navbar">
      <a className="navbar-brand" href="/dashboard">
        <div className="navbar-logo">🅿</div>
        <span className="navbar-name">ParkEase</span>
      </a>
      <div className="navbar-right">
        <span style={{
          display:"flex", alignItems:"center", gap:6,
          fontSize:"0.75rem", fontWeight:600,
          color: connected ? "var(--success)" : "var(--text-muted)"
        }}>
          <span style={{
            width:8, height:8, borderRadius:"50%", display:"inline-block",
            background: connected ? "var(--success)" : "var(--text-muted)",
            animation: connected ? "pulse 2s infinite" : "none"
          }}/>
          {connected ? "Live" : "Offline"}
        </span>
        <div className="user-pill">
          <div className="user-avatar">{initial}</div>
          <span className="user-name">{user?.name||user?.email?.split("@")[0]||"User"}</span>
        </div>
        <button className="btn btn-ghost" onClick={handleLogout}
          style={{ padding:"8px 16px", fontSize:"0.82rem" }}>
          Sign Out
        </button>
      </div>
    </nav>
  );
}
