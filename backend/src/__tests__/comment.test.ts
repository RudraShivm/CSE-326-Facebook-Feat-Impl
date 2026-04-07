import request from "supertest";
import app from "../app";

const authorAgent = request.agent(app);
let postId: string;
let commentId: string;

beforeAll(async () => {
  await authorAgent
    .post("/api/v1/auth/register")
    .send({
      email: "comment-test@example.com",
      password: "Secur3P@ss!",
      firstName: "Comment",
      lastName: "Tester",
      dateOfBirth: "1998-06-15",
    });
  const postRes = await authorAgent
    .post("/api/v1/posts")
    .send({ content: "Test post for comments" });
  postId = postRes.body.id;
});

describe("POST /api/v1/posts/:postId/comments", () => {
  it("should add a comment", async () => {
    const res = await authorAgent
      .post(`/api/v1/posts/${postId}/comments`)
      .send({ content: "Great post!" })
      .expect(201);

    expect(res.body.content).toBe("Great post!");
    commentId = res.body.id;
  });

  it("should increment commentCount on post", async () => {
    const res = await authorAgent
      .get(`/api/v1/posts/${postId}`)
      .expect(200);

    expect(res.body.commentCount).toBe(1);
  });

  it("should reject empty comment", async () => {
    await authorAgent
      .post(`/api/v1/posts/${postId}/comments`)
      .send({ content: "" })
      .expect(400);
  });
});

describe("GET /api/v1/posts/:postId/comments", () => {
  it("should list comments", async () => {
    const res = await authorAgent
      .get(`/api/v1/posts/${postId}/comments`)
      .expect(200);

    expect(res.body.comments).toHaveLength(1);
    expect(res.body.comments[0].content).toBe("Great post!");
  });
});

describe("PATCH /api/v1/posts/:postId/comments/:commentId", () => {
  it("should edit own comment", async () => {
    const res = await authorAgent
      .patch(`/api/v1/posts/${postId}/comments/${commentId}`)
      .send({ content: "Updated comment" })
      .expect(200);

    expect(res.body.content).toBe("Updated comment");
  });
});

describe("DELETE /api/v1/posts/:postId/comments/:commentId", () => {
  it("should delete own comment", async () => {
    await authorAgent
      .delete(`/api/v1/posts/${postId}/comments/${commentId}`)
      .expect(204);
  });

  it("should decrement commentCount", async () => {
    const res = await authorAgent
      .get(`/api/v1/posts/${postId}`)
      .expect(200);

    expect(res.body.commentCount).toBe(0);
  });
});
