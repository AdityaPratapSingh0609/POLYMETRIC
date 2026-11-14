FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# ---- Dependencies -----------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

# ---- Build -------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DATABASE_URL just needs to exist so `prisma generate` doesn't warn; the
# real value is supplied at runtime via docker-compose.
ENV DATABASE_URL="file:./build.db"
RUN npx prisma generate
RUN npm run build

# ---- Runtime -------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs

EXPOSE 3000

# Apply any pending migrations, then start the server. The SQLite file lives
# on a mounted volume (see docker-compose.yml) so data survives restarts.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
