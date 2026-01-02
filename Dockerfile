# syntax=docker/dockerfile:1

FROM node:20-alpine AS build

WORKDIR /app

# Build-time base path for Vite (the UI is served from /ai-pulp-ui/ in the Pulp image)
ARG VITE_BASE=/ai-pulp-ui/
ENV VITE_BASE=$VITE_BASE

# Build-time backend origins for the UI bundle.
# Note: Vite only embeds env vars at build time, so these must be set during `docker build`.
ARG PULP_BACKEND=http://localhost:8080
ARG PULP_EXPOSED_BACKEND=http://localhost:8080
ENV PULP_BACKEND=$PULP_BACKEND
ENV PULP_EXPOSED_BACKEND=$PULP_EXPOSED_BACKEND

# Install deps first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Build the UI
COPY . .
RUN npm run build


FROM ghcr.io/pulp/pulp:latest

# Add the built UI assets to the image.
# Note: this Dockerfile does not change Pulp's web server configuration;
# it simply bakes the UI build output into the container filesystem.
RUN mkdir -p /opt/ai-pulp-ui
COPY --from=build /app/dist /opt/ai-pulp-ui/dist

# Nginx snippet to serve the UI at /ai-pulp-ui/ on the existing port 80 server.
# The base image includes /etc/nginx/default.d/*.conf inside the default server block.
COPY nginx/ai-pulp-ui.conf /etc/nginx/pulp/ai-pulp-ui.conf
