# IITK AutoWala 🛺

Riders on the IIT Kanpur campus pick the zone they're standing in and get a list of auto and
taxi drivers who have recently marked themselves available there or nearby — each with a
tap-to-call phone number.

Built at a hackathon, around one constraint: drivers have cheap phones, patchy data and no
patience for an app. So drivers do one thing — press "I am Available" — and everything else
is derived from that press and its timestamp.

---

## What it does

**Rider.** Pick a zone from a dropdown. See available drivers grouped by zone — your own
first, then nearby ones. Tap a number to call. The list refreshes every 30 seconds.

**Driver.** Enter your phone number. Register if you're new. Press *I am Available* or
*I am Busy*, change your zone when you move, and watch a live countdown of how much
visibility time you have left.

**Admin.** Reachable by tapping the page title five times. Lists every driver with status,
last-seen time and expiry, plus counts of active / busy / expired.

There is no booking step. The rider gets a phone number and calls it — the same thing they'd
do at an auto stand, minus walking to the stand to find out nobody's there.

## How discovery works

Two filters and a sort:

**Zone matching.** Each of the 7 campus zones maps to itself plus three neighbours, in a
`NEARBY_ZONES` table. A rider at the IITK Gate sees drivers at the gate, CSE, KV School and
the Auditorium — not Hall 10.

**Freshness.** A driver appears only if they marked themselves available within the last 30
minutes. Nothing runs in the background to expire anyone; the rider's query filters on
`last_seen` at read time. A driver who goes home without pressing *Busy* simply drops off
the list half an hour later.

**Ordering.** Results come back ordered by their zone's position in that neighbour list, so
the rider's own zone leads, then the nearest neighbour, and so on.

Discovery is **zone-based, not distance-based**. No coordinates are stored and no distance
is computed anywhere — "nearby" means a hand-written adjacency table reflecting how the
campus is actually laid out and walked. On a campus with seven pickup points that people
already refer to by name, a lookup table beat a geospatial query for the time available, and
it means a driver never has to grant location permission or keep GPS on.

The trade-off is real: the ordering is only as good as the table. A zone map that's wrong,
or a campus with more than a handful of pickup points, would need actual coordinates.

## Tech stack

| Layer | |
|---|---|
| Frontend | React 19, Create React App. No router, no state library — `useState` and `fetch`. |
| Backend | Node.js, Express 5, `cors`, `mysql2`. CommonJS, single file. |
| Database | MySQL — one `drivers` table, created on boot if absent. |

## Project structure

```
driver-discovery-backend/
├── index.js            all 7 routes, zone map, 30-minute window
├── db.js               MySQL pool + table creation
├── models/Driver.js
└── package.json

driver-discovery-frontend/
├── src/
│   ├── App.js          panel switching, hidden admin entry
│   ├── panels/         RiderPanel · DriverPanel · AdminPanel
│   ├── css/
│   └── config/
└── package.json
```

## Getting started

You'll need Node and a reachable MySQL. The `drivers` table is created automatically on
first boot.

```bash
# Backend
cd driver-discovery-backend
cp .env.example .env          # fill in your MySQL details
npm install
node index.js                 # http://localhost:4000

# Frontend, second terminal
cd driver-discovery-frontend
cp .env.example .env          # REACT_APP_API_BASE, defaults to localhost:4000
npm install
npm start                     # http://localhost:3000
```

If MySQL is unreachable the backend logs the error and exits rather than serving requests
against a dead pool.

No MySQL handy:

```bash
docker run -d --name autowala-mysql -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=devpassword -e MYSQL_DATABASE=iitk_autowala mysql:8
```

### Configuration

| Variable | Where | Purpose |
|---|---|---|
| `PORT` | backend | Server port, defaults to 4000 |
| `DB_HOST` `DB_USER` `DB_PASSWORD` `DB_NAME` `DB_PORT` | backend | MySQL connection |
| `REACT_APP_API_BASE` | frontend | Backend base URL, defaults to `http://localhost:4000` |

Both `.env.example` files list every key the code reads. Never commit a real `.env`.

## API

Base URL `http://localhost:4000`. All JSON, no authentication.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health` | Returns `{"status":"OK"}` |
| `POST` | `/driver/register` | `{name, phone, vehicle_type, zone}`. Creates the driver **unavailable** — they must declare availability separately. `409` if the phone is taken. |
| `POST` | `/driver/status` | `{phone, is_available, zone?}`. Sets availability, optionally moves zone, refreshes `last_seen`. |
| `GET` | `/driver/me?phone=` | The driver's record plus a computed `is_visible`. Returns `200` with `{error, is_new: true}` for an unknown phone — the registration form keys off that flag. |
| `GET` | `/drivers?zone=` | Rider discovery. Zone is required. |
| `GET` | `/admin/drivers` | Every driver, newest `last_seen` first. |
| `POST` | `/admin/force-offline` | `{id}`. Sets `is_available = 0`. |

### Data model

One table. Zones are a constant in code, not rows.

| Column | Type | |
|---|---|---|
| `id` | `INT AUTO_INCREMENT` | |
| `name` | `VARCHAR(255)` | |
| `phone` | `VARCHAR(20) UNIQUE` | Also the login identifier |
| `vehicle_type` | `VARCHAR(50)` | `auto` or `taxi` |
| `zone` | `VARCHAR(100)` | One of the 7 zone keys |
| `is_available` | `TINYINT(1)` | The driver's own declaration |
| `last_seen` | `BIGINT` | Epoch ms of that declaration — drives the 30-minute window |

## Scope and limitations

Known, and deliberate for the timebox:

**No authentication.** There are no accounts, tokens or sessions. A phone number is an
identifier, not a credential — anyone who knows one can change that driver's availability,
and the admin routes are open to any caller. The five-tap admin entry hides the panel in the
UI; it does not protect the endpoints behind it. CORS is open. This is the first thing that
would need building for real use.

**Server-side validation is thin.** The phone-shape check (10 digits, starting 6–9) runs in
the browser only; the API checks that fields are present, not that they're well-formed.

**`POST /admin/force-offline`** works but has no button in the admin panel — it's callable
by hand only.

**Availability is self-reported.** Nothing verifies a driver is where they say they are, or
that they're still driving. The 30-minute window is the only correction for a stale claim.

**`src/config/`** holds an earlier attempt at centralising the zone list and API base; the
panels still carry their own copies, and the two definitions have drifted apart.

## Screens

Demo recordings (mobile and desktop) are linked in [live-demo-link.md](live-demo-link.md).
