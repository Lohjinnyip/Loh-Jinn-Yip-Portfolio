# syntax=docker/dockerfile:1

# ============================================================================
#  Stage 1 — build the Vite/React static site
# ============================================================================
FROM node:22-alpine AS build
WORKDIR /app

# install deps against the lockfile for reproducible builds
COPY package.json package-lock.json ./
RUN npm ci

# build the app; override the GitHub Pages base ("/Loh-Jinn-Yip-Portfolio/")
# so assets resolve from the container root ("/").
COPY . .
RUN npm run build -- --base=/

# ============================================================================
#  Stage 2 — serve the built /dist with nginx
# ============================================================================
FROM nginx:alpine AS serve

# SPA + asset config (gzip, long-cache hashed assets, index fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
