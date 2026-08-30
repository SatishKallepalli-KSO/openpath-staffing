# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS web-build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
RUN npm ci
COPY apps/web apps/web
ENV VITE_BASE=/
ENV VITE_API_BASE=
RUN npm run build --workspace=@openpath/web

FROM node:22-bookworm-slim AS api
WORKDIR /app

RUN useradd --create-home --uid 10001 appuser

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
RUN npm ci --omit=dev --workspace=@openpath/api && npm cache clean --force

COPY apps/api apps/api
COPY --from=web-build /repo/apps/web/dist ./apps/api/static

RUN mkdir -p /app/apps/api/data && chown -R appuser:appuser /app
USER appuser

ENV PORT=8000
ENV NODE_ENV=production
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--experimental-sqlite", "apps/api/src/index.js"]
