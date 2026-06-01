// src/services/socket.js
import { io } from "socket.io-client";

let socket;
try {
  socket = io("http://localhost:5000", {
    transports:          ["polling", "websocket"],
    autoConnect:         true,
    reconnection:        true,
    reconnectionAttempts:10,
    reconnectionDelay:   3000,
    timeout:             5000,
  });
  socket.on("connect",       () => console.log("[ws] connected:", socket.id));
  socket.on("disconnect",    () => console.log("[ws] disconnected"));
  socket.on("connect_error", (e) => console.warn("[ws] Flask not reachable:", e.message));
} catch (e) {
  console.warn("[ws] Socket init failed:", e.message);
  socket = { on:()=>{}, off:()=>{}, emit:()=>{}, connected:false, id:null };
}

export default socket;
