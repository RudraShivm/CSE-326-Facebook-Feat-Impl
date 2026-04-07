import request from "supertest";
import app from "../app";

async function registerUser(email: string, firstName: string, lastName: string) {
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({
      email,
      password: "Secur3P@ss!",
      firstName,
      lastName,
      dateOfBirth: "1998-06-15",
    })
    .expect(201);

  return {
    userId: res.body.user.userId as string,
    accessToken: res.body.accessToken as string,
  };
}

describe("Menu preferences", () => {
  it("stores only the three most recent profile visits per user", async () => {
    const owner = await registerUser("menu-owner@example.com", "Menu", "Owner");
    const profile1 = await registerUser("visited-1@example.com", "Visited", "One");
    const profile2 = await registerUser("visited-2@example.com", "Visited", "Two");
    const profile3 = await registerUser("visited-3@example.com", "Visited", "Three");
    const profile4 = await registerUser("visited-4@example.com", "Visited", "Four");

    const authHeader = { Authorization: `Bearer ${owner.accessToken}` };

    await request(app)
      .post(`/api/v1/users/${owner.userId}/recent-visits`)
      .set(authHeader)
      .send({ profileId: profile1.userId })
      .expect(200);

    await request(app)
      .post(`/api/v1/users/${owner.userId}/recent-visits`)
      .set(authHeader)
      .send({ profileId: profile2.userId })
      .expect(200);

    await request(app)
      .post(`/api/v1/users/${owner.userId}/recent-visits`)
      .set(authHeader)
      .send({ profileId: profile3.userId })
      .expect(200);

    const fourthVisit = await request(app)
      .post(`/api/v1/users/${owner.userId}/recent-visits`)
      .set(authHeader)
      .send({ profileId: profile4.userId })
      .expect(200);

    expect(fourthVisit.body.recentVisits.map((item: { id: string }) => item.id)).toEqual([
      profile4.userId,
      profile3.userId,
      profile2.userId,
    ]);

    const revisited = await request(app)
      .post(`/api/v1/users/${owner.userId}/recent-visits`)
      .set(authHeader)
      .send({ profileId: profile2.userId })
      .expect(200);

    expect(revisited.body.recentVisits.map((item: { id: string }) => item.id)).toEqual([
      profile2.userId,
      profile4.userId,
      profile3.userId,
    ]);
  });

  it("persists shortcuts in order and drops the oldest beyond four", async () => {
    const owner = await registerUser("shortcut-owner@example.com", "Shortcut", "Owner");
    const profileShortcutUser = await registerUser("shortcut-profile@example.com", "Profile", "Shortcut");
    const authHeader = { Authorization: `Bearer ${owner.accessToken}` };

    await request(app)
      .post(`/api/v1/users/${owner.userId}/shortcuts`)
      .set(authHeader)
      .send({
        kind: "profile",
        title: "Profile Shortcut",
        url: `/profile/${profileShortcutUser.userId}`,
        icon: "👤",
        profileUserId: profileShortcutUser.userId,
        subtitle: "Profile bio",
      })
      .expect(201);

    await request(app)
      .post(`/api/v1/users/${owner.userId}/shortcuts`)
      .set(authHeader)
      .send({ kind: "link", title: "One", url: "/one", icon: "1" })
      .expect(201);

    await request(app)
      .post(`/api/v1/users/${owner.userId}/shortcuts`)
      .set(authHeader)
      .send({ kind: "link", title: "Two", url: "/two", icon: "2" })
      .expect(201);

    await request(app)
      .post(`/api/v1/users/${owner.userId}/shortcuts`)
      .set(authHeader)
      .send({ kind: "link", title: "Three", url: "/three", icon: "3" })
      .expect(201);

    const fifthShortcut = await request(app)
      .post(`/api/v1/users/${owner.userId}/shortcuts`)
      .set(authHeader)
      .send({ kind: "link", title: "Four", url: "/four", icon: "4" })
      .expect(201);

    expect(fifthShortcut.body.shortcuts).toHaveLength(4);
    expect(fifthShortcut.body.shortcuts.map((item: { title: string }) => item.title)).toEqual([
      "Four",
      "Three",
      "Two",
      "One",
    ]);
    expect(fifthShortcut.body.droppedShortcut.title).toBe("Profile Shortcut");

    const menu = await request(app)
      .get(`/api/v1/users/${owner.userId}/menu-preferences`)
      .set(authHeader)
      .expect(200);

    expect(menu.body.shortcuts).toHaveLength(4);
    expect(menu.body.shortcuts.map((item: { title: string }) => item.title)).toEqual([
      "Four",
      "Three",
      "Two",
      "One",
    ]);
  });
});
