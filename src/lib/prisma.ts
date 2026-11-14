import { PrismaClient } from "@prisma/client";

// Standard Next.js singleton with SQLite WAL mode and busy timeout configuration
// to safely handle concurrent shop-floor entries across plant shifts.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  sqliteOptimized?: boolean;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (!globalForPrisma.sqliteOptimized) {
  globalForPrisma.sqliteOptimized = true;
  // Configure WAL (Write-Ahead Logging) & busy timeout for non-blocking concurrent reads
  prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;")
    .then(() => prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;"))
    .then(() => prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL;"))
    .catch((err) => {
      // Non-fatal if building or running on a non-SQLite backend
      if (process.env.NODE_ENV === "development") {
        console.warn("SQLite WAL configuration notice:", err?.message || err);
      }
    });
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
