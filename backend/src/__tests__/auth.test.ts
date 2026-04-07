import request from "supertest";
import app from "../app";

// ── Test Data ──────────────────────────────────────────────
const testUser = {
  email: "test@example.com",
  password: "Secur3P@ss!",
  firstName: "Test",
  lastName: "User",
  dateOfBirth: "1998-06-15",
};

const authAgent = request.agent(app);

// ── Register Tests ─────────────────────────────────────────
describe("POST /api/v1/auth/register", () => {
  it("should register a new user and set the access token cookie", async () => {
    const res = await authAgent
      .post("/api/v1/auth/register")
      .send(testUser)
      .expect(201);

    expect(res.headers["set-cookie"]).toEqual(
      expect.arrayContaining([expect.stringContaining("accessToken=")])
    );
    expect(res.body).toHaveProperty("user");
    expect(res.body.user).toHaveProperty("userId");
    expect(res.body.user.firstName).toBe("Test");
    expect(res.body.user.lastName).toBe("User");
  });

  it("should reject duplicate email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send(testUser)
      .expect(409);

    expect(res.body.code).toBe("EMAIL_CONFLICT");
  });

  it("should reject invalid email format", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...testUser, email: "not-an-email" })
      .expect(400);

    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("should reject short password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...testUser, email: "short@test.com", password: "123" })
      .expect(400);

    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("should reject missing required fields", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "missing@test.com" })
      .expect(400);

    expect(res.body.code).toBe("VALIDATION_ERROR");
  });
});

// ── Login Tests ────────────────────────────────────────────
describe("POST /api/v1/auth/login", () => {
  it("should login with valid credentials", async () => {
    const res = await authAgent
      .post("/api/v1/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password,
      })
      .expect(200);

    expect(res.headers["set-cookie"]).toEqual(
      expect.arrayContaining([expect.stringContaining("accessToken=")])
    );
    expect(res.body.user.firstName).toBe("Test");
  });

  it("should reject wrong password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: testUser.email,
        password: "WrongPassword!",
      })
      .expect(401);

    expect(res.body.code).toBe("INVALID_CREDENTIALS");
  });

  it("should reject non-existent email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "nobody@example.com",
        password: "Secur3P@ss!",
      })
      .expect(401);

    expect(res.body.code).toBe("INVALID_CREDENTIALS");
  });
});

// ── Refresh Tests ──────────────────────────────────────────
describe("POST /api/v1/auth/refresh", () => {
  it("should return a new access token", async () => {
    const res = await authAgent
      .post("/api/v1/auth/refresh")
      .expect(200);

    expect(res.body.expiresIn).toBe(900);
    expect(res.headers["set-cookie"]).toEqual(
      expect.arrayContaining([expect.stringContaining("accessToken=")])
    );
  });

  it("should reject refresh without a valid session cookie", async () => {
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .expect(401);

    expect(res.body.code).toBe("UNAUTHORIZED");
  });
});

// ── Logout Tests ───────────────────────────────────────────
describe("POST /api/v1/auth/logout", () => {
  it("should return 204 when authenticated", async () => {
    await authAgent
      .post("/api/v1/auth/logout")
      .expect(204);
  });

  it("should reject unauthenticated request", async () => {
    await request(app)
      .post("/api/v1/auth/logout")
      .expect(401);
  });
});

// ── Protected Route Test ───────────────────────────────────
describe("Auth Middleware", () => {
  it("should allow access to protected auth/me with a valid cookie session", async () => {
    await authAgent.post("/api/v1/auth/login").send({
      email: testUser.email,
      password: testUser.password,
    });

    const res = await authAgent
      .get("/api/v1/auth/me")
      .expect(200);

    expect(res.body.firstName).toBe("Test");
  });
});
