# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY services/api/package.json services/api/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-config/package.json packages/shared-config/package.json
RUN npm ci --workspaces --include-workspace-root

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build --workspace @easydocument/api
RUN npm prune --omit=dev --workspaces --include-workspace-root

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
RUN addgroup -S easydocument && adduser -S easydocument -G easydocument
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/services/api/package.json ./services/api/package.json
COPY --from=build /app/services/api/dist ./services/api/dist
USER easydocument
EXPOSE 3000
CMD ["node", "services/api/dist/main.js"]
