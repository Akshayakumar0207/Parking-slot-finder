import { useState, useEffect } from "react";
import { useBooking } from "../../context/BookingContext.jsx";
import { VEHICLE_ICONS, VEHICLE_LABELS } from "../../utils/pricingEngine.js";
import toast from "react-hot-toast";
import "../../styles/slots.css";

function fmtDT(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day:"numeric", month:"short", hour:"2-digit", minute:"2-digit", hour12:true
  });
}

const STATUS_BADGE = {
  confirmed: { label:"Confirmed", cls:"badge-success" },
  active:    { label:"Active",    cls:"badge-success" },
  completed: { label:"Completed", cls:"" },
  cancelled: { label:"Cancelled", cls:"badge-danger" },
};

export default function MyBookings() {
  const { bookings, fetchBookings, cancelBooking } = useBooking();
  const [tab,     setTab]     = useState("active");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchBookings().finally(() => setLoading(false));
  }, []);

  const active = bookings.filter(b => b.status==="confirmed" || b.status==="active");
  const past   = bookings.filter(b => b.status==="completed" || b.status==="cancelled");
  const shown  = tab==="active" ? active : past;

  const handleCancel = async (ref) => {
    if (!window.confirm("Cancel this booking?")) return;
    try {
      await cancelBooking(ref);
      toast.success("Booking cancelled. Slot is now free.");
    } catch(err) { toast.error(err.message||"Cancel failed"); }
  };

  return (
    <div className="bookings-page">
      <div style={{ marginBottom:24 }}>
        <div className="section-title">My Bookings</div>
        <div className="section-subtitle">All bookings stored in MySQL. Cancel to free slots instantly.</div>
      </div>

      <div className="bookings-tabs">
        {[["active","🟢 Active",active.length],["past","🕐 History",null]].map(([key,lbl,cnt])=>(
          <button key={key} className={`bookings-tab-btn ${tab===key?"active":""}`} onClick={()=>setTab(key)}>
            {lbl}
            {cnt>0&&(
              <span style={{ background:tab===key?"rgba(10,13,20,0.2)":"var(--accent-dim)",
                color:tab===key?"#0a0d14":"var(--accent)", borderRadius:10,
                padding:"1px 7px", fontSize:"0.72rem", fontWeight:700 }}>{cnt}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:60 }}>
          <div style={{ width:36, height:36, border:"3px solid var(--border)",
            borderTopColor:"var(--accent)", borderRadius:"50%",
            animation:"spin 0.7s linear infinite", margin:"0 auto 12px" }}/>
          <span style={{ color:"var(--text-muted)" }}>Loading from database…</span>
        </div>
      ) : shown.length===0 ? (
        <div className="no-bookings">
          <div className="no-bookings-icon">{tab==="active"?"🅿":"📋"}</div>
          <h3 style={{ fontFamily:"var(--font-display)", fontWeight:700, marginBottom:6 }}>
            {tab==="active"?"No active bookings":"No history yet"}
          </h3>
          <p style={{ fontSize:"0.88rem" }}>Book a slot from the Find Parking tab.</p>
        </div>
      ) : (
        shown.map(b => {
          const badge = STATUS_BADGE[b.status] || {};
          return (
            <div key={b.id} className={`booking-card ${b.status}`}>
              <div className="booking-card-top">
                <div>
                  <div className="booking-card-name">{b.parkingName}</div>
                  <div className="booking-card-addr">📍 {b.parkingAddress}</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
                  <span className={`badge ${badge.cls}`}>{badge.label}</span>
                  <span style={{ fontFamily:"var(--font-display)", fontWeight:800,
                    fontSize:"1.1rem", color:"var(--accent)" }}>₹{b.totalAmount}</span>
                </div>
              </div>

              <div className="booking-meta-grid">
                {[
                  ["Booking ID",  b.id,                                                           ""],
                  ["Vehicle",     `${VEHICLE_ICONS[b.vehicleType]} ${VEHICLE_LABELS[b.vehicleType]}`,""],
                  ["Slot",        `#${b.slotNumber}`,                                              "accent"],
                  ["Duration",    `${b.hours}h`,                                                   ""],
                  ["Check-in",    fmtDT(b.checkIn),                                                ""],
                  ["Check-out",   fmtDT(b.checkOut),                                               ""],
                  ["Payment",     `${b.paymentMethod} ✓`,                                          "green"],
                  ["Rate",        `₹${b.ratePerHour}/hr`,                                          ""],
                ].map(([lbl,val,cls])=>(
                  <div className="booking-meta-item" key={lbl}>
                    <span className="bmi-label">{lbl}</span>
                    <span className={`bmi-val ${cls}`}
                      style={{ fontSize:lbl==="Booking ID"?"0.72rem":"0.88rem" }}>{val}</span>
                  </div>
                ))}
              </div>

              <div className="booking-card-actions">
                {(b.status==="confirmed"||b.status==="active") && (
                  <button className="btn btn-danger"
                    style={{ fontSize:"0.8rem", padding:"7px 14px" }}
                    onClick={()=>handleCancel(b.id)}>
                    Cancel Booking
                  </button>
                )}
                <button className="btn btn-ghost"
                  style={{ fontSize:"0.8rem", padding:"7px 14px" }}
                  onClick={()=>alert(
                    `PARKEASE RECEIPT\n---\nID: ${b.id}\nParking: ${b.parkingName}\n` +
                    `Slot: #${b.slotNumber}\nVehicle: ${VEHICLE_LABELS[b.vehicleType]}\n` +
                    `Duration: ${b.hours}h\nAmount: ₹${b.totalAmount}\n` +
                    `Payment: ${b.paymentMethod}\nStatus: ${b.status.toUpperCase()}`
                  )}>
                  View Receipt
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
