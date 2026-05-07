import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "../ProtectedRoute";

// ---------------------------------------------------------------------------
// Mock better-auth client
// ---------------------------------------------------------------------------
vi.mock("../../lib/auth-client", () => ({
  authClient: {
    useSession: vi.fn(),
  },
}));

import { authClient } from "../../lib/auth-client";

// ---------------------------------------------------------------------------
// Helper: wraps the component in a router with a "/login" route
// ---------------------------------------------------------------------------
function renderProtectedRoute(children: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
        <Route
          path="/protected"
          element={<ProtectedRoute>{children}</ProtectedRoute>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("ProtectedRoute", () => {
  it("shows loading indicator while session is pending", () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: null,
      isPending: true,
    } as ReturnType<typeof authClient.useSession>);

    renderProtectedRoute(<div>Protected Content</div>);

    expect(screen.getByText(/checking session/i)).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects to /login when there is no session", () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: null,
      isPending: false,
    } as ReturnType<typeof authClient.useSession>);

    renderProtectedRoute(<div>Protected Content</div>);

    expect(screen.getByTestId("login-page")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("renders children when the user is authenticated", () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: {
        user: { id: "user-1", email: "user@example.com", name: "Alice", emailVerified: true, createdAt: new Date(), updatedAt: new Date(), image: null },
        session: { id: "sess-1", userId: "user-1", token: "tok", expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date(), ipAddress: null, userAgent: null },
      },
      isPending: false,
    } as ReturnType<typeof authClient.useSession>);

    renderProtectedRoute(<div>Protected Content</div>);

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
  });
});
