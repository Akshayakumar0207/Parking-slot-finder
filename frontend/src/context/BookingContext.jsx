import { createContext, useContext, useState, useCallback } from "react";
import { bookingsAPI } from "../services/api.js";

const BookingContext = createContext();

export function BookingProvider({ children }) {
  const [bookings, setBookings] = useState([]);

  const fetchBookings = useCallback(async () => {
    try {
      const data = await bookingsAPI.list();
      setBookings(data);
      return data;
    } catch (e) {
      console.error("fetchBookings failed:", e.message);
      return [];
    }
  }, []);

  const createBooking = async (params) => {
    const booking = await bookingsAPI.create(params);
    setBookings(prev => [booking, ...prev]);
    return booking;
  };

  const cancelBooking = async (ref) => {
    await bookingsAPI.cancel(ref);
    setBookings(prev => prev.map(b => b.id===ref ? {...b, status:"cancelled"} : b));
  };

  return (
    <BookingContext.Provider value={{ bookings, fetchBookings, createBooking, cancelBooking }}>
      {children}
    </BookingContext.Provider>
  );
}

export const useBooking = () => useContext(BookingContext);
