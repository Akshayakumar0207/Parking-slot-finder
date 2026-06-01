// src/services/api.js
const BASE = "/api";

function getToken() {
  return localStorage.getItem("parkease_token");
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error("Cannot reach the server. Make sure Flask is running on port 5000.");
  }
  let data = {};
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const authAPI = {
  register: (b) => request("/auth/register", { method:"POST", body:JSON.stringify(b) }),
  login:    (b) => request("/auth/login",    { method:"POST", body:JSON.stringify(b) }),
  me:       ()  => request("/auth/me"),
};

export const profileAPI = {
  get:  ()  => request("/profile"),
  save: (b) => request("/profile", { method:"POST", body:JSON.stringify(b) }),
};

export const lotsAPI = {
  list:           ()           => request("/lots"),
  get:            (k)          => request(`/lots/${k}`),
  slots:          (k, vt)      => request(`/lots/${k}/slots?vehicleType=${vt}`),
  nearby:         (lat,lng,r,vt) => request(`/lots/nearby?lat=${lat}&lng=${lng}&radius=${r}&vehicleType=${vt||""}`),
  create:         (b)          => request("/lots", { method:"POST", body:JSON.stringify(b) }),
  toggle:         (k)          => request(`/lots/${k}/toggle`, { method:"PATCH" }),
  remove:         (k)          => request(`/lots/${k}`, { method:"DELETE" }),
  myLots:         ()           => request("/my-lots"),
  predictPricing: (b)          => request("/predict-pricing", { method:"POST", body:JSON.stringify(b) }),
};

export const bookingsAPI = {
  list:   ()  => request("/bookings"),
  create: (b) => request("/bookings", { method:"POST", body:JSON.stringify(b) }),
  cancel: (r) => request(`/bookings/${r}/cancel`, { method:"PATCH" }),
};
