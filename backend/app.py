# backend/app.py
# Python 3.10/3.11/3.12/3.13 — Windows & Mac/Linux
# threading async_mode — NO eventlet required

import os, json, random, time, threading, sys
from decimal import Decimal
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv

from database import query, execute, test_connection
from auth import hash_password, check_password, create_token, token_required

load_dotenv()

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("JWT_SECRET", "parkease_secret_key_2024")
CORS(app, origins="*", supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading",
                    logger=False, engineio_logger=False)

# ── JSON encoder: handles MySQL Decimal & datetime ────────────
class SafeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

app.json_encoder = SafeEncoder

# ── Helpers ───────────────────────────────────────────────────
def safe_int(val, default=0):
    try:   return int(val) if val is not None else default
    except: return default

def safe_float(val, default=0.0):
    try:   return float(val) if val is not None else default
    except: return default

def lot_to_dict(lot, pricing, slots_summary):
    amenities = []
    try:
        amenities = json.loads(lot.get("amenities") or "[]")
    except Exception:
        pass
    slots = {
        "car":        {"total": 0, "available": 0},
        "twoWheeler": {"total": 0, "available": 0},
        "heavy":      {"total": 0, "available": 0},
    }
    for row in (slots_summary or []):
        vt = row["vehicle_type"]
        if vt in slots:
            slots[vt]["total"]     = safe_int(row["total"])
            slots[vt]["available"] = safe_int(row["available"])
    p = pricing or {}
    return {
        "id":           str(lot["lot_key"]),
        "dbId":         safe_int(lot["id"]),
        "name":         str(lot["name"]),
        "address":      str(lot["address"]),
        "lat":          safe_float(lot["lat"]),
        "lng":          safe_float(lot["lng"]),
        "distanceKm":   safe_float(lot.get("dist_km") or lot.get("distance_km", 0)),
        "rating":       safe_float(lot["rating"]),
        "isOpen":       bool(lot["is_open"]),
        "isCityCenter": bool(lot["is_city_center"]),
        "amenities":    amenities,
        "slots":        slots,
        "pricePerHour": {
            "car":        safe_int(p.get("price_car",        100)),
            "twoWheeler": safe_int(p.get("price_two_wheeler", 50)),
            "heavy":      safe_int(p.get("price_heavy",      200)),
        },
    }

def db_error_response(e):
    msg = str(e)
    if "1049" in msg or "Unknown database" in msg:
        return jsonify({"error": "Database 'parkease' not found. Run schema.sql in MySQL Workbench first."}), 503
    if "1045" in msg or "2003" in msg or "Access denied" in msg:
        return jsonify({"error": "Cannot connect to MySQL. Check your .env DB_PASSWORD."}), 503
    return jsonify({"error": f"Database error: {msg}"}), 500

def get_slots_summary():
    return query("""
        SELECT lot_id, vehicle_type,
               COUNT(*) AS total,
               COALESCE(SUM(CASE WHEN status='available' THEN 1 ELSE 0 END),0) AS available
        FROM parking_slots GROUP BY lot_id, vehicle_type
    """)

# ─────────────────────────────────────────────────────────────
#  ROUTES — ORDER MATTERS: specific routes BEFORE /<lot_key>/
# ─────────────────────────────────────────────────────────────

# ── Health ────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    try:
        query("SELECT 1", fetchone=True)
        return jsonify({"status": "ok", "db": "connected"})
    except Exception as e:
        return jsonify({"status": "error", "db": str(e)}), 503

# ── Auth ──────────────────────────────────────────────────────
@app.route("/api/auth/register", methods=["POST"])
def register():
    try:
        data  = request.get_json(silent=True) or {}
        name  = (data.get("name")  or "").strip()
        email = (data.get("email") or "").strip().lower()
        pwd   = data.get("password", "")
        phone = (data.get("phone") or "").strip()
        if not name or not email or not pwd:
            return jsonify({"error": "Name, email and password are required"}), 400
        if len(pwd) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        if query("SELECT id FROM users WHERE email=%s", (email,), fetchone=True):
            return jsonify({"error": "This email is already registered. Please sign in."}), 409
        uid   = execute(
            "INSERT INTO users (name,email,password,phone) VALUES(%s,%s,%s,%s)",
            (name, email, hash_password(pwd), phone))
        token = create_token(uid, email)
        return jsonify({"token": token, "user": {"id": uid, "name": name, "email": email}}), 201
    except Exception as e:
        return db_error_response(e)

@app.route("/api/auth/login", methods=["POST"])
def login():
    try:
        data  = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        pwd   = data.get("password", "")
        if not email or not pwd:
            return jsonify({"error": "Email and password are required"}), 400
        user = query("SELECT * FROM users WHERE email=%s", (email,), fetchone=True)
        if not user or not check_password(pwd, user["password"]):
            return jsonify({"error": "Invalid email or password"}), 401
        token = create_token(safe_int(user["id"]), user["email"])
        return jsonify({"token": token,
                        "user": {"id": safe_int(user["id"]), "name": user["name"], "email": user["email"]}})
    except Exception as e:
        return db_error_response(e)

@app.route("/api/auth/me", methods=["GET"])
@token_required
def me():
    try:
        user = query("SELECT id,name,email,phone FROM users WHERE id=%s", (g.user_id,), fetchone=True)
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"id": safe_int(user["id"]), "name": user["name"],
                        "email": user["email"], "phone": user.get("phone","")})
    except Exception as e:
        return db_error_response(e)

# ── User Profile ──────────────────────────────────────────────
@app.route("/api/profile", methods=["GET"])
@token_required
def get_profile():
    try:
        profile = query("SELECT * FROM user_profiles WHERE user_id=%s", (g.user_id,), fetchone=True)
        if not profile:
            return jsonify(None)
        return jsonify({
            "locationName":  profile["location_name"],
            "lat":           safe_float(profile["lat"]),
            "lng":           safe_float(profile["lng"]),
            "vehicleType":   profile["vehicle_type"],
            "vehicleModel":  profile["vehicle_model"],
            "vehicleNumber": profile["vehicle_number"],
        })
    except Exception as e:
        return db_error_response(e)

@app.route("/api/profile", methods=["POST"])
@token_required
def save_profile():
    try:
        d = request.get_json(silent=True) or {}
        location_name  = d.get("locationName", "")
        lat            = float(d.get("lat", 12.9716))
        lng            = float(d.get("lng", 77.5946))
        vehicle_type   = d.get("vehicleType", "car")
        vehicle_model  = d.get("vehicleModel", "")
        vehicle_number = d.get("vehicleNumber", "")
        existing = query("SELECT id FROM user_profiles WHERE user_id=%s", (g.user_id,), fetchone=True)
        if existing:
            execute("""UPDATE user_profiles
                SET location_name=%s, lat=%s, lng=%s,
                    vehicle_type=%s, vehicle_model=%s, vehicle_number=%s
                WHERE user_id=%s""",
                (location_name, lat, lng, vehicle_type, vehicle_model, vehicle_number, g.user_id))
        else:
            execute("""INSERT INTO user_profiles
                (user_id, location_name, lat, lng, vehicle_type, vehicle_model, vehicle_number)
                VALUES(%s,%s,%s,%s,%s,%s,%s)""",
                (g.user_id, location_name, lat, lng, vehicle_type, vehicle_model, vehicle_number))
        return jsonify({"ok": True})
    except Exception as e:
        return db_error_response(e)

# ── Lots — list all ───────────────────────────────────────────
@app.route("/api/lots", methods=["GET"])
def list_lots():
    try:
        lots     = query("SELECT * FROM parking_lots ORDER BY distance_km")
        pricings = {safe_int(r["lot_id"]): r for r in query("SELECT * FROM pricing")}
        summary  = get_slots_summary()
        by_lot   = {}
        for row in summary:
            by_lot.setdefault(safe_int(row["lot_id"]), []).append(row)
        return jsonify([lot_to_dict(l, pricings.get(safe_int(l["id"])), by_lot.get(safe_int(l["id"]),[])) for l in lots])
    except Exception as e:
        return db_error_response(e)

# ── Lots — nearby (MUST be before /<lot_key> routes) ─────────
@app.route("/api/lots/nearby", methods=["GET"])
def nearby_lots():
    try:
        user_lat     = float(request.args.get("lat",    12.9716))
        user_lng     = float(request.args.get("lng",    77.5946))
        radius_km    = float(request.args.get("radius", 5.0))
        vehicle_type = request.args.get("vehicleType", "")

        lots = query("""
            SELECT *,
              ROUND(6371 * ACOS(
                LEAST(1.0, COS(RADIANS(%s)) * COS(RADIANS(lat)) *
                COS(RADIANS(lng) - RADIANS(%s)) +
                SIN(RADIANS(%s)) * SIN(RADIANS(lat)))
              ), 1) AS dist_km
            FROM parking_lots
            HAVING dist_km <= %s
            ORDER BY dist_km
        """, (user_lat, user_lng, user_lat, radius_km))

        pricings = {safe_int(r["lot_id"]): r for r in query("SELECT * FROM pricing")}
        summary  = get_slots_summary()
        by_lot   = {}
        for row in summary:
            by_lot.setdefault(safe_int(row["lot_id"]), []).append(row)

        result = []
        for l in lots:
            d = lot_to_dict(l, pricings.get(safe_int(l["id"])), by_lot.get(safe_int(l["id"]), []))
            d["distanceKm"] = safe_float(l.get("dist_km", 0))
            if vehicle_type and vehicle_type in d["slots"]:
                if d["slots"][vehicle_type]["total"] == 0:
                    continue
            result.append(d)
        return jsonify(result)
    except Exception as e:
        return db_error_response(e)

# ── Lots — my listings ────────────────────────────────────────
@app.route("/api/my-lots", methods=["GET"])
@token_required
def my_lots():
    try:
        lots     = query("SELECT * FROM parking_lots WHERE owner_id=%s ORDER BY created_at DESC", (g.user_id,))
        pricings = {safe_int(r["lot_id"]): r for r in query("SELECT * FROM pricing")}
        summary  = query("""
            SELECT lot_id, vehicle_type, COUNT(*) AS total,
                   COALESCE(SUM(CASE WHEN status='available' THEN 1 ELSE 0 END),0) AS available
            FROM parking_slots
            WHERE lot_id IN (SELECT id FROM parking_lots WHERE owner_id=%s)
            GROUP BY lot_id, vehicle_type
        """, (g.user_id,))
        by_lot = {}
        for row in summary:
            by_lot.setdefault(safe_int(row["lot_id"]), []).append(row)
        return jsonify([lot_to_dict(l, pricings.get(safe_int(l["id"])), by_lot.get(safe_int(l["id"]),[])) for l in lots])
    except Exception as e:
        return db_error_response(e)

# ── Lots — predict pricing ────────────────────────────────────
BASE_RATES = {"twoWheeler":50,"car":100,"heavy":200}

def _predict(vt, is_cc, cap, loc):
    base = BASE_RATES.get(vt, 50)
    if is_cc:    base = round(base * 1.25)
    if cap < 10: base = round(base * 1.15)
    elif cap>30: base = round(base * 0.90)
    mult = {"mall":1.1,"basement":1.05,"street":0.85,"open":0.9}.get(loc, 1.0)
    return round(base * mult)

@app.route("/api/predict-pricing", methods=["POST"])
@token_required
def predict_pricing():
    d    = request.get_json(silent=True) or {}
    caps = d.get("capacities", {})
    is_cc= bool(d.get("isCityCenter", False))
    loc  = d.get("locationType", "open")
    tiers= []
    for key, factor, emoji, desc in [
        ("budget",  0.8, "💚", "Attract more drivers with lower rates."),
        ("standard",1.0, "💛", "Balanced pricing for your location."),
        ("premium", 1.3, "🔴", "Maximum earnings per booking."),
    ]:
        prices = {}
        for vt in ("twoWheeler","car","heavy"):
            cap = safe_int(caps.get(vt, 0))
            if cap > 0: prices[vt] = round(_predict(vt, is_cc, cap, loc) * factor)
        tiers.append({"key":key,"label":key.capitalize(),"emoji":emoji,"desc":desc,"factor":factor,"prices":prices})
    return jsonify(tiers)

# ── Lots — create new ─────────────────────────────────────────
@app.route("/api/lots", methods=["POST"])
@token_required
def create_lot():
    try:
        d = request.get_json(silent=True) or {}
        if not all(d.get(k) for k in ("parkingName","address","city","locationType")):
            return jsonify({"error": "Missing required fields"}), 400
        caps  = d.get("capacities", {})
        car_c = safe_int(caps.get("car", 0))
        tw_c  = safe_int(caps.get("twoWheeler", 0))
        hv_c  = safe_int(caps.get("heavy", 0))
        if car_c + tw_c + hv_c == 0:
            return jsonify({"error": "Add capacity for at least one vehicle type"}), 400

        lot_key = f"user_park_{int(time.time())}"
        lot_id  = execute("""
            INSERT INTO parking_lots
                (lot_key,name,address,lat,lng,distance_km,rating,
                 is_open,is_city_center,amenities,owner_id,pricing_tier)
            VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            lot_key, d["parkingName"], f"{d['address']}, {d['city']}",
            round(12.97+random.uniform(0,0.06),7), round(77.72+random.uniform(0,0.06),7),
            round(random.uniform(0.2,2.5),1), 0, 1,
            1 if d.get("isCityCenter") else 0,
            json.dumps(d.get("amenities",[])), g.user_id, d.get("pricingTier","standard"),
        ))
        prices = d.get("pricePerHour", {})
        execute("INSERT INTO pricing(lot_id,price_car,price_two_wheeler,price_heavy)VALUES(%s,%s,%s,%s)",
                (lot_id, safe_int(prices.get("car",100)), safe_int(prices.get("twoWheeler",50)), safe_int(prices.get("heavy",200))))
        for sn in range(1, car_c+1):
            execute("INSERT IGNORE INTO parking_slots(lot_id,vehicle_type,slot_number,status)VALUES(%s,'car',%s,'available')",(lot_id,sn))
        for sn in range(1, tw_c+1):
            execute("INSERT IGNORE INTO parking_slots(lot_id,vehicle_type,slot_number,status)VALUES(%s,'twoWheeler',%s,'available')",(lot_id,sn))
        for sn in range(1, hv_c+1):
            execute("INSERT IGNORE INTO parking_slots(lot_id,vehicle_type,slot_number,status)VALUES(%s,'heavy',%s,'available')",(lot_id,sn))

        lot     = query("SELECT * FROM parking_lots WHERE id=%s",(lot_id,),fetchone=True)
        pricing = query("SELECT * FROM pricing WHERE lot_id=%s",(lot_id,),fetchone=True)
        summary = query("""SELECT vehicle_type,COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN status='available' THEN 1 ELSE 0 END),0) AS available
            FROM parking_slots WHERE lot_id=%s GROUP BY vehicle_type""",(lot_id,))
        result = lot_to_dict(lot, pricing, summary)
        socketio.emit("lot_added", result)
        return jsonify(result), 201
    except Exception as e:
        return db_error_response(e)

# ── Lots — single lot (AFTER /nearby and /my-lots) ────────────
@app.route("/api/lots/<lot_key>", methods=["GET"])
def get_lot(lot_key):
    try:
        lot = query("SELECT * FROM parking_lots WHERE lot_key=%s",(lot_key,),fetchone=True)
        if not lot: return jsonify({"error":"Not found"}),404
        pricing = query("SELECT * FROM pricing WHERE lot_id=%s",(safe_int(lot["id"]),),fetchone=True)
        summary = query("""SELECT vehicle_type,COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN status='available' THEN 1 ELSE 0 END),0) AS available
            FROM parking_slots WHERE lot_id=%s GROUP BY vehicle_type""",(safe_int(lot["id"]),))
        return jsonify(lot_to_dict(lot, pricing, summary))
    except Exception as e:
        return db_error_response(e)

# ── Lots — slots for a specific lot ──────────────────────────
@app.route("/api/lots/<lot_key>/slots", methods=["GET"])
def get_slots(lot_key):
    try:
        lot = query("SELECT id FROM parking_lots WHERE lot_key=%s",(lot_key,),fetchone=True)
        if not lot: return jsonify({"error":"Lot not found"}),404
        vt    = request.args.get("vehicleType","car")
        slots = query(
            "SELECT slot_number,status FROM parking_slots "
            "WHERE lot_id=%s AND vehicle_type=%s ORDER BY slot_number",
            (safe_int(lot["id"]),vt))
        return jsonify([
            {"id":f"slot_{safe_int(r['slot_number'])}","number":safe_int(r["slot_number"]),"status":r["status"]}
            for r in slots])
    except Exception as e:
        return db_error_response(e)

# ── Lots — toggle open/closed ─────────────────────────────────
@app.route("/api/lots/<lot_key>/toggle", methods=["PATCH"])
@token_required
def toggle_lot(lot_key):
    try:
        lot = query("SELECT * FROM parking_lots WHERE lot_key=%s AND owner_id=%s",(lot_key,g.user_id),fetchone=True)
        if not lot: return jsonify({"error":"Not found or not yours"}),404
        new_state = 0 if lot["is_open"] else 1
        execute("UPDATE parking_lots SET is_open=%s WHERE id=%s",(new_state,safe_int(lot["id"])))
        socketio.emit("lot_updated",{"id":lot_key,"isOpen":bool(new_state)})
        return jsonify({"isOpen":bool(new_state)})
    except Exception as e:
        return db_error_response(e)

# ── Lots — delete ─────────────────────────────────────────────
@app.route("/api/lots/<lot_key>", methods=["DELETE"])
@token_required
def delete_lot(lot_key):
    try:
        lot = query("SELECT * FROM parking_lots WHERE lot_key=%s AND owner_id=%s",(lot_key,g.user_id),fetchone=True)
        if not lot: return jsonify({"error":"Not found or not yours"}),404
        execute("DELETE FROM parking_lots WHERE id=%s",(safe_int(lot["id"]),))
        socketio.emit("lot_removed",{"id":lot_key})
        return jsonify({"ok":True})
    except Exception as e:
        return db_error_response(e)

# ── Bookings ──────────────────────────────────────────────────
@app.route("/api/bookings", methods=["POST"])
@token_required
def create_booking():
    try:
        d       = request.get_json(silent=True) or {}
        lot_key = d.get("lotId")
        vt      = d.get("vehicleType")
        slot_no = d.get("slotNumber")
        hours   = safe_int(d.get("hours",1),1)
        payment = d.get("paymentMethod","UPI")
        if not all([lot_key,vt,slot_no]):
            return jsonify({"error":"lotId, vehicleType and slotNumber are required"}),400
        lot = query("SELECT * FROM parking_lots WHERE lot_key=%s",(lot_key,),fetchone=True)
        if not lot: return jsonify({"error":"Parking lot not found"}),404
        slot = query("SELECT * FROM parking_slots WHERE lot_id=%s AND vehicle_type=%s AND slot_number=%s",
                     (safe_int(lot["id"]),vt,slot_no),fetchone=True)
        if not slot: return jsonify({"error":"Slot not found"}),404
        if slot["status"]!="available":
            return jsonify({"error":"This slot is already occupied. Please choose another."}),409
        pricing  = query("SELECT * FROM pricing WHERE lot_id=%s",(safe_int(lot["id"]),),fetchone=True)
        rate_map = {
            "car":        safe_int((pricing or {}).get("price_car",        100)),
            "twoWheeler": safe_int((pricing or {}).get("price_two_wheeler", 50)),
            "heavy":      safe_int((pricing or {}).get("price_heavy",      200)),
        }
        rate  = rate_map.get(vt,50)
        total = rate * hours
        check_in  = datetime.now()
        check_out = check_in + timedelta(hours=hours)
        ref       = f"BKG-{int(time.time())}-{random.randint(100,999)}"
        execute("UPDATE parking_slots SET status='occupied' WHERE id=%s",(safe_int(slot["id"]),))
        execute("""INSERT INTO bookings
            (booking_ref,user_id,lot_id,slot_id,vehicle_type,hours,
             rate_per_hour,total_amount,payment_method,status,check_in,check_out)
            VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,'confirmed',%s,%s)""",
            (ref,g.user_id,safe_int(lot["id"]),safe_int(slot["id"]),vt,hours,rate,total,payment,
             check_in.strftime("%Y-%m-%d %H:%M:%S"),check_out.strftime("%Y-%m-%d %H:%M:%S")))
        summary = query("""SELECT vehicle_type,COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN status='available' THEN 1 ELSE 0 END),0) AS available
            FROM parking_slots WHERE lot_id=%s GROUP BY vehicle_type""",(safe_int(lot["id"]),))
        socketio.emit("slots_updated",{
            "lotId":lot_key,
            "summary":[{"vehicle_type":r["vehicle_type"],"total":safe_int(r["total"]),"available":safe_int(r["available"])} for r in summary],
            "changedSlot":{"vehicleType":vt,"slotNumber":slot_no,"status":"occupied"},
        })
        return jsonify({
            "id":ref,"bookingRef":ref,
            "parkingName":str(lot["name"]),"parkingAddress":str(lot["address"]),
            "vehicleType":vt,"slotNumber":slot_no,"hours":hours,
            "ratePerHour":rate,"totalAmount":total,
            "checkIn":check_in.isoformat(),"checkOut":check_out.isoformat(),
            "status":"confirmed","paymentMethod":payment,
        }),201
    except Exception as e:
        return db_error_response(e)

@app.route("/api/bookings", methods=["GET"])
@token_required
def list_bookings():
    try:
        rows = query("""SELECT b.*,p.name AS parking_name,p.address AS parking_address,p.lot_key
            FROM bookings b JOIN parking_lots p ON p.id=b.lot_id
            WHERE b.user_id=%s ORDER BY b.created_at DESC""",(g.user_id,))
        return jsonify([{
            "id":b["booking_ref"],"bookingRef":b["booking_ref"],
            "parkingId":b["lot_key"],"parkingName":b["parking_name"],"parkingAddress":b["parking_address"],
            "vehicleType":b["vehicle_type"],"slotNumber":safe_int(b["slot_id"]),
            "hours":safe_int(b["hours"]),"ratePerHour":safe_int(b["rate_per_hour"]),"totalAmount":safe_int(b["total_amount"]),
            "checkIn":b["check_in"].isoformat() if b["check_in"] else "",
            "checkOut":b["check_out"].isoformat() if b["check_out"] else "",
            "status":b["status"],"paymentMethod":b["payment_method"],
            "bookedAt":b["created_at"].isoformat() if b["created_at"] else "",
        } for b in rows])
    except Exception as e:
        return db_error_response(e)

@app.route("/api/bookings/<booking_ref>/cancel", methods=["PATCH"])
@token_required
def cancel_booking(booking_ref):
    try:
        booking = query("""SELECT b.*,ps.id AS slot_db_id FROM bookings b
            JOIN parking_slots ps ON ps.id=b.slot_id
            WHERE b.booking_ref=%s AND b.user_id=%s""",(booking_ref,g.user_id),fetchone=True)
        if not booking: return jsonify({"error":"Booking not found"}),404
        if booking["status"] not in ("confirmed","active"):
            return jsonify({"error":"Cannot cancel — booking is "+booking["status"]}),400
        execute("UPDATE bookings      SET status='cancelled' WHERE booking_ref=%s",(booking_ref,))
        execute("UPDATE parking_slots SET status='available' WHERE id=%s",(safe_int(booking["slot_db_id"]),))
        lot     = query("SELECT lot_key FROM parking_lots WHERE id=%s",(safe_int(booking["lot_id"]),),fetchone=True)
        summary = query("""SELECT vehicle_type,COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN status='available' THEN 1 ELSE 0 END),0) AS available
            FROM parking_slots WHERE lot_id=%s GROUP BY vehicle_type""",(safe_int(booking["lot_id"]),))
        socketio.emit("slots_updated",{
            "lotId":lot["lot_key"] if lot else "",
            "summary":[{"vehicle_type":r["vehicle_type"],"total":safe_int(r["total"]),"available":safe_int(r["available"])} for r in summary],
            "changedSlot":{"vehicleType":booking["vehicle_type"],"slotNumber":safe_int(booking["slot_id"]),"status":"available"},
        })
        return jsonify({"ok":True})
    except Exception as e:
        return db_error_response(e)

# ── Socket.IO ─────────────────────────────────────────────────
@socketio.on("connect")
def on_connect():
    print(f"[ws] connected: {request.sid}")
    emit("connected",{"msg":"ParkEase real-time connected"})

@socketio.on("disconnect")
def on_disconnect():
    print(f"[ws] disconnected: {request.sid}")

# ── Background simulation ─────────────────────────────────────
def simulate_slot_changes():
    while True:
        time.sleep(20)
        try:
            lot = query("SELECT id,lot_key FROM parking_lots WHERE owner_id IS NULL ORDER BY RAND() LIMIT 1",fetchone=True)
            if not lot: continue
            slot = query("SELECT id,vehicle_type,slot_number,status FROM parking_slots WHERE lot_id=%s ORDER BY RAND() LIMIT 1",(safe_int(lot["id"]),),fetchone=True)
            if not slot: continue
            if query("SELECT id FROM bookings WHERE slot_id=%s AND status IN('confirmed','active')",(safe_int(slot["id"]),),fetchone=True): continue
            new_status = "available" if slot["status"]=="occupied" else "occupied"
            execute("UPDATE parking_slots SET status=%s WHERE id=%s",(new_status,safe_int(slot["id"])))
            summary = query("""SELECT vehicle_type,COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN status='available' THEN 1 ELSE 0 END),0) AS available
                FROM parking_slots WHERE lot_id=%s GROUP BY vehicle_type""",(safe_int(lot["id"]),))
            socketio.emit("slots_updated",{
                "lotId":lot["lot_key"],
                "summary":[{"vehicle_type":r["vehicle_type"],"total":safe_int(r["total"]),"available":safe_int(r["available"])} for r in summary],
                "changedSlot":{"vehicleType":slot["vehicle_type"],"slotNumber":safe_int(slot["slot_number"]),"status":new_status},
            })
        except Exception as e:
            print(f"[simulate] {e}")

# ── Entry point ───────────────────────────────────────────────
if __name__ == "__main__":
    print("\n"+"="*50)
    print("  🅿  ParkEase Backend")
    print("="*50)
    if not test_connection():
        print("\n⛔  Fix the database issue above, then restart.\n")
        sys.exit(1)
    sim = threading.Thread(target=simulate_slot_changes, daemon=True)
    sim.start()
    print("  ✅  Real-time simulation thread started")
    port  = int(os.getenv("FLASK_PORT",5000))
    debug = os.getenv("FLASK_DEBUG","true").lower()=="true"
    print(f"  🚀  Running on http://localhost:{port}")
    print("="*50+"\n")
    socketio.run(app, host="0.0.0.0", port=port, debug=debug,
                 use_reloader=False, allow_unsafe_werkzeug=True)
