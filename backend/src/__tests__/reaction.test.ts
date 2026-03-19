import request from "supertest";
import app from "../app";

let accessToken: string;
let postId: string;
let commentId: string;

beforeAll(async () => {
  // Register user
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({
      email: "react-test@example.com",
      password: "Secur3P@ss!",
      firstName: "React",
      lastName: "Tester",
      dateOfBirth: "1998-06-15",
    });
  accessToken = res.body.accessToken;

  // Create a post
  const postRes = await request(app)
    .post("/api/v1/posts")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ content: "Post to react to" });
  postId = postRes.body.id;

  // Create a comment
  const commentRes = await request(app)
    .post(`/api/v1/posts/${postId}/comments`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ content: "Comment to react to" });
  commentId = commentRes.body.id;
});

describe("POST /api/v1/posts/:postId/reactions", () => {
  it("should add a LIKE reaction to a post", async () => {
    const res = await request(app)
      .post(`/api/v1/posts/${postId}/reactions`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ type: "LIKE" })
      .expect(200);

    expect(res.body.status).toBe("added");
    expect(res.body.reaction.type).toBe("LIKE");
  });

  it("should increment post likeCount", async () => {
    const res = await request(app)
      .get(`/api/v1/posts/${postId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.likeCount).toBe(1);
  });

  it("should update reaction if sending a different type (LOVE)", async () => {
    const res = await request(app)
      .post(`/api/v1/posts/${postId}/reactions`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ type: "LOVE" })
      .expect(200);

    expect(res.body.status).toBe("updated");
    expect(res.body.reaction.type).toBe("LOVE");
  });

  it("should remove reaction if sending the same type again", async () => {
    const res = await request(app)
      .post(`/api/v1/posts/${postId}/reactions`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ type: "LOVE" }) // We already changed it to LOVE in the previous test
      .expect(200);

    expect(res.body.status).toBe("removed");
  });

  it("should have decremented post likeCount back to 0", async () => {
    const res = await request(app)
      .get(`/api/v1/posts/${postId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.likeCount).toBe(0);
  });
});

describe("POST /api/v1/comments/:commentId/reactions", () => {
  it("should add a HAHA reaction to a comment", async () => {
    const res = await request(app)
      .post(`/api/v1/comments/${commentId}/reactions`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ type: "HAHA" })
      .expect(200);

    expect(res.body.status).toBe("added");
    expect(res.body.reaction.type).toBe("HAHA");
  });
});
