import { useState, useEffect } from "react";
import "../css/DriverPanel.css";

const API = process.env.REACT_APP_API_BASE || "http://localhost:4000";

const ZONES = [
  { value: "IITK_GATE", label: "IITK Gate" },
  { value: "KV_SCHOOL", label: "KV School" },
  { value: "CSE", label: "CSE Building" },
  { value: "AUDITORIUM", label: "Auditorium" },
  { value: "NEW_SC", label: "New Shopping Complex" },
  { value: "HALL_10", label: "Hall 10" },
  { value: "HALL_14", label: "Hall 14" },
];

/* ---------- phone validation ---------- */
const isValidPhone = (phone) => {
  if (phone.length !== 10) return false;
  if (!/^[6-9]/.test(phone)) return false;
  return /^\d+$/.test(phone);
};

export default function DriverPanel() {
  const [phone, setPhone] = useState("");
  const [driver, setDriver] = useState(null);
  const [zone, setZone] = useState("IITK_GATE");
  const [zoneDirty, setZoneDirty] = useState(false);
  const [isNewDriver, setIsNewDriver] = useState(false);
  const [name, setName] = useState("");
  const [vehicle, setVehicle] = useState("auto");
  const [message, setMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(null);

  const fetchMe = async () => {
    setMessage("");

    if (!isValidPhone(phone)) {
      setMessage("Enter a valid 10-digit mobile number");
      return;
    }

    const res = await fetch(`${API}/driver/me?phone=${phone}`);
    const data = await res.json();

    if (res.status === 200 && data.is_new) {
      setIsNewDriver(true);
      setDriver(null);
    } else if (res.ok) {
      setDriver(data);
      setZone(data.zone);
      setZoneDirty(false);
      setIsNewDriver(false);
    } else {
      setMessage(data.error);
    }
  };

  const updateStatus = async (is_available) => {
    await fetch(`${API}/driver/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, is_available, zone }),
    });
    fetchMe();
  };

  useEffect(() => {
    if (!driver || !driver.is_visible) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const diff = driver.last_seen + 30 * 60 * 1000 - Date.now();
      setTimeLeft(diff > 0 ? Math.floor(diff / 1000) : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [driver]);

  const fmt = (s) => `${Math.floor(s / 60)}m ${s % 60}s`;

  return (
    <div className="driver-page">
      <h2 className="panel-title">Driver Panel</h2>

      {/* Phone input */}
      {!driver && !isNewDriver && (
        <div className="center-form">
          <div className="input-block">
            <input
              type="text"
              placeholder="Phone"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/\D/g, ""));
                setMessage("");
              }}
              className="input-field"
              maxLength={10}
            />
            <button className="primary-btn full-width-btn" onClick={fetchMe}>
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Registration */}
      {isNewDriver && (
        <div className="card">
          <h3 className="card-title">Register</h3>
          <div className="input-block">
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field full-width-btn"
            />
            <select
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              className="input-field full-width-btn"
            >
              <option value="auto">Auto</option>
              <option value="taxi">Taxi</option>
            </select>
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="input-field full-width-btn"
            >
              {ZONES.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </select>
            <button
              className="primary-btn full-width-btn"
              onClick={async () => {
                if (!isValidPhone(phone)) {
                  setMessage("Enter a valid 10-digit mobile number");
                  return;
                }

                await fetch(`${API}/driver/register`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name,
                    phone,
                    vehicle_type: vehicle,
                    zone,
                  }),
                });
                fetchMe();
              }}
            >
              Register
            </button>
          </div>
        </div>
      )}

      {/* Driver info */}
      {driver && (
        <div className="card">
          <h3 className="card-title">Welcome, {driver.name}</h3>
          <p>
            <b>Phone:</b> +91 {driver.phone}
          </p>
          <p>
            <b>Vehicle:</b>{" "}
            {driver.vehicle_type === "taxi" ? "Taxi 🚕" : "Auto 🛺"}
          </p>
          <p>
            <b>Status:</b>{" "}
            {driver.is_visible
              ? `🟢 Active (${fmt(timeLeft || 0)})`
              : "🔴 Expired"}
          </p>

          <div className="input-block">
            <select
              value={zone}
              onChange={(e) => {
                setZone(e.target.value);
                setZoneDirty(true);
              }}
              className="input-field full-width-btn"
            >
              {ZONES.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </select>

            {zoneDirty && (
              <button
                className="primary-btn full-width-btn"
                onClick={() => updateStatus(1)}
              >
                Update Zone & Refresh Timer
              </button>
            )}

            <button
              className="primary-btn full-width-btn"
              onClick={() => updateStatus(1)}
            >
              I am Available
            </button>
            <button
              className="secondary-btn full-width-btn"
              onClick={() => updateStatus(0)}
            >
              I am Busy
            </button>
          </div>
        </div>
      )}

      {message && <p className="error-msg">{message}</p>}
    </div>
  );
}
