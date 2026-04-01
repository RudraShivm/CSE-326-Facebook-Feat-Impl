import request from "supertest";
import app from "../app";

let user1Token: string;
let user1Id: string;
let user2Token: string;
let user2Id: string;
let originalPostId: string;

beforeAll(async () => {
  // Register User 1 (post author)
  const res1 = await request(app).post("/api/v1/auth/register").send({
    email: "share-author@example.com",
    password: "Password1!",
    firstName: "Share",
    lastName: "Author",
    dateOfBirth: "1990-01-01",
  });
  user1Token = res1.body.accessToken;
  user1Id = res1.body.user.userId;

  // Register User 2 (sharer)
  const res2 = await request(app).post("/api/v1/auth/register").send({
    email: "share-sharer@example.com",
    password: "Password2!",
    firstName: "Share",
    lastName: "Sharer",
    dateOfBirth: "1990-01-01",
  });
  user2Token = res2.body.accessToken;
  user2Id = res2.body.user.userId;

  // User 1 creates a post with mock media URLs
  const postRes = await request(app)
    .post("/api/v1/posts")
    .set("Authorization", `Bearer ${user1Token}`)
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
    const shareRes = await request(app)
      .post("/api/v1/posts")
      .set("Authorization", `Bearer ${user2Token}`)
      .send({ content: "", sharedPostId: originalPostId, visibility: "PUBLIC" })
      .expect(201);

    expect(shareRes.body.sharedPostId).toBe(originalPostId);

    // Verify shareCount incremented on original post
    const originalPost = await request(app)
      .get(`/api/v1/posts/${originalPostId}`)
      .set("Authorization", `Bearer ${user1Token}`)
      .expect(200);

    expect(originalPost.body.shareCount).toBe(1);
  });

  it("should return shared post media (imageUrl and videoUrl)", async () => {
    // User 2 shares user 1's post
    const shareRes = await request(app)
      .post("/api/v1/posts")
      .set("Authorization", `Bearer ${user2Token}`)
      .send({ content: "Check this out!", sharedPostId: originalPostId, visibility: "PUBLIC" })
      .expect(201);

    // The shared post embed should include the original post's media
    expect(shareRes.body.sharedPost).toBeDefined();
    expect(shareRes.body.sharedPost.imageUrl).toBe("https://example.com/image.jpg");
    expect(shareRes.body.sharedPost.videoUrl).toBe("https://example.com/video.mp4");
  });

  it("should create a SHARE notification for the original author", async () => {
    // User 2 shares user 1's post (another share)
    await request(app)
      .post("/api/v1/posts")
      .set("Authorization", `Bearer ${user2Token}`)
      .send({ content: "", sharedPostId: originalPostId, visibility: "PUBLIC" })
      .expect(201);

    // Check user 1's notifications
    const notifRes = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${user1Token}`)
      .expect(200);

    const shareNotifications = notifRes.body.notifications.filter(
      (n: any) => n.type === "SHARE" && n.actorId === user2Id
    );
    expect(shareNotifications.length).toBeGreaterThanOrEqual(1);
    expect(shareNotifications[0].message).toContain("shared your post");
  });

  it("should NOT create a notification when sharing own post", async () => {
    // Get current notification count for user 1
    const beforeRes = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${user1Token}`)
      .expect(200);
    const countBefore = beforeRes.body.notifications.filter(
      (n: any) => n.type === "SHARE" && n.actorId === user1Id
    ).length;

    // User 1 shares their own post
    await request(app)
      .post("/api/v1/posts")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({ content: "", sharedPostId: originalPostId, visibility: "PUBLIC" })
      .expect(201);

    // Notification count for self-shares should not increase
    const afterRes = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${user1Token}`)
      .expect(200);
    const countAfter = afterRes.body.notifications.filter(
      (n: any) => n.type === "SHARE" && n.actorId === user1Id
    ).length;

    expect(countAfter).toBe(countBefore);
  });
});
