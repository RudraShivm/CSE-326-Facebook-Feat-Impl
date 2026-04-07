import request from "supertest";
import app from "../app";

const user1Agent = request.agent(app);
const user2Agent = request.agent(app);

beforeAll(async () => {
  // Register User 1
  await user1Agent.post("/api/v1/auth/register").send({
    email: "feed1@example.com",
    password: "Password1!",
    firstName: "Feed",
    lastName: "One",
    dateOfBirth: "1990-01-01",
  });

  // Register User 2
  await user2Agent.post("/api/v1/auth/register").send({
    email: "feed2@example.com",
    password: "Password2!",
    firstName: "Feed",
    lastName: "Two",
    dateOfBirth: "1990-01-01",
  });
});

describe("GET /api/v1/feed", () => {
  beforeAll(async () => {
    // User 1 creates 3 PUBLIC posts
    for (let i = 0; i < 3; i++) {
      await user1Agent
        .post("/api/v1/posts")
        .send({ content: `User 1 Public Post ${i}`, visibility: "PUBLIC" });
    }

    // User 1 creates 1 PRIVATE post
    await user1Agent
      .post("/api/v1/posts")
      .send({ content: `User 1 Private Post`, visibility: "PRIVATE" });

    // User 2 creates 2 PUBLIC posts
    for (let i = 0; i < 2; i++) {
      await user2Agent
        .post("/api/v1/posts")
        .send({ content: `User 2 Public Post ${i}`, visibility: "PUBLIC" });
    }
  });

  it("should return the correct feed for User 1", async () => {
    const res = await user1Agent
      .get("/api/v1/feed?limit=10")
      .expect(200);

    // User 1 should see: 3 own public + 1 own private + 2 User2 public = 6 posts
    expect(res.body.posts).toHaveLength(6);
  });

  it("should return the correct feed for User 2", async () => {
    const res = await user2Agent
      .get("/api/v1/feed?limit=10")
      .expect(200);

    // User 2 should see: 2 own public + 3 User1 public = 5 posts
    // Should NOT see User 1's private post
    expect(res.body.posts).toHaveLength(5);
    
    res.body.posts.forEach((post: any) => {
      expect(post.content).not.toBe("User 1 Private Post");
    });
  });

  it("should paginate correctly via cursor", async () => {
    // Fetch first 2 posts
    const page1 = await user1Agent
      .get("/api/v1/feed?limit=2")
      .expect(200);

    expect(page1.body.posts).toHaveLength(2);
    expect(page1.body.nextCursor).toBeDefined();

    const page2 = await user1Agent
      .get(`/api/v1/feed?limit=2&cursor=${page1.body.nextCursor}`)
      .expect(200);

    expect(page2.body.posts).toHaveLength(2);
    // The posts in page2 should be different from page1
    expect(page1.body.posts[0].id).not.toBe(page2.body.posts[0].id);
  });
});
