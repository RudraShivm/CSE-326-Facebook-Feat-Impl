import request from "supertest";
import app from "../app";

let accessToken: string;
let userId: string;
let postId: string;

// Setup: register a test user and get their token
beforeAll(async () => {
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({
      email: "post-test@example.com",
      password: "Secur3P@ss!",
      firstName: "Post",
      lastName: "Tester",
      dateOfBirth: "1998-06-15",
    });

  accessToken = res.body.accessToken;
  userId = res.body.user.userId;
});

// ── Create Post ───────────────────────────────────────────
describe("POST /api/v1/posts", () => {
  it("should create a post", async () => {
    const res = await request(app)
      .post("/api/v1/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        content: "Hello, this is my first post!",
        visibility: "PUBLIC",
      })
      .expect(201);

    expect(res.body.content).toBe("Hello, this is my first post!");
    expect(res.body.visibility).toBe("PUBLIC");
    expect(res.body.author.firstName).toBe("Post");
    postId = res.body.id;
  });

  it("should reject empty content", async () => {
    await request(app)
      .post("/api/v1/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ content: "" })
      .expect(400);
  });

  it("should reject unauthenticated request", async () => {
    await request(app)
      .post("/api/v1/posts")
      .send({ content: "Test" })
      .expect(401);
  });
});

// ── Get Post ──────────────────────────────────────────────
describe("GET /api/v1/posts/:postId", () => {
  it("should return a post by ID", async () => {
    const res = await request(app)
      .get(`/api/v1/posts/${postId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.id).toBe(postId);
    expect(res.body.content).toBe("Hello, this is my first post!");
  });

  it("should return 404 for non-existent post", async () => {
    await request(app)
      .get("/api/v1/posts/nonexistent-id")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404);
  });
});

// ── Update Post ───────────────────────────────────────────
describe("PATCH /api/v1/posts/:postId", () => {
  it("should update post content", async () => {
    const res = await request(app)
      .patch(`/api/v1/posts/${postId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ content: "Updated content" })
      .expect(200);

    expect(res.body.content).toBe("Updated content");
  });

  it("should update visibility", async () => {
    const res = await request(app)
      .patch(`/api/v1/posts/${postId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ visibility: "FRIENDS" })
      .expect(200);

    expect(res.body.visibility).toBe("FRIENDS");
  });

  it("should reject update from non-author", async () => {
    // Register a different user
    const otherRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: "other-post@example.com",
        password: "Secur3P@ss!",
        firstName: "Other",
        lastName: "User",
        dateOfBirth: "1999-01-01",
      });

    await request(app)
      .patch(`/api/v1/posts/${postId}`)
      .set("Authorization", `Bearer ${otherRes.body.accessToken}`)
      .send({ content: "Hijacked!" })
      .expect(403);
  });
});

// ── Get User's Posts ──────────────────────────────────────
describe("GET /api/v1/users/:userId/posts", () => {
  it("should return user's posts with pagination", async () => {
    const res = await request(app)
      .get(`/api/v1/users/${userId}/posts?limit=5`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty("posts");
    expect(res.body).toHaveProperty("nextCursor");
    expect(res.body).toHaveProperty("hasMore");
    expect(Array.isArray(res.body.posts)).toBe(true);
  });
});

// ── Delete Post ───────────────────────────────────────────
describe("DELETE /api/v1/posts/:postId", () => {
  it("should delete a post", async () => {
    await request(app)
      .delete(`/api/v1/posts/${postId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(204);

    // Verify it's deleted
    await request(app)
      .get(`/api/v1/posts/${postId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404);
  });
});
