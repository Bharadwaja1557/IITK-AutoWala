// const express = require("express");
// const cors = require("cors");
// const db = require("./db");

// const app = express();
// const PORT = 4000;

// /* -------------------- MIDDLEWARE -------------------- */
// app.use(cors({ origin: "*" }));
// app.use(express.json());

// /* -------------------- CONSTANTS -------------------- */
// const THIRTY_MIN = 30 * 60 * 1000;

// /*
//   Nearby zone map
//   (self zone MUST be included as first element)
// */
// const NEARBY_ZONES = {
//   IITK_GATE: ["IITK_GATE", "CSE", "KV_SCHOOL", "AUDITORIUM"],
//   KV_SCHOOL: ["KV_SCHOOL", "CSE", "AUDITORIUM", "NEW_SC"],
//   CSE: ["CSE", "KV_SCHOOL", "AUDITORIUM", "IITK_GATE"],
//   AUDITORIUM: ["AUDITORIUM", "CSE", "HALL_14", "NEW_SC"],
//   NEW_SC: ["NEW_SC", "KV_SCHOOL", "AUDITORIUM", "HALL_10"],
//   HALL_14: ["HALL_14", "HALL_10", "CSE", "NEW_SC"],
//   HALL_10: ["HALL_10", "HALL_14", "CSE", "NEW_SC"],
// };

// /* -------------------- HEALTH -------------------- */
// app.get("/health", (req, res) => {
//   res.json({ status: "OK" });
// });

// /* -------------------- DRIVER REGISTER -------------------- */
// app.post("/driver/register", (req, res) => {
//   const { name, phone, vehicle_type, zone } = req.body;

//   if (!name || !phone || !vehicle_type || !zone) {
//     return res.status(400).json({ error: "Missing fields" });
//   }

//   db.run(
//     `
//     INSERT INTO drivers (name, phone, vehicle_type, zone, is_available, last_seen)
//     VALUES (?, ?, ?, ?, 0, ?)
//     `,
//     [name, phone, vehicle_type, zone.toUpperCase(), Date.now()],
//     function (err) {
//       if (err) {
//         if (err.message.includes("UNIQUE")) {
//           return res.status(409).json({ error: "Driver already registered" });
//         }
//         return res.status(500).json({ error: err.message });
//       }

//       res.json({
//         message: "Driver registered successfully",
//         driver_id: this.lastID,
//       });
//     }
//   );
// });

// /* -------------------- DRIVER STATUS UPDATE -------------------- */
// app.post("/driver/status", (req, res) => {
//   const { phone, is_available } = req.body;
//   const zone = req.body.zone ? req.body.zone.toUpperCase() : null;

//   if (!phone || is_available === undefined) {
//     return res.status(400).json({ error: "Missing fields" });
//   }

//   db.get(`SELECT * FROM drivers WHERE phone = ?`, [phone], (err, driver) => {
//     if (err) return res.status(500).json({ error: err.message });
//     if (!driver) return res.status(404).json({ error: "Driver not found" });

//     db.run(
//       `
//       UPDATE drivers
//       SET is_available = ?,
//           zone = COALESCE(?, zone),
//           last_seen = ?
//       WHERE phone = ?
//       `,
//       [is_available, zone, Date.now(), phone],
//       (err) => {
//         if (err) return res.status(500).json({ error: err.message });
//         res.json({ message: "Status updated" });
//       }
//     );
//   });
// });

// /* -------------------- DRIVER SELF INFO -------------------- */
// app.get("/driver/me", (req, res) => {
//   const { phone } = req.query;
//   if (!phone) return res.status(400).json({ error: "Phone required" });

//   db.get(
//     `
//     SELECT id, name, phone, vehicle_type, zone, is_available, last_seen
//     FROM drivers
//     WHERE phone = ?
//     `,
//     [phone],
//     (err, driver) => {
//       if (err) return res.status(500).json({ error: err.message });
//       if (!driver) return res.status(404).json({ error: "Driver not found" });

//       const is_visible =
//         driver.is_available === 1 &&
//         Date.now() - driver.last_seen <= THIRTY_MIN;

//       res.json({ ...driver, is_visible });
//     }
//   );
// });

// /* -------------------- RIDER: GET DRIVERS (NEARBY LOGIC) -------------------- */
// app.get("/drivers", (req, res) => {
//   const zone = req.query.zone ? req.query.zone.toUpperCase() : null;
//   if (!zone) return res.status(400).json({ error: "Zone required" });

//   const nearbyZones = NEARBY_ZONES[zone] || [zone];
//   const activeSince = Date.now() - THIRTY_MIN;

//   const placeholders = nearbyZones.map(() => "?").join(",");

//   db.all(
//     `
//     SELECT id, name, phone, vehicle_type, zone, last_seen
//     FROM drivers
//     WHERE is_available = 1
//       AND last_seen >= ?
//       AND zone IN (${placeholders})
//     `,
//     [activeSince, ...nearbyZones],
//     (err, rows) => {
//       if (err) return res.status(500).json({ error: err.message });

//       // sort by proximity priority
//       rows.sort(
//         (a, b) =>
//           nearbyZones.indexOf(a.zone) -
//           nearbyZones.indexOf(b.zone)
//       );

//       res.json(rows);
//     }
//   );
// });

// /* -------------------- ADMIN: ALL DRIVERS -------------------- */
// app.get("/admin/drivers", (req, res) => {
//   db.all(
//     `
//     SELECT id, name, phone, vehicle_type, zone, is_available, last_seen
//     FROM drivers
//     ORDER BY last_seen DESC
//     `,
//     [],
//     (err, rows) => {
//       if (err) return res.status(500).json({ error: err.message });
//       res.json(rows);
//     }
//   );
// });

// /* -------------------- ADMIN: FORCE OFFLINE -------------------- */
// app.post("/admin/force-offline", (req, res) => {
//   const { id } = req.body;
//   if (!id) return res.status(400).json({ error: "Driver ID required" });

//   db.run(
//     `UPDATE drivers SET is_available = 0 WHERE id = ?`,
//     [id],
//     (err) => {
//       if (err) return res.status(500).json({ error: err.message });
//       res.json({ message: "Driver forced offline" });
//     }
//   );
// });

// /* -------------------- START SERVER -------------------- */
// app.listen(PORT, "0.0.0.0", () => {
//   console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
// });

const express = require("express");
const cors = require("cors");
const db = require("./db");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;

/* -------------------- MIDDLEWARE -------------------- */
app.use(cors({ origin: "*" }));
app.use(express.json());

/* -------------------- CONSTANTS -------------------- */
const THIRTY_MIN = 30 * 60 * 1000;

const NEARBY_ZONES = {
  IITK_GATE: ["IITK_GATE", "CSE", "KV_SCHOOL", "AUDITORIUM"],
  KV_SCHOOL: ["KV_SCHOOL", "CSE", "AUDITORIUM", "NEW_SC"],
  CSE: ["CSE", "KV_SCHOOL", "AUDITORIUM", "IITK_GATE"],
  AUDITORIUM: ["AUDITORIUM", "CSE", "HALL_14", "NEW_SC"],
  NEW_SC: ["NEW_SC", "KV_SCHOOL", "AUDITORIUM", "HALL_10"],
  HALL_14: ["HALL_14", "HALL_10", "CSE", "NEW_SC"],
  HALL_10: ["HALL_10", "HALL_14", "CSE", "NEW_SC"],
};

/* -------------------- HEALTH -------------------- */
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

/* -------------------- DRIVER REGISTER -------------------- */
app.post("/driver/register", async (req, res) => {
  const { name, phone, vehicle_type, zone } = req.body;

  if (!name || !phone || !vehicle_type || !zone) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const [result] = await db.query(
      `
      INSERT INTO drivers (name, phone, vehicle_type, zone, is_available, last_seen)
      VALUES (?, ?, ?, ?, 0, ?)
      `,
      [name, phone, vehicle_type, zone.toUpperCase(), Date.now()],
    );

    res.json({
      message: "Driver registered successfully",
      driver_id: result.insertId,
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Driver already registered" });
    }
    return res.status(500).json({ error: err.message });
  }
});

/* -------------------- DRIVER STATUS UPDATE -------------------- */
app.post("/driver/status", async (req, res) => {
  const { phone, is_available } = req.body;
  const zone = req.body.zone ? req.body.zone.toUpperCase() : null;

  if (!phone || is_available === undefined) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const [drivers] = await db.query(`SELECT * FROM drivers WHERE phone = ?`, [
      phone,
    ]);

    if (drivers.length === 0) {
      return res.status(404).json({ error: "Driver not found" });
    }

    await db.query(
      `
      UPDATE drivers
      SET is_available = ?,
          zone = COALESCE(?, zone),
          last_seen = ?
      WHERE phone = ?
      `,
      [is_available, zone, Date.now(), phone],
    );

    res.json({ message: "Status updated" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* -------------------- DRIVER SELF INFO -------------------- */
app.get("/driver/me", async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: "Phone required" });

  try {
    const [drivers] = await db.query(
      `
      SELECT id, name, phone, vehicle_type, zone, is_available, last_seen
      FROM drivers
      WHERE phone = ?
      `,
      [phone],
    );

    if (drivers.length === 0) {
      return res.status(200).json({ error: "Driver not found", is_new: true });
    }

    const driver = drivers[0];
    const is_visible =
      driver.is_available === 1 && Date.now() - driver.last_seen <= THIRTY_MIN;

    res.json({ ...driver, is_visible });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* -------------------- RIDER: GET DRIVERS (NEARBY LOGIC) -------------------- */
app.get("/drivers", async (req, res) => {
  const zone = req.query.zone ? req.query.zone.toUpperCase() : null;
  if (!zone) return res.status(400).json({ error: "Zone required" });

  const nearbyZones = NEARBY_ZONES[zone] || [zone];
  const activeSince = Date.now() - THIRTY_MIN;

  const placeholders = nearbyZones.map(() => "?").join(",");

  try {
    const [rows] = await db.query(
      `
      SELECT id, name, phone, vehicle_type, zone, last_seen
      FROM drivers
      WHERE is_available = 1
        AND last_seen >= ?
        AND zone IN (${placeholders})
      `,
      [activeSince, ...nearbyZones],
    );

    // sort by proximity priority
    rows.sort(
      (a, b) => nearbyZones.indexOf(a.zone) - nearbyZones.indexOf(b.zone),
    );

    res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* -------------------- ADMIN: ALL DRIVERS -------------------- */
app.get("/admin/drivers", async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT id, name, phone, vehicle_type, zone, is_available, last_seen
      FROM drivers
      ORDER BY last_seen DESC
      `,
    );

    res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* -------------------- ADMIN: FORCE OFFLINE -------------------- */
app.post("/admin/force-offline", async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "Driver ID required" });

  try {
    await db.query(`UPDATE drivers SET is_available = 0 WHERE id = ?`, [id]);

    res.json({ message: "Driver forced offline" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* -------------------- START SERVER -------------------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
