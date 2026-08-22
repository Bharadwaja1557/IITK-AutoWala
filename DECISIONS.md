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

## Dead ends

_Nothing yet._

## Known weaknesses

_Nothing yet._
