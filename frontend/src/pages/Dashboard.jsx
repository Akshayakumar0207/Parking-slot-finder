import { useState, useEffect } from "react";
import { useAuth }    from "../context/AuthContext.jsx";
import { useBooking } from "../context/BookingContext.jsx";
import Navbar              from "../components/common/Navbar.jsx";
import FinderDashboard     from "../components/finder/FinderDashboard.jsx";
import MyBookings          from "../components/booking/MyBookings.jsx";
import RenterDashboard     from "../components/renter/RenterDashboard.jsx";
import UserProfileSetup    from "../components/profile/UserProfileSetup.jsx";
import "../styles/dashboard.css";

const TABS = [
  { key:"find",     label:"Find Parking", icon:"🔍" },
  { key:"bookings", label:"My Bookings",  icon:"🎫" },
  { key:"rent",     label:"Rent Parking", icon:"🏠" },
];

export default function Dashboard() {
  const { user, profile, saveProfile } = useAuth();
  const { bookings, fetchBookings }    = useBooking();
  const [tab, setTab]               = useState("find");
  const [showSetup, setShowSetup]   = useState(false);

  useEffect(() => { fetchBookings().catch(()=>{}); }, []);

  // Show setup if user has no profile
  useEffect(() => {
    if (user && profile === null) {
      // small delay so dashboard renders first
      const t = setTimeout(() => setShowSetup(true), 400);
      return () => clearTimeout(t);
    }
  }, [user, profile]);

  useEffect(() => {
    const h = () => setTab("bookings");
    window.addEventListener("parkease:viewbookings", h);
    return () => window.removeEventListener("parkease:viewbookings", h);
  }, []);

  const hour = new Date().getHours();
  const greeting = hour<12?"Good morning":hour<18?"Good afternoon":"Good evening";
  const firstName = user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const activeCount = bookings.filter(b=>b.status==="confirmed"||b.status==="active").length;

  const handleProfileComplete = async (profileData) => {
    await saveProfile(profileData);
    setShowSetup(false);
  };

  return (
    <div className="app-layout">
      <Navbar/>

      {/* Profile setup overlay — shown on first login */}
      {showSetup && <UserProfileSetup onComplete={handleProfileComplete}/>}

      <main className="dashboard">
        <div className="dashboard-header">
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
            <div className="dashboard-greeting">{greeting}, <span>{firstName}</span> 👋</div>
            {profile && (
              <div style={{
                display:"flex", alignItems:"center", gap:8,
                background:"var(--bg-card)", border:"1px solid var(--border-accent)",
                borderRadius:"var(--radius-md)", padding:"8px 14px",
                fontSize:"0.82rem",
              }}>
                <span>{profile.vehicleType==="twoWheeler"?"🛵":profile.vehicleType==="car"?"🚗":"🚛"}</span>
                <span style={{ color:"var(--text-secondary)" }}>
                  {profile.vehicleModel || profile.vehicleType}
                </span>
                {profile.vehicleNumber && (
                  <span style={{
                    background:"var(--bg-primary)", border:"1px solid var(--border)",
                    borderRadius:4, padding:"2px 8px", fontFamily:"var(--font-display)",
                    fontWeight:700, fontSize:"0.72rem", letterSpacing:"0.05em",
                  }}>{profile.vehicleNumber}</span>
                )}
                <span style={{ color:"var(--text-muted)" }}>·</span>
                <span style={{ color:"var(--accent)", fontSize:"0.78rem" }}>📍 {profile.locationName?.split(",")[0]}</span>
                <button
                  onClick={() => setShowSetup(true)}
                  style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:"0.75rem", padding:0 }}
                  title="Update profile"
                >✏️</button>
              </div>
            )}
          </div>
          <p style={{ color:"var(--text-secondary)", fontSize:"0.9rem", marginTop:6 }}>
            {tab==="find"     && "Showing nearby parking based on your location — live from MySQL."}
            {tab==="bookings" && "Your reservations stored in MySQL. Cancel to free slots instantly."}
            {tab==="rent"     && "List your space and earn. Visible in real-time to all drivers."}
          </p>
        </div>

        <div className="tab-bar">
          {TABS.map(t=>(
            <button key={t.key} className={`tab-btn ${tab===t.key?"active":""}`} onClick={()=>setTab(t.key)}>
              <span>{t.icon}</span>{t.label}
              {t.key==="bookings" && activeCount>0 && (
                <span style={{ background:tab==="bookings"?"rgba(10,13,20,0.2)":"var(--accent)", color:"#0a0d14",
                  borderRadius:10, padding:"1px 7px", fontSize:"0.72rem", fontWeight:700, marginLeft:2 }}>
                  {activeCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab==="find"     && <FinderDashboard userProfile={profile}/>}
        {tab==="bookings" && <MyBookings/>}
        {tab==="rent"     && <RenterDashboard/>}
      </main>
    </div>
  );
}
