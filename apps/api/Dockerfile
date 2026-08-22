# Build stage: install everything, compile shared then the API, then drop the
# dev dependencies. The whole repo is copied rather than a curated list of
# paths — npm workspaces put symlinks in several node_modules directories and
# reassembling them by hand in a second stage is the kind of cleverness that
# breaks quietly. D-14.
FROM node:24-alpine AS build

WORKDIR /app
COPY . .

RUN npm ci \
 && npm run build --workspace @iitk-autowala/shared \
 && npm run build --workspace @iitk-autowala/api \
 && npm prune --omit=dev

FROM node:24-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app

# Configuration comes from compose. Nothing is baked in, and the API refuses to
# start if a required key is missing or malformed.
USER node
EXPOSE 4000

CMD ["node", "apps/api/dist/index.js"]
