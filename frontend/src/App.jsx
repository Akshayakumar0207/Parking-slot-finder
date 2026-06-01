import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider }    from "./context/AuthContext.jsx";
import { ParkingProvider } from "./context/ParkingContext.jsx";
import { BookingProvider } from "./context/BookingContext.jsx";
import ProtectedRoute from "./components/common/ProtectedRoute.jsx";
import Login     from "./components/auth/Login.jsx";
import Register  from "./components/auth/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import "./styles/global.css";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ParkingProvider>
          <BookingProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background:  "var(--bg-card)",
                  color:       "var(--text-primary)",
                  border:      "1px solid var(--border)",
                  fontFamily:  "var(--font-body)",
                  fontSize:    "0.88rem",
                },
                success: { iconTheme: { primary:"#00e5c3", secondary:"#0a0d14" } },
                error:   { iconTheme: { primary:"#ff4757", secondary:"#0a0d14" } },
              }}
            />
            <Routes>
              <Route path="/login"     element={<Login />} />
              <Route path="/register"  element={<Register />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/"  element={<Navigate to="/dashboard" replace />} />
              <Route path="*"  element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BookingProvider>
        </ParkingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
