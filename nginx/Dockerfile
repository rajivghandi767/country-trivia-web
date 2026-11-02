# ============================================================================
# Stage 1: Build React SPA (Vite)
# ============================================================================
FROM node:24-alpine AS frontend-build

ENV NODE_OPTIONS="--max-old-space-size=1024"

RUN addgroup -S frontend_group && adduser -S frontend -G frontend_group && \
    mkdir -p /home/frontend/react && chown -R frontend:frontend_group /home/frontend/react

WORKDIR /home/frontend/react
USER frontend

COPY --chown=frontend:frontend_group frontend/package*.json ./
RUN npm ci

COPY --chown=frontend:frontend_group frontend/ ./

ARG NODE_ENV=production
ARG VITE_API_URL

ENV NODE_ENV=$NODE_ENV
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ============================================================================
# Stage 2: Consolidated Production Nginx (Static SPA + API Reverse Proxy)
# ============================================================================
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Remove default nginx configs - BOTH files needed
RUN rm /etc/nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copy compiled React SPA assets from Stage 1
COPY --from=frontend-build --chown=nginx:nginx /home/frontend/react/dist /usr/share/nginx/html

# Create directory for Django static files volume mount
RUN mkdir -p /usr/share/nginx/html/static && \
    chown -R nginx:nginx /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/nginx-status/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
