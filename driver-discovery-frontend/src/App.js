import { useState, useEffect } from "react";

import RiderPanel from "./panels/RiderPanel";
import DriverPanel from "./panels/DriverPanel";
import AdminPanel from "./panels/AdminPanel";

import "./App.css";


export default function App() {
  const [view, setView] = useState("rider");
  const [tapCount, setTapCount] = useState(0);

  // Hidden admin access (5 taps)
  useEffect(() => {
    if (tapCount >= 5) {
      setView("admin");
      setTapCount(0);
    }
  }, [tapCount]);

  // Disable tap logic inside admin
  useEffect(() => {
    if (view === "admin") {
      setTapCount(0);
    }
  }, [view]);

  return (
    <div className="app-container">
      <h1
        className="app-title"
        onClick={() => {
          if (view !== "admin") setTapCount(c => c + 1);
        }}
      >
        IITK AutoWala
      </h1>

      {/* Navigation buttons */}
      <div className="nav-buttons">
        <button className="nav-btn" onClick={() => setView("rider")}>
          Rider
        </button>
        <button className="nav-btn" onClick={() => setView("driver")}>
          Driver
        </button>
      </div>

      <hr className="divider" />

      {/* Panel router */}
      {view === "rider" && <RiderPanel />}
      {view === "driver" && <DriverPanel />}
      {view === "admin" && <AdminPanel />}
    </div>
  );
}
