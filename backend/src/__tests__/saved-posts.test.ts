import request from "supertest";
import app from "../app";

const userAgent = request.agent(app);
let userId: string;
const otherAgent = request.agent(app);
let otherId: string;
let plainPostId: string;
let sharedPostId: string;

beforeAll(async () => {
  // Register user who will save posts
  const res1 = await userAgent.post("/api/v1/auth/register").send({
    email: "saved-user@example.com",
    password: "Password1!",
    firstName: "Saved",
    lastName: "User",
    dateOfBirth: "1990-01-01",
  });
  userId = res1.body.user.userId;

  // Register another user who creates posts
  const res2 = await otherAgent.post("/api/v1/auth/register").send({
    email: "saved-author@example.com",
    password: "Password2!",
    firstName: "Post",
    lastName: "Author",
    dateOfBirth: "1990-01-01",
  });
  otherId = res2.body.user.userId;

  // Other user creates a plain post
  const p1 = await otherAgent
    .post("/api/v1/posts")
    .send({ content: "A normal post", visibility: "PUBLIC" });
  plainPostId = p1.body.id;

  // Other user creates a post with media, then user shares it
  const p2 = await otherAgent
    .post("/api/v1/posts")
    .send({
      content: "Post with media",
      imageUrl: "https://example.com/img.jpg",
      videoUrl: "https://example.com/vid.mp4",
      visibility: "PUBLIC",
    });

  const shareRes = await userAgent
    .post("/api/v1/posts")
    .send({
      content: "Sharing this!",
      sharedPostId: p2.body.id,
      visibility: "PUBLIC",
    });
  sharedPostId = shareRes.body.id;
});

describe("Saved Posts", () => {
  it("should save a post and return 201", async () => {
    const res = await userAgent
      .post(`/api/v1/users/${userId}/saved-posts/${plainPostId}`)
      .expect(201);

    expect(res.body.postId).toBe(plainPostId);
    expect(res.body.userId).toBe(userId);
  });

  it("should fetch saved posts with post data", async () => {
    const res = await userAgent
      .get(`/api/v1/users/${userId}/saved-posts?limit=10`)
      .expect(200);

    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].id).toBe(plainPostId);
    expect(res.body.items[0].content).toBe("A normal post");
    expect(res.body.items[0].isSaved).toBe(true);
    expect(res.body.items[0].author).toBeDefined();
    expect(res.body.items[0].author.firstName).toBe("Post");
  });

  it("should include sharedPost content when saving a shared post", async () => {
    // Save the shared post
    await userAgent
      .post(`/api/v1/users/${userId}/saved-posts/${sharedPostId}`)
      .expect(201);

    const res = await userAgent
      .get(`/api/v1/users/${userId}/saved-posts?limit=10`)
      .expect(200);

    const saved = res.body.items.find((p: any) => p.id === sharedPostId);
    expect(saved).toBeDefined();
    expect(saved.sharedPost).toBeDefined();
    expect(saved.sharedPost.content).toBe("Post with media");
    expect(saved.sharedPost.imageUrl).toBe("https://example.com/img.jpg");
    expect(saved.sharedPost.videoUrl).toBe("https://example.com/vid.mp4");
    expect(saved.sharedPost.author).toBeDefined();
    expect(saved.sharedPost.author.firstName).toBe("Post");
  });

  it("should unsave a post and return 204", async () => {
    await userAgent
      .delete(`/api/v1/users/${userId}/saved-posts/${plainPostId}`)
      .expect(204);

    const res = await userAgent
      .get(`/api/v1/users/${userId}/saved-posts?limit=10`)
      .expect(200);

    const ids = res.body.items.map((p: any) => p.id);
    expect(ids).not.toContain(plainPostId);
  });
});
