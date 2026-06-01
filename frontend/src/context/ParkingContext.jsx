import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { lotsAPI } from "../services/api.js";
import socket      from "../services/socket.js";

const ParkingContext = createContext();

export function ParkingProvider({ children }) {
  const [parkingData, setParkingData] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);

  const fetchLots = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const lots = await lotsAPI.list();
      setParkingData(lots);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  }, []);

  // Socket: real-time updates to parkingData (used by renter dashboard)
  useEffect(() => {
    if (!socket?.on) return;
    const onLotAdded   = (lot) => setParkingData(p => p.find(l=>l.id===lot.id)?p:[lot,...p]);
    const onLotUpdated = ({id,isOpen}) => setParkingData(p => p.map(l=>l.id===id?{...l,isOpen}:l));
    const onLotRemoved = ({id}) => setParkingData(p => p.filter(l=>l.id!==id));
    const onSlotsUpdated = ({lotId, summary}) => {
      setParkingData(prev => prev.map(lot => {
        if (lot.id !== lotId) return lot;
        const newSlots = { ...lot.slots };
        (summary||[]).forEach(row => {
          const vt = row.vehicle_type;
          if (newSlots[vt]) newSlots[vt] = { total: Number(row.total||0), available: Number(row.available||0) };
        });
        return { ...lot, slots: newSlots };
      }));
    };
    socket.on("lot_added",     onLotAdded);
    socket.on("lot_updated",   onLotUpdated);
    socket.on("lot_removed",   onLotRemoved);
    socket.on("slots_updated", onSlotsUpdated);
    return () => {
      socket.off("lot_added",     onLotAdded);
      socket.off("lot_updated",   onLotUpdated);
      socket.off("lot_removed",   onLotRemoved);
      socket.off("slots_updated", onSlotsUpdated);
    };
  }, []);

  const addUserListing    = (data) => lotsAPI.create(data);
  const toggleListingLive = (key)  => lotsAPI.toggle(key);
  const removeListing     = (key)  => lotsAPI.remove(key);

  return (
    <ParkingContext.Provider value={{
      parkingData, loading, error, fetchLots,
      addUserListing, toggleListingLive, removeListing,
    }}>
      {children}
    </ParkingContext.Provider>
  );
}

export const useParking = () => useContext(ParkingContext);
