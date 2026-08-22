# IITK AutoWala

Finding an auto on the IIT Kanpur campus means calling drivers one at a time
from a list forwarded around hall WhatsApp groups. Each call takes 30-60
seconds and tells you nothing until someone picks up. Meanwhile a free driver
two minutes away is sitting there, unknown to you.

Both sides already exist. What is missing is the information: who is free right
now, and where. That state lives only in drivers' heads.

This is a screen that shows it.

## The constraint everything follows from

**No GPS tracking.** Drivers will not run a background location app — it costs
data, it drains the battery, and there is nothing in it for them. So
availability here is:

- **self-declared** — the driver says they are free, nothing infers it
- **one tap** — pick where you are from a list of campus landmarks, or let the
  browser read your position once
- **self-expiring** — a declaration is good for a bounded window (45 minutes by
  default) and then disappears on its own

That last property is what keeps the list honest without anyone maintaining it.
A driver who forgets to go off duty stops showing up anyway.

Distance is real. Every declaration stores a GeoJSON point, and rider search is
a `$geoNear` aggregation returning great-circle metres. The landmark list is
how a position gets entered, not a substitute for computing one.

## Demo data

Everything in a running instance is invented: the names, the vehicle numbers,
and the phone numbers, which all begin `55501`. Indian mobile numbers start
with 6, 7, 8 or 9, so nothing here can be dialled and nothing here can collide
with a real line. The API's own validator rejects these numbers, which means a
seeded account cannot be signed into either.

Every screen carries a banner saying so, and the Call button opens an
explanation rather than a `tel:` link. There is no `tel:` link anywhere in this
codebase.

## Running it

### With Docker

```sh
cp .env.example .env          # then set JWT_SECRET
openssl rand -base64 48       # a value for it
docker compose up --build
```

Then open <http://localhost:8080>. The database, the API and the client all
come up together, seeded, with nothing else installed.

`JWT_SECRET` has no default: compose stops with a message if it is unset. Every
other key does have one.

### Without Docker

Needs Node 20.11+ and a MongoDB you can reach.

```sh
npm install
cp .env.example .env          # set JWT_SECRET and MONGODB_URI
npm run dev
```

The API comes up on :4000 and the client on <http://localhost:5173>, which
proxies `/api` to it. Seeding happens at boot when `DEMO_MODE=true`; `npm run
seed` does it on demand.

## Tests

```sh
npm test         # API: Vitest + Supertest against a real mongod in memory
npm run typecheck
```

The first run downloads a MongoDB binary (~78MB) and caches it. That is the one
place this repo needs the network after `npm install`.

Two of the tests are the ones worth reading, in
[`apps/api/tests/discovery.test.ts`](apps/api/tests/discovery.test.ts):

- distances come back checked against an independent haversine calculation, not
  just in the right order
- a session that expired an hour ago is excluded **while still physically in the
  collection** — MongoDB's TTL reaper only runs about once a minute, so the
  query has to filter on expiry itself. The index is cleanup; the filter is
  correctness.

## What is here, and what is not

In v1: driver registration and sign-in, one-tap availability with a TTL,
geospatial rider search ranked by distance, synthetic seed data that refills
itself, and the tests above.

Not here, and not stubbed anywhere: ride request and accept, payments, fares,
ratings, chat, navigation, live tracking of moving vehicles. The schema leaves
room to add a request/accept flow later without restructuring, but none of it is
written.

Phase 1 of 5. Still to come: live updates over WebSocket, an admin roster behind
a role check, CI, rate limiting.

## Layout

```
packages/shared   Zod schemas, inferred types, campus landmark coordinates.
                  Imported by both sides — no duplicated interfaces.
apps/api          Express 5, Mongoose, JWT auth, the $geoNear pipeline.
apps/web          Vite + React. Two screens: driver and rider.
```

## Why the code looks like this

[`DECISIONS.md`](DECISIONS.md) records every choice where a real alternative
existed — what was picked, what was rejected and why, and what each choice makes
worse. It also carries a running list of the things that are currently thin,
stated plainly.
