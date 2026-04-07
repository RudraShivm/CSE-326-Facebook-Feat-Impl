import { afterEach, describe, expect, it } from "vitest";
import {
  MAX_SHORTCUTS,
  addShortcut,
  hydrateMenuStorage,
  getRecentVisits,
  getShortcuts,
  recordRecentVisit,
} from "./globalMenuStorage";

describe("globalMenuStorage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("keeps only the three most recent visited profiles", () => {
    recordRecentVisit({ id: "1", firstName: "A", lastName: "One", profilePicture: null, bio: null });
    recordRecentVisit({ id: "2", firstName: "B", lastName: "Two", profilePicture: null, bio: null });
    recordRecentVisit({ id: "3", firstName: "C", lastName: "Three", profilePicture: null, bio: null });
    recordRecentVisit({ id: "4", firstName: "D", lastName: "Four", profilePicture: null, bio: null });

    expect(getRecentVisits().map((item) => item.id)).toEqual(["4", "3", "2"]);
  });

  it("moves a revisited profile to the top instead of duplicating it", () => {
    recordRecentVisit({ id: "1", firstName: "A", lastName: "One", profilePicture: null, bio: null });
    recordRecentVisit({ id: "2", firstName: "B", lastName: "Two", profilePicture: null, bio: null });
    recordRecentVisit({ id: "1", firstName: "A", lastName: "One", profilePicture: null, bio: null });

    expect(getRecentVisits().map((item) => item.id)).toEqual(["1", "2"]);
  });

  it("keeps only four shortcuts and drops the oldest when a new one is added", () => {
    addShortcut({ id: "1", title: "One", url: "/1", icon: "1", kind: "link" });
    addShortcut({ id: "2", title: "Two", url: "/2", icon: "2", kind: "link" });
    addShortcut({ id: "3", title: "Three", url: "/3", icon: "3", kind: "link" });
    addShortcut({ id: "4", title: "Four", url: "/4", icon: "4", kind: "link" });
    const result = addShortcut({ id: "5", title: "Five", url: "/5", icon: "5", kind: "link" });

    expect(result.shortcuts).toHaveLength(MAX_SHORTCUTS);
    expect(result.shortcuts.map((item) => item.id)).toEqual(["5", "4", "3", "2"]);
    expect(result.droppedShortcut?.id).toBe("1");
    expect(getShortcuts().map((item) => item.id)).toEqual(["5", "4", "3", "2"]);
  });

  it("hydrates both recent visits and shortcuts together", () => {
    hydrateMenuStorage(
      [{ id: "1", firstName: "A", lastName: "One", profilePicture: null, bio: null }],
      [{ id: "s1", title: "One", url: "/1", icon: "1", kind: "link" }]
    );

    expect(getRecentVisits().map((item) => item.id)).toEqual(["1"]);
    expect(getShortcuts().map((item) => item.id)).toEqual(["s1"]);
  });
});
