import { useState, useMemo, useEffect, useCallback } from "react";
import { useParking } from "../../context/ParkingContext.jsx";
import { lotsAPI }    from "../../services/api.js";
import socket         from "../../services/socket.js";
import ParkingCard    from "./ParkingCard.jsx";
import SlotMap        from "./SlotMap.jsx";
import BookingModal   from "../booking/BookingModal.jsx";
import "../../styles/dashboard.css";

const FILTERS = [
  { key:"all",        label:"All" },
  { key:"open",       label:"Open Now" },
  { key:"car",        label:"🚗 Cars" },
  { key:"twoWheeler", label:"🛵 2-Wheelers" },
  { key:"heavy",      label:"🚛 Heavy" },
];

const RADIUS_OPTIONS = [2, 3, 5, 10];

export default function FinderDashboard({ userProfile }) {
  const { fetchLots }             = useParking();
  const [lots,      setLots]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState("all");
  const [radius,    setRadius]    = useState(5);
  const [mapItem,   setMapItem]   = useState(null);
  const [bookItem,  setBookItem]  = useState(null);

  // Use profile location or default Bengaluru
  const userLat = userProfile?.lat  || 12.9716;
  const userLng = userProfile?.lng  || 77.5946;
  const userVT  = userProfile?.vehicleType || "";
  const locName = userProfile?.locationName || "Bengaluru";

  const loadNearby = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await lotsAPI.nearby(userLat, userLng, radius, "");
      setLots(data);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  }, [userLat, userLng, radius]);

  useEffect(() => { loadNearby(); }, [loadNearby]);

  // Real-time socket updates
  useEffect(() => {
    if (!socket?.on) return;
    const onSlotsUpdated = ({ lotId, summary }) => {
      setLots(prev => prev.map(lot => {
        if (lot.id !== lotId) return lot;
        const newSlots = { ...lot.slots };
        (summary || []).forEach(row => {
          const vt = row.vehicle_type;
          if (newSlots[vt]) newSlots[vt] = { total: Number(row.total||0), available: Number(row.available||0) };
        });
        return { ...lot, slots: newSlots };
      }));
    };
    const onLotAdded   = (lot) => setLots(prev => prev.find(l=>l.id===lot.id) ? prev : [lot,...prev]);
    const onLotUpdated = ({id,isOpen}) => setLots(prev => prev.map(l=>l.id===id?{...l,isOpen}:l));
    const onLotRemoved = ({id}) => setLots(prev => prev.filter(l=>l.id!==id));
    socket.on("slots_updated", onSlotsUpdated);
    socket.on("lot_added",     onLotAdded);
    socket.on("lot_updated",   onLotUpdated);
    socket.on("lot_removed",   onLotRemoved);
    return () => {
      socket.off("slots_updated", onSlotsUpdated);
      socket.off("lot_added",     onLotAdded);
      socket.off("lot_updated",   onLotUpdated);
      socket.off("lot_removed",   onLotRemoved);
    };
  }, []);

  const filtered = useMemo(() => {
    return lots.filter(p => {
      const ms = p.name.toLowerCase().includes(search.toLowerCase()) ||
                 p.address.toLowerCase().includes(search.toLowerCase());
      if (!ms) return false;
      if (filter==="open")       return p.isOpen;
      if (filter==="car")        return (p.slots?.car?.available||0)>0;
      if (filter==="twoWheeler") return (p.slots?.twoWheeler?.available||0)>0;
      if (filter==="heavy")      return (p.slots?.heavy?.available||0)>0;
      return true;
    }).sort((a,b) => parseFloat(a.distanceKm)-parseFloat(b.distanceKm));
  }, [lots, search, filter]);

  const openCount  = lots.filter(p=>p.isOpen).length;
  const totalCars  = lots.reduce((s,p)=>s+(p.slots?.car?.available||0),0);
  const total2W    = lots.reduce((s,p)=>s+(p.slots?.twoWheeler?.available||0),0);
  const totalHeavy = lots.reduce((s,p)=>s+(p.slots?.heavy?.available||0),0);

  if (error) return (
    <div style={{ textAlign:"center", padding:"60px 24px" }}>
      <div style={{ fontSize:"3rem", marginBottom:16 }}>⚠️</div>
      <h3 style={{ fontFamily:"var(--font-display)", fontSize:"1.3rem", fontWeight:800, marginBottom:8 }}>
        Cannot connect to backend
      </h3>
      <p style={{ color:"var(--text-secondary)", fontSize:"0.9rem", marginBottom:8 }}>{error}</p>
      <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)",
        padding:"16px 20px", maxWidth:460, margin:"20px auto", textAlign:"left",
        fontSize:"0.85rem", color:"var(--text-secondary)", lineHeight:1.8 }}>
        <strong style={{ color:"var(--text-primary)" }}>To fix:</strong><br/>
        1. Open terminal in <code style={{ color:"var(--accent)" }}>backend/</code><br/>
        2. Run <code style={{ color:"var(--accent)" }}>python app.py</code><br/>
        3. Make sure <code style={{ color:"var(--accent)" }}>.env</code> has your MySQL password
      </div>
      <button className="btn btn-primary" onClick={loadNearby} style={{ marginTop:8 }}>🔄 Retry</button>
    </div>
  );

  return (
    <div style={{ animation:"slideUp 0.4s ease" }}>

      {/* Location banner */}
      <div className="location-banner">
        <div className="location-dot"/>
        <div>
          <strong style={{ color:"var(--text-primary)", fontSize:"0.88rem" }}>
            📍 {locName}
          </strong>
          <span style={{ color:"var(--text-secondary)", marginLeft:8, fontSize:"0.82rem" }}>
            — Showing parking within {radius} km · Real-time MySQL
          </span>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
          <span className="live-badge"><span className="live-dot"/>LIVE</span>
        </div>
      </div>

      {/* Radius selector */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        <span style={{ fontSize:"0.82rem", color:"var(--text-secondary)", fontWeight:500 }}>Search radius:</span>
        {RADIUS_OPTIONS.map(r => (
          <button key={r}
            className={`filter-chip ${radius===r?"active":""}`}
            onClick={() => setRadius(r)}
            style={{ padding:"5px 12px" }}
          >
            {r} km
          </button>
        ))}
        {userProfile?.vehicleType && (
          <span style={{
            marginLeft:"auto", display:"flex", alignItems:"center", gap:5,
            background:"var(--accent-dim)", border:"1px solid var(--border-accent)",
            borderRadius:100, padding:"4px 12px", fontSize:"0.78rem", color:"var(--accent)"
          }}>
            {userProfile.vehicleType==="twoWheeler"?"🛵":userProfile.vehicleType==="car"?"🚗":"🚛"}
            {userProfile.vehicleModel || userProfile.vehicleType}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="stats-row">
        {[
          { icon:"🅿", val:loading?"—":openCount,  label:"Lots Nearby" },
          { icon:"🚗", val:loading?"—":totalCars,  label:"Car Slots" },
          { icon:"🛵", val:loading?"—":total2W,    label:"2-Wheeler Slots" },
          { icon:"🚛", val:loading?"—":totalHeavy, label:"Heavy Slots" },
        ].map(s=>(
          <div className="stat-card" key={s.label}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Search by name or area…"
            value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        {FILTERS.map(f=>(
          <button key={f.key} className={`filter-chip ${filter===f.key?"active":""}`}
            onClick={()=>setFilter(f.key)}>{f.label}</button>
        ))}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
        <span style={{ fontSize:"0.88rem", color:"var(--text-secondary)" }}>
          {loading?"Loading…":`${filtered.length} parking lot${filtered.length!==1?"s":""} within ${radius} km`}
        </span>
        <span style={{ fontSize:"0.78rem", color:"var(--text-muted)" }}>Sorted by distance</span>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign:"center", padding:"60px 24px", color:"var(--text-muted)" }}>
          <div style={{ width:40,height:40,border:"3px solid var(--border)",
            borderTopColor:"var(--accent)",borderRadius:"50%",
            animation:"spin 0.7s linear infinite",margin:"0 auto 14px" }}/>
          Finding nearby parking…
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length===0 && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No parking found within {radius} km</h3>
          <p>Try increasing the search radius above.</p>
          <button className="btn btn-secondary" style={{ marginTop:14 }} onClick={()=>setRadius(10)}>
            Search within 10 km
          </button>
        </div>
      )}

      {/* Cards */}
      {!loading && filtered.length>0 && (
        <div className="parking-grid">
          {filtered.map(p=>(
            <ParkingCard key={p.id} parking={p}
              onClick={setMapItem} onBook={setBookItem}
              userVehicleType={userVT}/>
          ))}
        </div>
      )}

      {mapItem  && <SlotMap     parking={mapItem}  onClose={()=>setMapItem(null)}/>}
      {bookItem && <BookingModal parking={bookItem} onClose={()=>setBookItem(null)}/>}
    </div>
  );
}
