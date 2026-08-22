FROM node:24-alpine AS build

WORKDIR /app
COPY . .

RUN npm ci \
 && npm run build --workspace @iitk-autowala/shared \
 && npm run build --workspace @iitk-autowala/web

# The client is static files. nginx serves them and proxies /api to the API
# container, so the browser stays on one origin and there is no CORS anywhere
# in this system. D-08.
FROM nginx:1.27-alpine AS runtime

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
