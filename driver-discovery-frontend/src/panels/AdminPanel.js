import { useState, useEffect } from "react";
import "../css/AdminPanel.css";

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

const zoneLabel = z =>
  ZONES.find(x => x.value === z)?.label || z;

export default function AdminPanel() {
  const [drivers, setDrivers] = useState([]);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchDrivers = async () => {
    const res = await fetch(`${API}/admin/drivers`);
    const data = await res.json();
    setDrivers(data);
    setLastRefreshed(new Date());
  };

  useEffect(() => {
    fetchDrivers();
    const i = setInterval(fetchDrivers, 5 * 60 * 1000);
    return () => clearInterval(i);
  }, []);

  /* ----------- summary stats ----------- */
  const total = drivers.length;

  const active = drivers.filter(
    d => d.is_available && Date.now() - d.last_seen <= 30 * 60 * 1000
  ).length;

  const expired = drivers.filter(
    d => d.is_available && Date.now() - d.last_seen > 30 * 60 * 1000
  ).length;

  const busy = drivers.filter(d => !d.is_available).length;

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header">
        <h2>Admin Panel</h2>
        <button className="refresh-btn" onClick={fetchDrivers}>
          Refresh
        </button>
      </div>

      {lastRefreshed && (
        <p className="last-refreshed">
          Last refreshed on: {lastRefreshed.toLocaleTimeString()}
        </p>
      )}

      {/* Summary */}
      <div className="summary-grid">
        <div className="summary-card">
          <span>Total <b>{total}</b></span>
        </div>
        <div className="summary-card green">
          <span>Active <b>{active}</b></span>
        </div>
        <div className="summary-card yellow">
          <span>Busy <b>{busy}</b></span>
        </div>
        <div className="summary-card red">
          <span>Expired <b>{expired}</b></span>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Vehicle</th>
              <th>Zone</th>
              <th>Status</th>
              <th>Last Seen</th>
              <th>Expires at</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map(d => {
              const isExpired =
                d.is_available &&
                Date.now() - d.last_seen > 30 * 60 * 1000;

              return (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td>{d.name}</td>
                  <td>{d.phone}</td>
                  <td>{d.vehicle_type}</td>
                  <td>{zoneLabel(d.zone)}</td>
                  <td>
                    {d.is_available
                      ? isExpired
                        ? "Expired"
                        : "Active"
                      : "Busy"}
                  </td>
                  <td>
                    {new Date(d.last_seen).toLocaleTimeString()}
                  </td>
                  <td>
                    {d.is_available
                      ? new Date(d.last_seen + 30 * 60 * 1000).toLocaleTimeString()
                      : "-"}
                  </td> 
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
