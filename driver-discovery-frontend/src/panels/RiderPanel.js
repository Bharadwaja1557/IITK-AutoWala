// import { useState, useEffect } from "react";

// const API = "http://127.0.0.1:4000";

// /* ---------------- ZONES ---------------- */
// const ZONES = [
//   { value: "IITK_GATE", label: "IITK Gate" },
//   { value: "KV_SCHOOL", label: "KV School" },
//   { value: "CSE", label: "CSE Building" },
//   { value: "AUDITORIUM", label: "Auditorium" },
//   { value: "NEW_SC", label: "New Shopping Complex" },
//   { value: "HALL_10", label: "Hall 10" },
//   { value: "HALL_14", label: "Hall 14" },
// ];

// const zoneLabel = (z) =>
//   ZONES.find(x => x.value === z)?.label || z;

// export default function RiderPanel() {
//   const [zone, setZone] = useState("IITK_GATE");
//   const [drivers, setDrivers] = useState([]);
//   const [loading, setLoading] = useState(false);

//   const fetchDrivers = async () => {
//     setLoading(true);
//     const res = await fetch(`${API}/drivers?zone=${zone}`);
//     const data = await res.json();
//     setDrivers(data);
//     setLoading(false);
//   };

//   useEffect(() => {
//     fetchDrivers();
//     const i = setInterval(fetchDrivers, 30000);
//     return () => clearInterval(i);
//   }, [zone]);

//   /* ---- GROUPING LOGIC ---- */
//   const grouped = {};
//   drivers.forEach(d => {
//     if (!grouped[d.zone]) grouped[d.zone] = [];
//     grouped[d.zone].push(d);
//   });

//   // ensure selected zone always exists
//   if (!grouped[zone]) grouped[zone] = [];

//   const orderedZones = [];
//   drivers.forEach(d => {
//     if (!orderedZones.includes(d.zone)) orderedZones.push(d.zone);
//   });
//   if (!orderedZones.includes(zone)) orderedZones.unshift(zone);

//   return (
//     <div>
//       <h2>Rider Panel</h2>

//       <p style={{ fontSize: 12, color: "#555" }}>
//         Showing drivers from selected and nearby locations
//       </p>

//       <select value={zone} onChange={e => setZone(e.target.value)}>
//         {ZONES.map(z => (
//           <option key={z.value} value={z.value}>
//             {z.label}
//           </option>
//         ))}
//       </select>

//       <button onClick={fetchDrivers}>Refresh</button>

//       {loading && <p>Loading…</p>}

//       {!loading && orderedZones.map(z => (
//         <div key={z} style={{ marginTop: 15 }}>
//           <h4>📍 {zoneLabel(z)}</h4>

//           {grouped[z].length === 0 ? (
//             <p style={{ fontStyle: "italic", color: "#777" }}>
//               No drivers available
//             </p>
//           ) : (
//             <ul>
//               {grouped[z].map(d => (
//                 <li key={d.id}>
//                   <b>{d.name}</b> ({d.vehicle_type})<br />
//                   📞 <a href={`tel:${d.phone}`}>{d.phone}</a>
//                 </li>
//               ))}
//             </ul>
//           )}
//         </div>
//       ))}
//     </div>
//   );
// }

import { useState, useEffect, useCallback } from "react";
import "../css/RiderPanel.css";

const API = process.env.REACT_APP_API_BASE || "http://localhost:4000";

/* ---------------- ZONES ---------------- */
const ZONES = [
  { value: "IITK_GATE", label: "IITK Gate" },
  { value: "KV_SCHOOL", label: "KV School" },
  { value: "CSE", label: "CSE Building" },
  { value: "AUDITORIUM", label: "Auditorium" },
  { value: "NEW_SC", label: "New Shopping Complex" },
  { value: "HALL_10", label: "Hall 10" },
  { value: "HALL_14", label: "Hall 14" },
];

const zoneLabel = (z) => ZONES.find((x) => x.value === z)?.label || z;

export default function RiderPanel() {
  const [zone, setZone] = useState("IITK_GATE");
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/drivers?zone=${zone}`);
    const data = await res.json();
    setDrivers(data);
    setLoading(false);
  }, [zone]);

  useEffect(() => {
    fetchDrivers();
    const i = setInterval(fetchDrivers, 30000);
    return () => clearInterval(i);
  }, [fetchDrivers]);

  /* ---- GROUPING LOGIC ---- */
  const grouped = {};
  drivers.forEach((d) => {
    if (!grouped[d.zone]) grouped[d.zone] = [];
    grouped[d.zone].push(d);
  });

  if (!grouped[zone]) grouped[zone] = [];

  const orderedZones = [];
  drivers.forEach((d) => {
    if (!orderedZones.includes(d.zone)) orderedZones.push(d.zone);
  });
  if (!orderedZones.includes(zone)) orderedZones.unshift(zone);

  return (
    <div className="rider-page">
      <h2 className="panel-title">Rider Panel</h2>

      <p className="panel-desc">
        Showing drivers from selected and nearby locations
      </p>

      <div className="controls">
        <select
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          className="zone-select"
        >
          {ZONES.map((z) => (
            <option key={z.value} value={z.value}>
              {z.label}
            </option>
          ))}
        </select>

        <button className="refresh-btn" onClick={fetchDrivers}>
          Refresh
        </button>
      </div>
      <p className="phone-desc">
        Click on the phone number to call directly 📞
      </p>

      {loading && <p className="loading">Loading…</p>}

      {!loading &&
        orderedZones.map((z) => (
          <div key={z} className="zone-block">
            <h4 className="zone-title">📍 {zoneLabel(z)}</h4>

            {grouped[z].length === 0 ? (
              <p className="empty">No drivers available</p>
            ) : (
              <div className="drivers">
                {grouped[z].map((d) => (
                  <div key={d.id} className="driver-card">
                    <div className="driver-line">
                      <b>Name: </b>
                      {d.name}
                    </div>
                    <div className="driver-line">
                      <b>Vehicle: </b>
                      {d.vehicle_type === "taxi" ? "Taxi 🚕" : "Auto 🛺"}
                    </div>
                    <div className="driver-line">
                      <b>Phone: </b>{" "}
                      <a href={`tel:${d.phone}`}>+91 {d.phone}</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
