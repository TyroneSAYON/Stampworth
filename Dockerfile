FROM node:20-alpine AS build
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app/backend

COPY --from=build /app/backend/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/backend/dist ./dist

ENV NODE_ENV=production
EXPOSE 8080

CMD ["sh", "-c", "PORT=${PORT:-8080} node dist/main"]
