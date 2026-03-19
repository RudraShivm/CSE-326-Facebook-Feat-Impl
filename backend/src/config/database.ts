import { PrismaClient } from "@prisma/client";

// The 'declare global' trick prevents multiple PrismaClient
// instances during hot-reloading in development (ts-node-dev).
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const prisma =
  global.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") global.__prisma = prisma;

export default prisma;
