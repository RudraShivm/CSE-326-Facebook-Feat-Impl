import request from "supertest";
import app from "../app";

const authorAgent = request.agent(app);
let postId: string;
let commentId: string;

beforeAll(async () => {
  // Register user
  await authorAgent
    .post("/api/v1/auth/register")
    .send({
      email: "react-test@example.com",
      password: "Secur3P@ss!",
      firstName: "React",
      lastName: "Tester",
      dateOfBirth: "1998-06-15",
    });
  // Create a post
  const postRes = await authorAgent
    .post("/api/v1/posts")
    .send({ content: "Post to react to" });
  postId = postRes.body.id;

  // Create a comment
  const commentRes = await authorAgent
    .post(`/api/v1/posts/${postId}/comments`)
    .send({ content: "Comment to react to" });
  commentId = commentRes.body.id;
});

describe("POST /api/v1/posts/:postId/reactions", () => {
  it("should add a LIKE reaction to a post", async () => {
    const res = await authorAgent
      .post(`/api/v1/posts/${postId}/reactions`)
      .send({ type: "LIKE" })
      .expect(200);

    expect(res.body.status).toBe("added");
    expect(res.body.reaction.type).toBe("LIKE");
  });

  it("should increment post likeCount", async () => {
    const res = await authorAgent
      .get(`/api/v1/posts/${postId}`)
      .expect(200);

    expect(res.body.likeCount).toBe(1);
  });

  it("should update reaction if sending a different type (LOVE)", async () => {
    const res = await authorAgent
      .post(`/api/v1/posts/${postId}/reactions`)
      .send({ type: "LOVE" })
      .expect(200);

    expect(res.body.status).toBe("updated");
    expect(res.body.reaction.type).toBe("LOVE");
  });

  it("should remove reaction if sending the same type again", async () => {
    const res = await authorAgent
      .post(`/api/v1/posts/${postId}/reactions`)
      .send({ type: "LOVE" }) // We already changed it to LOVE in the previous test
      .expect(200);

    expect(res.body.status).toBe("removed");
  });

  it("should have decremented post likeCount back to 0", async () => {
    const res = await authorAgent
      .get(`/api/v1/posts/${postId}`)
      .expect(200);

    expect(res.body.likeCount).toBe(0);
  });
});

describe("POST /api/v1/comments/:commentId/reactions", () => {
  it("should add a HAHA reaction to a comment", async () => {
    const res = await authorAgent
      .post(`/api/v1/comments/${commentId}/reactions`)
      .send({ type: "HAHA" })
      .expect(200);

    expect(res.body.status).toBe("added");
    expect(res.body.reaction.type).toBe("HAHA");
  });
});
