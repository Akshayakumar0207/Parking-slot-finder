import { useState, useEffect } from "react";
import { lotsAPI } from "../../services/api.js";
import socket from "../../services/socket.js";
import BookingModal from "../booking/BookingModal.jsx";
import "../../styles/slots.css";

const VTABS = [
  { key:"car", label:"Cars", icon:"🚗" },
  { key:"twoWheeler", label:"2-Wheelers", icon:"🛵" },
  { key:"heavy", label:"Heavy", icon:"🚛" },
];

export default function SlotMap({ parking, onClose }) {
  const [activeVT, setActiveVT]   = useState("car");
  const [slots, setSlots]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [justFreed, setJustFreed] = useState(new Set());
  const [showBook, setShowBook]   = useState(false);
  const [summary, setSummary]     = useState(parking.slots);

  const loadSlots = async (vt) => {
    setLoading(true);
    try {
      const data = await lotsAPI.slots(parking.id, vt);
      setSlots(data);
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadSlots(activeVT); }, [activeVT, parking.id]);

  // Real-time slot updates via Socket.IO
  useEffect(() => {
    const handler = ({ lotId, summary: s, changedSlot }) => {
      if (lotId !== parking.id) return;
      // Update summary counts
      if (s) {
        const newSum = { ...summary };
        s.forEach(row => {
          if (newSum[row.vehicle_type]) {
            newSum[row.vehicle_type] = { total: Number(row.total), available: Number(row.available) };
          }
        });
        setSummary(newSum);
      }
      // Update individual slot if it matches active vehicle type
      if (changedSlot && changedSlot.vehicleType === activeVT) {
        setSlots(prev => prev.map(sl =>
          sl.number === changedSlot.slotNumber ? { ...sl, status: changedSlot.status } : sl
        ));
        if (changedSlot.status === "available") {
          const id = `slot_${changedSlot.slotNumber}`;
          setJustFreed(f => new Set([...f, id]));
          setTimeout(() => setJustFreed(f => { const n=new Set(f); n.delete(id); return n; }), 1500);
        }
      }
    };
    socket.on("slots_updated", handler);
    return () => socket.off("slots_updated", handler);
  }, [parking.id, activeVT, summary]);

  const cur = summary[activeVT] || { total:0, available:0 };
  const available = cur.available;
  const total     = cur.total;
  const pct       = total ? Math.round((available / total) * 100) : 0;
  const hasAvail  = Object.values(summary).some(s => s.available > 0);

  return (
    <>
      <div className="slot-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="slot-modal">
          <div className="slot-modal-header">
            <div>
              <div className="slot-modal-title">{parking.name}</div>
              <div className="slot-modal-addr">📍 {parking.address}</div>
              <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:10 }}>
                <span className="live-badge"><span className="live-dot"/>LIVE</span>
                <span style={{ fontSize:"0.78rem", color:"var(--text-muted)" }}>Real-time from MySQL</span>
              </div>
            </div>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>

          <div className="vehicle-tabs">
            {VTABS.map(v => (
              <button key={v.key} className={`vehicle-tab ${activeVT===v.key?"active":""}`}
                onClick={() => setActiveVT(v.key)} disabled={!(summary[v.key]?.total > 0)}>
                {v.icon} {v.label}
                <span style={{ background:"var(--bg-primary)", padding:"1px 6px", borderRadius:10, fontSize:"0.7rem", marginLeft:2 }}>
                  {summary[v.key]?.available || 0}/{summary[v.key]?.total || 0}
                </span>
              </button>
            ))}
          </div>

          <div className="slot-legend">
            <div className="legend-item"><div className="legend-dot available"/>Available</div>
            <div className="legend-item"><div className="legend-dot occupied"/>Occupied</div>
            <span style={{ marginLeft:"auto", fontSize:"0.78rem", color:"var(--text-secondary)" }}>
              ₹{parking.pricePerHour[activeVT]}/hr
            </span>
          </div>

          <div className="slot-summary">
            <div className="summary-item"><span className="summary-label">Available</span><span className="summary-value green">{available}</span></div>
            <div style={{ width:1, background:"var(--border)" }}/>
            <div className="summary-item"><span className="summary-label">Occupied</span><span className="summary-value red">{total - available}</span></div>
            <div style={{ width:1, background:"var(--border)" }}/>
            <div className="summary-item"><span className="summary-label">Total</span><span className="summary-value accent">{total}</span></div>
            <div style={{ width:1, background:"var(--border)" }}/>
            <div className="summary-item">
              <span className="summary-label">Free</span>
              <span className="summary-value" style={{ color: pct>70?"var(--success)":pct>30?"var(--warning)":"var(--danger)" }}>{pct}%</span>
            </div>
            <div style={{ marginLeft:"auto", alignSelf:"center" }}>
              <div style={{ width:100, height:8, background:"var(--border)", borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:pct>70?"var(--success)":pct>30?"var(--warning)":"var(--danger)", borderRadius:4, transition:"width 0.5s ease" }}/>
              </div>
            </div>
          </div>

          <div className="slot-grid-wrap">
            {loading ? (
              <div style={{ textAlign:"center", padding:30, color:"var(--text-muted)" }}>
                <div style={{ width:32, height:32, border:"3px solid var(--border)", borderTopColor:"var(--accent)", borderRadius:"50%", animation:"spin 0.7s linear infinite", margin:"0 auto 10px" }}/>
                Loading slots…
              </div>
            ) : slots.length === 0 ? (
              <div className="empty-state" style={{ padding:30 }}><div className="empty-icon">🚫</div><p>No slots for this type</p></div>
            ) : (
              <>
                <div className="slot-grid-label">Slot Map — {VTABS.find(v=>v.key===activeVT)?.label}</div>
                <div className="slot-grid">
                  {slots.map(slot => (
                    <div key={slot.id}
                      className={`slot-cell ${slot.status} ${justFreed.has(slot.id)?"just-freed":""}`}
                      title={`Slot #${slot.number} — ${slot.status}`}>
                      {slot.number}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="slot-actions">
            <button className="btn btn-primary" style={{ fontSize:"0.88rem", padding:"11px 22px" }}
              disabled={!hasAvail} onClick={() => setShowBook(true)}>🅿 Book a Slot Online</button>
            <button className="btn btn-ghost" style={{ fontSize:"0.85rem", padding:"10px 20px" }}
              onClick={() => loadSlots(activeVT)}>🔄 Refresh</button>
            <button className="btn btn-ghost" style={{ fontSize:"0.85rem", padding:"10px 20px" }} onClick={onClose}>✕ Close</button>
          </div>
        </div>
      </div>
      {showBook && <BookingModal parking={{ ...parking, slots: summary }} onClose={() => setShowBook(false)} />}
    </>
  );
}