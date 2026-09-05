# syntax=docker/dockerfile:1.7
#
# warehouse-console depends on @warehouse/ui-kit via `file:../warehouse-ui-kit`
# (a sibling checkout, not a registry package -- see package.json). Build with:
#   docker build --build-context uikit=../warehouse-ui-kit -t warehouse-console .
#
# NOTE: src/config.ts currently bakes SERVICE_BASE_URL / MFE remote URLs in as
# build-time constants (see README "Configuration" section) rather than
# reading them from a runtime-injected config, so one image is only good for
# the environment it was built for. Not addressed by this Dockerfile.

# --- ui-kit build stage (sibling dependency) ---
FROM node:22-alpine AS uikit-build
WORKDIR /uikit
COPY --from=uikit . .
RUN --mount=type=cache,target=/root/.npm \
    npm ci && npm run build

# --- app build stage ---
FROM node:22-alpine AS build
WORKDIR /workspace/warehouse-ui-kit
COPY --from=uikit-build /uikit/package.json ./package.json
COPY --from=uikit-build /uikit/dist ./dist

WORKDIR /workspace/warehouse-console
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY . .
RUN npm run build

# --- runtime stage ---
FROM nginxinc/nginx-unprivileged:1.27-alpine
# apk upgrade picks up any CVE fixes published to the 3.21 branch since the
# base image was last rebuilt (openssl, libxml2, etc.), matching the fleet's
# Go-service runtime stages. Root is only needed for this one step.
USER root
RUN apk upgrade --no-cache
USER nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=nginx:nginx /workspace/warehouse-console/dist /usr/share/nginx/html
EXPOSE 8080
