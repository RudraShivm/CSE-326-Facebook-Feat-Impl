import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "../contexts/AuthContext";
import { AppToastProvider } from "../contexts/AppToastContext";
import { CreatePostProvider } from "../contexts/CreatePostContext";
import { useCreatePostAction } from "./useCreatePostAction";

function Trigger() {
  const openCreatePost = useCreatePostAction();
  return <button onClick={openCreatePost}>Create</button>;
}

function LocationReader() {
  const location = useLocation();
  return <div>{location.pathname}</div>;
}

describe("useCreatePostAction", () => {
  it("opens the create-post modal without leaving the current page", () => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        userId: "user-1",
        firstName: "Owner",
        lastName: "User",
        profilePicture: null,
        isActive: true,
      })
    );
    render(
      <AuthProvider>
        <AppToastProvider>
          <CreatePostProvider>
            <MemoryRouter initialEntries={["/search"]}>
              <Routes>
                <Route
                  path="/search"
                  element={
                    <>
                      <Trigger />
                      <LocationReader />
                    </>
                  }
                />
              </Routes>
            </MemoryRouter>
          </CreatePostProvider>
        </AppToastProvider>
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByRole("heading", { name: "Create Post" })).toBeInTheDocument();
    expect(screen.getByText("/search")).toBeInTheDocument();
  });
});
