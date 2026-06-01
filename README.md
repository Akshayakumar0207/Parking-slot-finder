# 🅿 ParkEase — Smart Parking Finder

## Run Commands

### Step 1 — MySQL Workbench (first time only)
Open `backend/schema.sql` → Execute ⚡ → see `✅ Done — lots:6`

### Step 2 — Set DB password
Open `backend/.env` → change `DB_PASSWORD=YOUR_MYSQL_PASSWORD_HERE` to your actual password.

### Step 3 — Backend (Terminal 1)
```
cd backend
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
Success: `✅ MySQL connected` + `🚀 Running on http://localhost:5000`

### Step 4 — Frontend (Terminal 2)
```
cd frontend
npm install
npm run dev
```
Open: http://localhost:5173

---

## Features
- 🔐 Register / Login with JWT auth
- 👤 Profile setup after first login (location + vehicle)
- 📍 Nearby parking within 2–10 km (Haversine SQL)
- ⚡ Real-time slot updates via Socket.IO
- 🅿 Book a slot (UPI / Card / Cash)
- 🎫 My Bookings with cancel
- 🏠 Rent your parking space with AI pricing
