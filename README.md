# IITK AutoWala 🛺

A hackathon build. Riders pick a campus zone and get a list of auto/taxi drivers who
recently marked themselves available in that zone or in a small set of hand-picked
neighbouring zones, with a tap-to-call phone link for each.

This README describes **what the code actually does**. The original submission README is
preserved verbatim at [README.original.md](README.original.md); several of its claims do not
match the code, and the discrepancies are catalogued in [WORK.md](WORK.md).

---

## What it is

A three-panel single-page React app over a small Express REST API backed by one MySQL table.

- **Rider** — pick a zone, see available drivers grouped by zone, tap a number to call.
- **Driver** — enter a phone number, register if new, toggle Available/Busy, change zone,
  watch a countdown of remaining visibility.
- **Admin** — reachable by tapping the page title five times; lists every driver with status.

**It is a discovery directory, not a ride-hailing app.** There is no booking, no matching,
no driver acceptance step, no fare, no live location tracking, and no map. The rider's
result is a phone number they dial themselves.

## Stack

| Layer | What |
|---|---|
| Frontend | React 19, Create React App (`react-scripts` 5). No router, no state library — `fetch` and `useState`. |
| Backend | Node.js, Express 5, `cors`, `mysql2`. Plain CommonJS, one file. |
| Database | MySQL — a single `drivers` table, created on boot with `CREATE TABLE IF NOT EXISTS` (`db.js:59-70`). |

**It is not a MERN app**, despite the original folder name. There is no MongoDB.
`mongoose` appears in `package.json` and in `models/Driver.js`, but nothing imports that
file and it would throw if anything did — it uses ESM `import` inside a package declared
`"type": "commonjs"`. `sqlite3` is likewise declared but unused: the SQLite implementation
is commented out at the top of `db.js` and `index.js`. `drivers.db` is a leftover from that
abandoned approach and is read by no code.

## How discovery works

Two filters and a sort:

1. **Zone set** — `NEARBY_ZONES` (`index.js:204-212`) maps each of the 7 zones to itself
   plus 3 hand-picked neighbours. The query returns drivers whose zone is in that set.
2. **Freshness** — only drivers with `last_seen >= now - 30 minutes` and `is_available = 1`
   (`index.js:327-328`). Nothing expires anything in the background; this is a filter
   applied at read time.
3. **Ordering** — results are sorted by each driver's zone's **position in the hardcoded
   neighbour list** (`index.js:335-337`).

That third step is worth stating plainly, because the code comment above it says
`// sort by proximity priority`: **there is no distance computation anywhere in this
project.** No coordinates are stored, no geospatial query is used, no distance is
calculated. "Proximity" is a human's judgement about campus geography, frozen as the order
of strings in an array. The ordering is only as good as that hand-written guess.

## Auth

**There is none.** No tokens, no sessions, no passwords, no middleware.

- Anyone who knows a driver's phone number can change that driver's availability and zone
  (`POST /driver/status`).
- `GET /admin/drivers` returns every driver's name, phone and location to any caller.
- `POST /admin/force-offline` lets any caller disable any driver by id.
- The admin panel's "hidden" five-tap entry (`App.js:14-20`) is a UI toggle, not access
  control — the endpoints it calls are open regardless.
- CORS is `origin: "*"` (`index.js:198`).

This is a hackathon artefact and is documented, not defended.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness — returns `{status:"OK"}` |
| POST | `/driver/register` | Create a driver. Starts **unavailable** (`is_available = 0`). |
| POST | `/driver/status` | Set availability, optionally move zone, refresh `last_seen` |
| GET | `/driver/me?phone=` | Driver's own record + computed `is_visible`. Returns **HTTP 200 with `{error, is_new:true}`** for an unknown phone, not a 404 — the frontend keys registration off that flag. |
| GET | `/drivers?zone=` | Rider discovery — the query described above |
| GET | `/admin/drivers` | Every driver, newest `last_seen` first |
| POST | `/admin/force-offline` | Set `is_available = 0` by id. **No UI calls this** — the admin panel has no such button. |

## Running it locally

You need Node and a reachable MySQL. The table is created automatically on first boot.

```bash
# 1. Backend
cd driver-discovery-backend
cp .env.example .env          # then fill in your MySQL details
npm install
node index.js                 # http://localhost:4000 — no start script exists

# 2. Frontend, in a second terminal
cd driver-discovery-frontend
cp .env.example .env          # REACT_APP_API_BASE, defaults to localhost:4000
npm install
npm start                     # http://localhost:3000
```

If MySQL is unreachable the backend prints a connection error and exits — `db.js:46-53`
calls `process.exit(1)` by design.

Quick MySQL via Docker, if you don't have one:

```bash
docker run -d --name autowala-mysql -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=devpassword -e MYSQL_DATABASE=iitk_autowala mysql:8
```

## Credentials

The original code had live MySQL credentials hardcoded in `db.js`. They were removed during
the restore and replaced with environment variables. See "Secrets found" in
[WORK.md](WORK.md) for detail and rotation status. Never commit `.env`.

## Known broken / not wired up

Recorded rather than fixed, so this repo stays an honest record of the hackathon build.
Full detail in [WORK.md](WORK.md).

- `POST /admin/force-offline` works but no UI reaches it.
- `src/config/api.js` and `src/config/zones.js` are dead — nothing imports them. The zone
  list is copy-pasted into all three panels instead, and `config/zones.js`'s `NEARBY` map
  disagrees with the backend's.
- `models/Driver.js` is unreachable Mongoose code that would throw if required.
- The deployed Render backend no longer responds; the Netlify frontend still serves.
