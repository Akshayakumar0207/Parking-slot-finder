import "../../styles/dashboard.css";

function slotColor(available, total) {
  if (!total || available === 0) return "full";
  return (available / total) < 0.2 ? "low" : "available";
}

export default function ParkingCard({ parking, onClick, onBook, userVehicleType }) {
  const { slots, pricePerHour } = parking;
  const prices = Object.values(pricePerHour).filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const totalAvail = (slots.car?.available||0)+(slots.twoWheeler?.available||0)+(slots.heavy?.available||0);

  const rows = [
    { icon:"🚗", label:"Cars",       data: slots.car,        vt:"car" },
    { icon:"🛵", label:"2-Wheelers", data: slots.twoWheeler, vt:"twoWheeler" },
    { icon:"🚛", label:"Heavy",      data: slots.heavy,      vt:"heavy" },
  ].filter(r => r.data?.total > 0);

  // highlight the user's vehicle type row
  const isUserVT = (vt) => userVehicleType && userVehicleType === vt;

  return (
    <div className={`parking-card ${!parking.isOpen?"closed":""}`}>
      <div className="parking-card-header">
        <div>
          <div className="parking-name">{parking.name}</div>
          <div className="parking-address"><span>📍</span>{parking.address}</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
          <span className={`badge ${parking.isOpen?"badge-success":"badge-danger"}`}>
            {parking.isOpen?"Open":"Closed"}
          </span>
          <span style={{ fontSize:"0.72rem", color:"var(--accent)", fontWeight:600 }}>
            📍 {parking.distanceKm} km away
          </span>
        </div>
      </div>

      <div className="parking-meta">
        <span className="parking-rating">⭐ {parking.rating>0?Number(parking.rating).toFixed(1):"New"}</span>
        {parking.isCityCenter&&<><span>·</span><span className="badge badge-warning" style={{fontSize:"0.68rem"}}>City Centre</span></>}
      </div>

      <div className="slot-counts">
        {rows.map(({ icon, label, data, vt }) => {
          const c = slotColor(data.available, data.total);
          const pct = data.total ? (data.available/data.total)*100 : 0;
          const highlight = isUserVT(vt);
          return (
            <div className="slot-row" key={label} style={{
              background: highlight ? "var(--accent-dim)" : "transparent",
              borderRadius: highlight ? 6 : 0,
              padding: highlight ? "4px 6px" : 0,
              margin: highlight ? "2px -6px" : 0,
              border: highlight ? "1px solid var(--border-accent)" : "none",
            }}>
              <div className="slot-type-label">
                <span>{icon}</span>
                <span>{label}</span>
                {highlight && <span style={{ fontSize:"0.65rem", color:"var(--accent)", fontWeight:700 }}>YOUR VEHICLE</span>}
              </div>
              <div className="slot-count-display">
                <div className="slot-bar">
                  <div className={`slot-bar-fill ${c}`} style={{ width:`${pct}%` }}/>
                </div>
                <span className={`slot-count-num ${c}`}>
                  {data.available}
                  <span style={{ color:"var(--text-muted)", fontWeight:400, fontSize:"0.78rem" }}>/{data.total}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {parking.amenities?.length>0 && (
        <div className="amenities-list">
          {parking.amenities.map(a=><span key={a} className="amenity-tag">{a}</span>)}
        </div>
      )}

      <div className="parking-pricing">
        <span className="pricing-from">Starting from</span>
        <span className="pricing-value">₹{minPrice}/hr</span>
      </div>

      {parking.isOpen && (
        <div style={{ display:"flex", gap:8, marginTop:12 }}>
          <button className="btn btn-ghost"
            style={{ flex:1, justifyContent:"center", fontSize:"0.8rem", padding:"9px 12px" }}
            onClick={() => onClick(parking)}>
            View Slots
          </button>
          <button className="btn btn-primary"
            style={{ flex:2, justifyContent:"center", fontSize:"0.82rem", padding:"9px 14px" }}
            disabled={totalAvail===0}
            onClick={e=>{ e.stopPropagation(); onBook(parking); }}>
            {totalAvail===0 ? "Full" : "🅿 Book Now"}
          </button>
        </div>
      )}
    </div>
  );
}
