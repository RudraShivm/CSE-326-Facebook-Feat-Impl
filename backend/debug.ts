import prisma from './src/config/database';
import { generateFeed } from './src/services/feed.service';

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user found");
    return;
  }
  console.log("Found user:", user.id);
  const feed = await generateFeed(user.id);
  console.log("Feed mapped:", JSON.stringify(feed.posts.map(p => ({ id: p.id, hasReacted: p.hasReacted })), null, 2));
  
  const rawPosts = await prisma.post.findMany({
    select: {
      id: true,
      reactions: { where: { userId: user.id }, select: { id: true } }
    }
  });
  console.log("Raw posts from DB:", JSON.stringify(rawPosts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
