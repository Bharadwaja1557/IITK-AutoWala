// const sqlite3 = require("sqlite3").verbose();

// const db = new sqlite3.Database("./drivers.db", (err) => {
//   if (err) {
//     console.error(err.message);
//   } else {
//     console.log("Connected to SQLite database.");
//   }
// });

// db.serialize(() => {
//   db.run(`
//     CREATE TABLE IF NOT EXISTS drivers (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       name TEXT,
//       phone TEXT UNIQUE,
//       vehicle_type TEXT,
//       zone TEXT,
//       is_available INTEGER,
//       last_seen INTEGER
//     )
//   `);
// });

// module.exports = db;

const mysql = require("mysql2");
require("dotenv").config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Get promise-based pool
const promisePool = pool.promise();

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ MySQL connection error:", err.message);
    process.exit(1);
  } else {
    console.log("✅ Connected to MySQL database.");
    connection.release();
  }
});

// Create table if not exists
const createTable = async () => {
  try {
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        phone VARCHAR(20) UNIQUE,
        vehicle_type VARCHAR(50),
        zone VARCHAR(100),
        is_available TINYINT(1),
        last_seen BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Drivers table ready.");
  } catch (err) {
    console.error("❌ Error creating table:", err.message);
  }
};

createTable();

module.exports = promisePool;
