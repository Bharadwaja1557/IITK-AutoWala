# DECISIONS

Why the code is the way it is. Written as the code is written, in the same
commit — not reconstructed afterwards.

An entry exists only where a real alternative was on the table and one was
picked. Things with a single obvious answer are not in here.

Two running sections live at the bottom: **Dead ends** (what was tried and
abandoned, and what actually went wrong) and **Known weaknesses** (what is
currently thin, stated bluntly).

On the **Commit** field: a commit cannot contain its own hash, and every entry
here ships in the same commit as the code it describes. So the field names that
commit's subject line instead. `git log --oneline --grep="<subject>"` gets the
sha; `git log -S "[D-nn]" -- DECISIONS.md` gets the diff directly.

---

## [D-01] npm workspaces, no build orchestrator
**Phase:** 1 · **Commit:** `Scaffold TypeScript workspaces and fail-fast env validation` · **Touches:** package.json, tsconfig.base.json

**Context.** The brief requires shared types imported by both sides with no duplicated interfaces, so the repo needs some monorepo mechanism. Three packages, one build edge (shared → api, web).

**Decision.** npm workspaces. Root scripts sequence the shared build explicitly.

**Alternatives rejected.** *pnpm workspaces* — better linking, but it must be installed before `npm install` does anything, and the Dockerfile then needs a corepack step; the repo has to run from a clean clone with only Node present. *Turborepo/Nx* — a task graph and remote caching solve problems this repo does not have, and become another thing to explain. *Single package, folders instead of packages* — Vite and the API need different `module`/`lib`/`types` settings; one tsconfig serving both DOM and Node ends up as per-folder overrides, which is workspaces with extra steps.

**Trade-off accepted.** The shared build edge is hand-maintained: every root script touching api or web must start with `build:shared`. Miss it once and a consumer compiles against a stale `dist/`.

**How I'd know I was wrong.** A fourth or fifth package appears, or a stale-`dist` bug bites more than once.

## [D-02] Shared package is compiled, not consumed as TypeScript source
**Phase:** 1 · **Commit:** `Scaffold TypeScript workspaces and fail-fast env validation` · **Touches:** packages/shared/package.json, packages/shared/tsconfig.json

**Context.** Two consumers with different module resolution: Vite/esbuild for the web, `tsc` → plain `node` for the API. The `exports` field has to satisfy both.

**Decision.** `shared` emits ESM plus `.d.ts` into `dist/`; both consumers import the built output.

**Alternatives rejected.** *Point `exports` at `./src/index.ts`* — Vite copes, but the built API cannot: `node dist/index.js` would `import` a `.ts` file out of `node_modules` and fail at runtime unless Node's type-stripping flag is on, and the Docker image should not depend on that. *tsconfig path aliases + `vite-tsconfig-paths`* — fine in dev, but the API would then need a bundler too, replacing a plain `tsc` build with a bundling step to solve a problem that does not exist yet.

**Trade-off accepted.** Editing `shared` requires a rebuild before either consumer sees it. `npm run dev` builds it once at startup and will not notice later edits without a restart.

**How I'd know I was wrong.** If iterating on shared types means restarting dev repeatedly, add `tsc --watch` to the dev script.

## [D-03] Landmark picker as the location input; geometry stays real
**Phase:** 1 · **Commit:** `Add campus landmark coordinates to the shared package` · **Touches:** packages/shared/src/landmarks.ts

**Context.** The binding constraint is no GPS tracking, so a driver has to state where they are. Typing coordinates is absurd and a map picker is a heavier dependency than this phase can carry. But the position still has to be a real point, because ranking is the product.

**Decision.** A fixed list of ~19 campus landmarks in `shared`, each holding real `[lng, lat]`. Picking one stores that GeoJSON Point on the session. An optional one-shot `navigator.geolocation` call can override it. Distance is always computed by `$geoNear` from stored coordinates; nothing consults landmark identity.

**Alternatives rejected.** *Zone-adjacency table* (what the old version did) — "near" becomes a hand-maintained graph that lies the moment two adjacent zones are 900m apart, and it cannot rank two drivers inside one zone at all. *Free-text location* — not queryable. *Map picker (Leaflet/Mapbox)* — the honest long-term answer, but a tile provider is an external network dependency and a key, and non-negotiable #6 says the repo runs with nothing external.

**Trade-off accepted.** Reported position is quantised to the nearest listed landmark, so a driver 300m from Hall 5 shows as at Hall 5. Ranking is therefore trustworthy at roughly landmark spacing (150-400m here), not at street level.

**How I'd know I was wrong.** Riders report the top-ranked driver is routinely not the closest one, or the geolocation override gets used far more than the picker.

## [D-04] Format validation at the HTTP boundary only; Mongoose keeps structure
**Phase:** 1 · **Commit:** `Define the shared request/response contracts in Zod` · **Touches:** packages/shared/src/contracts.ts

**Context.** Two requirements pull against each other: every registration must be a valid Indian mobile, and every seeded number must be impossible to dial. If the mobile regex sits on the Mongoose path, the seed cannot write.

**Decision.** Content rules — mobile regex, plate format, password length, landmark ids — live only in the Zod schemas in `shared`, applied where a request enters. Mongoose keeps type, `required`, `unique`, `enum`, `ref`: the constraints that protect the collection's shape, not its content. The seed then writes directly and the two rules stop fighting.

**Alternatives rejected.** *Regex on the model plus a seed bypass* (`validateBeforeSave: false`, or raw `collection.insertMany`) — works, but leaves a documented way to skip validation sitting in the repo, and that is the line that gets copy-pasted into a real write path a year later. *Regex in both places* — they drift, and then the API rejects what the database accepts with a different message.

**Trade-off accepted.** Nothing at the database level guarantees a stored phone is dialable. Any write that does not pass through a route can insert garbage — the seed does exactly that on purpose, and a future migration or a `mongosh` session could do it by accident. The guarantee is a convention, not a mechanism.

**How I'd know I was wrong.** A phone number no Zod schema ever saw turns up in a rider result and someone tries to call it.

## [D-05] Availability is a separate ephemeral collection, not fields on the driver
**Phase:** 1 · **Commit:** `Add Driver and AvailabilitySession models with their indexes` · **Touches:** apps/api/src/models/availability-session.ts, apps/api/src/models/driver.ts

**Context.** Availability is self-declared and must expire on its own. The obvious cheaper shape is three fields on `drivers`: `isAvailable`, `availableUntil`, `lastLocation`.

**Decision.** A second collection, one document per declaration, with a TTL index on `expiresAt` and a 2dsphere index on `location`.

**Alternatives rejected.** *Fields on `drivers`* — a TTL index deletes whole documents, so it cannot expire a field; expiry would need a cron sweeping `availableUntil`, which is the moving part the TTL index exists to remove. Worse, the 2dsphere index would then cover every driver ever registered instead of the handful currently live, so each rider query searches the whole roster. It also overwrites history: "when is Hall 5 busiest" is unanswerable from a field that gets replaced.

**Trade-off accepted.** A driver's current status is now a second query or a `$lookup` rather than a field read, and the schema cannot enforce "at most one live session per driver" — the predicate depends on `now`, and a partial index filter cannot reference it. Uniqueness is enforced in application code (D-06) and can therefore be violated by a half-failed write.

**How I'd know I was wrong.** The `$lookup` shows up as the expensive stage in the rider query, or duplicate live sessions per driver appear in real data.

## [D-06] The token carries a subject and nothing else
**Phase:** 1 · **Commit:** `Add driver registration, login, and bearer-token auth` · **Touches:** apps/api/src/auth/tokens.ts, apps/api/src/middleware/require-auth.ts

**Context.** Handlers need to know which driver is acting. The usual JWT shortcut is to pack the profile and role into the claims so the request needs no database read at all.

**Decision.** Claims are `sub` plus expiry. `requireAuth` loads the driver by id on every authenticated request and attaches the document.

**Alternatives rejected.** *Role and profile in the claims* — a driver who is removed or demoted keeps their old access until the token expires, seven days here, with no revocation short of rotating the signing secret. That matters specifically because phase 2 puts an admin role behind this. *Server-side session store* — gives revocation, but adds a store to operate for a lookup that costs the same as the driver read already happening.

**Trade-off accepted.** One `findById` per authenticated request. The API is therefore not stateless in the way JWTs are usually sold, and under load that read sits on the hot path of every mutating call. There is no cache in front of it.

**How I'd know I was wrong.** The auth read shows up as the dominant cost in a request profile.

## [D-07] bcryptjs rather than the native bcrypt binding
**Phase:** 1 · **Commit:** `Add driver registration, login, and bearer-token auth` · **Touches:** apps/api/src/auth/password.ts

**Context.** Passwords need a cost-factor KDF, and the container is `node:alpine`. Non-negotiable #6 says a clean clone must build with nothing external.

**Decision.** `bcryptjs`, pure JavaScript, cost factor from env (default 10).

**Alternatives rejected.** *`bcrypt`* — a native addon needing python and a C toolchain in the build image, or a prebuilt binary matching the exact Node and musl combination. That is a build-time failure on the one requirement I am least willing to break. *`argon2`* — better algorithm, same native-build problem, and a memory-cost parameter I would be picking arbitrarily. *`crypto.scrypt`* — no dependency, but then I am hand-rolling salt generation and the encoded-hash format, which is the part of password storage worth not writing myself.

**Trade-off accepted.** Measured here: 56ms per hash at cost 10, 199ms at cost 12. That runs on the event loop, so concurrent sign-ins queue behind each other. The native binding would be several times faster for the same cost factor, which means this choice effectively caps how high the cost factor can go before login latency becomes the problem.

**How I'd know I was wrong.** Sign-in latency rises with concurrency rather than with cost factor.

## [D-08] Same-origin `/api` proxy instead of CORS
**Phase:** 1 · **Commit:** `Add driver registration, login, and bearer-token auth` · **Touches:** apps/api/src/app.ts

**Context.** The client and API run on different ports in development. Either the API learns to allow the browser's origin, or the browser never crosses one.

**Decision.** No CORS middleware and no `CORS_ORIGIN` key. The client always calls relative `/api/...`; Vite proxies it in development and nginx proxies it in the container, so both environments have the same network shape. The matching proxy configuration lands with the client and the container.

**Alternatives rejected.** *`cors` middleware plus an absolute API base URL* — another env key to keep synchronised across dev, compose and any deployment, and an allowlist that is one careless line from `*`. *Proxy in dev, CORS in production* — two different network topologies, which is exactly where "worked locally" bugs come from.

**Trade-off accepted.** The API is unreachable from any other origin until CORS is added back. A native app, a second front-end, or hosting the static bundle on a CDN pointed at an API elsewhere all require revisiting this. Every deployment must include a reverse proxy.

**How I'd know I was wrong.** A second client needs to call this API from an origin I do not control.

## Dead ends

_Nothing yet._

## Known weaknesses

- **Landmark coordinates are not surveyed.** They are hand-placed from map
  knowledge, good to maybe 50-100m. Good enough to rank landmarks against each
  other, not good enough to quote a distance to a rider as if it were measured.
  Fixing this means one afternoon walking the campus with a GPS app.
- **`role` is written and never read in phase 1.** It exists because the phase-2
  admin check needs it and adding a required field to a populated collection
  later is a migration. It is the one field in the schema that breaks the
  "delete anything stored but never rendered or queried" rule, knowingly.
- **`syncIndexes()` on every boot** drops and rebuilds indexes that no longer
  match the schema. Cheap on a collection this size, a foreground stall on a
  large one. It needs to become a deploy step, not a boot step, before this
  holds real data.
- **Login leaks whether a phone number is registered, by timing.** Both failure
  paths return the same message, but the "no such driver" path skips bcrypt and
  returns in ~1ms while a wrong password costs ~56ms. Fixing it means comparing
  against a dummy hash on the miss path. Not done.
- **No rate limiting on login.** Phase 4. Right now the only thing between an
  attacker and an unlimited password-guessing loop is bcrypt's cost factor.
