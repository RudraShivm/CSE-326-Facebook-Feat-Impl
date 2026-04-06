import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppToastProvider, useAppToast } from "./AppToastContext";

function ToastAndNavigateButton() {
  const { showToast } = useAppToast();
  const navigate = useNavigate();

  return (
    <button
      onClick={() => {
        showToast("Post deleted successfully!");
        navigate("/next");
      }}
    >
      Trigger
    </button>
  );
}

describe("AppToastProvider", () => {
  it("keeps success feedback visible across route navigation", () => {
    render(
      <AppToastProvider>
        <MemoryRouter initialEntries={["/start"]}>
          <Routes>
            <Route path="/start" element={<ToastAndNavigateButton />} />
            <Route path="/next" element={<div>Next page</div>} />
          </Routes>
        </MemoryRouter>
      </AppToastProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Trigger" }));

    expect(screen.getByText("Next page")).toBeInTheDocument();
    expect(screen.getByText("Post deleted successfully!")).toBeInTheDocument();
  });
});
