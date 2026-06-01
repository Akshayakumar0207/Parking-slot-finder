import { useState, useEffect } from "react";
import { useAuth }    from "../../context/AuthContext.jsx";
import { useBooking } from "../../context/BookingContext.jsx";
import { lotsAPI }    from "../../services/api.js";
import { VEHICLE_ICONS, VEHICLE_LABELS } from "../../utils/pricingEngine.js";
import toast from "react-hot-toast";
import "../../styles/slots.css";

const HOURS_OPTS = [1,2,3,4,6,8,12,24];
const VT_ORDER   = ["car","twoWheeler","heavy"];

function fmtTime(iso){ return new Date(iso).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true}); }
function fmtDate(iso){ return new Date(iso).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}); }

// ── UPI dummy payment screen ─────────────────────────────────
function UPIPaymentScreen({ total, onSuccess, onBack }) {
  const [upiId,    setUpiId]    = useState("");
  const [paying,   setPaying]   = useState(false);
  const [paid,     setPaid]     = useState(false);
  const [progress, setProgress] = useState(0);
  const [error,    setError]    = useState("");

  const handlePay = () => {
    if (!upiId.trim()) { setError("Please enter your UPI ID."); return; }
    if (!upiId.includes("@")) { setError("Invalid UPI ID. Example: name@upi"); return; }
    setError("");
    setPaying(true);
    // Simulate progress bar
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 18 + 5;
      if (p >= 100) {
        p = 100;
        clearInterval(iv);
        setPaid(true);
        setTimeout(() => onSuccess(), 900);
      }
      setProgress(Math.min(p, 100));
    }, 200);
  };

  if (paid) return (
    <div style={{ textAlign:"center", padding:"30px 28px" }}>
      <div style={{ fontSize:"3.5rem", marginBottom:12, animation:"slideUp 0.3s ease" }}>✅</div>
      <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"1.2rem", color:"var(--success)", marginBottom:6 }}>
        Payment Successful!
      </div>
      <p style={{ color:"var(--text-secondary)", fontSize:"0.88rem" }}>Confirming your booking…</p>
    </div>
  );

  return (
    <div className="booking-body">
      {/* UPI header */}
      <div style={{
        background:"linear-gradient(135deg,#6c3df4,#4a90d9)",
        borderRadius:"var(--radius-md)", padding:"20px",
        textAlign:"center", marginBottom:20, position:"relative", overflow:"hidden"
      }}>
        <div style={{ position:"absolute", inset:0, opacity:0.1, background:"repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)", backgroundSize:"10px 10px" }}/>
        <div style={{ fontSize:"2rem", marginBottom:4 }}>📱</div>
        <div style={{ fontFamily:"var(--font-display)", fontWeight:800, color:"#fff", fontSize:"1.1rem" }}>UPI Payment</div>
        <div style={{ color:"rgba(255,255,255,0.75)", fontSize:"0.82rem", marginTop:2 }}>Secure · Instant · Real-time</div>
      </div>

      {/* Amount */}
      <div style={{
        background:"var(--bg-card)", border:"1px solid var(--border-accent)",
        borderRadius:"var(--radius-md)", padding:"14px 18px",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom:20
      }}>
        <span style={{ color:"var(--text-secondary)", fontSize:"0.9rem" }}>Amount to Pay</span>
        <span style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"1.5rem", color:"var(--accent)" }}>
          ₹{total}
        </span>
      </div>

      {/* UPI ID input */}
      <div className="input-group" style={{ marginBottom:8 }}>
        <label>Your UPI ID</label>
        <input
          type="text" placeholder="yourname@upi  or  9876543210@paytm"
          value={upiId} onChange={e=>{ setUpiId(e.target.value); setError(""); }}
          disabled={paying}
          style={{ letterSpacing:"0.02em" }}
        />
      </div>

      {/* Popular UPI apps */}
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        {[
          { label:"GPay",   icon:"🟢", ex:"name@okaxis"  },
          { label:"PhonePe",icon:"🟣", ex:"name@ybl"     },
          { label:"Paytm",  icon:"🔵", ex:"number@paytm" },
          { label:"BHIM",   icon:"🟠", ex:"name@upi"     },
        ].map(a=>(
          <button key={a.label} type="button"
            onClick={()=>{ setUpiId(a.ex); setError(""); }}
            style={{
              display:"flex", alignItems:"center", gap:5,
              padding:"5px 10px", borderRadius:100,
              border:"1px solid var(--border)", background:"var(--bg-card)",
              color:"var(--text-secondary)", fontSize:"0.75rem",
              cursor:"pointer", transition:"all 0.2s",
            }}
            onMouseEnter={e=>e.currentTarget.style.borderColor="var(--accent)"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}
          >
            <span>{a.icon}</span>{a.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ color:"var(--danger)", fontSize:"0.82rem", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
          <span>⚠️</span>{error}
        </div>
      )}

      {/* Progress bar while paying */}
      {paying && (
        <div style={{ marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.78rem", color:"var(--text-secondary)", marginBottom:6 }}>
            <span>⏳ Processing payment…</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div style={{ height:6, background:"var(--border)", borderRadius:3, overflow:"hidden" }}>
            <div style={{
              height:"100%", width:`${progress}%`,
              background:"linear-gradient(90deg,#6c3df4,var(--accent))",
              borderRadius:3, transition:"width 0.2s ease"
            }}/>
          </div>
          <div style={{ fontSize:"0.75rem", color:"var(--text-muted)", marginTop:6, textAlign:"center" }}>
            Connecting to your bank · Do not close this window
          </div>
        </div>
      )}

      <div style={{ display:"flex", gap:10 }}>
        <button className="btn btn-ghost" style={{ flex:1, justifyContent:"center" }}
          onClick={onBack} disabled={paying}>← Back</button>
        <button
          className="btn btn-primary"
          style={{ flex:2, justifyContent:"center", background:"linear-gradient(135deg,#6c3df4,#4a90d9)", boxShadow:"0 4px 16px rgba(108,61,244,0.4)" }}
          onClick={handlePay} disabled={paying}
        >
          {paying ? "Verifying…" : `Pay ₹${total} →`}
        </button>
      </div>

      <div style={{ textAlign:"center", marginTop:12, fontSize:"0.72rem", color:"var(--text-muted)" }}>
        🔒 256-bit encrypted · Simulated demo payment
      </div>
    </div>
  );
}

// ── Main BookingModal ─────────────────────────────────────────
export default function BookingModal({ parking, onClose }) {
  const { user }          = useAuth();
  const { createBooking } = useBooking();

  const [step,         setStep]         = useState(1);
  const [vehicleType,  setVT]           = useState(null);
  const [hours,        setHours]        = useState(2);
  const [slots,        setSlots]        = useState([]);
  const [selectedSlot, setSSlot]        = useState(null);
  const [payMethod,    setPayMethod]    = useState("UPI");
  const [confirmed,    setConfirmed]    = useState(null);
  const [processing,   setProcessing]   = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    const first = VT_ORDER.find(vt=>(parking.slots?.[vt]?.available||0)>0);
    if (first) setVT(first);
  }, []);

  useEffect(() => {
    if (step===2 && vehicleType) {
      setLoadingSlots(true);
      lotsAPI.slots(parking.id, vehicleType)
        .then(d=>{ setSlots(d); setSSlot(null); })
        .catch(()=>setSlots([]))
        .finally(()=>setLoadingSlots(false));
    }
  }, [step, vehicleType, parking.id]);

  const rate  = vehicleType ? (parking.pricePerHour?.[vehicleType]||0) : 0;
  const total = rate * hours;

  // Called when payment is complete (UPI success OR Card/Cash immediate)
  const doCreateBooking = async () => {
    setProcessing(true);
    try {
      const booking = await createBooking({
        lotId: parking.id, vehicleType, slotNumber: selectedSlot.number,
        hours, paymentMethod: payMethod,
      });
      setConfirmed(booking);
      setStep(5); // confirmed screen
      toast.success("Booking confirmed! 🎉");
    } catch(err) {
      toast.error(err.message || "Booking failed. Please try again.");
      setStep(3); // go back to payment step
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentStep = () => {
    // Card or Cash → skip UPI screen, book directly
    if (payMethod !== "UPI") {
      doCreateBooking();
    } else {
      setStep(4); // show UPI screen
    }
  };

  const stepLabels = ["Details","Pick Slot","Payment"];

  return (
    <div className="booking-overlay" onClick={e=>e.target===e.currentTarget&&step!==5&&onClose()}>
      <div className="booking-modal">

        {/* Header */}
        <div className="booking-modal-header">
          <div>
            <div className="booking-modal-title">
              {step===5 ? "Booking Confirmed! 🎉" : "Book Parking Slot"}
            </div>
            <div className="booking-modal-sub"><span>🅿</span>{parking.name}</div>
          </div>
          {step!==5 && <button className="close-btn" onClick={onClose}>✕</button>}
        </div>

        {/* Step bar (steps 1-3 only) */}
        {step<=3 && (
          <div className="booking-steps">
            {stepLabels.map((lbl,i)=>{
              const n=i+1, done=step>n, active=step===n;
              return (
                <div key={lbl} style={{display:"flex",alignItems:"center",flex:1}}>
                  <div className={`bstep ${done?"done":active?"active":""}`}>
                    <div className="bstep-num">{done?"✓":n}</div>
                    <span>{lbl}</span>
                  </div>
                  {i<2&&<div className={`bstep-line ${done?"done":""}`}/>}
                </div>
              );
            })}
          </div>
        )}

        {/* ── STEP 1: Vehicle + Hours ── */}
        {step===1 && (
          <div className="booking-body">
            <div style={{fontSize:"0.78rem",fontWeight:600,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10}}>Select Vehicle</div>
            <div className="vehicle-selector">
              {VT_ORDER.map(vt=>{
                const info=parking.slots?.[vt]||{total:0,available:0};
                const disabled=info.available===0;
                const sel=vehicleType===vt;
                return (
                  <div key={vt} className={`vehicle-option ${sel?"selected":""} ${disabled?"disabled":""}`} onClick={()=>!disabled&&setVT(vt)}>
                    {sel&&<div className="selected-tick">✓</div>}
                    <span className="v-emoji">{VEHICLE_ICONS[vt]}</span>
                    <span className="v-name">{VEHICLE_LABELS[vt]}</span>
                    <span className="v-price">₹{parking.pricePerHour?.[vt]}/hr</span>
                    <span className="v-slots">{disabled?"No slots":`${info.available} free`}</span>
                  </div>
                );
              })}
            </div>
            <div style={{fontSize:"0.78rem",fontWeight:600,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10}}>Duration</div>
            <div className="hours-picker">
              {HOURS_OPTS.map(h=><div key={h} className={`hour-chip ${hours===h?"selected":""}`} onClick={()=>setHours(h)}>{h}h</div>)}
            </div>
            {vehicleType&&(
              <div style={{background:"var(--bg-card)",border:"1px solid var(--border-accent)",borderRadius:"var(--radius-md)",padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <span style={{fontSize:"0.85rem",color:"var(--text-secondary)"}}>{VEHICLE_ICONS[vehicleType]} {VEHICLE_LABELS[vehicleType]} × {hours}h</span>
                <span style={{fontFamily:"var(--font-display)",fontWeight:800,color:"var(--accent)",fontSize:"1.2rem"}}>₹{total}</span>
              </div>
            )}
            <button className="btn btn-primary" style={{width:"100%",justifyContent:"center"}} disabled={!vehicleType} onClick={()=>setStep(2)}>Choose Slot →</button>
          </div>
        )}

        {/* ── STEP 2: Pick Slot ── */}
        {step===2 && (
          <div className="booking-body">
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
              <span style={{fontSize:"0.82rem",fontWeight:600,color:"var(--text-secondary)",textTransform:"uppercase"}}>Pick a Free Slot</span>
              <div style={{display:"flex",gap:10,fontSize:"0.74rem",color:"var(--text-muted)"}}>
                <span>🟢 Free</span><span>🔵 Yours</span><span>🔴 Taken</span>
              </div>
            </div>
            {loadingSlots ? (
              <div style={{textAlign:"center",padding:30}}>
                <div style={{width:28,height:28,border:"3px solid var(--border)",borderTopColor:"var(--accent)",borderRadius:"50%",animation:"spin 0.7s linear infinite",margin:"0 auto"}}/>
              </div>
            ) : (
              <div className="slot-picker-grid">
                {slots.map(slot=>(
                  <div key={slot.id}
                    className={`slot-pick-cell ${slot.id===selectedSlot?.id?"selected-slot":slot.status}`}
                    onClick={()=>slot.status==="available"&&setSSlot(slot)}>
                    {slot.number}
                  </div>
                ))}
              </div>
            )}
            {selectedSlot&&(
              <div style={{background:"var(--accent-dim)",border:"1px solid var(--border-accent)",borderRadius:"var(--radius-sm)",padding:"10px 14px",fontSize:"0.84rem",color:"var(--accent)",fontWeight:600,marginBottom:16}}>
                ✅ Slot #{selectedSlot.number} selected
              </div>
            )}
            <div style={{display:"flex",gap:10}}>
              <button className="btn btn-ghost" style={{flex:1,justifyContent:"center"}} onClick={()=>setStep(1)}>← Back</button>
              <button className="btn btn-primary" style={{flex:2,justifyContent:"center"}} disabled={!selectedSlot} onClick={()=>setStep(3)}>Review & Pay →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Payment method select ── */}
        {step===3 && (
          <div className="booking-body">
            {/* Summary */}
            <div className="booking-summary">
              <div className="booking-summary-title">Booking Summary</div>
              <div className="summary-rows">
                {[["Parking",parking.name],["Address",parking.address],
                  ["Vehicle",`${VEHICLE_ICONS[vehicleType]} ${VEHICLE_LABELS[vehicleType]}`],
                  ["Slot",`#${selectedSlot?.number}`],["Duration",`${hours}h`],["Rate",`₹${rate}/hr`]
                ].map(([k,v])=>(
                  <div className="summary-row" key={k}><span className="s-key">{k}</span><span className="s-val">{v}</span></div>
                ))}
                <div className="summary-row total"><span className="s-key">Total Amount</span><span className="s-val">₹{total}</span></div>
              </div>
            </div>

            {/* Payment method */}
            <div style={{fontSize:"0.78rem",fontWeight:600,color:"var(--text-secondary)",textTransform:"uppercase",marginBottom:10}}>Payment Method</div>
            <div className="payment-methods">
              {[
                {id:"UPI",  icon:"📱", label:"UPI",  sub:"GPay · PhonePe · Paytm"},
                {id:"Card", icon:"💳", label:"Card", sub:"Debit / Credit"},
                {id:"Cash", icon:"💵", label:"Cash", sub:"Pay at parking"},
              ].map(pm=>(
                <div key={pm.id} className={`pay-method ${payMethod===pm.id?"selected":""}`} onClick={()=>setPayMethod(pm.id)}>
                  <span className="pay-icon">{pm.icon}</span>
                  <span className="pay-label">{pm.label}</span>
                  <span style={{fontSize:"0.65rem",color:"var(--text-muted)",display:"block",marginTop:2}}>{pm.sub}</span>
                </div>
              ))}
            </div>

            {/* Info note */}
            <div style={{background:"rgba(0,229,195,0.05)",border:"1px solid var(--border-accent)",borderRadius:"var(--radius-sm)",padding:"10px 14px",fontSize:"0.78rem",color:"var(--text-secondary)",marginBottom:20}}>
              {payMethod==="UPI"  && "📱 You'll enter your UPI ID on the next screen to complete payment."}
              {payMethod==="Card" && "💳 Slot will be booked immediately. Show this receipt at the parking."}
              {payMethod==="Cash" && "💵 Slot reserved now. Pay the parking attendant when you arrive."}
            </div>

            <div style={{display:"flex",gap:10}}>
              <button className="btn btn-ghost" style={{flex:1,justifyContent:"center"}} disabled={processing} onClick={()=>setStep(2)}>← Back</button>
              <button className="btn btn-primary" style={{flex:2,justifyContent:"center"}} onClick={handlePaymentStep} disabled={processing}>
                {processing ? (
                  <span style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{width:16,height:16,border:"2px solid rgba(10,13,20,0.3)",borderTopColor:"#0a0d14",borderRadius:"50%",animation:"spin 0.6s linear infinite",display:"inline-block"}}/>
                    Booking…
                  </span>
                ) : payMethod==="UPI" ? `Pay ₹${total} via UPI →` : `Confirm Booking ₹${total} →`}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: UPI dummy payment screen ── */}
        {step===4 && (
          <UPIPaymentScreen
            total={total}
            onSuccess={doCreateBooking}
            onBack={()=>setStep(3)}
          />
        )}

        {/* ── STEP 5: Confirmed ── */}
        {step===5 && confirmed && (
          <div className="booking-confirmed">
            <div className="confirmed-icon">✅</div>
            <h3 style={{fontFamily:"var(--font-display)",fontSize:"1.4rem",fontWeight:800,marginBottom:6}}>You're all set!</h3>
            <p style={{color:"var(--text-secondary)",fontSize:"0.88rem",marginBottom:16}}>
              Slot #{confirmed.slotNumber} reserved · {confirmed.paymentMethod} payment · Saved in database.
            </p>
            <div className="booking-id-badge">{confirmed.id}</div>
            <div className="confirmed-details">
              {[
                ["Parking",    confirmed.parkingName],
                ["Slot",       `#${confirmed.slotNumber}`],
                ["Vehicle",    `${VEHICLE_ICONS[confirmed.vehicleType]} ${VEHICLE_LABELS[confirmed.vehicleType]}`],
                ["Check-in",  `${fmtDate(confirmed.checkIn)} at ${fmtTime(confirmed.checkIn)}`],
                ["Check-out", `${fmtDate(confirmed.checkOut)} at ${fmtTime(confirmed.checkOut)}`],
                ["Amount",    `₹${confirmed.totalAmount}`],
                ["Payment",    confirmed.paymentMethod+" ✓"],
              ].map(([k,v])=>(
                <div className="confirmed-detail-row" key={k}>
                  <span className="cd-key">{k}</span>
                  <span className="cd-val">{v}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button className="btn btn-primary" onClick={onClose}>Done</button>
              <button className="btn btn-ghost" onClick={()=>{onClose();window.dispatchEvent(new CustomEvent("parkease:viewbookings"));}}>
                View My Bookings
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
