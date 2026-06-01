// src/components/renter/RentParkingFlow.jsx
import { useState } from "react";
import { useAuth }    from "../../context/AuthContext.jsx";
import { useParking } from "../../context/ParkingContext.jsx";
import { lotsAPI }    from "../../services/api.js";
import { VEHICLE_ICONS, VEHICLE_LABELS } from "../../utils/pricingEngine.js";
import toast from "react-hot-toast";

const CITIES = ["Bengaluru","Chennai","Mumbai","Delhi","Hyderabad","Pune","Kolkata","Ahmedabad","Jaipur","Kochi","Chandigarh","Coimbatore","Surat","Indore","Nagpur"];
const LOC_TYPES = [
  { value:"open",     label:"🌳 Open Air Lot"       },
  { value:"mall",     label:"🏬 Mall / Commercial"   },
  { value:"basement", label:"🏢 Basement / Building" },
  { value:"street",   label:"🛣️ Street / Roadside"  },
];
const AMENITY_OPTS = ["CCTV","Covered","24/7","Security","EV Charging","Well-lit","Valet","Disabled Access"];

function StepDot({ n, active, done }) {
  return (
    <div style={{
      width:32, height:32, borderRadius:"50%",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"var(--font-display)", fontWeight:700, fontSize:"0.8rem", flexShrink:0,
      background: done?"var(--success)":active?"var(--accent)":"var(--bg-card)",
      color: (done||active)?"#0a0d14":"var(--text-muted)",
      border:`2px solid ${done?"var(--success)":active?"var(--accent)":"var(--border)"}`,
      transition:"all 0.3s ease",
    }}>{done?"✓":n}</div>
  );
}

function SectionCard({ icon, title, sub, children }) {
  return (
    <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:24, marginBottom:18 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
        <div style={{ width:30, height:30, background:"var(--accent-dim)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.9rem" }}>{icon}</div>
        <span style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"0.95rem" }}>{title}</span>
      </div>
      {sub && <p style={{ fontSize:"0.8rem", color:"var(--text-muted)", marginBottom:18, marginLeft:40 }}>{sub}</p>}
      {!sub && <div style={{ marginBottom:16 }}/>}
      {children}
    </div>
  );
}

export default function RentParkingFlow({ onCancel }) {
  const { user }            = useAuth();
  const { addUserListing }  = useParking();
  const [step, setStep]     = useState(1);
  const [predicting, setPredicting] = useState(false);
  const [launching,  setLaunching]  = useState(false);
  const [tiers,    setTiers]        = useState([]);
  const [selectedTier, setSelectedTier] = useState("standard");
  const [liveListing,  setLiveListing]  = useState(null);

  const [profile, setProfile] = useState({
    ownerName:  user?.name || "",
    phone:      "",
    parkingName:"",
    address:    "",
    city:       "Bengaluru",
    locationType:"open",
    isCityCenter:false,
    amenities:  [],
    capacities: { twoWheeler:"", car:"", heavy:"" },
  });

  const setP   = (k,v) => setProfile(p=>({...p,[k]:v}));
  const setCap = (k,v) => setProfile(p=>({...p,capacities:{...p.capacities,[k]:v}}));
  const toggleAmenity = a => setProfile(p=>({...p, amenities:p.amenities.includes(a)?p.amenities.filter(x=>x!==a):[...p.amenities,a]}));
  const hasCapacity = parseInt(profile.capacities.twoWheeler)>0 || parseInt(profile.capacities.car)>0 || parseInt(profile.capacities.heavy)>0;

  const handlePredict = async () => {
    if (!profile.ownerName.trim()) { toast.error("Enter your name"); return; }
    if (!profile.phone.trim())     { toast.error("Enter phone number"); return; }
    if (!profile.parkingName.trim()){ toast.error("Enter parking name"); return; }
    if (!profile.address.trim())   { toast.error("Enter address"); return; }
    if (!hasCapacity)              { toast.error("Add capacity for at least one vehicle type"); return; }
    setPredicting(true);
    try {
      const data = await lotsAPI.predictPricing({
        isCityCenter: profile.isCityCenter,
        locationType: profile.locationType,
        capacities:   profile.capacities,
      });
      setTiers(data); setStep(2);
      toast.success("Pricing predicted! Choose your tier.");
    } catch(err) { toast.error(err.message||"Prediction failed"); }
    finally { setPredicting(false); }
  };

  const handleGoLive = async () => {
    if (!selectedTier) { toast.error("Choose a pricing tier"); return; }
    setLaunching(true);
    try {
      const tier = tiers.find(t=>t.key===selectedTier);
      const listing = await addUserListing({
        parkingName:  profile.parkingName,
        address:      profile.address,
        city:         profile.city,
        locationType: profile.locationType,
        isCityCenter: profile.isCityCenter,
        amenities:    profile.amenities,
        pricingTier:  selectedTier,
        pricePerHour: tier?.prices || {},
        capacities:   profile.capacities,
      });
      setLiveListing(listing); setStep(3);
      toast.success("Your parking is now LIVE! 🎉");
    } catch(err) { toast.error(err.message||"Failed to go live"); }
    finally { setLaunching(false); }
  };

  return (
    <div style={{ animation:"slideUp 0.35s ease", maxWidth:680, margin:"0 auto" }}>

      {/* Step bar */}
      <div style={{ display:"flex", alignItems:"center", background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:"16px 24px", marginBottom:24 }}>
        {[{n:1,l:"Your Profile"},{n:2,l:"Choose Pricing"},{n:3,l:"Go Live"}].map(({n,l},i)=>(
          <div key={n} style={{ display:"flex", alignItems:"center", flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <StepDot n={n} active={step===n} done={step>n}/>
              <span style={{ fontSize:"0.8rem", fontWeight:600, whiteSpace:"nowrap",
                color:step===n?"var(--text-primary)":step>n?"var(--success)":"var(--text-muted)" }}>{l}</span>
            </div>
            {i<2&&<div style={{ flex:1,height:2,margin:"0 10px",borderRadius:1,transition:"background 0.4s",
              background:step>n?"var(--success)":"var(--border)" }}/>}
          </div>
        ))}
      </div>

      {/* STEP 1 */}
      {step===1 && <>
        <SectionCard icon="👤" title="Owner Profile" sub="Private — not shown to drivers.">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
            <div className="input-group">
              <label>Full Name *</label>
              <input type="text" placeholder="Arjun Kumar" value={profile.ownerName} onChange={e=>setP("ownerName",e.target.value)}/>
            </div>
            <div className="input-group">
              <label>Phone Number *</label>
              <input type="tel" placeholder="9876543210" maxLength={10} value={profile.phone}
                onChange={e=>setP("phone",e.target.value.replace(/\D/g,"").slice(0,10))}/>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon="📍" title="Parking Location" sub="Where is your parking space?">
          <div className="input-group">
            <label>Parking Space Name *</label>
            <input type="text" placeholder="e.g. My Home Garage" value={profile.parkingName} onChange={e=>setP("parkingName",e.target.value)}/>
          </div>
          <div className="input-group">
            <label>Street Address *</label>
            <input type="text" placeholder="e.g. 12, 3rd Cross, Whitefield" value={profile.address} onChange={e=>setP("address",e.target.value)}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
            <div className="input-group">
              <label>City</label>
              <select value={profile.city} onChange={e=>setP("city",e.target.value)}>
                {CITIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Location Type</label>
              <select value={profile.locationType} onChange={e=>setP("locationType",e.target.value)}>
                {LOC_TYPES.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>
          <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:"0.88rem", color:"var(--text-secondary)" }}>
            <input type="checkbox" checked={profile.isCityCenter} onChange={e=>setP("isCityCenter",e.target.checked)}
              style={{ width:16, height:16, accentColor:"var(--accent)" }}/>
            This is a city centre / high-demand area
          </label>
        </SectionCard>

        <SectionCard icon="🚘" title="Vehicle Capacity" sub="How many vehicles can park at once?">
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
            {[{key:"twoWheeler",icon:"🛵",label:"2-Wheelers"},{key:"car",icon:"🚗",label:"Cars"},{key:"heavy",icon:"🚛",label:"Heavy"}].map(({key,icon,label})=>(
              <div key={key} style={{ background:"var(--bg-primary)", border:`1.5px solid ${parseInt(profile.capacities[key])>0?"var(--border-accent)":"var(--border)"}`,
                borderRadius:"var(--radius-md)", padding:"16px 12px", textAlign:"center", transition:"all 0.2s" }}>
                <div style={{ fontSize:"1.8rem", marginBottom:6 }}>{icon}</div>
                <div style={{ fontSize:"0.72rem", color:"var(--text-secondary)", marginBottom:8 }}>{label}</div>
                <input type="number" min="0" max="999" placeholder="0" value={profile.capacities[key]}
                  onChange={e=>setCap(key,e.target.value)}
                  style={{ width:"100%", background:"var(--bg-secondary)", border:"1px solid var(--border)",
                    borderRadius:6, padding:"6px 8px", color:"var(--text-primary)",
                    fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1.1rem", textAlign:"center", outline:"none" }}/>
              </div>
            ))}
          </div>
          <div style={{ marginTop:20 }}>
            <div style={{ fontSize:"0.78rem", fontWeight:600, color:"var(--text-secondary)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:10 }}>Amenities (optional)</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {AMENITY_OPTS.map(a=>{
                const on=profile.amenities.includes(a);
                return (
                  <button key={a} type="button" onClick={()=>toggleAmenity(a)} style={{
                    padding:"6px 12px", borderRadius:100,
                    border:`1.5px solid ${on?"var(--accent)":"var(--border)"}`,
                    background:on?"var(--accent-dim)":"transparent",
                    color:on?"var(--accent)":"var(--text-secondary)",
                    fontSize:"0.78rem", fontWeight:500, cursor:"pointer", transition:"all 0.2s"
                  }}>{a}</button>
                );
              })}
            </div>
          </div>
        </SectionCard>

        <div style={{ display:"flex", gap:10 }}>
          <button className="btn btn-ghost" style={{ flex:1, justifyContent:"center" }} onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary"
            style={{ flex:3, justifyContent:"center", background:predicting?"var(--bg-card)":"var(--accent-secondary)", boxShadow:predicting?"none":"0 4px 20px rgba(255,107,53,0.3)" }}
            onClick={handlePredict} disabled={predicting}>
            {predicting?(
              <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ width:16, height:16, border:"2px solid rgba(255,255,255,0.2)", borderTopColor:"var(--accent)", borderRadius:"50%", animation:"spin 0.6s linear infinite", display:"inline-block" }}/>
                Predicting…
              </span>
            ):"🔮 Predict Pricing →"}
          </button>
        </div>
      </>}

      {/* STEP 2 */}
      {step===2 && <>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontFamily:"var(--font-display)", fontSize:"1.2rem", fontWeight:800, marginBottom:4 }}>Choose Your Pricing Tier</div>
          <p style={{ fontSize:"0.85rem", color:"var(--text-secondary)" }}>
            Based on <strong style={{ color:"var(--text-primary)" }}>{profile.city}</strong> · {profile.locationType} · your capacity.
          </p>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:24 }}>
          {tiers.map(tier=>{
            const sel=selectedTier===tier.key;
            const vEntries=Object.entries(tier.prices||{}).filter(([,v])=>v>0);
            return (
              <div key={tier.key} onClick={()=>setSelectedTier(tier.key)} style={{
                background:"var(--bg-card)", border:`2px solid ${sel?"var(--accent)":"var(--border)"}`,
                borderRadius:"var(--radius-lg)", padding:22, cursor:"pointer",
                transition:"all 0.2s", position:"relative", overflow:"hidden",
                boxShadow:sel?"var(--shadow-accent)":"none"
              }}>
                {sel&&<div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:"linear-gradient(90deg,var(--accent),transparent)" }}/>}
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:"1.5rem" }}>{tier.emoji}</span>
                    <div>
                      <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"1rem" }}>{tier.label} Pricing</div>
                      <div style={{ fontSize:"0.78rem", color:"var(--text-secondary)", marginTop:2, maxWidth:280 }}>{tier.desc}</div>
                    </div>
                  </div>
                  <div style={{ width:22, height:22, borderRadius:"50%", flexShrink:0,
                    border:`2px solid ${sel?"var(--accent)":"var(--border)"}`,
                    background:sel?"var(--accent)":"transparent",
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {sel&&<div style={{ width:8, height:8, borderRadius:"50%", background:"#0a0d14" }}/>}
                  </div>
                </div>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  {vEntries.map(([vt,price])=>(
                    <div key={vt} style={{ background:"var(--bg-primary)", borderRadius:"var(--radius-sm)",
                      padding:"10px 16px", display:"flex", alignItems:"center", gap:8,
                      border:`1px solid ${sel?"var(--border-accent)":"var(--border)"}` }}>
                      <span style={{ fontSize:"1.2rem" }}>{VEHICLE_ICONS[vt]}</span>
                      <div>
                        <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"1rem", color:sel?"var(--accent)":"var(--text-primary)" }}>₹{price}</div>
                        <div style={{ fontSize:"0.68rem", color:"var(--text-muted)" }}>{VEHICLE_LABELS[vt]}/hr</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button className="btn btn-ghost" style={{ flex:1, justifyContent:"center" }} onClick={()=>setStep(1)}>← Back</button>
          <button className="btn btn-primary"
            style={{ flex:3, justifyContent:"center", background:launching?"var(--bg-card)":"var(--accent)", boxShadow:launching?"none":"var(--accent-glow)" }}
            onClick={handleGoLive} disabled={!selectedTier||launching}>
            {launching?(
              <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ width:16, height:16, border:"2px solid rgba(10,13,20,0.2)", borderTopColor:"#0a0d14", borderRadius:"50%", animation:"spin 0.6s linear infinite", display:"inline-block" }}/>
                Going Live…
              </span>
            ):"🚀 Go Live Now →"}
          </button>
        </div>
      </>}

      {/* STEP 3 */}
      {step===3 && liveListing && (
        <div style={{ animation:"slideUp 0.4s ease" }}>
          <div style={{ background:"linear-gradient(135deg,rgba(0,229,160,0.1),rgba(0,229,195,0.05))",
            border:"1.5px solid var(--success)", borderRadius:"var(--radius-xl)",
            padding:"32px 28px", textAlign:"center", marginBottom:24 }}>
            <div style={{ fontSize:"3.5rem", marginBottom:12 }}>🎉</div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:"1.5rem", fontWeight:800, marginBottom:6 }}>You're Live!</div>
            <p style={{ color:"var(--text-secondary)", fontSize:"0.88rem", marginBottom:20 }}>
              <strong style={{ color:"var(--text-primary)" }}>{liveListing.name}</strong> is now visible to all nearby drivers.
            </p>
            <div style={{ display:"inline-flex", alignItems:"center", gap:7,
              background:"rgba(0,229,160,0.15)", border:"1px solid var(--success)", borderRadius:100, padding:"7px 16px" }}>
              <span style={{ width:8, height:8, background:"var(--success)", borderRadius:"50%", animation:"pulse 1.5s ease infinite" }}/>
              <span style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"0.82rem", color:"var(--success)" }}>LIVE — Real-time via Socket.IO</span>
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button className="btn btn-ghost"    style={{ flex:1, justifyContent:"center" }} onClick={onCancel}>✅ Done</button>
            <button className="btn btn-primary"  style={{ flex:2, justifyContent:"center" }} onClick={()=>{ setStep(1); setTiers([]); setLiveListing(null); }}>+ List Another</button>
          </div>
        </div>
      )}
    </div>
  );
}
