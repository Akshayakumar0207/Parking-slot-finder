// src/components/profile/UserProfileSetup.jsx
// Shown once after login if no profile exists yet
// Collects: location, vehicle type, model, number
import { useState } from "react";
import { profileAPI } from "../../services/api.js";
import toast from "react-hot-toast";

const VEHICLE_TYPES = [
  { key:"twoWheeler", icon:"🛵", label:"2-Wheeler", sub:"Bike / Scooter" },
  { key:"car",        icon:"🚗", label:"Car",        sub:"Sedan / SUV / Hatchback" },
  { key:"heavy",      icon:"🚛", label:"Heavy",      sub:"Truck / Bus / Van" },
];

const POPULAR_LOCATIONS = [
  { name:"Whitefield, Bengaluru",     lat:12.9698, lng:77.7499 },
  { name:"Koramangala, Bengaluru",    lat:12.9352, lng:77.6245 },
  { name:"Indiranagar, Bengaluru",    lat:12.9784, lng:77.6408 },
  { name:"MG Road, Bengaluru",        lat:12.9757, lng:77.6098 },
  { name:"HSR Layout, Bengaluru",     lat:12.9121, lng:77.6446 },
  { name:"Electronic City, Bengaluru",lat:12.8399, lng:77.6770 },
  { name:"Marathahalli, Bengaluru",   lat:12.9591, lng:77.6972 },
  { name:"Jayanagar, Bengaluru",      lat:12.9308, lng:77.5830 },
];

const BIKE_MODELS  = ["Honda Activa","TVS Jupiter","Royal Enfield","Bajaj Pulsar","Hero Splendor","Yamaha FZ","KTM Duke","Other"];
const CAR_MODELS   = ["Maruti Swift","Hyundai i20","Honda City","Tata Nexon","Kia Seltos","Toyota Fortuner","Mahindra Scorpio","BMW 3 Series","Other"];
const HEAVY_MODELS = ["Tata Ace","Ashok Leyland","Volvo Bus","Eicher Truck","Force Traveller","Other"];

export default function UserProfileSetup({ onComplete }) {
  const [step,          setStep]          = useState(1);
  const [locationName,  setLocationName]  = useState("");
  const [lat,           setLat]           = useState(12.9716);
  const [lng,           setLng]           = useState(77.5946);
  const [vehicleType,   setVehicleType]   = useState("car");
  const [vehicleModel,  setVehicleModel]  = useState("");
  const [customModel,   setCustomModel]   = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [saving,        setSaving]        = useState(false);
  const [locLoading,    setLocLoading]    = useState(false);

  const models = vehicleType === "twoWheeler" ? BIKE_MODELS :
                 vehicleType === "car"        ? CAR_MODELS  : HEAVY_MODELS;

  const detectLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocationName("My Current Location");
        setLocLoading(false);
        toast.success("Location detected! 📍");
      },
      () => { toast.error("Could not detect location. Pick from list."); setLocLoading(false); }
    );
  };

  const handleSave = async () => {
    if (!locationName) { toast.error("Please select or enter your location."); return; }
    if (!vehicleType)  { toast.error("Please select a vehicle type."); return; }
    const finalModel = vehicleModel === "Other" ? customModel : vehicleModel;
    setSaving(true);
    try {
      await profileAPI.save({ locationName, lat, lng, vehicleType, vehicleModel: finalModel, vehicleNumber });
      toast.success("Profile saved! Finding nearby parking… 🚀");
      onComplete({ locationName, lat, lng, vehicleType, vehicleModel: finalModel, vehicleNumber });
    } catch (err) {
      toast.error(err.message || "Failed to save profile");
    } finally { setSaving(false); }
  };

  return (
    <div style={{
      position:"fixed", inset:0,
      background:"rgba(0,0,0,0.85)",
      backdropFilter:"blur(10px)",
      zIndex:999,
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:20,
      animation:"fadeIn 0.3s ease",
    }}>
      <div style={{
        background:"var(--bg-secondary)",
        border:"1px solid var(--border)",
        borderRadius:"var(--radius-xl)",
        width:"100%", maxWidth:520,
        maxHeight:"90vh", overflowY:"auto",
        animation:"slideUp 0.35s ease",
      }}>

        {/* Header */}
        <div style={{
          padding:"28px 28px 0",
          textAlign:"center",
          borderBottom:"1px solid var(--border)",
          paddingBottom:20,
          marginBottom:24,
        }}>
          <div style={{ fontSize:"2.5rem", marginBottom:8 }}>🅿</div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:"1.4rem", fontWeight:800, marginBottom:4 }}>
            Welcome to ParkEase!
          </div>
          <p style={{ color:"var(--text-secondary)", fontSize:"0.88rem" }}>
            Tell us your location and vehicle to find parking near you.
          </p>

          {/* Step dots */}
          <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:16 }}>
            {[1,2].map(s => (
              <div key={s} style={{
                width: step===s ? 24 : 8, height:8,
                borderRadius:4,
                background: step>=s ? "var(--accent)" : "var(--border)",
                transition:"all 0.3s ease",
              }}/>
            ))}
          </div>
        </div>

        <div style={{ padding:"0 28px 28px" }}>

          {/* ── STEP 1: Location ── */}
          {step === 1 && (
            <div style={{ animation:"slideUp 0.3s ease" }}>
              <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1rem", marginBottom:4 }}>
                📍 Where are you located?
              </div>
              <p style={{ color:"var(--text-secondary)", fontSize:"0.82rem", marginBottom:18 }}>
                We'll show parking within 2–5 km of your location.
              </p>

              {/* Auto detect */}
              <button
                className="btn btn-secondary"
                style={{ width:"100%", justifyContent:"center", marginBottom:16 }}
                onClick={detectLocation}
                disabled={locLoading}
              >
                {locLoading ? "Detecting…" : "📡 Use My Current Location"}
              </button>

              <div style={{ textAlign:"center", color:"var(--text-muted)", fontSize:"0.78rem", marginBottom:16 }}>
                — or pick from popular areas —
              </div>

              {/* Popular locations */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
                {POPULAR_LOCATIONS.map(loc => (
                  <button key={loc.name} type="button"
                    onClick={() => { setLocationName(loc.name); setLat(loc.lat); setLng(loc.lng); }}
                    style={{
                      padding:"10px 12px",
                      borderRadius:"var(--radius-sm)",
                      border:`1.5px solid ${locationName===loc.name?"var(--accent)":"var(--border)"}`,
                      background: locationName===loc.name ? "var(--accent-dim)" : "var(--bg-card)",
                      color: locationName===loc.name ? "var(--accent)" : "var(--text-secondary)",
                      fontSize:"0.78rem", fontWeight:500,
                      cursor:"pointer", transition:"all 0.2s",
                      textAlign:"left",
                    }}
                  >
                    📍 {loc.name.split(",")[0]}
                  </button>
                ))}
              </div>

              {/* Manual input */}
              <div className="input-group">
                <label>Or type your area</label>
                <input type="text" placeholder="e.g. JP Nagar, Bengaluru"
                  value={locationName} onChange={e => setLocationName(e.target.value)}/>
              </div>

              {locationName && (
                <div style={{
                  background:"var(--accent-dim)", border:"1px solid var(--border-accent)",
                  borderRadius:"var(--radius-sm)", padding:"10px 14px",
                  fontSize:"0.82rem", color:"var(--accent)", marginBottom:16,
                }}>
                  ✅ Location set: <strong>{locationName}</strong>
                </div>
              )}

              <button
                className="btn btn-primary"
                style={{ width:"100%", justifyContent:"center" }}
                disabled={!locationName}
                onClick={() => setStep(2)}
              >
                Next — Select Vehicle →
              </button>
            </div>
          )}

          {/* ── STEP 2: Vehicle ── */}
          {step === 2 && (
            <div style={{ animation:"slideUp 0.3s ease" }}>
              <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1rem", marginBottom:4 }}>
                🚗 What's your vehicle?
              </div>
              <p style={{ color:"var(--text-secondary)", fontSize:"0.82rem", marginBottom:18 }}>
                We'll filter parking slots that support your vehicle type.
              </p>

              {/* Vehicle type selector */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
                {VEHICLE_TYPES.map(v => (
                  <div key={v.key}
                    onClick={() => { setVehicleType(v.key); setVehicleModel(""); }}
                    style={{
                      border:`2px solid ${vehicleType===v.key?"var(--accent)":"var(--border)"}`,
                      background: vehicleType===v.key ? "var(--accent-dim)" : "var(--bg-card)",
                      borderRadius:"var(--radius-md)", padding:"16px 10px",
                      textAlign:"center", cursor:"pointer", transition:"all 0.2s",
                    }}
                  >
                    <div style={{ fontSize:"2rem", marginBottom:6 }}>{v.icon}</div>
                    <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"0.88rem",
                      color: vehicleType===v.key ? "var(--accent)" : "var(--text-primary)" }}>{v.label}</div>
                    <div style={{ fontSize:"0.68rem", color:"var(--text-muted)", marginTop:2 }}>{v.sub}</div>
                  </div>
                ))}
              </div>

              {/* Vehicle model */}
              <div className="input-group">
                <label>Vehicle Model</label>
                <select value={vehicleModel} onChange={e => setVehicleModel(e.target.value)}>
                  <option value="">Select model…</option>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {vehicleModel === "Other" && (
                <div className="input-group">
                  <label>Enter your model</label>
                  <input type="text" placeholder="e.g. Honda CB Shine"
                    value={customModel} onChange={e => setCustomModel(e.target.value)}/>
                </div>
              )}

              {/* Vehicle number */}
              <div className="input-group">
                <label>Vehicle Number <span style={{ color:"var(--text-muted)", fontWeight:400 }}>(optional)</span></label>
                <input type="text" placeholder="e.g. KA-01-AB-1234"
                  value={vehicleNumber}
                  onChange={e => setVehicleNumber(e.target.value.toUpperCase())}
                  style={{ textTransform:"uppercase", letterSpacing:"0.05em" }}/>
              </div>

              <div style={{ display:"flex", gap:10 }}>
                <button className="btn btn-ghost" style={{ flex:1, justifyContent:"center" }} onClick={() => setStep(1)}>
                  ← Back
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex:2, justifyContent:"center" }}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "🚀 Find Nearby Parking →"}
                </button>
              </div>

              <p style={{ textAlign:"center", color:"var(--text-muted)", fontSize:"0.75rem", marginTop:12 }}>
                You can update these details anytime from your profile.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
