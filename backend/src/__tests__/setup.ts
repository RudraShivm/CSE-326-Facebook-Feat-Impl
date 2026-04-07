import { PrismaClient } from "@prisma/client";
import redis from "../config/redis";

// Use a separate test database to avoid polluting dev data
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  "postgresql://postgres:postgres@localhost:5432/facebook_db_test?schema=public";
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.NODE_ENV = "test";

const prisma = new PrismaClient();

// Clean all tables before the test suite runs
beforeAll(async () => {
  // Delete in reverse dependency order (foreign key constraints)
  await prisma.userShortcut.deleteMany();
  await prisma.recentProfileVisit.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.savedPost.deleteMany();
  await prisma.blockedUser.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
});

// Disconnect after all tests complete
afterAll(async () => {
  await prisma.userShortcut.deleteMany();
  await prisma.recentProfileVisit.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.savedPost.deleteMany();
  await prisma.blockedUser.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
  redis.disconnect(); // Close redis connection so tests can exit
});

export { prisma };
