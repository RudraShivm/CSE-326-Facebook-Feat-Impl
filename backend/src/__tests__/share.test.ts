import request from "supertest";
import app from "../app";

const authorAgent = request.agent(app);
let user1Id: string;
const sharerAgent = request.agent(app);
let user2Id: string;
let originalPostId: string;
let sharedPostToDeleteId: string;
let sharedPostForDeletedOriginalId: string;

beforeAll(async () => {
  // Register User 1 (post author)
  const res1 = await authorAgent.post("/api/v1/auth/register").send({
    email: "share-author@example.com",
    password: "Password1!",
    firstName: "Share",
    lastName: "Author",
    dateOfBirth: "1990-01-01",
  });
  user1Id = res1.body.user.userId;

  // Register User 2 (sharer)
  const res2 = await sharerAgent.post("/api/v1/auth/register").send({
    email: "share-sharer@example.com",
    password: "Password2!",
    firstName: "Share",
    lastName: "Sharer",
    dateOfBirth: "1990-01-01",
  });
  user2Id = res2.body.user.userId;

  // User 1 creates a post with mock media URLs
  const postRes = await authorAgent
    .post("/api/v1/posts")
    .send({
      content: "Original post with media",
      imageUrl: "https://example.com/image.jpg",
      videoUrl: "https://example.com/video.mp4",
      visibility: "PUBLIC",
    });
  originalPostId = postRes.body.id;
});

describe("Post Sharing", () => {
  it("should increment shareCount on the original post", async () => {
    // User 2 shares user 1's post
    const shareRes = await sharerAgent
      .post("/api/v1/posts")
      .send({ content: "", sharedPostId: originalPostId, visibility: "PUBLIC" })
      .expect(201);

    expect(shareRes.body.sharedPostId).toBe(originalPostId);

    // Verify shareCount incremented on original post
    const originalPost = await authorAgent
      .get(`/api/v1/posts/${originalPostId}`)
      .expect(200);

    expect(originalPost.body.shareCount).toBe(1);
  });

  it("should decrement shareCount when a shared post is deleted", async () => {
    const shareRes = await sharerAgent
      .post("/api/v1/posts")
      .send({ content: "I am sharing this", sharedPostId: originalPostId, sourcePostId: originalPostId, visibility: "PUBLIC" })
      .expect(201);

    sharedPostToDeleteId = shareRes.body.id;

    const originalBeforeDelete = await authorAgent
      .get(`/api/v1/posts/${originalPostId}`)
      .expect(200);

    await sharerAgent
      .delete(`/api/v1/posts/${sharedPostToDeleteId}`)
      .expect(204);

    const originalAfterDelete = await authorAgent
      .get(`/api/v1/posts/${originalPostId}`)
      .expect(200);

    expect(originalAfterDelete.body.shareCount).toBe(originalBeforeDelete.body.shareCount - 1);
  });

  it("should return shared post media (imageUrl and videoUrl)", async () => {
    // User 2 shares user 1's post
    const shareRes = await sharerAgent
      .post("/api/v1/posts")
      .send({ content: "Check this out!", sharedPostId: originalPostId, visibility: "PUBLIC" })
      .expect(201);

    // The shared post embed should include the original post's media
    expect(shareRes.body.sharedPost).toBeDefined();
    expect(shareRes.body.sharedPost.imageUrl).toBe("https://example.com/image.jpg");
    expect(shareRes.body.sharedPost.videoUrl).toBe("https://example.com/video.mp4");
  });

  it("should create a SHARE notification for the original author", async () => {
    // User 2 shares user 1's post (another share)
    await sharerAgent
      .post("/api/v1/posts")
      .send({ content: "", sharedPostId: originalPostId, visibility: "PUBLIC" })
      .expect(201);

    // Check user 1's notifications
    const notifRes = await authorAgent
      .get("/api/v1/notifications")
      .expect(200);

    const shareNotifications = notifRes.body.notifications.filter(
      (n: any) => n.type === "SHARE" && n.actorId === user2Id
    );
    expect(shareNotifications.length).toBeGreaterThanOrEqual(1);
    expect(shareNotifications[0].message).toContain("shared your post");
  });

  it("should NOT create a notification when sharing own post", async () => {
    // Get current notification count for user 1
    const beforeRes = await authorAgent
      .get("/api/v1/notifications")
      .expect(200);
    const countBefore = beforeRes.body.notifications.filter(
      (n: any) => n.type === "SHARE" && n.actorId === user1Id
    ).length;

    // User 1 shares their own post
    await authorAgent
      .post("/api/v1/posts")
      .send({ content: "", sharedPostId: originalPostId, visibility: "PUBLIC" })
      .expect(201);

    // Notification count for self-shares should not increase
    const afterRes = await authorAgent
      .get("/api/v1/notifications")
      .expect(200);
    const countAfter = afterRes.body.notifications.filter(
      (n: any) => n.type === "SHARE" && n.actorId === user1Id
    ).length;

    expect(countAfter).toBe(countBefore);
  });

  it("should keep a shared post visible after the original is deleted and mark the embed as missing", async () => {
    const shareRes = await sharerAgent
      .post("/api/v1/posts")
      .send({ content: "Sharing before delete", sharedPostId: originalPostId, sourcePostId: originalPostId, visibility: "PUBLIC" })
      .expect(201);

    sharedPostForDeletedOriginalId = shareRes.body.id;

    await authorAgent
      .delete(`/api/v1/posts/${originalPostId}`)
      .expect(204);

    const sharedPost = await sharerAgent
      .get(`/api/v1/posts/${sharedPostForDeletedOriginalId}`)
      .expect(200);

    expect(sharedPost.body.content).toBe("Sharing before delete");
    expect(sharedPost.body.sourcePostId).toBe(originalPostId);
    expect(sharedPost.body.sharedPostId).toBeFalsy();
    expect(sharedPost.body.sharedPost).toBeNull();
  });
});
