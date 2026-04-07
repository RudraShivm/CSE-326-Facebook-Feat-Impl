import request from "supertest";
import app from "../app";

const authorAgent = request.agent(app);
let userId: string;
let postId: string;

// Setup: register a test user and get their token
beforeAll(async () => {
  const res = await authorAgent
    .post("/api/v1/auth/register")
    .send({
      email: "post-test@example.com",
      password: "Secur3P@ss!",
      firstName: "Post",
      lastName: "Tester",
      dateOfBirth: "1998-06-15",
    });

  userId = res.body.user.userId;
});

// ── Create Post ───────────────────────────────────────────
describe("POST /api/v1/posts", () => {
  it("should create a post", async () => {
    const res = await authorAgent
      .post("/api/v1/posts")
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
    await authorAgent
      .post("/api/v1/posts")
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
    const res = await authorAgent
      .get(`/api/v1/posts/${postId}`)
      .expect(200);

    expect(res.body.id).toBe(postId);
    expect(res.body.content).toBe("Hello, this is my first post!");
  });

  it("should return 404 for non-existent post", async () => {
    await authorAgent
      .get("/api/v1/posts/nonexistent-id")
      .expect(404);
  });
});

// ── Update Post ───────────────────────────────────────────
describe("PATCH /api/v1/posts/:postId", () => {
  it("should update post content", async () => {
    const res = await authorAgent
      .patch(`/api/v1/posts/${postId}`)
      .send({ content: "Updated content" })
      .expect(200);

    expect(res.body.content).toBe("Updated content");
  });

  it("should update visibility", async () => {
    const res = await authorAgent
      .patch(`/api/v1/posts/${postId}`)
      .send({ visibility: "FRIENDS" })
      .expect(200);

    expect(res.body.visibility).toBe("FRIENDS");
  });

  it("should reject update from non-author", async () => {
    const otherAgent = request.agent(app);
    // Register a different user
    await otherAgent
      .post("/api/v1/auth/register")
      .send({
        email: "other-post@example.com",
        password: "Secur3P@ss!",
        firstName: "Other",
        lastName: "User",
        dateOfBirth: "1999-01-01",
      });

    await otherAgent
      .patch(`/api/v1/posts/${postId}`)
      .send({ content: "Hijacked!" })
      .expect(403);
  });
});

// ── Get User's Posts ──────────────────────────────────────
describe("GET /api/v1/users/:userId/posts", () => {
  it("should return user's posts with pagination", async () => {
    const res = await authorAgent
      .get(`/api/v1/users/${userId}/posts?limit=5`)
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
    await authorAgent
      .delete(`/api/v1/posts/${postId}`)
      .expect(204);

    // Verify it's deleted
    await authorAgent
      .get(`/api/v1/posts/${postId}`)
      .expect(404);
  });
});
